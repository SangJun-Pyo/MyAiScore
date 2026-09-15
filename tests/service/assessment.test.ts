import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAssessment, generateAssessmentQuestions, finalizeAssessment, syntheticExample, ServiceError } from '../../src/server/service/assessment.js';
import type { IngestionSnapshot } from '../../src/shared/contracts/ingestion.js';
import type { EvaluationProvider } from '../../src/server/evaluation/provider.js';
import type { JudgementRequest } from '../../src/server/evaluation/providerRequest.js';
import { hash } from '../../src/server/service/safety.js';

function snapshot(): IngestionSnapshot {
  return { schemaVersion: 'ingestion-snapshot-v0.3.1', repo: 'example/project', commitSha: 'a'.repeat(40), collectorVersion: 'test', selectionDigest: 'test', ingestionStatus: 'complete', supportStatus: 'nextjs_typescript', collectedAt: '2026-09-14T00:00:00Z',
    files: [{ path: 'index.ts', blobSha: 'b'.repeat(40), byteSize: 15, contentSha256: 'test', lineCount: 1, redactedContent: 'export const x = 1;', secretPatternMasked: false }],
    staticSignals: { basis: 'selected_files', languageFileCounts: { ts: 1 }, dependencies: [], testPaths: [], ciPaths: [], aiConfigPaths: [] },
    evidenceCandidates: [{ assessmentId: null, sourceType: 'repo_static', collectionMethod: 'synthetic_fixture', summary: '정적 파일', contentSha256: 'test', collectedAt: '2026-09-14T00:00:00Z', repo: 'example/project', commitSha: 'a'.repeat(40), path: 'index.ts', locator: { startLine: 1, endLine: 1 }, eventTime: null, verificationNote: '실행되지 않음' }],
    coverage: { treeTruncated: false, candidateFiles: 1, selectedFiles: 1, readFiles: 1, selectionLimited: false }, skippedFiles: [], warnings: [], failure: null, metrics: { durationMs: 0, httpRequests: 0, fetchedBytes: 0, cacheHits: 0 } };
}
function provider(observed = false): EvaluationProvider & { last?: JudgementRequest } {
  return { mode: 'mock', providerId: 'test-provider',
    async generateQuestions(request) { return { raw: { questions: [0, 1, 2].map(i => ({ text: `질문 ${i}`, grounding_evidence_ids: [request.untrusted.evidence[0]!.evidenceId], target_criteria: ['D'] })) } }; },
    async judgeCriteria(request) { this.last = request; return { raw: { criteria: ['A', 'B', 'C', 'D', 'E'].map(criterion_code => ({ criterion_code, status: observed ? 'observed' : 'not_observed', level: observed ? 3 : null, supporting_evidence_ids: observed ? [request.untrusted.evidence[0]!.evidenceId] : [], contrary_evidence_ids: [], rationale: 'Synthetic rationale', missing_evidence: '실제 협업 과정 필요', blocking_conflict: false })) } }; } };
}
const prep = () => prepareAssessment({ assessmentId: 'test', repoUrl: 'https://github.com/example/project' }, { ingest: async () => snapshot() });

test('GitHub input reaches ingestion; excerpts are redacted and bounded before assessment', async () => {
  let seen: unknown;
  const p = await prepareAssessment({ assessmentId: 'test', repoUrl: 'https://github.com/example/project', commitRef: 'main', excerpts: ['secret=hidden-value user@example.com sk-ant-test-secret'] }, { ingest: async input => { seen = input; return snapshot(); } });
  assert.deepEqual(seen, { repoUrl: 'https://github.com/example/project', commitRef: 'main' });
  assert.equal(p.evidence.at(-1)?.collectionMethod, 'user_submission');
  assert.doesNotMatch(JSON.stringify(p), /hidden-value|user@example.com|sk-ant-test-secret/);
  await assert.rejects(prepareAssessment({ assessmentId: 'test', repoUrl: 'x', excerpts: ['a'.repeat(2001)] }), ServiceError);
  await assert.rejects(prepareAssessment({ assessmentId: 'test', repoUrl: 'x', excerpts: ['a','b','c','d'] }), ServiceError);
});
test('no evidence and failed ingestion never reach a provider', async () => {
  const empty = snapshot(); empty.evidenceCandidates = []; empty.files = [];
  await assert.rejects(prepareAssessment({ assessmentId: 'test', repoUrl: 'x' }, { ingest: async () => empty }), (e: unknown) => e instanceof ServiceError && e.code === 'no_evidence');
  await assert.rejects(prepareAssessment({ assessmentId: 'test', repoUrl: 'x' }, { ingest: async () => { throw new Error('sk-ant-secret'); } }), (e: unknown) => e instanceof ServiceError && !e.message.includes('sk-ant'));
});
test('question failure is explicit and judgement cannot run without validated questions', async () => {
  const p = await prep(); const model = provider(); model.generateQuestions = async () => { throw new Error('private input'); };
  await assert.rejects(generateAssessmentQuestions(p, model), (e: unknown) => e instanceof ServiceError && e.stage === 'questions' && !e.message.includes('private'));
  await assert.rejects(finalizeAssessment(p, [], model), (e: unknown) => e instanceof ServiceError && e.code === 'questions_required');
  assert.equal(model.last, undefined);
});
test('unobserved axes produce withheld and no raw context in final result', async () => {
  const model = provider(); const p = await generateAssessmentQuestions(await prep(), model);
  const result = await finalizeAssessment(p, [], model);
  assert.equal(result.score.status, 'withheld'); assert.equal(result.score.value, null);
  assert.equal(result.confidence.processEvidence, 'none');
  assert.equal(result.manifest.stageRequestHashes.judgement, hash(JSON.stringify(model.last)));
  assert.doesNotMatch(JSON.stringify(result), /export const x|analysisContext|collaborationCase/);
  assert.match(result.improvementTask.copyText, /Completion checklist/);
});
test('answer evidence is assessment scoped and self-report is not linked records', async () => {
  const model = provider(); const p = await generateAssessmentQuestions(await prep(), model);
  const result = await finalizeAssessment(p, [{ questionId: p.questions[0]!.questionId, text: '검증은 수동으로 확인했습니다.', linkedEvidenceIds: ['repo_0'] }], model);
  assert.equal(result.confidence.processEvidence, 'statements_only');
  assert.equal(result.source, 'github_with_user_submissions');
  assert.ok(model.last?.untrusted.evidence.some(e => e.sourceType === 'interview_answer' && e.assessmentId === 'test'));
  assert.doesNotMatch(JSON.stringify(result), /검증은 수동으로 확인했습니다/);
});
test('orphan/duplicate answers and foreign evidence are rejected before judgement', async () => {
  const model = provider(); const p = await generateAssessmentQuestions(await prep(), model);
  for (const submissions of [[{ questionId: 'foreign', text: 'x' }], [{ questionId: p.questions[0]!.questionId, text: 'x', linkedEvidenceIds: ['foreign'] }], [{ questionId: p.questions[0]!.questionId, text: 'x' }, { questionId: p.questions[0]!.questionId, text: 'y' }]]) await assert.rejects(finalizeAssessment(p, submissions, model), ServiceError);
  assert.equal(model.last, undefined);
});
test('partial collection cannot issue even all-observed synthetic judgement', async () => {
  const p = await prep(); p.snapshot.ingestionStatus = 'partial'; const model = provider(true);
  const result = await finalizeAssessment(await generateAssessmentQuestions(p, model), [], model);
  assert.equal(result.score.status, 'withheld'); assert.ok(result.score.reasons.includes('ingestion_partial'));
});
test('complete all-observed mock response uses deterministic scorer, explicitly not live', async () => {
  const model = provider(true); const result = await finalizeAssessment(await generateAssessmentQuestions(await prep(), model), [], model);
  assert.equal(result.score.value, 75); assert.equal(result.mode, 'mock'); assert.equal(result.manifest.executedAt, null);
  assert.equal(result.source, 'github_repository');
});
test('demo is deterministic, entirely synthetic, no API configuration required', () => {
  assert.deepEqual(syntheticExample(), syntheticExample());
  assert.equal(syntheticExample().source, 'synthetic'); assert.equal(syntheticExample().manifest.tokensUsed, null);
});
test('demo ties tailored diagnoses and computed score to explicit synthetic evidence', () => {
  const example = syntheticExample(), ids = new Set(example.evidence.map(e => e.evidenceId));
  assert.equal(example.evidence.length, 5);
  assert.ok(example.evidence.every(e => e.collectionMethod === 'synthetic_fixture'));
  assert.ok(example.criteria.every(c => c.supportingEvidenceIds.length > 0 && c.supportingEvidenceIds.every(id => ids.has(id))));
  assert.equal(new Set(example.criteria.map(c => c.rationale)).size, 5);
  assert.equal(example.confidence.evidenceScope.readFiles, example.evidence.filter(e => e.sourceType === 'repo_static').length);
  assert.ok(example.evidence.filter(e => e.sourceType === 'repo_static').every(e => e.path && e.locator));
  const weighted = example.criteria.reduce((sum, c, i) => sum + c.level! * 25 * [15,20,15,30,20][i]!, 0);
  assert.equal(example.score.value, Math.floor((weighted + 50) / 100));
  assert.equal(example.score.value, 71); assert.equal(example.improvementTask.criterionCode, 'C');
  assert.match(example.improvementTask.why, /regex/);
  assert.equal(example.manifest.executedAt, null); assert.equal(example.manifest.costUsd, null);
});
test('changed evaluator model between question and judgement stages fails before provider invocation', async () => {
  const model = provider(); const p = await generateAssessmentQuestions(await prep(), model);
  const changed = { ...model, mode: 'live' as const, evaluatorModelId: 'different-model' };
  await assert.rejects(finalizeAssessment({ ...p, evaluatorModelId: 'original-model' }, [], changed), (e: unknown) => e instanceof ServiceError && e.code === 'provider_changed');
  assert.equal(changed.last, undefined);
});


test('built-in demo and rubric are English while submitted source text stays intact', async () => {
  const { RUBRIC_CRITERIA } = await import('../../src/server/evaluation/rubricCriteria.js');
  assert.doesNotMatch(JSON.stringify(syntheticExample()), /[가-힣]/);
  assert.doesNotMatch(JSON.stringify(RUBRIC_CRITERIA), /[가-힣]/);
  assert.deepEqual(RUBRIC_CRITERIA.map(c => c.title), ['Problem framing', 'Context & delegation', 'Tool choice', 'Verification', 'Judgment & iteration']);
  assert.deepEqual(RUBRIC_CRITERIA.map(c => c.weight), [15, 20, 15, 30, 20]);
  const submitted = '서버 검증을 추가하고 경계값을 확인했습니다.';
  const p = await prepareAssessment({ assessmentId: 'test', repoUrl: 'https://github.com/example/project', excerpts: [submitted] }, { ingest: async () => snapshot() });
  assert.ok(Object.values(p.analysisContext).includes(submitted));
  assert.equal(p.evidence.find(e => e.evidenceId === 'repo_0')?.summary, '정적 파일');
  assert.doesNotMatch(p.evidence.at(-1)!.summary + p.evidence.at(-1)!.verificationNote, /[가-힣]/);
});
