import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { collectLocalSession, LocalCollectionError } from "../../src/server/localCollection/collectLocalSession.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "..", "fixtures", "local-collection");

test("end-to-end: a basic synthetic session produces evidence, connects a known repo path, and flows through analysisContext without leaking raw text into the outcome's Evidence records", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    mkdirSync(join(projectRoot, "src", "lib"), { recursive: true });
    writeFileSync(join(projectRoot, "src", "lib", "validateOrderTotal.ts"), "export function validateOrderTotal() { return true; }\n");

    const result = collectLocalSession({
      projectRoot,
      sessionFilePath: join(FIXTURES, "basic-session.jsonl"),
      repoEvidencePaths: new Set(["src/lib/validateOrderTotal.ts"]),
    });

    assert.equal(result.parsed.malformedLines.length, 0);
    assert.ok(result.conversion.evidence.length > 0);
    assert.ok(result.fileConnections.some((c) => c.status === "path_referenced_in_repo_evidence"));

    const fullText = "네, 음수 총액을 거부하는 조건을 추가하겠습니다.";
    const inAnalysisContext = Object.values(result.conversion.analysisContext).some((t) => t.includes(fullText));
    assert.ok(inAnalysisContext, "the full AI response text must be present in analysisContext");
    for (const e of result.conversion.evidence) {
      assert.ok(e.summary.length <= 120, `Evidence.summary must stay a short label+preview, not the full text (got ${e.summary.length} chars)`);
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("an unsupported-format session file surfaces LocalCollectionError, not a crash", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    assert.throws(
      () => collectLocalSession({ projectRoot, sessionFilePath: join(FIXTURES, "unsupported-format.jsonl") }),
      (err: unknown) => err instanceof LocalCollectionError && err.code === "session_parse_failed",
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("no real LLM call, no network, no execution of project code happens anywhere in this pipeline (structural check: no fetch/exec/spawn imports)", async () => {
  // This is a structural smoke check, not a sandbox guarantee: confirms the
  // local-collection module set does not import Node's process-execution or
  // network primitives at all.
  const fs = await import("node:fs");
  const files = ["parseSessionFile.ts", "extractCollaborationEvents.ts", "connectToRepoEvidence.ts", "toEvidence.ts", "collectLocalSession.ts"];
  for (const f of files) {
    const src = fs.readFileSync(join(__dirname, "..", "..", "src", "server", "localCollection", f), "utf8");
    assert.doesNotMatch(src, /node:child_process|node:https?|fetch\(/, `${f} must not import execution or network primitives`);
  }
});
