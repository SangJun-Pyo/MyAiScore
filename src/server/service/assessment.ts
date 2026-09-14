import type { Answer, CollaborationCase, ConfidenceSummary, CriterionCode, CriterionResult, Evidence, EvaluationManifest, MyAiScore, Question, UserAction } from '../../shared/contracts/evaluation.js';
import type { IngestionInput, IngestionSnapshot } from '../../shared/contracts/ingestion.js';
import { ingestRepository } from '../ingestion/ingest.js';
import { boundedText, hash, inputText, safeText, ServiceError } from './safety.js';
import { assembleEvaluationInput } from '../evaluation/inputAssembly.js';
import type { EvaluationProvider, RawProviderOutput } from '../evaluation/provider.js';
import type { JudgementRequest, QuestionGenerationRequest } from '../evaluation/providerRequest.js';
import { prepareProviderRequest } from '../evaluation/providerRequest.js';
import { invokeProviderSafely } from '../evaluation/timeout.js';
import { validateAndBuildQuestions } from '../evaluation/questionGeneration.js';
import { validateAndBuildCriterionResults } from '../evaluation/criterionJudgement.js';
import { QUESTION_PROMPT_TEXT, QUESTION_PROMPT_VERSION } from '../evaluation/prompts/questionPromptV1.js';
import { JUDGE_PROMPT_TEXT, JUDGE_PROMPT_VERSION } from '../evaluation/prompts/judgePromptV1.js';
import { RUBRIC_CRITERIA, RUBRIC_CRITERIA_VERSION } from '../evaluation/rubricCriteria.js';
import { buildManifest } from '../evaluation/manifest.js';
import { computeMyAiScore } from '../scoring/scoreCalculator.js';
import { computeConfidenceSummary } from '../scoring/confidenceSummary.js';
import type { ProviderCallRecord } from './anthropicProvider.js';
export { ServiceError } from './safety.js';

export interface CaseSubmission {
  problem: string; constraints: string; done_criteria: string; ai_suggestion_summary: string;
  user_action: UserAction; user_action_detail: string; verification_summary: string;
}
export interface PrepareAssessmentInput { assessmentId: string; repoUrl: string; commitRef?: string; collaborationCase?: CaseSubmission; excerpts?: string[]; }
export interface AnswerSubmission { questionId: string; text: string; linkedEvidenceIds?: string[]; }
/** Server private state: never serialize this object to a browser or public result. */
export interface PreparedAssessment {
  assessmentId: string; snapshot: IngestionSnapshot; evidence: Evidence[]; analysisContext: Record<string, string>;
  collaborationCase: CollaborationCase | null; questions: Question[]; answers: Answer[];
  questionRequestHash: string | null; providerCalls: ProviderCallRecord[]; contextTruncated: boolean;
  questionProviderId: string | null; evaluatorModelId: string | null;
}
export interface ImprovementTask { criterionCode: CriterionCode; title: string; why: string; action: string; evidenceIds: string[]; doneChecklist: string[]; copyText: string; }
export interface ServiceManifest extends EvaluationManifest { evaluatorModelId: string | null; stageRequestHashes: { questions: string | null; judgement: string | null }; wireRequestHashes: string[]; }
export interface AssessmentResult {
  assessmentId: string; mode: 'mock' | 'live'; source: 'synthetic' | 'github_with_user_submissions';
  repo: string; commitSha: string | null; criteria: CriterionResult[]; score: MyAiScore; confidence: ConfidenceSummary;
  improvementTask: ImprovementTask; manifest: ServiceManifest; evidence: Evidence[];
}
export interface PrepareDependencies { ingest?: (input: IngestionInput) => Promise<IngestionSnapshot>; }

async function collect(input: IngestionInput): Promise<IngestionSnapshot> {
  return ingestRepository(input, { httpClient: { async request(url, init) {
    // Ingestion is URL-validated; enforce the transport destination too. No private-repo token.
    if (new URL(url).origin !== 'https://api.github.com') throw new Error('invalid_destination');
    const response = await fetch(url, { headers: init?.headers, redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    return { status: response.status, headers: Object.fromEntries(response.headers.entries()), bodyText: await boundedText(response, 2_000_000) };
  } } });
}
function submittedEvidence(p: PreparedAssessment, id: string, sourceType: Evidence['sourceType'], text: string): Evidence {
  return { evidenceId: id, assessmentId: p.assessmentId, sourceType, collectionMethod: 'user_submission',
    summary: sourceType === 'collaboration_case' ? '사용자가 제출한 협업 사례' : sourceType === 'interview_answer' ? '사용자가 제출한 질문 답변' : '사용자가 선택하여 제출한 협업 발췌',
    contentSha256: hash(text), collectedAt: new Date().toISOString(), repo: null, commitSha: null, path: null, locator: null, eventTime: null,
    verificationNote: '사용자 제공 자료. 진위와 프로젝트 변경의 인과관계는 독립 검증되지 않았습니다.' };
}
export async function prepareAssessment(input: PrepareAssessmentInput, deps: PrepareDependencies = {}): Promise<PreparedAssessment> {
  if (!input || typeof input.assessmentId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.assessmentId)) throw new ServiceError('input', 'invalid_input', '평가 식별자가 올바르지 않습니다.');
  const repoUrl = inputText(input.repoUrl, 'repoUrl', 300);
  const commitRef = input.commitRef === undefined ? undefined : inputText(input.commitRef, 'commitRef', 150);
  if (input.excerpts !== undefined && (!Array.isArray(input.excerpts) || input.excerpts.length > 3)) throw new ServiceError('input', 'invalid_input', '발췌는 최대 3개입니다.');
  const excerpts = (input.excerpts ?? []).map(x => inputText(x, 'excerpt')).filter(Boolean);
  let collaborationCase: CollaborationCase | null = null;
  if (input.collaborationCase !== undefined) {
    const c = input.collaborationCase;
    if (!c || !['accepted', 'rejected', 'modified'].includes(c.user_action)) throw new ServiceError('input', 'invalid_input', '협업 사례의 사용자 행동을 확인해 주세요.');
    collaborationCase = { caseId: `case_${input.assessmentId}`, assessmentId: input.assessmentId,
      problem: inputText(c.problem, 'problem'), constraints: inputText(c.constraints, 'constraints'), doneCriteria: inputText(c.done_criteria, 'done_criteria'),
      aiSuggestionSummary: inputText(c.ai_suggestion_summary, 'ai_suggestion_summary'), userAction: c.user_action,
      userActionDetail: inputText(c.user_action_detail, 'user_action_detail'), verificationSummary: inputText(c.verification_summary, 'verification_summary'),
      linkedEvidenceIds: [], submittedAt: new Date().toISOString() };
    if (![collaborationCase.problem, collaborationCase.aiSuggestionSummary, collaborationCase.userActionDetail, collaborationCase.verificationSummary].some(Boolean)) collaborationCase = null;
  }
  let snapshot: IngestionSnapshot;
  try { snapshot = await (deps.ingest ?? collect)({ repoUrl, commitRef }); }
  catch { throw new ServiceError('ingestion', 'ingestion_failed', '공개 GitHub 저장소를 수집하지 못했습니다.'); }
  if (!['complete', 'partial'].includes(snapshot.ingestionStatus)) throw new ServiceError('ingestion', 'ingestion_failed', '저장소 수집이 완료되지 않았습니다. 공개 URL과 수집 범위를 확인해 주세요.');
  const p: PreparedAssessment = { assessmentId: input.assessmentId, snapshot, evidence: [], analysisContext: {}, collaborationCase, questions: [], answers: [], questionRequestHash: null, providerCalls: [], contextTruncated: false, questionProviderId: null, evaluatorModelId: null };
  let remaining = 72_000;
  for (const [index, candidate] of snapshot.evidenceCandidates.slice(0, 40).entries()) {
    const id = `repo_${index}`;
    p.evidence.push({ ...candidate, evidenceId: id, assessmentId: p.assessmentId, summary: safeText(candidate.summary, 500), path: candidate.path, verificationNote: safeText(candidate.verificationNote, 500) });
    const file = snapshot.files.find(f => f.path === candidate.path);
    if (file) { const raw = file.redactedContent; const text = safeText(raw, Math.min(4000, remaining)); p.analysisContext[id] = text; remaining -= text.length; if (text.length < raw.length) p.contextTruncated = true; }
  }
  if (snapshot.evidenceCandidates.length > 40) p.contextTruncated = true;
  if (collaborationCase) { const id = `case_${p.assessmentId}`; const text = JSON.stringify(collaborationCase); p.evidence.push(submittedEvidence(p, id, 'collaboration_case', text)); p.analysisContext[id] = text; }
  for (const [index, text] of excerpts.entries()) { const id = `excerpt_${index}`; p.evidence.push(submittedEvidence(p, id, 'user_provided_excerpt', text)); p.analysisContext[id] = text; }
  if (!p.evidence.length) throw new ServiceError('ingestion', 'no_evidence', '질문을 만들 근거가 없습니다. 협업 사례 또는 지원되는 코드 자료를 추가해 주세요.');
  assembleEvaluationInput(p);
  return p;
}

const TIMEOUT = 45_000;
async function invoke(fn: (signal: AbortSignal) => Promise<RawProviderOutput>): Promise<RawProviderOutput> {
  return invokeProviderSafely(fn, TIMEOUT);
}
function calls(provider: EvaluationProvider): ProviderCallRecord[] {
  const records = (provider as EvaluationProvider & { calls?: ProviderCallRecord[] }).calls;
  return records ? records.map(r => ({ ...r })) : [];
}
function evaluatorModel(provider: EvaluationProvider): string | null {
  const model = (provider as EvaluationProvider & { evaluatorModelId?: string }).evaluatorModelId;
  return typeof model === 'string' && model.trim() ? model : null;
}
function frozenRequest<T extends QuestionGenerationRequest | JudgementRequest>(request: T): { request: T; hash: string } {
  const { serialized, payload, hash: requestHash } = prepareProviderRequest(request);
  if (Buffer.byteLength(serialized) > 165_000) throw new ServiceError('input', 'input_limit', '평가 자료가 모델 입력 한도를 초과했습니다.');
  return { request: payload, hash: requestHash };
}
export async function generateAssessmentQuestions(prepared: PreparedAssessment, provider: EvaluationProvider): Promise<PreparedAssessment> {
  if (prepared.questions.length) throw new ServiceError('questions', 'already_generated', '질문은 이미 생성됐습니다.');
  const bundle = assembleEvaluationInput(prepared);
  const q: QuestionGenerationRequest = { assessmentId: prepared.assessmentId,
    trustedInstructions: { promptVersion: QUESTION_PROMPT_VERSION, promptText: QUESTION_PROMPT_TEXT, rubricCriteriaVersion: RUBRIC_CRITERIA_VERSION },
    untrusted: { evidence: prepared.evidence, collaborationCase: prepared.collaborationCase, analysisContext: prepared.analysisContext }, inferenceConfigVersion: 'service-v1', timeoutMs: TIMEOUT };
  const request = frozenRequest(q); const before = calls(provider).length;
  const raw = await invoke(signal => provider.generateQuestions(request.request, signal));
  if (raw.providerError) throw new ServiceError('questions', raw.providerError.code, '평가 제공자 요청이 완료되지 않았습니다.', raw.providerError.retryable);
  const validated = validateAndBuildQuestions(raw, bundle);
  if (!validated.ok) throw new ServiceError('questions', validated.failure.code, '유효한 질문을 생성하지 못했습니다. 평가를 다시 시도해 주세요.');
  return { ...prepared, questions: validated.questions.map(q => ({ ...q, text: safeText(q.text, 1500) })), questionRequestHash: request.hash, providerCalls: [...prepared.providerCalls, ...calls(provider).slice(before)], questionProviderId: provider.providerId, evaluatorModelId: evaluatorModel(provider) };
}

export async function finalizeAssessment(prepared: PreparedAssessment, submissions: AnswerSubmission[], provider: EvaluationProvider): Promise<AssessmentResult> {
  if (prepared.questions.length !== 3 || !prepared.questionRequestHash) throw new ServiceError('judgement', 'questions_required', '질문 생성이 먼저 완료되어야 합니다.');
  if (prepared.questionProviderId !== provider.providerId || (provider.mode === 'live' && (!prepared.evaluatorModelId || prepared.evaluatorModelId !== evaluatorModel(provider)))) throw new ServiceError('judgement', 'provider_changed', '질문 생성 이후 평가 제공자 또는 모델이 바뀌었습니다. 같은 설정으로 다시 시작해 주세요.');
  if (!Array.isArray(submissions) || submissions.length > 3) throw new ServiceError('input', 'invalid_answers', '답변은 질문당 하나씩 최대 3개입니다.');
  const p: PreparedAssessment = { ...prepared, evidence: [...prepared.evidence], analysisContext: { ...prepared.analysisContext }, answers: [] };
  const seen = new Set<string>(), validEvidence = new Set(p.evidence.map(e => e.evidenceId));
  for (const [index, s] of submissions.entries()) {
    if (!s || typeof s.questionId !== 'string' || !p.questions.some(q => q.questionId === s.questionId) || seen.has(s.questionId)) throw new ServiceError('input', 'invalid_answers', '답변의 질문 참조가 잘못되었거나 중복입니다.');
    seen.add(s.questionId); const text = inputText(s.text, 'answer');
    const linked = s.linkedEvidenceIds ?? [];
    if (!Array.isArray(linked) || linked.length > 40 || !linked.every(id => typeof id === 'string' && validEvidence.has(id))) throw new ServiceError('input', 'invalid_answers', '답변의 근거 참조가 올바르지 않습니다.');
    if (!text) continue;
    const answer: Answer = { answerId: `ans_${index}`, assessmentId: p.assessmentId, questionId: s.questionId, text, linkedEvidenceIds: linked, submittedAt: new Date().toISOString() };
    p.answers.push(answer); const evidenceId = `answer_${index}`; p.evidence.push(submittedEvidence(p, evidenceId, 'interview_answer', text)); p.analysisContext[evidenceId] = text;
  }
  const bundle = assembleEvaluationInput(p);
  const j: JudgementRequest = { assessmentId: p.assessmentId,
    trustedInstructions: { promptVersion: JUDGE_PROMPT_VERSION, promptText: JUDGE_PROMPT_TEXT, rubricCriteriaVersion: RUBRIC_CRITERIA_VERSION, rubricCriteria: RUBRIC_CRITERIA },
    untrusted: { evidence: p.evidence, collaborationCase: p.collaborationCase, analysisContext: p.analysisContext, questions: p.questions, answers: p.answers }, inferenceConfigVersion: 'service-v1', timeoutMs: TIMEOUT };
  const request = frozenRequest(j); const before = calls(provider).length;
  const raw = await invoke(signal => provider.judgeCriteria(request.request, signal));
  if (raw.providerError) throw new ServiceError('judgement', raw.providerError.code, '평가 제공자 요청이 완료되지 않았습니다.', raw.providerError.retryable);
  const judgement = validateAndBuildCriterionResults(raw, bundle);
  if (!judgement.ok) throw new ServiceError('judgement', judgement.failure.code, '평가 응답의 근거 또는 형식이 유효하지 않아 점수를 발급하지 않았습니다.');
  const criteria = judgement.criteria.map(c => ({ ...c, rationale: safeText(c.rationale, 2000), missingEvidence: safeText(c.missingEvidence, 1000) }));
  const score = computeMyAiScore({ criterionResults: criteria, ingestionStatus: p.snapshot.ingestionStatus, validEvidenceIds: new Set(p.evidence.map(e => e.evidenceId)) });
  // Submitted case/excerpts/answers are not independently verified process records.
  const confidence = computeConfidenceSummary({ coverage: p.snapshot.coverage, ingestionStatus: p.snapshot.ingestionStatus,
    processEvidence: p.evidence.some(e => e.collectionMethod === 'user_submission') ? 'statements_only' : 'none',
    remainingUncertainty: ['실험적 평가 기준입니다. 개인의 일반 역량을 인증하지 않습니다.', '코드의 존재는 실행 성공이나 본인의 협업 행동을 증명하지 않습니다.', '사용자 제공 자료의 진위와 코드 변경의 인과관계는 독립 검증되지 않았습니다.', ...(p.contextTruncated ? ['모델에 전달한 파일 내용은 길이 제한으로 일부 생략되었습니다.'] : []), ...(provider.mode === 'mock' ? ['합성 응답을 사용한 예시이며 실제 모델 평가가 아닙니다.'] : [])] });
  const stageRequestHashes = { questions: p.questionRequestHash, judgement: request.hash };
  const allCalls = [...p.providerCalls, ...calls(provider).slice(before)];
  const base = buildManifest({ mode: provider.mode, providerId: provider.providerId,
    versions: { rubricVersion: 'scoring-rubric-v0.3.1', pipelineVersion: 'service-v1', questionPromptVersion: QUESTION_PROMPT_VERSION, evaluatorPromptVersion: JUDGE_PROMPT_VERSION, inferenceConfigVersion: 'service-v1' },
    bundleTextHash: bundle.bundleTextHash, modelInputHash: hash(JSON.stringify(stageRequestHashes)), warnings: confidence.remainingUncertainty });
  const manifest: ServiceManifest = { ...base, evaluatorModelId: evaluatorModel(provider), stageRequestHashes, wireRequestHashes: allCalls.map(c => c.wireRequestHash),
    tokensUsed: allCalls.length === 2 && allCalls.every(c => c.tokensUsed !== null) ? allCalls.reduce((sum, c) => sum + c.tokensUsed!, 0) : null,
    executedAt: provider.mode === 'live' ? allCalls.at(-1)?.executedAt ?? null : null,
    costUsd: null, costNote: '모델 가격과 청구액을 검증하지 않아 비용은 표시하지 않습니다.' };
  return { assessmentId: p.assessmentId, mode: provider.mode, source: 'github_with_user_submissions', repo: p.snapshot.repo, commitSha: p.snapshot.commitSha, criteria, score, confidence, improvementTask: buildImprovementTask(criteria), manifest, evidence: p.evidence };
}

const ACTIONS: Record<CriterionCode, { title: string; action: string; checks: string[] }> = {
  A: { title: '다음 작업의 완료 조건을 먼저 적어보세요', action: '작업 하나를 골라 해결할 문제, 제약, 성공·실패를 구분할 예시를 적고 AI에게 전달하세요.', checks: ['해결할 문제를 한 문장으로 기록', '확인 가능한 완료 조건과 실패 예시 작성', 'AI 제안이 완료 조건을 충족하는지 확인'] },
  B: { title: 'AI가 필요한 맥락을 직접 확인하게 하세요', action: '관련 파일과 제약을 지정하고 맡길 범위를 적으세요. AI가 이해한 작업 범위를 확인한 후 구현을 진행하세요.', checks: ['관련 파일과 제약을 지정', '맡길 작업과 직접 판단할 부분을 구분', '맥락 부족으로 수정한 내용을 기록'] },
  C: { title: '도구 선택의 이유와 대안을 기록하세요', action: '이번 문제에 사용한 도구 하나를 골라 다른 접근과 비교하고 선택 이유를 실제 결과와 연결하세요.', checks: ['문제와 도구의 역할을 연결', '대안 한 가지와 선택 이유 작성', '선택한 방법의 한계를 확인'] },
  D: { title: '실패 사례 하나를 재현하고 수정 결과를 남기세요', action: '프로젝트에서 중요한 동작 하나를 골라 실패 입력을 만들고, 수정 전 결과와 수정 후 재검증 결과를 기록하세요.', checks: ['기대 결과와 재현 입력 기록', '실제 실행 결과 확인', '수정 내용과 재실행 결과 연결'] },
  E: { title: 'AI 제안을 수정한 판단을 근거와 연결하세요', action: 'AI 제안 중 하나를 골라 채택·거절·수정 이유와 결과를 관련 코드 또는 실행 기록에 연결하세요.', checks: ['원래 제안과 본인의 판단을 구분', '판단 이유를 근거와 연결', '수정 후 결과와 남은 한계를 기록'] },
};
export function buildImprovementTask(criteria: CriterionResult[]): ImprovementTask {
  const priority: CriterionCode[] = ['D', 'A', 'B', 'E', 'C'];
  const selected = [...criteria].sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || priority.indexOf(a.criterionCode) - priority.indexOf(b.criterionCode))[0];
  const code = selected?.criterionCode ?? 'D', template = ACTIONS[code];
  const why = selected?.status === 'observed' ? `이번 평가에서 ${code}축의 다음 개선 행동입니다. ${selected.rationale}` : `현재 ${code}축을 판단할 근거가 부족합니다. ${selected?.missingEvidence ?? ''}`;
  const copyText = `${template.title}\n\n${safeText(why)}\n\n${template.action}\n\n완료 체크\n${template.checks.map(c => `- [ ] ${c}`).join('\n')}\n\n기록을 추가한 것과 실제 행동이 개선된 것은 구분합니다.`;
  return { criterionCode: code, title: template.title, why: safeText(why), action: template.action, evidenceIds: selected?.supportingEvidenceIds ?? [], doneChecklist: template.checks, copyText };
}

/** Static walkthrough: all data and scores are synthetic, no repository/API access. */
export function syntheticExample(): AssessmentResult {
  const assessmentId = 'synthetic-example';
  const samples: { id: string; type: Evidence['sourceType']; summary: string; path?: string; start?: number; end?: number }[] = [
    { id: 'example-goal', type: 'repo_static', path: 'docs/reservation-goal.md', start: 3, end: 12,
      summary: '합성 문서: 예약 인원은 1~8명, 빈 입력과 범위 밖 입력은 저장 전에 거부한다는 완료 조건을 정의했습니다.' },
    { id: 'example-context', type: 'user_provided_excerpt',
      summary: '합성 대화: 예약 폼과 서버 검증 파일을 지정해 AI에게 수정을 맡겼습니다. 정규식 검증 제안은 채택했지만 다른 접근과 비교한 기록은 없습니다.' },
    { id: 'example-code', type: 'repo_static', path: 'src/reservations/validate.ts', start: 8, end: 24,
      summary: '합성 코드: 서버 경계에서 예약 인원의 정수 여부와 1~8 범위를 확인합니다. 코드의 존재만으로 실행 성공을 증명하지는 않습니다.' },
    { id: 'example-verification', type: 'user_provided_excerpt',
      summary: '합성 검증 기록: 0명 입력이 허용되는 실패 사례를 먼저 기록하고, 수정 후 0명·9명 거부와 1명·8명 허용 결과를 연결했습니다. 실제 테스트를 실행한 기록은 아닙니다.' },
    { id: 'example-decision', type: 'user_provided_excerpt',
      summary: '합성 판단 기록: 브라우저 검사만 추가하자는 AI 제안을 수정해 서버 검증도 요청했습니다. API 직접 요청으로 우회할 수 있다는 이유와 수정된 함수를 연결했습니다.' },
  ];
  const evidence: Evidence[] = samples.map(s => ({ evidenceId: s.id, assessmentId, sourceType: s.type, collectionMethod: 'synthetic_fixture',
    summary: s.summary, contentSha256: hash(s.summary), collectedAt: '2026-09-14T00:00:00.000Z', repo: null, commitSha: null,
    path: s.path ?? null, locator: s.path ? { startLine: s.start!, endLine: s.end! } : null, eventTime: null,
    verificationNote: '가상의 예약 폼 사례입니다. 파일 경로·대화·실행 결과는 모두 설명용 합성 자료이며 실제 저장소에서 수집하지 않았습니다.' }));
  const dimensions: { code: CriterionCode; level: number; refs: string[]; rationale: string; missing: string }[] = [
    { code: 'A', level: 3, refs: ['example-goal'], rationale: '합성 사례에서는 예약 인원의 허용 범위와 거부 조건을 구현 전에 정했습니다. 무엇을 확인하면 완료인지 구체적입니다.', missing: '중복 예약이나 동시 요청처럼 이번 범위 밖의 조건을 어떻게 정했는지는 나타나지 않습니다.' },
    { code: 'B', level: 3, refs: ['example-context', 'example-code'], rationale: '합성 대화에서 관련 폼·서버 파일과 수정 범위를 지정해 위임했습니다. 구현 결과도 지정한 검증 경계와 연결됩니다.', missing: 'AI가 맥락을 잘못 이해했을 때 확인하고 교정한 과정은 더 필요합니다.' },
    { code: 'C', level: 2, refs: ['example-context', 'example-code'], rationale: '정규식 검증을 사용한 목적은 확인되지만 스키마 검증 같은 대안과 유지보수 비용을 비교한 근거가 없습니다.', missing: '정규식과 스키마 검증 중 이 예약 폼에 더 적합한 방법을 선택한 이유와 한계가 필요합니다.' },
    { code: 'D', level: 3, refs: ['example-verification', 'example-code'], rationale: '합성 검증 기록은 수정 전 0명 입력 실패와 수정 후 경계값 결과를 연결합니다. 명령의 존재만으로 성공을 추정한 판정은 아닙니다.', missing: '예상하지 못한 입력 형식과 회귀 위험까지 확인한 기록은 없습니다. 여기에 표시된 실행 결과 자체는 합성 예시입니다.' },
    { code: 'E', level: 3, refs: ['example-decision', 'example-code'], rationale: '브라우저 검사만으로는 우회가 가능하다는 이유로 AI 제안을 수정하고 서버 검증을 추가한 판단이 합성 자료에 연결돼 있습니다.', missing: '수정 이후 다른 기능에 미친 영향과 남은 제약을 검토한 자료는 더 필요합니다.' },
  ];
  const criteria: CriterionResult[] = dimensions.map(d => ({ criterionResultId: `example-${d.code}`, assessmentId, criterionCode: d.code, status: 'observed', level: d.level, dimensionScore: d.level * 25, supportingEvidenceIds: d.refs, contraryEvidenceIds: [], rationale: d.rationale, missingEvidence: d.missing, blockingConflict: false }));
  const confidence: ConfidenceSummary = { evidenceScope: { readFiles: 2, candidateFiles: 2, selectionLimited: false }, sourceVerification: 'complete', processEvidence: 'statements_only', remainingUncertainty: ['합성 예시입니다. 파일 2개와 협업 발췌 3개를 가정한 화면이며 GitHub 수집·테스트 실행·실제 LLM 호출은 수행하지 않았습니다.', '수집 완료와 근거 수는 이 합성 사례 내부의 범위를 표시합니다. 실제 출처 검증이나 개인의 능력 인증을 뜻하지 않습니다.'] };
  const base = buildManifest({ mode: 'mock', providerId: 'synthetic-example', versions: { rubricVersion: 'scoring-rubric-v0.3.1', pipelineVersion: 'synthetic-example-v2', questionPromptVersion: QUESTION_PROMPT_VERSION, evaluatorPromptVersion: JUDGE_PROMPT_VERSION, inferenceConfigVersion: 'not-applicable' }, bundleTextHash: '', modelInputHash: '', warnings: confidence.remainingUncertainty });
  return { assessmentId, mode: 'mock', source: 'synthetic', repo: '합성 예시 · 예약 폼', commitSha: null, criteria,
    score: computeMyAiScore({ criterionResults: criteria, ingestionStatus: 'complete', validEvidenceIds: new Set(evidence.map(e => e.evidenceId)) }), confidence, improvementTask: buildImprovementTask(criteria), manifest: { ...base, evaluatorModelId: null, stageRequestHashes: { questions: null, judgement: null }, wireRequestHashes: [] }, evidence };
}
