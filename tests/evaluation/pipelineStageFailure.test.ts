/**
 * Regression tests for Astra Phase 2 review R1 ("질문 실패 후 판정·점수 발급이
 * 계속됨"). Reproduces the exact failure shape from
 * artifacts/phase2-review/astra-probes.mjs (invalid/empty questions +
 * a formally valid "all axes level 4" judgement mock) against the FIXED
 * pipeline interface (stage tracking + pipelineFailed), not the old
 * interface the probe script used.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runOfflineEvaluationForFixture } from "../../src/server/evaluation/runOfflineEvaluationForFixture.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASE_02_DIR = join(__dirname, "..", "..", "fixtures", "calibration", "cases", "case-02-simple-tool-strong-verification");

const formallyValidFullMarksJudgement = {
  raw: {
    criteria: "ABCDE".split("").map((code) => ({
      criterion_code: code,
      status: "observed",
      level: 4,
      supporting_evidence_ids: ["ev_fixture_case02_test"],
      contrary_evidence_ids: [],
      rationale: "synthetic contract probe",
      missing_evidence: "",
      blocking_conflict: false,
    })),
  },
};

test("R1 regression: 0 questions (invalid) + a formally-valid 5x100 judgement mock must NOT produce judgement or a score", async () => {
  const outcome = await runOfflineEvaluationForFixture({
    fixtureDir: CASE_02_DIR,
    mockQuestionsResponse: { raw: { questions: [] } },
    mockJudgementResponse: formallyValidFullMarksJudgement,
  });

  assert.equal(outcome.stages.questions.status, "failed");
  assert.equal(outcome.stages.judgement.status, "not_attempted", "judgement must never run once questions failed");
  assert.equal(outcome.stages.scoring.status, "not_attempted");
  assert.equal(outcome.judgement, null, "no judgement result object should exist -- not even a rejected one");
  assert.equal(outcome.score, null, "score must be null, never issued=100 or any other fabricated value");
  assert.equal(outcome.pipelineFailed, true);
});

test("R1 regression: a judgement failure (after valid questions) must NOT produce a score, and must not run scoring", async () => {
  const outcome = await runOfflineEvaluationForFixture({
    fixtureDir: CASE_02_DIR,
    mockQuestionsResponse: {
      raw: {
        questions: [
          { text: "Q1?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["A"] },
          { text: "Q2?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["B"] },
          { text: "Q3?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["C"] },
        ],
      },
    },
    // malformed: only 2 of 5 axes present
    mockJudgementResponse: {
      raw: {
        criteria: [
          { criterion_code: "A", status: "observed", level: 4, supporting_evidence_ids: ["ev_fixture_case02_test"], contrary_evidence_ids: [], rationale: "x", missing_evidence: "", blocking_conflict: false },
          { criterion_code: "B", status: "observed", level: 4, supporting_evidence_ids: ["ev_fixture_case02_test"], contrary_evidence_ids: [], rationale: "x", missing_evidence: "", blocking_conflict: false },
        ],
      },
    },
  });

  assert.equal(outcome.stages.questions.status, "succeeded");
  assert.equal(outcome.stages.judgement.status, "failed");
  assert.equal(outcome.stages.scoring.status, "not_attempted");
  assert.equal(outcome.score, null);
  assert.equal(outcome.pipelineFailed, true);
});

test("a legitimate withheld score (all stages succeeded, but not all 5 axes observed) is NOT a pipeline failure", async () => {
  const outcome = await runOfflineEvaluationForFixture({
    fixtureDir: CASE_02_DIR,
    mockQuestionsResponse: {
      raw: {
        questions: [
          { text: "Q1?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["A"] },
          { text: "Q2?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["B"] },
          { text: "Q3?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["C"] },
        ],
      },
    },
    mockJudgementResponse: {
      raw: {
        criteria: [
          { criterion_code: "A", status: "not_observed", level: null, supporting_evidence_ids: [], contrary_evidence_ids: [], rationale: "x", missing_evidence: "m", blocking_conflict: false },
          { criterion_code: "B", status: "observed", level: 4, supporting_evidence_ids: ["ev_fixture_case02_test"], contrary_evidence_ids: [], rationale: "x", missing_evidence: "", blocking_conflict: false },
          { criterion_code: "C", status: "observed", level: 4, supporting_evidence_ids: ["ev_fixture_case02_test"], contrary_evidence_ids: [], rationale: "x", missing_evidence: "", blocking_conflict: false },
          { criterion_code: "D", status: "observed", level: 4, supporting_evidence_ids: ["ev_fixture_case02_test"], contrary_evidence_ids: [], rationale: "x", missing_evidence: "", blocking_conflict: false },
          { criterion_code: "E", status: "observed", level: 4, supporting_evidence_ids: ["ev_fixture_case02_test"], contrary_evidence_ids: [], rationale: "x", missing_evidence: "", blocking_conflict: false },
        ],
      },
    },
  });

  assert.deepEqual(
    Object.fromEntries(Object.entries(outcome.stages).map(([k, v]) => [k, v.status])),
    { ingestion: "succeeded", questions: "succeeded", judgement: "succeeded", scoring: "succeeded" },
  );
  assert.equal(outcome.pipelineFailed, false);
  assert.ok(outcome.score);
  assert.equal(outcome.score!.status, "withheld");
  assert.deepEqual(outcome.score!.reasons, ["insufficient_dimensions"]);
});
