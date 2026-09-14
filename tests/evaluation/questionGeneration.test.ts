import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAndBuildQuestions } from "../../src/server/evaluation/questionGeneration.js";
import { assembleEvaluationInput } from "../../src/server/evaluation/inputAssembly.js";
import type { Evidence } from "../../src/shared/contracts/evaluation.js";
import type { RawProviderOutput } from "../../src/server/evaluation/provider.js";
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

const validRaw = {
  questions: [
    { text: "Q1?", grounding_evidence_ids: ["ev_1"], target_criteria: ["A"] },
    { text: "Q2?", grounding_evidence_ids: ["ev_2"], target_criteria: ["D"] },
    { text: "Q3?", grounding_evidence_ids: ["ev_1", "ev_2"], target_criteria: ["E"] },
  ],
};

test("valid provider output builds exactly 3 Question objects", () => {
  const result = validateAndBuildQuestions({ raw: validRaw }, bundle(["ev_1", "ev_2"]));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.questions.length, 3);
    assert.equal(result.questions[0]!.assessmentId, "as_1");
    assert.deepEqual(result.questions[1]!.targetCriteria, ["D"]);
  }
});

test("provider transport error surfaces as an explicit failure, not fabricated questions", () => {
  const output: RawProviderOutput = { providerError: { code: "timeout", message: "timed out", retryable: true } };
  const result = validateAndBuildQuestions(output, bundle(["ev_1", "ev_2"]));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, "provider_error");
    assert.equal(result.failure.retryable, true);
  }
});

test("malformed JSON shape is rejected", () => {
  const result = validateAndBuildQuestions({ raw: { not_questions: [] } }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "output_validation_failed");
});

test("wrong question count (2 instead of 3) is rejected", () => {
  const raw = { questions: validRaw.questions.slice(0, 2) };
  const result = validateAndBuildQuestions({ raw }, bundle(["ev_1", "ev_2"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "wrong_question_count");
});

test("duplicate question text is rejected", () => {
  const raw = {
    questions: [
      { text: "Same?", grounding_evidence_ids: ["ev_1"], target_criteria: ["A"] },
      { text: "Same?", grounding_evidence_ids: ["ev_1"], target_criteria: ["B"] },
      { text: "Different?", grounding_evidence_ids: ["ev_1"], target_criteria: ["C"] },
    ],
  };
  const result = validateAndBuildQuestions({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "duplicate_questions");
});

test("a grounding_evidence_id outside this assessment's evidence set is rejected", () => {
  const raw = {
    questions: [
      { text: "Q1?", grounding_evidence_ids: ["ev_not_in_assessment"], target_criteria: ["A"] },
      { text: "Q2?", grounding_evidence_ids: ["ev_1"], target_criteria: ["B"] },
      { text: "Q3?", grounding_evidence_ids: ["ev_1"], target_criteria: ["C"] },
    ],
  };
  const result = validateAndBuildQuestions({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_grounding_evidence");
});

test("an empty grounding_evidence_ids array is rejected (a question must be grounded)", () => {
  const raw = {
    questions: [
      { text: "Q1?", grounding_evidence_ids: [], target_criteria: ["A"] },
      { text: "Q2?", grounding_evidence_ids: ["ev_1"], target_criteria: ["B"] },
      { text: "Q3?", grounding_evidence_ids: ["ev_1"], target_criteria: ["C"] },
    ],
  };
  const result = validateAndBuildQuestions({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "output_validation_failed");
});

test("an invalid target_criteria value (not A-E) is rejected", () => {
  const raw = {
    questions: [
      { text: "Q1?", grounding_evidence_ids: ["ev_1"], target_criteria: ["Z"] },
      { text: "Q2?", grounding_evidence_ids: ["ev_1"], target_criteria: ["B"] },
      { text: "Q3?", grounding_evidence_ids: ["ev_1"], target_criteria: ["C"] },
    ],
  };
  const result = validateAndBuildQuestions({ raw }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_target_criteria");
});

test("no evidence at all -> any grounded question is impossible, all rejected as invalid_grounding_evidence", () => {
  const result = validateAndBuildQuestions({ raw: validRaw }, bundle([]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "invalid_grounding_evidence");
});

// Regression (Astra Phase 2 review R4): null/primitive/array entries in the
// questions array used to throw a raw TypeError ("Cannot read properties of
// null") instead of returning an explicit validation failure.
test("null entries in the questions array are an explicit validation failure, not a TypeError", () => {
  const result = validateAndBuildQuestions({ raw: { questions: [null, null, null] } }, bundle(["ev_1", "ev_2"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "output_validation_failed");
});

test("a primitive (string) entry in the questions array is an explicit validation failure, not a TypeError", () => {
  const result = validateAndBuildQuestions({ raw: { questions: ["not an object", "not an object", "not an object"] } }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "output_validation_failed");
});

test("an array entry (instead of an object) in the questions array is an explicit validation failure", () => {
  const result = validateAndBuildQuestions({ raw: { questions: [[], [], []] } }, bundle(["ev_1"]));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.code, "output_validation_failed");
});
