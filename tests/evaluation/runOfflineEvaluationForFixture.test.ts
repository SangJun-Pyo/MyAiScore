import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runOfflineEvaluationForFixture } from "../../src/server/evaluation/runOfflineEvaluationForFixture.js";
import type { RawProviderOutput } from "../../src/server/evaluation/provider.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_ROOT = join(__dirname, "..", "..", "fixtures", "calibration", "cases");
const MOCK_RESPONSES_ROOT = join(__dirname, "..", "..", "fixtures", "mock-responses");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

test("end-to-end offline run against case-02 produces a mock manifest, valid questions/judgement, and a withheld score (mock judgement only observes D)", async () => {
  const genericMock = loadJson<{ questions: RawProviderOutput; judgement: RawProviderOutput }>(join(MOCK_RESPONSES_ROOT, "case-02-generic-valid.json"));
  const fixedAnswers = loadJson<{ text: string; linkedEvidenceIds?: string[] }[]>(join(MOCK_RESPONSES_ROOT, "case-02-fixed-answers.json"));

  const outcome = await runOfflineEvaluationForFixture({
    fixtureDir: join(CASES_ROOT, "case-02-simple-tool-strong-verification"),
    mockQuestionsResponse: genericMock.questions,
    mockJudgementResponse: genericMock.judgement,
    fixedAnswers,
  });

  assert.equal(outcome.manifest.mode, "mock");
  assert.equal(outcome.manifest.executedAt, null);
  assert.equal(outcome.manifest.tokensUsed, null);
  assert.equal(outcome.pipelineFailed, false, "a normal withheld result is not a pipeline failure");
  assert.deepEqual(
    Object.fromEntries(Object.entries(outcome.stages).map(([k, v]) => [k, v.status])),
    { ingestion: "succeeded", questions: "succeeded", judgement: "succeeded", scoring: "succeeded" },
  );
  assert.equal(outcome.unresolvedEvidence.length, 0);
  assert.ok(outcome.questions);
  assert.equal(outcome.questions!.ok, true);
  assert.equal(outcome.answers.length, 3);
  assert.ok(outcome.judgement);
  assert.equal(outcome.judgement!.ok, true);
  assert.ok(outcome.score);
  assert.equal(outcome.score!.status, "withheld");
  assert.deepEqual(outcome.score!.reasons, ["insufficient_dimensions"]);
  assert.equal(outcome.score!.observedDimensions, 1);
  assert.equal(outcome.confidence?.sourceVerification, "complete");
});

test("case-08 subvariant-a: the unresolved 'late log' evidence flows through to the outcome's unresolvedEvidence and manifest warnings, never silently dropped", async () => {
  const genericMock = loadJson<{ questions: RawProviderOutput; judgement: RawProviderOutput }>(join(MOCK_RESPONSES_ROOT, "case-02-generic-valid.json"));
  const subDir = join(CASES_ROOT, "case-08-before-after", "subvariant-a-late-log");

  const outcome = await runOfflineEvaluationForFixture({
    fixtureDir: join(subDir, "after"),
    caseDir: join(subDir, "after"),
    // this fixture's own grounding IDs don't exist in this repo, so use an empty/failing question response instead
    mockQuestionsResponse: { raw: { questions: [] } },
    mockJudgementResponse: genericMock.judgement,
  });

  assert.equal(outcome.unresolvedEvidence.length, 1);
  assert.equal(outcome.unresolvedEvidence[0]!.evidenceId, "ev_fixture_case08a_old_log");
  assert.ok(outcome.manifest.warnings.some((w) => w.includes("ev_fixture_case08a_old_log")));
});
