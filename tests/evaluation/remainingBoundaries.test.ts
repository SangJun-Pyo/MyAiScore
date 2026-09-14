import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";
import { MockProvider } from "../../src/server/evaluation/mockProvider.js";
import { runOfflineEvaluationForFixture } from "../../src/server/evaluation/runOfflineEvaluationForFixture.js";
import { invokeProviderSafely, withTimeout } from "../../src/server/evaluation/timeout.js";
import { hashProviderRequest, prepareProviderRequest, type JudgementRequest } from "../../src/server/evaluation/providerRequest.js";
import { RUBRIC_CRITERIA } from "../../src/server/evaluation/rubricCriteria.js";

const fixtureDir = resolve("fixtures/calibration/cases/case-02-simple-tool-strong-verification");
const questionsResponse = { raw: { questions: ["A", "B", "C"].map((axis) => ({
  text: `Question ${axis}`, grounding_evidence_ids: ["ev_fixture_case02_test"], target_criteria: [axis],
})) } };
const judgementResponse = { raw: { criteria: "ABCDE".split("").map((axis) => ({
  criterion_code: axis, status: "not_observed", level: null, supporting_evidence_ids: [],
  contrary_evidence_ids: [], rationale: "Unobserved", missing_evidence: "Need records", blocking_conflict: false,
})) } };

for (const stage of ["questions", "judgement"] as const) {
  for (const failure of ["sync", "async"] as const) {
    test(`${stage} ${failure} exception returns safe failed outcome and does not score`, async () => {
      const provider = new MockProvider({ questionsResponse, judgementResponse });
      const fail = () => {
        const error = new Error("SECRET_TOKEN private/session/path raw excerpt");
        if (failure === "sync") throw error;
        return Promise.reject(error);
      };
      if (stage === "questions") provider.generateQuestions = fail;
      else provider.judgeCriteria = fail;
      const outcome = await runOfflineEvaluationForFixture({ fixtureDir, provider, providerTimeoutMs: 100 });
      assert.equal(outcome.pipelineFailed, true);
      assert.equal(outcome.stages[stage].status, "failed");
      assert.match(outcome.stages[stage].detail!, /provider_error/);
      const failed = stage === "questions" ? outcome.questions : outcome.judgement;
      assert.ok(failed && !failed.ok);
      assert.equal(failed.failure.providerCode, "provider_failure");
      assert.equal(outcome.stages.scoring.status, "not_attempted");
      assert.equal(outcome.score, null);
      assert.doesNotMatch(JSON.stringify(outcome), /SECRET_TOKEN|private\/session|raw excerpt/);
      if (stage === "questions") {
        assert.equal(outcome.stages.judgement.status, "not_attempted");
        assert.equal(provider.lastJudgementRequest, null);
        assert.equal(outcome.manifest.stageRequestHashes?.judgement, null);
      }
    });
  }
}

test("sync throw clears timeout without waiting for it to fire", async (t) => {
  const originalClearTimeout = globalThis.clearTimeout;
  let cleared = 0;
  t.mock.method(globalThis, "clearTimeout", (...args: Parameters<typeof clearTimeout>) => {
    cleared++;
    return originalClearTimeout(...args);
  });
  await assert.rejects(withTimeout(() => { throw new Error("transport"); }, 60_000));
  assert.equal(cleared, 1);
});

for (const late of ["resolve", "reject"] as const) {
  test(`timeout ignores late ${late} and aborts the provider`, async () => {
    let finish!: () => void;
    let aborted = false;
    const result = await invokeProviderSafely((signal) => {
      signal.addEventListener("abort", () => { aborted = true; });
      return new Promise((resolvePromise, rejectPromise) => {
        finish = () => late === "resolve" ? resolvePromise(questionsResponse) : rejectPromise(new Error("LATE_SECRET"));
      });
    }, 5);
    assert.equal(result.providerError?.code, "timeout");
    assert.equal(aborted, true);
    finish();
    await new Promise((resolvePromise) => setImmediate(resolvePromise));
    assert.equal(result.providerError?.code, "timeout");
  });
}

test("provider-shaped error messages are not copied into public outcomes", async () => {
  const result = await invokeProviderSafely(async () => ({ providerError: {
    code: "rate_limited", message: "SECRET upstream request", retryable: true,
  } }), 100);
  assert.equal(result.providerError?.code, "rate_limited");
  assert.doesNotMatch(JSON.stringify(result), /SECRET|upstream/);
});

test("manifest stage hashes match exactly the payloads recorded by provider", async () => {
  const provider = new MockProvider({ questionsResponse, judgementResponse });
  const outcome = await runOfflineEvaluationForFixture({ fixtureDir, provider, fixedAnswers: [{ text: "My answer" }] });
  assert.equal(outcome.pipelineFailed, false);
  assert.equal(outcome.manifest.stageRequestHashes?.questions, hashProviderRequest(provider.lastQuestionRequest!));
  assert.equal(outcome.manifest.stageRequestHashes?.judgement, hashProviderRequest(provider.lastJudgementRequest!));
  const nextProvider = new MockProvider({ questionsResponse, judgementResponse });
  const next = await runOfflineEvaluationForFixture({ fixtureDir, provider: nextProvider });
  assert.notEqual(next.manifest.stageRequestHashes?.judgement, outcome.manifest.stageRequestHashes?.judgement);
});

test("fixed experiment reuses identical bytes despite changing operational UUID/time, never cached responses", async () => {
  const provider = new MockProvider({ questionsResponse, judgementResponse });
  await runOfflineEvaluationForFixture({ fixtureDir, provider, fixedAnswers: [{ text: "Answer" }] });
  const prepared = prepareProviderRequest(provider.lastJudgementRequest!);
  const observed: string[] = [];
  const send = async (request: JudgementRequest) => {
    observed.push(JSON.stringify(request));
    return judgementResponse;
  };
  for (let i = 0; i < 2; i++) {
    const operationalRun = { id: randomUUID(), executedAt: new Date(Date.now() + i * 1000).toISOString() };
    assert.ok(operationalRun.id);
    await invokeProviderSafely(() => send(prepared.payload), 100);
  }
  assert.equal(observed.length, 2);
  assert.equal(observed[0], observed[1]);
  assert.equal(observed[0], prepared.serialized);
  assert.equal(prepared.hash, createHash("sha256").update(observed[0]!).digest("hex"));
  assert.throws(() => { prepared.payload.untrusted.answers[0]!.text = "mutated"; }, TypeError);

  const changes: Array<(request: JudgementRequest) => void> = [
    (r) => { r.untrusted.questions[0]!.text += " changed"; },
    (r) => { r.untrusted.answers[0]!.text += " changed"; },
    (r) => { r.untrusted.analysisContext.extra = "New excerpt"; },
    (r) => { r.trustedInstructions.rubricCriteria = structuredClone(RUBRIC_CRITERIA).slice(1); },
    (r) => { r.inferenceConfigVersion = "different-model-settings"; },
    (r) => { r.untrusted.evidence[0]!.eventTime = "2026-09-14T12:00:00Z"; },
    (r) => { r.untrusted.questions[0]!.questionId = "changed-id"; },
  ];
  for (const change of changes) {
    const changed = JSON.parse(prepared.serialized) as JudgementRequest;
    change(changed);
    assert.notEqual(hashProviderRequest(changed), prepared.hash);
  }
});
