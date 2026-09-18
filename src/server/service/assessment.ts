import type { Answer, CollaborationCase, ConfidenceSummary, CriterionCode, CriterionResult, Evidence, EvaluationManifest, MyAiScore, Question, UserAction } from '../../shared/contracts/evaluation.js';
import type { IngestionInput, IngestionSnapshot } from '../../shared/contracts/ingestion.js';
import { hash, inputText, safeText, ServiceError } from './safety.js';
import { collectPublicRepository } from '../repositoryReport/service.js';
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
  assessmentId: string; mode: 'mock' | 'live'; source: 'synthetic' | 'github_repository' | 'github_with_user_submissions';
  repo: string; commitSha: string | null; criteria: CriterionResult[]; score: MyAiScore; confidence: ConfidenceSummary;
  improvementTask: ImprovementTask; manifest: ServiceManifest; evidence: Evidence[];
}
export interface PrepareDependencies { ingest?: (input: IngestionInput) => Promise<IngestionSnapshot>; }

async function collect(input: IngestionInput): Promise<IngestionSnapshot> {
  // Legacy assessments keep their original unauthenticated public-only behavior.
  return collectPublicRepository(input);
}
function submittedEvidence(p: PreparedAssessment, id: string, sourceType: Evidence['sourceType'], text: string): Evidence {
  return { evidenceId: id, assessmentId: p.assessmentId, sourceType, collectionMethod: 'user_submission',
    summary: sourceType === 'collaboration_case' ? 'User-submitted collaboration case' : sourceType === 'interview_answer' ? 'User-submitted answer' : 'Collaboration excerpt selected and submitted by the user',
    contentSha256: hash(text), collectedAt: new Date().toISOString(), repo: null, commitSha: null, path: null, locator: null, eventTime: null,
    verificationNote: 'User-provided material. Its authenticity and causal link to project changes have not been independently verified.' };
}
export async function prepareAssessment(input: PrepareAssessmentInput, deps: PrepareDependencies = {}): Promise<PreparedAssessment> {
  if (!input || typeof input.assessmentId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.assessmentId)) throw new ServiceError('input', 'invalid_input', 'The assessment identifier is not valid.');
  const repoUrl = inputText(input.repoUrl, 'repoUrl', 300);
  const commitRef = input.commitRef === undefined ? undefined : inputText(input.commitRef, 'commitRef', 150);
  if (input.excerpts !== undefined && (!Array.isArray(input.excerpts) || input.excerpts.length > 3)) throw new ServiceError('input', 'invalid_input', 'You can submit up to 3 excerpts.');
  const excerpts = (input.excerpts ?? []).map(x => inputText(x, 'excerpt')).filter(Boolean);
  let collaborationCase: CollaborationCase | null = null;
  if (input.collaborationCase !== undefined) {
    const c = input.collaborationCase;
    if (!c || !['accepted', 'rejected', 'modified'].includes(c.user_action)) throw new ServiceError('input', 'invalid_input', 'Check the user action in the collaboration case.');
    collaborationCase = { caseId: `case_${input.assessmentId}`, assessmentId: input.assessmentId,
      problem: inputText(c.problem, 'problem'), constraints: inputText(c.constraints, 'constraints'), doneCriteria: inputText(c.done_criteria, 'done_criteria'),
      aiSuggestionSummary: inputText(c.ai_suggestion_summary, 'ai_suggestion_summary'), userAction: c.user_action,
      userActionDetail: inputText(c.user_action_detail, 'user_action_detail'), verificationSummary: inputText(c.verification_summary, 'verification_summary'),
      linkedEvidenceIds: [], submittedAt: new Date().toISOString() };
    if (![collaborationCase.problem, collaborationCase.aiSuggestionSummary, collaborationCase.userActionDetail, collaborationCase.verificationSummary].some(Boolean)) collaborationCase = null;
  }
  let snapshot: IngestionSnapshot;
  try { snapshot = await (deps.ingest ?? collect)({ repoUrl, commitRef }); }
  catch { throw new ServiceError('ingestion', 'ingestion_failed', 'The public GitHub repository could not be collected.'); }
  if (!['complete', 'partial'].includes(snapshot.ingestionStatus)) throw new ServiceError('ingestion', 'ingestion_failed', 'Repository collection did not complete. Check the public URL and collection scope.');
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
  if (!p.evidence.length) throw new ServiceError('ingestion', 'no_evidence', 'There is no evidence for generating questions. Add a collaboration case or supported code material.');
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
  if (Buffer.byteLength(serialized) > 165_000) throw new ServiceError('input', 'input_limit', 'The assessment material exceeds the model input limit.');
  return { request: payload, hash: requestHash };
}
export async function generateAssessmentQuestions(prepared: PreparedAssessment, provider: EvaluationProvider): Promise<PreparedAssessment> {
  if (prepared.questions.length) throw new ServiceError('questions', 'already_generated', 'Questions have already been generated.');
  const bundle = assembleEvaluationInput(prepared);
  const q: QuestionGenerationRequest = { assessmentId: prepared.assessmentId,
    trustedInstructions: { promptVersion: QUESTION_PROMPT_VERSION, promptText: QUESTION_PROMPT_TEXT, rubricCriteriaVersion: RUBRIC_CRITERIA_VERSION },
    untrusted: { evidence: prepared.evidence, collaborationCase: prepared.collaborationCase, analysisContext: prepared.analysisContext }, inferenceConfigVersion: 'service-v2-en', timeoutMs: TIMEOUT };
  const request = frozenRequest(q); const before = calls(provider).length;
  const raw = await invoke(signal => provider.generateQuestions(request.request, signal));
  if (raw.providerError) throw new ServiceError('questions', raw.providerError.code, 'The assessment provider request did not complete.', raw.providerError.retryable);
  const validated = validateAndBuildQuestions(raw, bundle);
  if (!validated.ok) throw new ServiceError('questions', validated.failure.code, 'Valid questions could not be generated. Try the assessment again.');
  return { ...prepared, questions: validated.questions.map(q => ({ ...q, text: safeText(q.text, 1500) })), questionRequestHash: request.hash, providerCalls: [...prepared.providerCalls, ...calls(provider).slice(before)], questionProviderId: provider.providerId, evaluatorModelId: evaluatorModel(provider) };
}

export async function finalizeAssessment(prepared: PreparedAssessment, submissions: AnswerSubmission[], provider: EvaluationProvider): Promise<AssessmentResult> {
  if (prepared.questions.length !== 3 || !prepared.questionRequestHash) throw new ServiceError('judgement', 'questions_required', 'Question generation must finish first.');
  if (prepared.questionProviderId !== provider.providerId || (provider.mode === 'live' && (!prepared.evaluatorModelId || prepared.evaluatorModelId !== evaluatorModel(provider)))) throw new ServiceError('judgement', 'provider_changed', 'The provider or model changed after question generation. Restart with consistent settings.');
  if (!Array.isArray(submissions) || submissions.length > 3) throw new ServiceError('input', 'invalid_answers', 'Submit up to 3 answers, one per question.');
  const p: PreparedAssessment = { ...prepared, evidence: [...prepared.evidence], analysisContext: { ...prepared.analysisContext }, answers: [] };
  const seen = new Set<string>(), validEvidence = new Set(p.evidence.map(e => e.evidenceId));
  for (const [index, s] of submissions.entries()) {
    if (!s || typeof s.questionId !== 'string' || !p.questions.some(q => q.questionId === s.questionId) || seen.has(s.questionId)) throw new ServiceError('input', 'invalid_answers', 'An answer has an invalid or duplicate question reference.');
    seen.add(s.questionId); const text = inputText(s.text, 'answer');
    const linked = s.linkedEvidenceIds ?? [];
    if (!Array.isArray(linked) || linked.length > 40 || !linked.every(id => typeof id === 'string' && validEvidence.has(id))) throw new ServiceError('input', 'invalid_answers', 'An answer has an invalid evidence reference.');
    if (!text) continue;
    const answer: Answer = { answerId: `ans_${index}`, assessmentId: p.assessmentId, questionId: s.questionId, text, linkedEvidenceIds: linked, submittedAt: new Date().toISOString() };
    p.answers.push(answer); const evidenceId = `answer_${index}`; p.evidence.push(submittedEvidence(p, evidenceId, 'interview_answer', text)); p.analysisContext[evidenceId] = text;
  }
  const bundle = assembleEvaluationInput(p);
  const j: JudgementRequest = { assessmentId: p.assessmentId,
    trustedInstructions: { promptVersion: JUDGE_PROMPT_VERSION, promptText: JUDGE_PROMPT_TEXT, rubricCriteriaVersion: RUBRIC_CRITERIA_VERSION, rubricCriteria: RUBRIC_CRITERIA },
    untrusted: { evidence: p.evidence, collaborationCase: p.collaborationCase, analysisContext: p.analysisContext, questions: p.questions, answers: p.answers }, inferenceConfigVersion: 'service-v2-en', timeoutMs: TIMEOUT };
  const request = frozenRequest(j); const before = calls(provider).length;
  const raw = await invoke(signal => provider.judgeCriteria(request.request, signal));
  if (raw.providerError) throw new ServiceError('judgement', raw.providerError.code, 'The assessment provider request did not complete.', raw.providerError.retryable);
  const judgement = validateAndBuildCriterionResults(raw, bundle);
  if (!judgement.ok) throw new ServiceError('judgement', judgement.failure.code, 'No score was issued because the assessment response contained invalid evidence or formatting.');
  const criteria = judgement.criteria.map(c => ({ ...c, rationale: safeText(c.rationale, 2000), missingEvidence: safeText(c.missingEvidence, 1000) }));
  const score = computeMyAiScore({ criterionResults: criteria, ingestionStatus: p.snapshot.ingestionStatus, validEvidenceIds: new Set(p.evidence.map(e => e.evidenceId)) });
  // Submitted case/excerpts/answers are not independently verified process records.
  const confidence = computeConfidenceSummary({ coverage: p.snapshot.coverage, ingestionStatus: p.snapshot.ingestionStatus,
    processEvidence: p.evidence.some(e => e.collectionMethod === 'user_submission') ? 'statements_only' : 'none',
    remainingUncertainty: ['These assessment criteria are experimental. They do not certify general personal ability.', 'Code existence does not prove successful execution or your collaboration behavior.', 'The authenticity of user-provided material and its causal link to code changes have not been independently verified.', ...(p.contextTruncated ? ['Some file content was omitted from the model input due to length limits.'] : []), ...(provider.mode === 'mock' ? ['This example uses synthetic responses, not a real model assessment.'] : [])] });
  const stageRequestHashes = { questions: p.questionRequestHash, judgement: request.hash };
  const allCalls = [...p.providerCalls, ...calls(provider).slice(before)];
  const base = buildManifest({ mode: provider.mode, providerId: provider.providerId,
    versions: { rubricVersion: 'scoring-rubric-v0.3.1', pipelineVersion: 'service-v2-en', questionPromptVersion: QUESTION_PROMPT_VERSION, evaluatorPromptVersion: JUDGE_PROMPT_VERSION, inferenceConfigVersion: 'service-v2-en' },
    bundleTextHash: bundle.bundleTextHash, modelInputHash: hash(JSON.stringify(stageRequestHashes)), warnings: confidence.remainingUncertainty });
  const manifest: ServiceManifest = { ...base, evaluatorModelId: evaluatorModel(provider), stageRequestHashes, wireRequestHashes: allCalls.map(c => c.wireRequestHash),
    tokensUsed: allCalls.length === 2 && allCalls.every(c => c.tokensUsed !== null) ? allCalls.reduce((sum, c) => sum + c.tokensUsed!, 0) : null,
    executedAt: provider.mode === 'live' ? allCalls.at(-1)?.executedAt ?? null : null,
    costUsd: null, costNote: 'Cost is not shown because model pricing and billed amounts have not been verified.' };
  return { assessmentId: p.assessmentId, mode: provider.mode, source: p.evidence.some(e => e.collectionMethod === 'user_submission') ? 'github_with_user_submissions' : 'github_repository', repo: p.snapshot.repo, commitSha: p.snapshot.commitSha, criteria, score, confidence, improvementTask: buildImprovementTask(criteria), manifest, evidence: p.evidence };
}

const ACTIONS: Record<CriterionCode, { title: string; action: string; checks: string[] }> = {
  A: { title: 'Define completion criteria before your next task', action: 'Choose one task. Write down the problem, constraints and examples of success and failure, then share them with the AI.', checks: ['Describe the problem in one sentence', 'Write verifiable completion criteria and a failure example', 'Check the AI suggestion against the completion criteria'] },
  B: { title: 'Give the AI the context it needs', action: 'Identify relevant files and constraints, and define the delegated scope. Check the AI understanding of that scope before implementation.', checks: ['Identify relevant files and constraints', 'Separate delegated work from decisions you will make', 'Record corrections caused by missing context'] },
  C: { title: 'Record your tool choice and alternatives', action: 'Choose one tool used for this problem. Compare it with another approach and connect your choice to actual results.', checks: ['Connect the problem to the role of the tool', 'Describe one alternative and your reason for choosing', 'Check the limits of the chosen approach'] },
  D: { title: 'Reproduce one failure and record the fix', action: 'Choose an important behavior in the project. Create a failing input and record the result before the fix and the verification result afterward.', checks: ['Record the expected result and reproduction input', 'Check the actual execution result', 'Link the change to the rerun result'] },
  E: { title: 'Connect your revision of an AI suggestion to evidence', action: 'Choose one AI suggestion. Connect your reasons for accepting, rejecting or modifying it, and the outcome, to relevant code or execution records.', checks: ['Distinguish the original suggestion from your decision', 'Connect your reasoning to evidence', 'Record the outcome after revision and remaining limits'] },
};
export function buildImprovementTask(criteria: CriterionResult[]): ImprovementTask {
  const priority: CriterionCode[] = ['D', 'A', 'B', 'E', 'C'];
  const selected = [...criteria].sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || priority.indexOf(a.criterionCode) - priority.indexOf(b.criterionCode))[0];
  const code = selected?.criterionCode ?? 'D', template = ACTIONS[code];
  const why = selected?.status === 'observed' ? `This is the next improvement action for axis ${code} in this assessment. ${selected.rationale}` : `There is not enough evidence to assess axis ${code} yet. ${selected?.missingEvidence ?? ''}`;
  const copyText = `${template.title}\n\n${safeText(why)}\n\n${template.action}\n\nCompletion checklist\n${template.checks.map(c => `- [ ] ${c}`).join('\n')}\n\nAdding records is different from improving actual behavior.`;
  return { criterionCode: code, title: template.title, why: safeText(why), action: template.action, evidenceIds: selected?.supportingEvidenceIds ?? [], doneChecklist: template.checks, copyText };
}

/** Static walkthrough: all data and scores are synthetic, no repository/API access. */
export function syntheticExample(): AssessmentResult {
  const assessmentId = 'synthetic-example';
  const samples: { id: string; type: Evidence['sourceType']; summary: string; path?: string; start?: number; end?: number }[] = [
    { id: 'example-goal', type: 'repo_static', path: 'docs/reservation-goal.md', start: 3, end: 12,
      summary: 'Synthetic document: completion criteria allow reservations for 1–8 people and reject empty or out-of-range inputs before saving.' },
    { id: 'example-context', type: 'user_provided_excerpt',
      summary: 'Synthetic conversation: the user delegated changes to specific reservation form and server validation files. They accepted regex validation, but no comparison with alternatives is recorded.' },
    { id: 'example-code', type: 'repo_static', path: 'src/reservations/validate.ts', start: 8, end: 24,
      summary: 'Synthetic code: server validation checks that the party size is an integer from 1 to 8. Code existence alone does not prove successful execution.' },
    { id: 'example-verification', type: 'user_provided_excerpt',
      summary: 'Synthetic verification record: a failure allowing 0 people is linked to post-fix results rejecting 0 and 9 and accepting 1 and 8. This is not a record of tests actually run.' },
    { id: 'example-decision', type: 'user_provided_excerpt',
      summary: 'Synthetic decision record: the user revised an AI suggestion for browser-only checks to include server validation, connecting the risk of direct API bypass to the revised function.' },
  ];
  const evidence: Evidence[] = samples.map(s => ({ evidenceId: s.id, assessmentId, sourceType: s.type, collectionMethod: 'synthetic_fixture',
    summary: s.summary, contentSha256: hash(s.summary), collectedAt: '2026-09-14T00:00:00.000Z', repo: null, commitSha: null,
    path: s.path ?? null, locator: s.path ? { startLine: s.start!, endLine: s.end! } : null, eventTime: null,
    verificationNote: 'This reservation form case is fictional. File paths, conversations and execution results are illustrative synthetic material, not collected from a real repository.' }));
  const dimensions: { code: CriterionCode; level: number; refs: string[]; rationale: string; missing: string }[] = [
    { code: 'A', level: 3, refs: ['example-goal'], rationale: 'The synthetic case defines allowed party sizes and rejection conditions before implementation, with specific checks for completion.', missing: 'It does not show how out-of-scope conditions, such as duplicate bookings or concurrent requests, were decided.' },
    { code: 'B', level: 3, refs: ['example-context', 'example-code'], rationale: 'The synthetic conversation names the relevant form and server files and delegates a defined scope. The implementation is linked to the specified validation boundary.', missing: 'More evidence is needed of checking and correcting misunderstood context.' },
    { code: 'C', level: 2, refs: ['example-context', 'example-code'], rationale: 'The purpose of regex validation is clear, but there is no evidence comparing alternatives such as schema validation or their maintenance costs.', missing: 'Explain why regex or schema validation better fits this reservation form, including the limits of that choice.' },
    { code: 'D', level: 3, refs: ['example-verification', 'example-code'], rationale: 'The synthetic verification record connects the pre-fix failure for 0 people to post-fix boundary results. The judgment does not infer success merely from the presence of a command.', missing: 'There is no record of checking unexpected input formats or regression risks. The execution results shown here are themselves synthetic examples.' },
    { code: 'E', level: 3, refs: ['example-decision', 'example-code'], rationale: 'The synthetic evidence links the decision to revise the AI suggestion and add server validation to the risk of bypassing browser-only checks.', missing: 'More evidence is needed of reviewing effects on other features and remaining constraints after the change.' },
  ];
  const criteria: CriterionResult[] = dimensions.map(d => ({ criterionResultId: `example-${d.code}`, assessmentId, criterionCode: d.code, status: 'observed', level: d.level, dimensionScore: d.level * 25, supportingEvidenceIds: d.refs, contraryEvidenceIds: [], rationale: d.rationale, missingEvidence: d.missing, blockingConflict: false }));
  const confidence: ConfidenceSummary = { evidenceScope: { readFiles: 2, candidateFiles: 2, selectionLimited: false }, sourceVerification: 'complete', processEvidence: 'statements_only', remainingUncertainty: ['Synthetic example with 2 illustrative files and 3 collaboration excerpts. No GitHub collection, tests or live LLM calls were performed.', 'Collection status and evidence counts describe this synthetic case only. They do not indicate real source verification or certification of personal ability.'] };
  const base = buildManifest({ mode: 'mock', providerId: 'synthetic-example', versions: { rubricVersion: 'scoring-rubric-v0.3.1', pipelineVersion: 'synthetic-example-v3-en', questionPromptVersion: QUESTION_PROMPT_VERSION, evaluatorPromptVersion: JUDGE_PROMPT_VERSION, inferenceConfigVersion: 'not-applicable' }, bundleTextHash: '', modelInputHash: '', warnings: confidence.remainingUncertainty });
  return { assessmentId, mode: 'mock', source: 'synthetic', repo: 'Synthetic example · Reservation form', commitSha: null, criteria,
    score: computeMyAiScore({ criterionResults: criteria, ingestionStatus: 'complete', validEvidenceIds: new Set(evidence.map(e => e.evidenceId)) }), confidence, improvementTask: buildImprovementTask(criteria), manifest: { ...base, evaluatorModelId: null, stageRequestHashes: { questions: null, judgement: null }, wireRequestHashes: [] }, evidence };
}
