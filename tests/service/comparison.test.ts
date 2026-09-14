import test from 'node:test';
import assert from 'node:assert/strict';
import { compareAssessments } from '../../src/server/service/comparison.js';
import { syntheticExample, type AssessmentResult } from '../../src/server/service/assessment.js';

function completed(): AssessmentResult & { manifest: AssessmentResult['manifest'] & { evaluatorModelId: string } } {
  const result = syntheticExample();
  return { ...result, repo: 'example/project', mode: 'live', source: 'github_with_user_submissions', commitSha: 'a'.repeat(40),
    confidence: { ...result.confidence, sourceVerification: 'complete', processEvidence: 'statements_only', evidenceScope: { readFiles: 1, candidateFiles: 1, selectionLimited: false } },
    manifest: { ...result.manifest, mode: 'live', providerId: 'anthropic-messages', evaluatorModelId: 'synthetic-model-for-tests' } };
}
test('same repo/config/coverage issued results allow numeric difference without claiming improvement', () => {
  const before = completed(), after = completed(); after.score.value = 75;
  const comparison = compareAssessments(before, after);
  assert.equal(comparison.comparisonAllowed, true); assert.equal(comparison.scoreDelta, 4);
  assert.equal(comparison.behaviorChange, 'not_established'); assert.equal(comparison.axes.length, 5);
});
test('every evaluation version, prompt content, provider and model mismatch limits direct scores', () => {
  const before = completed();
  for (const field of Object.keys(before.manifest.versions) as (keyof typeof before.manifest.versions)[]) {
    const after = completed(); after.manifest.versions[field] = 'changed';
    const result = compareAssessments(before, after); assert.equal(result.scoreDelta, null); assert.ok(result.reasons.includes('version_mismatch'));
  }
  const otherProvider = completed(); otherProvider.manifest.providerId = 'another';
  assert.ok(compareAssessments(before, otherProvider).reasons.includes('provider_mismatch'));
  const otherModel = completed(); otherModel.manifest.evaluatorModelId = 'another';
  assert.ok(compareAssessments(before, otherModel).reasons.includes('provider_mismatch'));
  const legacy = completed(); delete (legacy.manifest as { evaluatorModelId?: string }).evaluatorModelId;
  assert.ok(compareAssessments(before, legacy).reasons.includes('model_identity_unavailable'));
  const alteredPrompt = completed(); alteredPrompt.manifest.judgePromptTextHash = 'changed-without-version-bump';
  assert.ok(compareAssessments(before, alteredPrompt).reasons.includes('version_mismatch'));
});
test('withheld keeps null delta and represents missing axis level as null', () => {
  const after = completed(); after.score = { ...after.score, status: 'withheld', value: null, observedDimensions: 4, reasons: ['insufficient_dimensions'] };
  after.criteria[3] = { ...after.criteria[3]!, status: 'not_observed', level: null, dimensionScore: null };
  const result = compareAssessments(completed(), after);
  assert.equal(result.scoreDelta, null); assert.equal(result.axes[3]?.current?.level, null); assert.ok(result.reasons.includes('score_withheld'));
});
test('repo mismatch, source changes, coverage differences and synthetic results are not directly comparable', () => {
  const repo = completed(); repo.repo = 'example/another'; assert.ok(compareAssessments(completed(), repo).reasons.includes('different_repository'));
  const scope = completed(); scope.confidence.evidenceScope.readFiles = 2; assert.ok(compareAssessments(completed(), scope).reasons.includes('coverage_mismatch'));
  const source = completed(); source.evidence[0]!.collectionMethod = 'github_api'; assert.ok(compareAssessments(completed(), source).reasons.includes('source_mismatch'));
  assert.ok(compareAssessments(syntheticExample(), syntheticExample()).reasons.includes('synthetic_result'));
});
test('adding evidence may change scores but never establishes behavior improvement or exposes content', () => {
  const before = completed(), after = completed(); after.evidence.push({ ...after.evidence[0]!, evidenceId: 'additional', contentSha256: 'different', summary: 'PRIVATE_RAW_CONTENT' });
  const result = compareAssessments(before, after);
  assert.equal(result.comparisonAllowed, true); assert.equal(result.evidenceChanged, true); assert.equal(result.behaviorChange, 'not_established');
  assert.match(result.explanations.join(' '), /과거 기록/); assert.doesNotMatch(JSON.stringify(result), /PRIVATE_RAW_CONTENT/);
});
test('same file counts with different collected paths do not establish comparable coverage', () => {
  const before = completed(), after = completed();
  before.evidence[0] = { ...before.evidence[0]!, sourceType: 'repo_static', path: 'first.ts' };
  after.evidence[0] = { ...after.evidence[0]!, sourceType: 'repo_static', path: 'second.ts' };
  assert.ok(compareAssessments(before, after).reasons.includes('coverage_mismatch'));
});
