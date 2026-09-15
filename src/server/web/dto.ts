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
        rationale: c.status === 'observed' ? 'This is the axis diagnosis shared by the owner. Detailed evidence remains private.' : 'There is not enough evidence to assess this axis.',
        missingEvidence: '', blockingConflict: c.blockingConflict })),
      confidence: { evidenceScope: result.confidence.evidenceScope, sourceVerification: result.confidence.sourceVerification,
        processEvidence: result.confidence.processEvidence, remainingUncertainty: ['Shared summaries exclude cases, answers, excerpts and personalized explanations.', 'This is a single-project diagnosis, not a certification of AI skills.'] },
      manifest: { mode: result.manifest.mode, providerId: result.manifest.providerId, versions: result.manifest.versions },
      improvementTask: { title: 'Review your verification process', why: 'The personalized improvement task is visible only to the owner.',
        steps: ['Define completion criteria and record how you checked the AI output.'], doneWhen: ['Separate verified results from remaining uncertainty.'],
        copyText: 'Record how you checked the AI output and what remains uncertain.' },
    }, visibility: 'public' });
}
