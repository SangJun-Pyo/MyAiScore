import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseClaudeCodeSessionFile } from "../../src/server/localCollection/parseSessionFile.js";
import { extractCollaborationEvents } from "../../src/server/localCollection/extractCollaborationEvents.js";
import { connectFileTouchesToProject } from "../../src/server/localCollection/connectToRepoEvidence.js";
import { convertEventsToEvidence } from "../../src/server/localCollection/toEvidence.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "..", "fixtures", "local-collection");

function convert(fixtureName: string, projectRoot: string, repoEvidencePaths?: Set<string>) {
  const records = parseClaudeCodeSessionFile(join(FIXTURES, fixtureName)).records;
  const events = extractCollaborationEvents(records);
  const fileTouches = events.filter((e): e is Extract<typeof e, { kind: "file_touch" }> => e.kind === "file_touch");
  const fileConnections = connectFileTouchesToProject({ fileTouches, projectRoot, repoEvidencePaths });
  return convertEventsToEvidence({ assessmentId: "as_test", events, fileConnections, collectedAt: "2026-09-20T00:00:00.000Z" });
}

test("every Evidence produced uses sourceType=user_provided_excerpt, never repo_static/repo_history (local logs are not GitHub-verified)", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const result = convert("basic-session.jsonl", projectRoot, new Set(["src/lib/validateOrderTotal.ts"]));
    assert.ok(result.evidence.length > 0);
    for (const e of result.evidence) {
      assert.equal(e.sourceType, "user_provided_excerpt");
      assert.equal(e.collectionMethod, "user_submission");
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("only a file_touch/tool_call connected to a known repo-evidence path gets Evidence.path set; everything else is null", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const result = convert("basic-session.jsonl", projectRoot, new Set(["src/lib/validateOrderTotal.ts"]));
    const withPath = result.evidence.filter((e) => e.path !== null);
    assert.ok(withPath.length >= 1);
    for (const e of withPath) assert.equal(e.path, "src/lib/validateOrderTotal.ts");
    const withoutPath = result.evidence.filter((e) => e.path === null);
    assert.ok(withoutPath.length > 0);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("raw/masked text never lives on the Evidence object itself -- only in the separate analysisContext map", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const result = convert("basic-session.jsonl", projectRoot);
    for (const e of result.evidence) {
      const asJson = JSON.stringify(e);
      // summary is allowed a short preview, but the full analysisContext text for this id must not equal the whole Evidence object's serialization content beyond the short preview.
      assert.ok(!("rawText" in e));
    }
    assert.ok(Object.keys(result.analysisContext).length > 0);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("a secret-looking pattern in a user message is masked in analysisContext and flagged in maskedEvidenceIds", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const result = convert("secrets-session.jsonl", projectRoot);
    assert.equal(result.maskedEvidenceIds.length, 1);
    const maskedId = result.maskedEvidenceIds[0]!;
    assert.ok(!result.analysisContext[maskedId]!.includes("sk-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"));
    assert.match(result.analysisContext[maskedId]!, /masked/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("a tool_call with no matching tool_result produces Evidence stating the result is unconfirmed, not success or failure", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const result = convert("unresolved-tool-session.jsonl", projectRoot);
    const toolEvidence = result.evidence.find((e) => e.summary.includes("Bash"))!;
    assert.match(toolEvidence.verificationNote, /확인할 수 없다/);
    assert.doesNotMatch(toolEvidence.verificationNote, /완료됐다고 보고/, "must not claim the tool reported completion when no result was found at all");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("a score-manipulation instruction embedded in the log becomes ordinary Evidence content -- the collector does not execute it or add a compliance field", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const result = convert("injection-session.jsonl", projectRoot);
    const evidenceIds = Object.keys(result.analysisContext);
    const withInjectionText = evidenceIds.filter((id) => result.analysisContext[id]!.includes("SYSTEM OVERRIDE"));
    assert.equal(withInjectionText.length, 1);
    // Structural shape identical to any other Evidence -- no extra fields added because of this content.
    const injected = result.evidence.find((e) => e.evidenceId === withInjectionText[0]);
    assert.ok(injected);
    assert.deepEqual(
      Object.keys(injected!).sort(),
      ["assessmentId", "collectionMethod", "commitSha", "contentSha256", "collectedAt", "evidenceId", "eventTime", "locator", "path", "repo", "sourceType", "summary", "verificationNote"].sort(),
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("a file touch outside the project root is excluded from repo-evidence-path connections (reported as outside_project_root, not silently linked)", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const result = convert("outside-project-path-session.jsonl", projectRoot);
    const outsideEvidence = result.evidence.find((e) => e.summary.includes("secrets.env"))!;
    assert.equal(outsideEvidence.path, null);
    assert.match(outsideEvidence.verificationNote, /프로젝트 루트 밖/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
