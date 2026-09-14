import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleEvaluationInput, BundleAssemblyError, computeModelInputHash } from "../../src/server/evaluation/inputAssembly.js";
import type { Answer, Evidence, Question } from "../../src/shared/contracts/evaluation.js";
import { makeEmptySnapshot } from "./testHelpers.js";

function evidence(id: string, overrides: Partial<Evidence> = {}): Evidence {
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
    ...overrides,
  };
}

function question(id: string, overrides: Partial<Question> = {}): Question {
  return {
    questionId: id,
    assessmentId: "as_1",
    text: `text-${id}`,
    groundingEvidenceIds: ["ev_1"],
    targetCriteria: ["A"],
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function answer(id: string, questionId: string, overrides: Partial<Answer> = {}): Answer {
  return {
    answerId: id,
    assessmentId: "as_1",
    questionId,
    text: `answer-${id}`,
    linkedEvidenceIds: [],
    submittedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- R4: bundle assembly must be the earliest choke point against
// cross-assessment / duplicate / dangling-reference data. This directly
// reproduces the Astra Phase 2 review probe where a bundle was hand-built
// with evidence from "other-assessment" while assessmentId was
// "current-assessment", and the question validator accepted it because it
// only checked "is this ID somewhere in bundle.evidence", never who it
// actually belongs to.

test("evidence belonging to a different assessmentId is rejected at bundle assembly, not later", () => {
  assert.throws(
    () =>
      assembleEvaluationInput({
        assessmentId: "current-assessment",
        snapshot: makeEmptySnapshot(),
        collaborationCase: null,
        evidence: [evidence("ev_1", { assessmentId: "other-assessment" })],
      }),
    BundleAssemblyError,
  );
});

test("duplicate evidenceId is rejected", () => {
  assert.throws(
    () =>
      assembleEvaluationInput({
        assessmentId: "as_1",
        snapshot: makeEmptySnapshot(),
        collaborationCase: null,
        evidence: [evidence("ev_1"), evidence("ev_1")],
      }),
    BundleAssemblyError,
  );
});

test("a question belonging to a different assessmentId is rejected", () => {
  assert.throws(
    () =>
      assembleEvaluationInput({
        assessmentId: "as_1",
        snapshot: makeEmptySnapshot(),
        collaborationCase: null,
        evidence: [evidence("ev_1")],
        questions: [question("q_1", { assessmentId: "other-assessment" })],
      }),
    BundleAssemblyError,
  );
});

test("duplicate questionId is rejected", () => {
  assert.throws(
    () =>
      assembleEvaluationInput({
        assessmentId: "as_1",
        snapshot: makeEmptySnapshot(),
        collaborationCase: null,
        evidence: [evidence("ev_1")],
        questions: [question("q_1"), question("q_1")],
      }),
    BundleAssemblyError,
  );
});

test("an answer referencing a questionId not present in the bundle is rejected", () => {
  assert.throws(
    () =>
      assembleEvaluationInput({
        assessmentId: "as_1",
        snapshot: makeEmptySnapshot(),
        collaborationCase: null,
        evidence: [evidence("ev_1")],
        questions: [question("q_1")],
        answers: [answer("ans_1", "q_nonexistent")],
      }),
    BundleAssemblyError,
  );
});

test("two answers for the same question is rejected (schema: at most one answer per question)", () => {
  assert.throws(
    () =>
      assembleEvaluationInput({
        assessmentId: "as_1",
        snapshot: makeEmptySnapshot(),
        collaborationCase: null,
        evidence: [evidence("ev_1")],
        questions: [question("q_1")],
        answers: [answer("ans_1", "q_1"), answer("ans_2", "q_1")],
      }),
    BundleAssemblyError,
  );
});

test("an answer linking a broken/foreign evidence id is rejected", () => {
  assert.throws(
    () =>
      assembleEvaluationInput({
        assessmentId: "as_1",
        snapshot: makeEmptySnapshot(),
        collaborationCase: null,
        evidence: [evidence("ev_1")],
        questions: [question("q_1")],
        answers: [answer("ans_1", "q_1", { linkedEvidenceIds: ["ev_does_not_exist"] })],
      }),
    BundleAssemblyError,
  );
});

test("a well-formed bundle assembles without throwing", () => {
  const bundle = assembleEvaluationInput({
    assessmentId: "as_1",
    snapshot: makeEmptySnapshot(),
    collaborationCase: null,
    evidence: [evidence("ev_1")],
    questions: [question("q_1")],
    answers: [answer("ans_1", "q_1", { linkedEvidenceIds: ["ev_1"] })],
  });
  assert.equal(bundle.evidence.length, 1);
  assert.ok(bundle.bundleTextHash.length === 64);
  assert.ok(bundle.modelInputHash.length === 64);
});

// Legacy bundle fingerprint does not normalize model-visible fields.

test("deprecated bundle fingerprint preserves different IDs and timestamps", () => {
  const snapshot = makeEmptySnapshot();
  const hashA = computeModelInputHash({
    snapshot,
    collaborationCase: null,
    evidence: [evidence("ev_1", { assessmentId: "run-a", collectedAt: "2026-01-01T00:00:00Z" })],
    questions: [question("q_a", { assessmentId: "run-a", createdAt: "2026-01-01T00:00:00Z", text: "same question text" })],
    answers: [answer("ans_a", "q_a", { assessmentId: "run-a", submittedAt: "2026-01-01T00:00:00Z", text: "same answer text" })],
  });
  const hashB = computeModelInputHash({
    snapshot,
    collaborationCase: null,
    evidence: [evidence("ev_1", { assessmentId: "run-b", collectedAt: "2099-12-31T23:59:59Z" })],
    questions: [question("q_b", { assessmentId: "run-b", createdAt: "2099-12-31T23:59:59Z", text: "same question text" })],
    answers: [answer("ans_b", "q_b", { assessmentId: "run-b", submittedAt: "2099-12-31T23:59:59Z", text: "same answer text" })],
  });
  assert.notEqual(hashA, hashB);
});

test("modelInputHash changes when the actual question text changes", () => {
  const snapshot = makeEmptySnapshot();
  const base = { snapshot, collaborationCase: null, evidence: [evidence("ev_1")] };
  const hashA = computeModelInputHash({ ...base, questions: [question("q_1", { text: "question one" })] });
  const hashB = computeModelInputHash({ ...base, questions: [question("q_1", { text: "question two" })] });
  assert.notEqual(hashA, hashB);
});

test("both bundle fingerprints preserve assessment boundaries", () => {
  const snapshot = makeEmptySnapshot();
  const bundleA = assembleEvaluationInput({
    assessmentId: "run-a",
    snapshot,
    collaborationCase: null,
    evidence: [evidence("ev_1", { assessmentId: "run-a" })],
  });
  const bundleB = assembleEvaluationInput({
    assessmentId: "run-b",
    snapshot,
    collaborationCase: null,
    evidence: [evidence("ev_1", { assessmentId: "run-b" })],
  });
  assert.notEqual(bundleA.bundleTextHash, bundleB.bundleTextHash);
  assert.notEqual(bundleA.modelInputHash, bundleB.modelInputHash);
});

for (const questions of [undefined, []]) {
  test(`answers cannot reference absent questions: ${JSON.stringify(questions)}`, () => {
    assert.throws(() => assembleEvaluationInput({ assessmentId: "as_1", snapshot: makeEmptySnapshot(),
      collaborationCase: null, evidence: [evidence("ev_1")], questions, answers: [answer("a", "q")] }), BundleAssemblyError);
  });
}

test("blank answers and invalid question grounding are rejected at assembly", () => {
  const base = { assessmentId: "as_1", snapshot: makeEmptySnapshot(), collaborationCase: null, evidence: [evidence("ev_1")] };
  for (const text of ["", "   ", "\n\t"]) {
    assert.throws(() => assembleEvaluationInput({ ...base, questions: [question("q")], answers: [answer("a", "q", { text })] }), BundleAssemblyError);
  }
  for (const groundingEvidenceIds of [[], ["foreign"]]) {
    assert.throws(() => assembleEvaluationInput({ ...base, questions: [question("q", { groundingEvidenceIds })] }), BundleAssemblyError);
  }
  assert.doesNotThrow(() => assembleEvaluationInput(base));
  assert.doesNotThrow(() => assembleEvaluationInput({ ...base, questions: [question("q")] }));
});
