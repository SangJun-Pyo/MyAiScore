import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMyAiScore, ScoringContractError, IngestionNotScorableError } from "../../src/server/scoring/scoreCalculator.js";
import type { CriterionCode, CriterionResult } from "../../src/shared/contracts/evaluation.js";

function observed(code: CriterionCode, level: number, opts: Partial<CriterionResult> = {}): CriterionResult {
  return {
    criterionResultId: `cr_${code}`,
    assessmentId: "as_1",
    criterionCode: code,
    status: "observed",
    level,
    dimensionScore: level * 25,
    supportingEvidenceIds: [`ev_${code}`],
    contraryEvidenceIds: [],
    rationale: "rationale",
    missingEvidence: "",
    blockingConflict: false,
    ...opts,
  };
}

function notObserved(code: CriterionCode, opts: Partial<CriterionResult> = {}): CriterionResult {
  return {
    criterionResultId: `cr_${code}`,
    assessmentId: "as_1",
    criterionCode: code,
    status: "not_observed",
    level: null,
    dimensionScore: null,
    supportingEvidenceIds: [],
    contraryEvidenceIds: [],
    rationale: "no evidence",
    missingEvidence: "need X",
    blockingConflict: false,
    ...opts,
  };
}

function insufficient(code: CriterionCode, opts: Partial<CriterionResult> = {}): CriterionResult {
  return {
    criterionResultId: `cr_${code}`,
    assessmentId: "as_1",
    criterionCode: code,
    status: "insufficient_evidence",
    level: null,
    dimensionScore: null,
    supportingEvidenceIds: [`ev_${code}_support`],
    contraryEvidenceIds: [`ev_${code}_contrary`],
    rationale: "conflict",
    missingEvidence: "resolve conflict",
    blockingConflict: true,
    ...opts,
  };
}

/** Superset of every evidence id any helper above might cite -- used wherever a test isn't specifically about broken evidence references. */
function allValidIds(): Set<string> {
  const codes: CriterionCode[] = ["A", "B", "C", "D", "E"];
  const ids: string[] = [];
  for (const c of codes) ids.push(`ev_${c}`, `ev_${c}_support`, `ev_${c}_contrary`);
  return new Set(ids);
}

test("SCORING_RUBRIC.md §6 example: 3/4/3/2/3 -> 73, issued", () => {
  const results = [observed("A", 3), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  const score = computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() });
  assert.deepEqual(score, { status: "issued", value: 73, reasons: [], observedDimensions: 5, totalDimensions: 5 });
});

test("SCORING_RUBRIC.md §6 example: all 4s -> 100", () => {
  const results = (["A", "B", "C", "D", "E"] as CriterionCode[]).map((c) => observed(c, 4));
  const score = computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() });
  assert.equal(score.value, 100);
  assert.equal(score.status, "issued");
});

test("SCORING_RUBRIC.md §6 example: all 1s (fully observed, all lowest) -> 25, not withheld", () => {
  const results = (["A", "B", "C", "D", "E"] as CriterionCode[]).map((c) => observed(c, 1));
  const score = computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() });
  assert.deepEqual(score, { status: "issued", value: 25, reasons: [], observedDimensions: 5, totalDimensions: 5 });
});

test("one axis not_observed -> withheld insufficient_dimensions, even if the other four are perfect", () => {
  const results = [observed("A", 4), observed("B", 4), observed("C", 4), notObserved("D"), observed("E", 4)];
  const score = computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() });
  assert.equal(score.status, "withheld");
  assert.equal(score.value, null);
  assert.deepEqual(score.reasons, ["insufficient_dimensions"]);
  assert.equal(score.observedDimensions, 4);
});

test("blocking conflict on one axis -> withheld unresolved_conflict", () => {
  const results = [observed("A", 3), observed("B", 3), observed("C", 3), observed("D", 3), insufficient("E")];
  const score = computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() });
  assert.equal(score.status, "withheld");
  assert.ok(score.reasons.includes("unresolved_conflict"));
  assert.ok(score.reasons.includes("insufficient_dimensions"));
});

test("ingestion partial withholds the total even when all five axes are observed", () => {
  const results = (["A", "B", "C", "D", "E"] as CriterionCode[]).map((c) => observed(c, 3));
  const score = computeMyAiScore({ criterionResults: results, ingestionStatus: "partial", validEvidenceIds: allValidIds() });
  assert.deepEqual(score, { status: "withheld", value: null, reasons: ["ingestion_partial"], observedDimensions: 5, totalDimensions: 5 });
});

test("input order independence: shuffled criterion array produces the identical result", () => {
  const results = [observed("D", 2), observed("A", 3), observed("E", 3), observed("C", 3), observed("B", 4)];
  const score = computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() });
  assert.equal(score.value, 73);
});

test("duplicate criterion codes are a contract error, not a withheld result", () => {
  const results = [observed("A", 3), observed("A", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() }), ScoringContractError);
});

test("missing criterion code is a contract error", () => {
  const results = [observed("A", 3), observed("B", 4), observed("C", 3), observed("D", 2)];
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() }), ScoringContractError);
});

test("observed axis with null level is a contract error", () => {
  const results = [observed("A", 3, { level: null }), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() }), ScoringContractError);
});

test("observed axis with out-of-range level (5) is a contract error", () => {
  const results = [observed("A", 5), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() }), ScoringContractError);
});

test("not_observed axis with a non-null level is a contract error", () => {
  const results = [notObserved("A", { level: 2 }), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() }), ScoringContractError);
});

test("observed axis with blockingConflict=true is a contract error (must be insufficient_evidence)", () => {
  const results = [observed("A", 3, { blockingConflict: true }), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() }), ScoringContractError);
});

test("an invalid status enum value is a contract error even if it satisfies the TS type at compile time", () => {
  const results = [observed("A", 3, { status: "definitely-correct" as CriterionResult["status"] }), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: allValidIds() }), ScoringContractError);
});

test("an invalid ingestionStatus enum value is a contract error", () => {
  const results = (["A", "B", "C", "D", "E"] as CriterionCode[]).map((c) => observed(c, 3));
  assert.throws(
    () => computeMyAiScore({ criterionResults: results, ingestionStatus: "bogus-status" as never, validEvidenceIds: allValidIds() }),
    ScoringContractError,
  );
});

test("a broken evidence reference (outside the supplied valid set) is a contract error", () => {
  const results = [observed("A", 3), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  assert.throws(
    () => computeMyAiScore({ criterionResults: results, ingestionStatus: "complete", validEvidenceIds: new Set(["ev_A", "ev_B", "ev_C", "ev_D"]) }),
    ScoringContractError,
  );
});

test("a fully-covered valid evidence set does not throw", () => {
  const results = [observed("A", 3), observed("B", 4), observed("C", 3), observed("D", 2), observed("E", 3)];
  const score = computeMyAiScore({
    criterionResults: results,
    ingestionStatus: "complete",
    validEvidenceIds: new Set(["ev_A", "ev_B", "ev_C", "ev_D", "ev_E"]),
  });
  assert.equal(score.value, 73);
});

test("calling the scorer with ingestionStatus=failed is a caller error, not a withheld score", () => {
  const results = (["A", "B", "C", "D", "E"] as CriterionCode[]).map((c) => observed(c, 3));
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "failed", validEvidenceIds: allValidIds() }), IngestionNotScorableError);
});

test("calling the scorer with ingestionStatus=not_started is a caller error", () => {
  const results = (["A", "B", "C", "D", "E"] as CriterionCode[]).map((c) => observed(c, 3));
  assert.throws(() => computeMyAiScore({ criterionResults: results, ingestionStatus: "not_started", validEvidenceIds: allValidIds() }), IngestionNotScorableError);
});
