/**
 * Regression tests for Astra Phase 2 review R2 ("실제 판정 입력과 기준이
 * provider에 연결되지 않음"). Uses MockProvider's request-recording feature
 * to prove the actual typed request -- trusted prompt/rubric + untrusted
 * evidence/case/Q&A -- reaches the provider, not just the manifest hash.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runOfflineEvaluationForFixture, DEFAULT_PROVIDER_TIMEOUT_MS } from "../../src/server/evaluation/runOfflineEvaluationForFixture.js";
import { MockProvider } from "../../src/server/evaluation/mockProvider.js";
import { QUESTION_PROMPT_TEXT, QUESTION_PROMPT_VERSION } from "../../src/server/evaluation/prompts/questionPromptV1.js";
import { JUDGE_PROMPT_TEXT, JUDGE_PROMPT_VERSION } from "../../src/server/evaluation/prompts/judgePromptV1.js";
import { RUBRIC_CRITERIA_VERSION } from "../../src/server/evaluation/rubricCriteria.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASE_02_DIR = join(__dirname, "..", "..", "fixtures", "calibration", "cases", "case-02-simple-tool-strong-verification");

const validQuestionsResponse = {
  raw: {
    questions: [
      { text: "Q1?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["A"] },
      { text: "Q2?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["B"] },
      { text: "Q3?", grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: ["C"] },
    ],
  },
};
const validJudgementResponse = {
  raw: {
    criteria: "ABCDE".split("").map((code) => ({
      criterion_code: code,
      status: "not_observed",
      level: null,
      supporting_evidence_ids: [],
      contrary_evidence_ids: [],
      rationale: "x",
      missing_evidence: "m",
      blocking_conflict: false,
    })),
  },
};

test("the question-generation request actually carries the real prompt text/version and real evidence, not just its hash", async () => {
  const provider = new MockProvider({ questionsResponse: validQuestionsResponse, judgementResponse: validJudgementResponse });
  await runOfflineEvaluationForFixture({ fixtureDir: CASE_02_DIR, provider });

  const req = provider.lastQuestionRequest;
  assert.ok(req, "generateQuestions must have been called with a request object");
  assert.equal(req!.trustedInstructions.promptText, QUESTION_PROMPT_TEXT);
  assert.equal(req!.trustedInstructions.promptVersion, QUESTION_PROMPT_VERSION);
  assert.equal(req!.trustedInstructions.rubricCriteriaVersion, RUBRIC_CRITERIA_VERSION);
  assert.ok(req!.untrusted.evidence.length > 0, "real evidence must be attached, not just referenced by hash");
  assert.ok(req!.untrusted.evidence.some((e) => e.evidenceId === "ev_fixture_case02_test"));
  assert.equal(req!.assessmentId.length > 0, true);
  assert.ok(req!.timeoutMs > 0);
});

test("the judgement request carries the real judge prompt, the versioned per-axis rubric criteria (all 5 axes, 4 levels each), and the actual generated questions", async () => {
  const provider = new MockProvider({ questionsResponse: validQuestionsResponse, judgementResponse: validJudgementResponse });
  await runOfflineEvaluationForFixture({ fixtureDir: CASE_02_DIR, provider, fixedAnswers: [{ text: "a1" }, { text: "a2" }, { text: "a3" }] });

  const req = provider.lastJudgementRequest;
  assert.ok(req, "judgeCriteria must have been called with a request object");
  assert.equal(req!.trustedInstructions.promptText, JUDGE_PROMPT_TEXT);
  assert.equal(req!.trustedInstructions.promptVersion, JUDGE_PROMPT_VERSION);
  assert.ok(req!.trustedInstructions.rubricCriteria, "judgement requests must carry the structured rubric, unlike question-generation requests");
  assert.equal(req!.trustedInstructions.rubricCriteria!.length, 5);
  for (const criterion of req!.trustedInstructions.rubricCriteria!) {
    assert.equal(criterion.levels.length, 4, `axis ${criterion.code} must carry all 4 level definitions`);
  }
  assert.equal(req!.untrusted.questions.length, 3, "the actual generated questions must be delivered, not regenerated or omitted");
  assert.equal(req!.untrusted.answers.length, 3);
});

test("expected.json is never consulted anywhere in the mock request-building path (MockProvider only returns what the test configured)", async () => {
  // If MockProvider secretly peeked at expected.json, judgement would come
  // back "correct" for case-02 even though we intentionally configured an
  // all-not_observed canned response above. Confirming it stays
  // all-not_observed is itself proof the response is not being replaced.
  const provider = new MockProvider({ questionsResponse: validQuestionsResponse, judgementResponse: validJudgementResponse });
  const outcome = await runOfflineEvaluationForFixture({ fixtureDir: CASE_02_DIR, provider });
  assert.equal(outcome.judgement?.ok, true);
  if (outcome.judgement?.ok) {
    assert.ok(outcome.judgement.criteria.every((c) => c.status === "not_observed"));
  }
});

// --- timeout: two genuinely different scenarios, kept distinct on purpose ---

test("a providerError shaped as a timeout is handled as an ordinary explicit failure (does not need the timeout wrapper to fire)", async () => {
  const provider = new MockProvider({
    questionsResponse: { providerError: { code: "timeout", message: "provider reported its own timeout", retryable: true } },
    judgementResponse: validJudgementResponse,
  });
  const outcome = await runOfflineEvaluationForFixture({ fixtureDir: CASE_02_DIR, provider });
  assert.equal(outcome.stages.questions.status, "failed");
  assert.match(outcome.stages.questions.detail ?? "", /provider_error/);
});

test("a provider call that never resolves on its own is actually cut off by the timeout wrapper within the configured bound", async () => {
  const provider = new MockProvider({
    questionsResponse: validQuestionsResponse,
    judgementResponse: validJudgementResponse,
    neverResolveQuestions: true,
  });
  const startedAt = Date.now();
  const outcome = await runOfflineEvaluationForFixture({ fixtureDir: CASE_02_DIR, provider, providerTimeoutMs: 40 });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(outcome.stages.questions.status, "failed");
  assert.match(outcome.stages.questions.detail ?? "", /exceeded 40ms/);
  assert.equal(outcome.stages.judgement.status, "not_attempted");
  // Generous upper bound (not tied to the 40ms timeout itself) -- this just
  // proves the pipeline did not hang for DEFAULT_PROVIDER_TIMEOUT_MS or forever.
  assert.ok(elapsedMs < DEFAULT_PROVIDER_TIMEOUT_MS, `expected the pipeline to finish well under the default ${DEFAULT_PROVIDER_TIMEOUT_MS}ms timeout, took ${elapsedMs}ms`);
});
