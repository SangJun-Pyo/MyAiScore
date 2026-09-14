/**
 * Regression tests for Astra Phase 2 review R3 ("사용자 발췌 원문이 사라짐").
 * Uses case-08 subvariant-b's real fixture, which has an actual
 * after/excerpts/execution_log.txt with distinctive, uniquely-identifying
 * text, to prove that content now reaches the provider's request while
 * still never appearing in the pipeline's returned outcome (which is what
 * the CLI prints and any future public/log surface would draw from).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runOfflineEvaluationForFixture } from "../../src/server/evaluation/runOfflineEvaluationForFixture.js";
import { MockProvider } from "../../src/server/evaluation/mockProvider.js";
import { resolveWithinRoot } from "../../src/server/evaluation/fixtureRoot.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBVARIANT_B_AFTER = join(__dirname, "..", "..", "fixtures", "calibration", "cases", "case-08-before-after", "subvariant-b-real-improvement", "after");

// This exact string appears in fixtures/.../subvariant-b-real-improvement/after/excerpts/execution_log.txt.
const UNIQUE_LOG_MARKER = "validateOrderTotal.negative.repro.mjs";

const validQuestionsResponse = {
  raw: {
    questions: [
      { text: "Q1?", grounding_evidence_ids: ["ev_fixture_case08b_test"], target_criteria: ["D"] },
      { text: "Q2?", grounding_evidence_ids: ["ev_fixture_case08b_test"], target_criteria: ["E"] },
      { text: "Q3?", grounding_evidence_ids: ["ev_fixture_case08b_test"], target_criteria: ["A"] },
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

test("the excerpt's actual content reaches the judgement request's analysisContext", async () => {
  const provider = new MockProvider({ questionsResponse: validQuestionsResponse, judgementResponse: validJudgementResponse });
  await runOfflineEvaluationForFixture({ fixtureDir: SUBVARIANT_B_AFTER, caseDir: SUBVARIANT_B_AFTER, provider });

  const req = provider.lastJudgementRequest;
  assert.ok(req);
  const analysisTexts = Object.values(req!.untrusted.analysisContext);
  assert.ok(analysisTexts.some((t) => t.includes(UNIQUE_LOG_MARKER)), "the real excerpt text must reach the model input, not just its hash");
});

test("the excerpt's content never appears in the permanent Evidence record or the returned outcome (only in the transient request)", async () => {
  const provider = new MockProvider({ questionsResponse: validQuestionsResponse, judgementResponse: validJudgementResponse });
  const outcome = await runOfflineEvaluationForFixture({ fixtureDir: SUBVARIANT_B_AFTER, caseDir: SUBVARIANT_B_AFTER, provider });

  const outcomeJson = JSON.stringify(outcome);
  assert.ok(!outcomeJson.includes(UNIQUE_LOG_MARKER), "the outcome returned to the CLI/caller must never carry raw excerpt content");

  const excerptEvidence = provider.lastJudgementRequest!.untrusted.evidence.find((e) => e.sourceType === "user_provided_excerpt");
  assert.ok(excerptEvidence, "the excerpt must still be represented as Evidence metadata");
  assert.ok(!JSON.stringify(excerptEvidence).includes(UNIQUE_LOG_MARKER), "the permanent Evidence object itself must carry only metadata, never the raw text");
});

test("fixture root boundary: a path-traversal external_excerpts entry never escapes the case directory", () => {
  const escaped = resolveWithinRoot(SUBVARIANT_B_AFTER, "../../../../../../etc/passwd");
  assert.equal(escaped, null);
  const absolute = resolveWithinRoot(SUBVARIANT_B_AFTER, "C:\\Windows\\System32\\drivers\\etc\\hosts");
  // On non-Windows this path string is just a relative-looking segment; the
  // important invariant either way is that it resolves inside the root or is rejected.
  if (absolute !== null) {
    assert.ok(absolute.startsWith(SUBVARIANT_B_AFTER));
  }
  const withinRoot = resolveWithinRoot(SUBVARIANT_B_AFTER, "excerpts/execution_log.txt");
  assert.ok(withinRoot && withinRoot.startsWith(SUBVARIANT_B_AFTER));
});
