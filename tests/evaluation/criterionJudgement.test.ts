import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAndBuildCriterionResults } from "../../src/server/evaluation/criterionJudgement.js";
import { assembleEvaluationInput } from "../../src/server/evaluation/inputAssembly.js";
import type { Evidence } from "../../src/shared/contracts/evaluation.js";
import { makeEmptySnapshot } from "./testHelpers.js";

function evidence(id: string): Evidence {
  return {
    evidenceId: id,
    assessmentId: "as_1",
    sourceType: "repo_static",
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

function bundle(evidenceIds: string[]) {
  return assembleEvaluationInput({
    assessmentId: "as_1",
    snapshot: makeEmptySnapshot(),
    collaborationCase: null,
    evidence: evidenceIds.map(evidence),
  });
}

function validCriterion(code: string, overrides: Record<string, unknown> = {}) {
  return {
    criterion_code: code,
    status: "observed",
    level: 3,
    supporting_evidence_ids: ["ev_1"],
    contrary_evidence_ids: [],
    rationale: "because X",
    missing_evidence: "",
    blocking_conflict: false,
    ...overrides,
  };
}

function fullValidRaw() {
  return {
    criteria: [
      validCriterion("A"),
      validCriterion("B"),
      validCriterion("C"),
      validCriterion("D"),
      { criterion_code: "E", status: "not_observed", level: null, supporting_evidence_ids: [], contrary_evidence_ids: [], rationale: "no data", missing_evidence: "need X", blocking_conflict: false },
    ],
  };
}

test("valid provider output builds 5 CriterionResult objects with computed dimensionScore", () => {
  const result = validateAndBuildCriterionResults({ raw: fullValidRaw() }, bundle(["ev_1"]));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.criteria.length, 5);
    const a = result.criteria.find((c) => c.criterionCode === "A")!;
    assert.equal(a.dimensionScore, 75);
    const e = result.criteria.find((c) => c.criterionCode === "E")!;
    assert.equal(e.level, null);
    assert.equal(e.dimensionScore, null);
  }
});

test("provider transport failure surfaces explicitly", () => {
  const result = validateAndBuildCriterionResults({ providerError: { code: "provider_failure", message: "5xx", retryable: true } }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "provider_error");
});

test("duplicate criterion_code is rejected", () => {
  const raw = { criteria: [validCriterion("A"), validCriterion("A"), validCriterion("C"), validCriterion("D"), validCriterion("E")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "duplicate_or_missing_codes");
});

test("missing criterion_code (only 4 axes) is rejected", () => {
  const raw = { criteria: [validCriterion("A"), validCriterion("B"), validCriterion("C"), validCriterion("D")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "duplicate_or_missing_codes");
});

test("out-of-range level (0) is rejected", () => {
  const raw = { criteria: [validCriterion("A", { level: 0 }), validCriterion("B"), validCriterion("C"), validCriterion("D"), validCriterion("E")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_level");
});

test("non-integer level is rejected", () => {
  const raw = { criteria: [validCriterion("A", { level: 2.5 }), validCriterion("B"), validCriterion("C"), validCriterion("D"), validCriterion("E")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_level");
});

test("observed status with no supporting_evidence_ids is rejected", () => {
  const raw = { criteria: [validCriterion("A", { supporting_evidence_ids: [] }), validCriterion("B"), validCriterion("C"), validCriterion("D"), validCriterion("E")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_status_level_combination");
});

test("not_observed with a non-null level is rejected", () => {
  const raw = {
    criteria: [
      validCriterion("A"),
      validCriterion("B"),
      validCriterion("C"),
      validCriterion("D"),
      { criterion_code: "E", status: "not_observed", level: 2, supporting_evidence_ids: [], contrary_evidence_ids: [], rationale: "r", missing_evidence: "m", blocking_conflict: false },
    ],
  };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_status_level_combination");
});

test("a reference to evidence outside this assessment is rejected (broken/foreign reference)", () => {
  const raw = { criteria: [validCriterion("A", { supporting_evidence_ids: ["ev_from_another_assessment"] }), validCriterion("B"), validCriterion("C"), validCriterion("D"), validCriterion("E")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_evidence_reference");
});

test("blockingConflict=true with status=observed is rejected (must be insufficient_evidence)", () => {
  const raw = { criteria: [validCriterion("A", { blocking_conflict: true }), validCriterion("B"), validCriterion("C"), validCriterion("D"), validCriterion("E")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_blocking_conflict");
});

test("blockingConflict=true with status=insufficient_evidence is accepted", () => {
  const raw = {
    criteria: [
      validCriterion("A"),
      validCriterion("B"),
      validCriterion("C"),
      validCriterion("D"),
      { criterion_code: "E", status: "insufficient_evidence", level: null, supporting_evidence_ids: ["ev_1"], contrary_evidence_ids: ["ev_1"], rationale: "conflict", missing_evidence: "resolve conflict", blocking_conflict: true },
    ],
  };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, true);
  if (result.ok) {
    const e = result.criteria.find((c) => c.criterionCode === "E")!;
    assert.equal(e.blockingConflict, true);
    assert.equal(e.status, "insufficient_evidence");
  }
});

test("malformed shape ({criteria} not an array) is rejected", () => {
  const result = validateAndBuildCriterionResults({ raw: { criteria: "nope" } }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "output_validation_failed");
});

test("an invalid status enum value is rejected", () => {
  const raw = { criteria: [validCriterion("A", { status: "definitely_correct" }), validCriterion("B"), validCriterion("C"), validCriterion("D"), validCriterion("E")] };
  const result = validateAndBuildCriterionResults({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "output_validation_failed");
});
