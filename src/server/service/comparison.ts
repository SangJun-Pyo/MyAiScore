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
  different_repository: '서로 다른 저장소의 평가는 직접 비교하지 않습니다.',
  invalid_result: '완료된 다섯 축 판정과 유효한 점수 상태가 필요합니다.',
  mode_mismatch: '실제 평가와 예시 평가는 직접 비교하지 않습니다.',
  synthetic_result: '합성 예시는 실제 평가의 전후 변화로 비교하지 않습니다.',
  version_mismatch: '평가 기준·프롬프트·실행 설정 버전이 달라 총점 차이를 표시하지 않습니다.',
  provider_mismatch: '평가 제공자 또는 모델이 달라 총점 차이를 표시하지 않습니다.',
  model_identity_unavailable: '실제 평가 모델 식별자가 기록되지 않아 같은 모델인지 확인할 수 없습니다.',
  source_mismatch: '자료 출처의 종류 또는 과정 근거 수준이 달라 총점 차이를 표시하지 않습니다.',
  coverage_mismatch: '수집 범위가 다르거나 불완전해 총점 차이를 표시하지 않습니다.',
  score_withheld: '한쪽 이상의 총점이 보류되어 총점 차이를 계산하지 않습니다.',
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
      ...(evidenceChanged ? ['제출된 근거 내용이 달라졌습니다. 과거 기록을 추가한 것과 새로운 행동을 수행한 것은 구분합니다.'] : []),
      '숫자 차이는 두 평가 결과의 차이입니다. 실제 행동 변화나 개인의 AI 활용 능력 향상을 증명하지 않습니다.',
      '미관찰에서 관찰로 바뀌거나 자료가 추가된 것만으로 실력 향상을 선언하지 않습니다.',
    ],
  };
}
