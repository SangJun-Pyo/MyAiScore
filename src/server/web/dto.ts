import type { AssessmentRecord } from './store.js';
import type { AssessmentResult } from '../service/assessment.js';

/** Called only on explicitly constructed view objects, never on the persisted record. */
export function snakeCase(value: unknown): any {
  if (Array.isArray(value)) return value.map(snakeCase);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), snakeCase(v)]));
  return value;
}
export function ownerView(record: AssessmentRecord) {
  return snakeCase({ assessmentId: record.id, repoUrl: record.repoUrl,
    commitSha: record.prepared?.snapshot.commitSha ?? record.result?.commitSha ?? null,
    status: record.status, ingestionStatus: record.prepared?.snapshot.ingestionStatus ?? record.result?.confidence.sourceVerification ?? 'not_started',
    inputRevision: record.revision, createdAt: record.createdAt, expiresAt: record.expiresAt, previousAssessmentId: record.previousAssessmentId ?? null,
    questions: record.prepared?.questions ?? [], evidence: record.prepared?.evidence ?? record.result?.evidence ?? [],
    result: record.result ? resultView(record.result) : null, failure: record.failure, visibility: record.visibility, shareId: record.shareId,
    needsRetry: !!record.attempt && record.attempt.deadline < Date.now(),
  });
}
/** Private history uses an explicit summary allowlist, never the detail/result DTO. */
export function assessmentSummaryView(record: AssessmentRecord) {
  const result = record.status === 'done' ? record.result : null;
  return {
    assessment_id: record.id,
    repo_url: record.repoUrl,
    commit_sha: record.prepared?.snapshot.commitSha ?? record.result?.commitSha ?? null,
    status: record.status,
    created_at: record.createdAt,
    expires_at: record.expiresAt,
    score: result ? { status: result.score.status, value: result.score.value } : null,
    criteria: result ? result.criteria.map(c => ({ criterion_code: c.criterionCode, status: c.status, level: c.level })) : [],
    visibility: record.visibility,
  };
}
export function resultView(result: AssessmentResult) {
  return { ...result, improvementTask: { ...result.improvementTask,
    steps: [result.improvementTask.action], doneWhen: result.improvementTask.doneChecklist } };
}
export function publicView(result: AssessmentResult, repoUrl: string) {
  // Free-text model output may repeat private input. Public sharing uses only a strict summary.
  return snakeCase({ repoUrl, commitSha: result.commitSha, status: 'done',
    evidence: [], result: {
      score: result.score,
      criteria: result.criteria.map(c => ({ criterionCode: c.criterionCode, status: c.status, level: c.level,
        dimensionScore: c.dimensionScore, supportingEvidenceIds: [], contraryEvidenceIds: [],
        rationale: c.status === 'observed' ? '소유자가 공유한 축별 진단입니다. 상세 근거는 비공개입니다.' : '이 축의 판단에 필요한 근거가 부족합니다.',
        missingEvidence: '', blockingConflict: c.blockingConflict })),
      confidence: { evidenceScope: result.confidence.evidenceScope, sourceVerification: result.confidence.sourceVerification,
        processEvidence: result.confidence.processEvidence, remainingUncertainty: ['공유 요약에는 사례·답변·발췌와 개인화된 상세 설명을 포함하지 않습니다.', 'AI 활용 역량 인증이 아닌 단일 프로젝트 진단입니다.'] },
      manifest: { mode: result.manifest.mode, providerId: result.manifest.providerId, versions: result.manifest.versions },
      improvementTask: { title: '나의 검증 과정을 돌아보기', why: '개인화된 개선 작업서는 소유자에게만 표시됩니다.',
        steps: ['완료 조건을 정하고 AI 결과를 확인한 과정을 기록해보세요.'], doneWhen: ['확인한 결과와 남은 불확실성을 구분합니다.'],
        copyText: 'AI 결과를 확인한 과정과 남은 불확실성을 구분해 기록해주세요.' },
    }, visibility: 'public' });
}
