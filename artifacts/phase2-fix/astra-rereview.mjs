// Synthetic, offline review probes. Run from project root with node --import tsx.
import fs from 'node:fs';
import { runOfflineEvaluationForFixture } from '../../src/server/evaluation/runOfflineEvaluationForFixture.ts';
import { MockProvider } from '../../src/server/evaluation/mockProvider.ts';
import { assembleEvaluationInput } from '../../src/server/evaluation/inputAssembly.ts';
import { makeEmptySnapshot } from '../../tests/evaluation/testHelpers.ts';

const fixtureDir = 'fixtures/calibration/cases/case-02-simple-tool-strong-verification';
const canned = JSON.parse(fs.readFileSync('fixtures/mock-responses/case-02-generic-valid.json', 'utf8'));
let judgeCalls = 0;
const throwingProvider = {
  mode: 'mock', providerId: 'astra-throw-probe',
  async generateQuestions() { throw new Error('synthetic transport failure'); },
  async judgeCriteria() { judgeCalls++; return canned.judgement; },
};
let providerException;
try {
  const outcome = await runOfflineEvaluationForFixture({ fixtureDir, provider: throwingProvider, providerTimeoutMs: 40 });
  providerException = { returnedOutcome: true, stages: outcome.stages };
} catch (error) {
  providerException = { returnedOutcome: false, error: error.message, judgeCalls };
}
let orphanAnswerAccepted = false;
try {
  assembleEvaluationInput({
    assessmentId: 'as_1', snapshot: makeEmptySnapshot(), collaborationCase: null, evidence: [],
    answers: [{ answerId: 'a', assessmentId: 'as_1', questionId: 'missing', text: 'hello', linkedEvidenceIds: [], submittedAt: '2026-09-14T00:00:00Z' }],
  });
  orphanAnswerAccepted = true;
} catch { /* rejection is the desired post-fix behavior */ }

const run = async () => {
  const provider = new MockProvider({ questionsResponse: canned.questions, judgementResponse: canned.judgement });
  const outcome = await runOfflineEvaluationForFixture({ fixtureDir, provider, assessmentId: 'fixed' });
  return { provider, outcome };
};
const compare = (a, b) => ({
  sameReportedModelHash: a.outcome.manifest.modelInputHash === b.outcome.manifest.modelInputHash,
  sameActualJudgementRequest: JSON.stringify(a.provider.lastJudgementRequest) === JSON.stringify(b.provider.lastJudgementRequest),
});
const normalClock = compare(await run(), await run());
const OriginalDate = Date;
const fixed = OriginalDate.parse('2026-09-14T09:00:00Z');
let frozenClock;
try {
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  };
  frozenClock = compare(await run(), await run());
} finally {
  globalThis.Date = OriginalDate;
}
console.log(JSON.stringify({ providerException, orphanAnswerAccepted, normalClock, frozenClock }, null, 2));
