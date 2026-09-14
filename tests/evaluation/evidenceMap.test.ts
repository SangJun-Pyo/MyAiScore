import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLinkedEvidence, resolveExternalExcerpts, type EvidenceMap } from "../../src/server/evaluation/evidenceMap.js";
import { makeEmptySnapshot } from "./testHelpers.js";
import type { EvidenceCandidate } from "../../src/shared/contracts/ingestion.js";

function candidate(path: string): EvidenceCandidate {
  return {
    assessmentId: null,
    sourceType: "repo_static",
    collectionMethod: "synthetic_fixture",
    summary: `candidate for ${path}`,
    contentSha256: "a".repeat(64),
    collectedAt: "2026-01-01T00:00:00Z",
    repo: "fixture/case",
    commitSha: "b".repeat(40),
    path,
    locator: { startLine: 1, endLine: 5 },
    eventTime: null,
    verificationNote: "static existence only",
  };
}

test("repo_static entry resolves to a real Evidence when the path exists in the snapshot", () => {
  const snapshot = makeEmptySnapshot({ evidenceCandidates: [candidate("src/lib/validateOrderTotal.test.ts")] });
  const map: EvidenceMap = { ev_x: { kind: "repo_static", path: "src/lib/validateOrderTotal.test.ts" } };
  const result = resolveLinkedEvidence({
    assessmentId: "as_1",
    linkedEvidenceIds: ["ev_x"],
    evidenceMap: map,
    snapshot,
    collectedAt: "2026-02-01T00:00:00Z",
  });
  assert.equal(result.resolved.length, 1);
  assert.equal(result.unresolved.length, 0);
  assert.equal(result.resolved[0]!.path, "src/lib/validateOrderTotal.test.ts");
  assert.equal(result.resolved[0]!.assessmentId, "as_1");
});

test("an ID with no evidence_map entry at all is reported unresolved, not silently dropped", () => {
  const snapshot = makeEmptySnapshot();
  const result = resolveLinkedEvidence({
    assessmentId: "as_1",
    linkedEvidenceIds: ["ev_unmapped"],
    evidenceMap: {},
    snapshot,
    collectedAt: "2026-02-01T00:00:00Z",
  });
  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0]!.evidenceId, "ev_unmapped");
  assert.match(result.unresolved[0]!.reason, /evidence_map/);
});

test("an explicit unresolved entry (e.g. a claimed-but-never-submitted log) is reported with its stated reason, never fabricated", () => {
  const snapshot = makeEmptySnapshot();
  const map: EvidenceMap = { ev_old_log: { kind: "unresolved", reason: "이 fixture에는 실제 로그 발췌 파일이 없음" } };
  const result = resolveLinkedEvidence({
    assessmentId: "as_1",
    linkedEvidenceIds: ["ev_old_log"],
    evidenceMap: map,
    snapshot,
    collectedAt: "2026-02-01T00:00:00Z",
  });
  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved[0]!.reason, "이 fixture에는 실제 로그 발췌 파일이 없음");
});

test("a repo_static entry pointing at a path missing from the snapshot is unresolved, not fabricated", () => {
  const snapshot = makeEmptySnapshot({ evidenceCandidates: [] });
  const map: EvidenceMap = { ev_x: { kind: "repo_static", path: "src/does/not/exist.ts" } };
  const result = resolveLinkedEvidence({
    assessmentId: "as_1",
    linkedEvidenceIds: ["ev_x"],
    evidenceMap: map,
    snapshot,
    collectedAt: "2026-02-01T00:00:00Z",
  });
  assert.equal(result.resolved.length, 0);
  assert.match(result.unresolved[0]!.reason, /IngestionSnapshot/);
});

test("external excerpt resolves to a user_provided_excerpt Evidence when the file is readable", () => {
  const result = resolveExternalExcerpts({
    assessmentId: "as_1",
    externalExcerpts: ["excerpts/ai_suggestion_raw.txt"],
    readExcerptText: () => "raw excerpt text",
    collectedAt: "2026-02-01T00:00:00Z",
  });
  assert.equal(result.resolved.length, 1);
  assert.equal(result.resolved[0]!.sourceType, "user_provided_excerpt");
  assert.equal(result.resolved[0]!.collectionMethod, "user_submission");
});

test("a missing excerpt file is reported unresolved, never fabricated content", () => {
  const result = resolveExternalExcerpts({
    assessmentId: "as_1",
    externalExcerpts: ["excerpts/missing.txt"],
    readExcerptText: () => null,
    collectedAt: "2026-02-01T00:00:00Z",
  });
  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved.length, 1);
});
