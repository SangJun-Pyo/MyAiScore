import type { CriterionCode, CriterionStatus } from '../../shared/contracts/evaluation.js';
import type { AssessmentResult } from './assessment.js';

export type ComparisonReason = 'different_repository' | 'invalid_result' | 'mode_mismatch' | 'synthetic_result'
  | 'version_mismatch' | 'provider_mismatch' | 'model_identity_unavailable' | 'source_mismatch'
  | 'coverage_mismatch' | 'score_withheld';
export interface AxisComparison {
  criterionCode: CriterionCode;
  previous: { status: CriterionStatus; level: number | null } | null;
  current: { status: CriterionStatus; level: number | null } | null;
}
export interface AssessmentComparison {
  comparisonAllowed: boolean;
  scoreDelta: number | null;
  behaviorChange: 'not_established';
  reasons: ComparisonReason[];
  axes: AxisComparison[];
  evidenceChanged: boolean;
  codeRevisionChanged: boolean;
  explanations: string[];
}
const AXES: CriterionCode[] = ['A', 'B', 'C', 'D', 'E'];
const EXPLANATIONS: Record<ComparisonReason, string> = {
  different_repository: 'Assessments from different repositories are not directly comparable.',
  invalid_result: 'Completed judgments for all five axes and a valid score status are required.',
  mode_mismatch: 'Live assessments and examples are not directly comparable.',
  synthetic_result: 'Synthetic examples cannot establish changes between real assessments.',
  version_mismatch: 'The criteria, prompt or execution settings versions differ, so no score difference is shown.',
  provider_mismatch: 'The assessment provider or model differs, so no score difference is shown.',
  model_identity_unavailable: 'The live model identifier was not recorded, so matching models cannot be confirmed.',
  source_mismatch: 'Source types or process evidence levels differ, so no score difference is shown.',
  coverage_mismatch: 'Collection coverage differs or is incomplete, so no score difference is shown.',
  score_withheld: 'At least one score is withheld, so no score difference is calculated.',
};

function versionFingerprint(result: AssessmentResult): string {
  const m = result.manifest, v = m.versions;
  return JSON.stringify([v.rubricVersion, v.pipelineVersion, v.questionPromptVersion, v.evaluatorPromptVersion,
    v.inferenceConfigVersion, m.questionPromptTextHash, m.judgePromptTextHash, m.rubricCriteriaVersion, m.rubricCriteriaHash]);
}
function sourceFingerprint(result: AssessmentResult): string {
  const kinds = [...new Set(result.evidence.map(e => `${e.sourceType}:${e.collectionMethod}`))].sort();
  return JSON.stringify([result.source, result.confidence.processEvidence, kinds]);
}
function coverageFingerprint(result: AssessmentResult): string {
  const scope = result.confidence.evidenceScope;
  // Equal file counts alone do not establish equal sampling. Check collected paths too.
  const paths = [...new Set(result.evidence.filter(e => e.sourceType === 'repo_static').map(e => e.path))].sort();
  return JSON.stringify([result.confidence.sourceVerification, scope.readFiles, scope.candidateFiles, scope.selectionLimited, paths]);
}
function evidenceFingerprint(result: AssessmentResult): string {
  return JSON.stringify(result.evidence.map(e => JSON.stringify([e.sourceType, e.collectionMethod, e.path, e.contentSha256, e.eventTime])).sort());
}
function modelIdentity(result: AssessmentResult): string | null {
  // Legacy results did not persist the configured model. Absence must not mean equal models.
  const model = (result.manifest as AssessmentResult['manifest'] & { evaluatorModelId?: unknown }).evaluatorModelId;
  return typeof model === 'string' && model.trim() ? model : null;
}
function validResult(result: AssessmentResult): boolean {
  if (result.criteria.length !== 5 || new Set(result.criteria.map(c => c.criterionCode)).size !== 5) return false;
  if (!result.criteria.every(c => AXES.includes(c.criterionCode) && (c.status === 'observed'
    ? Number.isInteger(c.level) && c.level! >= 1 && c.level! <= 4
    : ['not_observed', 'insufficient_evidence'].includes(c.status) && c.level === null))) return false;
  return result.score.status === 'issued'
    ? Number.isInteger(result.score.value) && result.score.value! >= 25 && result.score.value! <= 100 && result.criteria.every(c => c.status === 'observed')
    : result.score.status === 'withheld' && result.score.value === null;
}

/** Owner authorization is the caller's responsibility. Never infers a person's skill/behavior improvement. */
export function compareAssessments(previous: AssessmentResult, current: AssessmentResult): AssessmentComparison {
  const reasons: ComparisonReason[] = [];
  if (previous.repo.toLowerCase() !== current.repo.toLowerCase()) reasons.push('different_repository');
  if (!validResult(previous) || !validResult(current)) reasons.push('invalid_result');
  if (previous.mode !== current.mode || previous.manifest.mode !== current.manifest.mode) reasons.push('mode_mismatch');
  if ([previous, current].some(r => r.mode !== 'live' || r.source === 'synthetic')) reasons.push('synthetic_result');
  if (versionFingerprint(previous) !== versionFingerprint(current)) reasons.push('version_mismatch');
  const previousModel = modelIdentity(previous), currentModel = modelIdentity(current);
  if ([previous, current].some(r => r.mode === 'live') && (!previousModel || !currentModel)) reasons.push('model_identity_unavailable');
  if (previous.manifest.providerId !== current.manifest.providerId || (previousModel && currentModel && previousModel !== currentModel)) reasons.push('provider_mismatch');
  if (sourceFingerprint(previous) !== sourceFingerprint(current)) reasons.push('source_mismatch');
  if (coverageFingerprint(previous) !== coverageFingerprint(current) || [previous, current].some(r =>
    r.confidence.sourceVerification !== 'complete' || r.confidence.evidenceScope.selectionLimited || r.confidence.evidenceScope.candidateFiles === null)) reasons.push('coverage_mismatch');
  if (previous.score.status !== 'issued' || current.score.status !== 'issued') reasons.push('score_withheld');
  const evidenceChanged = evidenceFingerprint(previous) !== evidenceFingerprint(current);
  const comparisonAllowed = reasons.length === 0;
  return {
    comparisonAllowed,
    scoreDelta: comparisonAllowed ? current.score.value! - previous.score.value! : null,
    behaviorChange: 'not_established', reasons,
    axes: AXES.map(criterionCode => {
      const oldAxis = previous.criteria.find(c => c.criterionCode === criterionCode), newAxis = current.criteria.find(c => c.criterionCode === criterionCode);
      return { criterionCode, previous: oldAxis ? { status: oldAxis.status, level: oldAxis.level } : null, current: newAxis ? { status: newAxis.status, level: newAxis.level } : null };
    }),
    evidenceChanged, codeRevisionChanged: previous.commitSha !== current.commitSha,
    explanations: [
      ...reasons.map(r => EXPLANATIONS[r]),
      ...(evidenceChanged ? ['The submitted evidence has changed. Adding historical records is different from performing new actions.'] : []),
      'A numerical difference describes two assessment results. It does not prove behavior change or improved AI skills.',
      'A change from unobserved to observed, or added material alone, does not establish improved skills.',
    ],
  };
}
