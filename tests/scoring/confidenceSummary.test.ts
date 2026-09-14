import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveProcessEvidenceLevel } from "../../src/server/scoring/confidenceSummary.js";
import type { Evidence } from "../../src/shared/contracts/evaluation.js";

function evidence(sourceType: Evidence["sourceType"]): Evidence {
  return {
    evidenceId: "ev_1",
    assessmentId: "as_1",
    sourceType,
    collectionMethod: "synthetic_fixture",
    summary: "s",
    contentSha256: "a".repeat(64),
    collectedAt: "2026-01-01T00:00:00Z",
    repo: "fixture/case",
    commitSha: "b".repeat(40),
    path: "src/x.ts",
    locator: { startLine: 1, endLine: 2 },
    eventTime: null,
    verificationNote: "v",
  };
}

test("no collaboration case at all -> none", () => {
  assert.equal(deriveProcessEvidenceLevel({ hasCollaborationCase: false, resolvedCaseEvidence: [] }), "none");
});

// Regression (Astra Phase 2 review, "과정 자료 표시"): a single repo_static
// link only proves a file exists -- it is not, by itself, a process record.
test("a collaboration case backed only by a repo_static link is statements_only, not linked_records", () => {
  const level = deriveProcessEvidenceLevel({ hasCollaborationCase: true, resolvedCaseEvidence: [evidence("repo_static")] });
  assert.equal(level, "statements_only");
});

test("a collaboration case with no resolved evidence at all is statements_only", () => {
  const level = deriveProcessEvidenceLevel({ hasCollaborationCase: true, resolvedCaseEvidence: [] });
  assert.equal(level, "statements_only");
});

test("a collaboration case backed by an actual user-provided excerpt is linked_records", () => {
  const level = deriveProcessEvidenceLevel({ hasCollaborationCase: true, resolvedCaseEvidence: [evidence("user_provided_excerpt")] });
  assert.equal(level, "linked_records");
});

test("a collaboration case backed by repo_history (e.g. a commit log entry) is linked_records", () => {
  const level = deriveProcessEvidenceLevel({ hasCollaborationCase: true, resolvedCaseEvidence: [evidence("repo_history")] });
  assert.equal(level, "linked_records");
});

test("mixing a repo_static link with a real process record is still linked_records (the process record is what counts)", () => {
  const level = deriveProcessEvidenceLevel({ hasCollaborationCase: true, resolvedCaseEvidence: [evidence("repo_static"), evidence("user_provided_excerpt")] });
  assert.equal(level, "linked_records");
});
