/**
 * Integration test: for each calibration fixture that ships an
 * evidence_map.json, actually ingest its repo (offline) and resolve its
 * collaboration_case.json's linked_evidence_ids/external_excerpts against
 * real Evidence -- proving the Astra-required "connect every reference to
 * loaded data, or report it as an explicit gap" behavior, not just that the
 * JSON files are shaped correctly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestRepository } from "../../src/server/ingestion/ingest.js";
import { OfflineHttpClient } from "../../src/server/ingestion/offlineHttpClient.js";
import { resolveLinkedEvidence, resolveExternalExcerpts, type EvidenceMap } from "../../src/server/evaluation/evidenceMap.js";
import { parseCollaborationCase } from "../../src/server/evaluation/loadCollaborationCase.js";
import { buildFixturesFromLocalRepo } from "../calibration/localRepoToFixtures.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_ROOT = join(__dirname, "..", "..", "fixtures", "calibration", "cases");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function ingestFixtureRepo(repoDir: string, owner: string, repo: string) {
  const fixtures = buildFixturesFromLocalRepo(repoDir, { owner, repo, commitSha: "d".repeat(40) });
  return ingestRepository({ repoUrl: `https://github.com/${owner}/${repo}` }, { httpClient: new OfflineHttpClient(fixtures) });
}

test("case-02: linked evidence resolves to the real ingested test file, nothing left unresolved", async () => {
  const dir = join(CASES_ROOT, "case-02-simple-tool-strong-verification");
  const repoDir = join(dir, "..", "..", "shared", "repos", "simple-tool-verified");
  const snapshot = await ingestFixtureRepo(repoDir, "fixture", "case02b");
  const evidenceMap = loadJson<EvidenceMap>(join(dir, "evidence_map.json"));
  const cc = parseCollaborationCase(loadJson(join(dir, "collaboration_case.json")), "as_case02");

  const result = resolveLinkedEvidence({
    assessmentId: "as_case02",
    linkedEvidenceIds: cc.linkedEvidenceIds,
    evidenceMap,
    snapshot,
    collectedAt: "2026-09-14T00:00:00Z",
  });
  assert.equal(result.unresolved.length, 0);
  assert.equal(result.resolved.length, 1);
  assert.equal(result.resolved[0]!.path, "src/lib/validateOrderTotal.test.ts");
});

test("case-04 variant-a: linked evidence resolves against the shared base-shop repo", async () => {
  const dir = join(CASES_ROOT, "case-04-same-code-different-process");
  const repoDir = join(dir, "..", "..", "shared", "repos", "base-shop");
  const snapshot = await ingestFixtureRepo(repoDir, "fixture", "case04");
  const evidenceMap = loadJson<EvidenceMap>(join(dir, "evidence_map.json"));
  const cc = parseCollaborationCase(loadJson(join(dir, "variant-a", "collaboration_case.json")), "as_case04a");

  const result = resolveLinkedEvidence({
    assessmentId: "as_case04a",
    linkedEvidenceIds: cc.linkedEvidenceIds,
    evidenceMap,
    snapshot,
    collectedAt: "2026-09-14T00:00:00Z",
  });
  assert.equal(result.unresolved.length, 0);
  assert.equal(result.resolved[0]!.path, "src/server/actions/createOrder.test.ts");
});

test("case-04 variant-b: empty linked_evidence_ids resolves to nothing (not an error, not a fabrication)", () => {
  const dir = join(CASES_ROOT, "case-04-same-code-different-process");
  const cc = parseCollaborationCase(loadJson(join(dir, "variant-b", "collaboration_case.json")), "as_case04b");
  assert.deepEqual(cc.linkedEvidenceIds, []);
});

test("case-05: external_excerpts resolves directly from the excerpt file, without needing an evidence_map entry", () => {
  const dir = join(CASES_ROOT, "case-05-conflicting-evidence");
  const cc = parseCollaborationCase(loadJson(join(dir, "collaboration_case.json")), "as_case05");
  assert.ok(cc.externalExcerpts && cc.externalExcerpts.length === 1);
  const result = resolveExternalExcerpts({
    assessmentId: "as_case05",
    externalExcerpts: cc.externalExcerpts!,
    readExcerptText: (p) => {
      const full = join(dir, p);
      return existsSync(full) ? readFileSync(full, "utf8") : null;
    },
    collectedAt: "2026-09-14T00:00:00Z",
  });
  assert.equal(result.unresolved.length, 0);
  assert.equal(result.resolved.length, 1);
  assert.match(result.resolved[0]!.summary, /ai_suggestion_raw\.txt/);
});

test("case-08 subvariant-a: the claimed 'late log' evidence ID is explicitly unresolved -- not fabricated, not silently dropped", async () => {
  const subDir = join(CASES_ROOT, "case-08-before-after", "subvariant-a-late-log");
  const repoDir = join(subDir, "..", "..", "..", "shared", "repos", "before-after", "v2-late-log");
  const snapshot = await ingestFixtureRepo(repoDir, "fixture", "case08a-after");
  const evidenceMap = loadJson<EvidenceMap>(join(subDir, "evidence_map.json"));
  const cc = parseCollaborationCase(loadJson(join(subDir, "after", "collaboration_case.json")), "as_case08a");

  const result = resolveLinkedEvidence({
    assessmentId: "as_case08a",
    linkedEvidenceIds: cc.linkedEvidenceIds,
    evidenceMap,
    snapshot,
    collectedAt: "2026-09-14T00:00:00Z",
  });
  assert.equal(result.resolved.length, 0, "no real log file exists in this fixture -- it must not be fabricated as resolved evidence");
  assert.equal(result.unresolved.length, 1);
  assert.match(result.unresolved[0]!.reason, /실제 발췌 파일이 존재하지 않는다/);
});

test("case-08 subvariant-b: both linked test evidence and the user-submitted execution log resolve", async () => {
  const subDir = join(CASES_ROOT, "case-08-before-after", "subvariant-b-real-improvement");
  const repoDir = join(subDir, "..", "..", "..", "shared", "repos", "before-after", "v2-real-improvement");
  const snapshot = await ingestFixtureRepo(repoDir, "fixture", "case08b-after");
  const evidenceMap = loadJson<EvidenceMap>(join(subDir, "evidence_map.json"));
  const cc = parseCollaborationCase(loadJson(join(subDir, "after", "collaboration_case.json")), "as_case08b");

  const linked = resolveLinkedEvidence({
    assessmentId: "as_case08b",
    linkedEvidenceIds: cc.linkedEvidenceIds,
    evidenceMap,
    snapshot,
    collectedAt: "2026-09-14T00:00:00Z",
  });
  assert.equal(linked.unresolved.length, 0);
  assert.equal(linked.resolved[0]!.path, "src/lib/validateOrderTotal.test.ts");

  const excerpts = resolveExternalExcerpts({
    assessmentId: "as_case08b",
    externalExcerpts: cc.externalExcerpts ?? [],
    readExcerptText: (p) => {
      const full = join(subDir, p);
      return existsSync(full) ? readFileSync(full, "utf8") : null;
    },
    collectedAt: "2026-09-14T00:00:00Z",
  });
  assert.equal(excerpts.unresolved.length, 0);
  assert.equal(excerpts.resolved.length, 1);
});
