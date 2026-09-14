import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getStore, purgeExpired, type Store, type AssessmentRecord, type Database } from './store.js';
import { HttpError, bodyOf, onlyKeys, createInput, collaborationInput, excerptsInput, answersInput } from './input.js';
import { assessmentSummaryView, ownerView, publicView, resultView, snakeCase } from './dto.js';
import { prepareAssessment, generateAssessmentQuestions, finalizeAssessment, syntheticExample, ServiceError, type PreparedAssessment, type AssessmentResult } from '../service/assessment.js';
import { createAnthropicProviderFromEnv } from '../service/anthropicProvider.js';
import type { EvaluationProvider } from '../evaluation/provider.js';
import { compareAssessments } from '../service/comparison.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const activeStates = new Set(['ingesting', 'generating_questions', 'scoring']);
interface Dependencies {
  store?: Store;
  prepare?: typeof prepareAssessment;
  questions?: typeof generateAssessmentQuestions;
  finalize?: typeof finalizeAssessment;
  provider?: () => EvaluationProvider;
  now?: () => number;
  liveEnabled?: boolean;
}
function reply(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
function auth(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization)?.[1];
  if (!token) throw new HttpError(401, 'unauthorized', '결과 접근 토큰을 확인해주세요.');
  return digest(token);
}
function authorized(db: Database, id: string, ownerHash: string, now: number) {
  const record = db.assessments[id];
  if (!record || record.ownerHash !== ownerHash || Date.parse(record.expiresAt) <= now) throw new HttpError(404, 'not_found', '평가를 찾을 수 없습니다.');
  return record;
}
function requireState(record: AssessmentRecord, state: string) {
  if (record.status !== state) throw new HttpError(409, 'invalid_transition', '현재 단계에서 수행할 수 없는 요청입니다.');
}
function positiveLimit(value: string | undefined, fallback: number) {
  const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 1000 ? parsed : fallback;
}
function useQuota(db: Database, bucket: string, limit: number, now: number) {
  const key = `${bucket}:${new Date(now).toISOString().slice(0, 10)}`;
  if ((db.usage[key] ?? 0) >= limit) throw new HttpError(429, 'rate_limited', '오늘의 분석 요청 한도에 도달했습니다. 나중에 다시 시도해주세요.', true);
  db.usage[key] = (db.usage[key] ?? 0) + 1;
}
function safeFailure(error: unknown, stage: string) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'internal_error';
  const retryable = error instanceof ServiceError ? error.retryable : ['timeout', 'stage_timeout', 'rate_limited', 'provider_failure', 'internal_error'].includes(code);
  const safe = ['timeout', 'stage_timeout', 'rate_limited', 'provider_failure', 'output_validation_failed', 'invalid_input', 'repo_not_found_or_private', 'unsupported_stack', 'size_limit_exceeded', 'provider_not_configured'].includes(code) ? code : 'internal_error';
  return { stage, code: safe, message: safe === 'provider_not_configured' ? '실제 평가 서비스가 아직 설정되지 않았습니다.' : '이 단계를 완료하지 못했습니다. 입력과 서비스 상태를 확인해주세요.', retryable };
}
export function liveConfiguration() {
  return process.env.MYAISCORE_ENABLE_LIVE === 'true' && !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL;
}

export function createApi(deps: Dependencies = {}) {
  const now = deps.now ?? Date.now;
  return async function handle(request: Request, segments: string[]): Promise<Response> {
    try {
      const method = request.method.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new HttpError(405, 'invalid_input', '지원하지 않는 요청입니다.');
      if (method !== 'GET') {
        const origin = request.headers.get('origin');
        if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'forbidden_origin', '다른 사이트에서 보낸 요청은 허용하지 않습니다.');
      }
      const [resource, id, action] = segments;
      if (segments.length > 3) throw new HttpError(404, 'not_found', '경로를 찾을 수 없습니다.');
      if (method === 'GET' && resource === 'config' && !id) return reply({
        live_enabled: deps.liveEnabled ?? liveConfiguration(), provider_configured: !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL,
        storage_mode: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'file', local_evidence_mode: 'pasted_excerpts',
        limitations: ['평가 기준과 가중치는 교정 중입니다.', 'GitHub 수집은 코드의 출처를 확인하며 개인의 역량을 인증하지 않습니다.', '로컬 기록은 선택한 발췌를 직접 붙여넣을 수 있습니다.'],
      });
      if (method === 'GET' && resource === 'health' && !id) return reply({ ok: true });
      if (method === 'GET' && resource === 'examples' && id === 'starter' && !action) {
        const result = syntheticExample();
        return reply({ assessment_id: 'example_starter', repo_url: 'https://github.com/example/taskboard', commit_sha: result.commitSha,
          status: 'done', result: snakeCase(resultView(result)), evidence: snakeCase(result.evidence), visibility: 'private',
          is_example: true, example_kind: 'synthetic', example_source: 'MyAiScore synthetic collaboration example', executed_at: null });
      }
      if (method === 'GET' && resource === 'assessments' && !id && !action) {
        // Authenticate before storage access: malformed or absent credentials always return 401.
        const ownerHash = auth(request);
        if (!ownerHash) throw new HttpError(401, 'unauthorized', '이 브라우저의 접근 토큰이 필요합니다.');
        const db = await (deps.store ?? getStore()).read();
        const timestamp = now(), limit = 50;
        const records = Object.values(db.assessments)
          .filter(record => record.ownerHash === ownerHash && Date.parse(record.expiresAt) > timestamp)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        return reply({ assessments: records.slice(0, limit).map(assessmentSummaryView), total: records.length, limit, has_more: records.length > limit });
      }
      const store = deps.store ?? getStore();
      if (resource === 'results' && id && !action && method === 'GET') {
        const db = await store.read();
        const record = Object.values(db.assessments).find(r => r.shareId === id && r.visibility === 'public' && r.status === 'done' && Date.parse(r.expiresAt) > now());
        if (!record?.result) throw new HttpError(404, 'not_found', '공유 결과를 찾을 수 없습니다.');
        return reply(publicView(record.result, record.repoUrl));
      }
      if (resource !== 'assessments') throw new HttpError(404, 'not_found', '경로를 찾을 수 없습니다.');
      const ownerHash = auth(request);
      if (method === 'POST' && !id) {
        const rawInput = await bodyOf(request);
        const input = createInput(rawInput);
        const createKey = request.headers.get('idempotency-key');
        if (ownerHash && (!createKey || !/^[A-Za-z0-9_-]{8,100}$/.test(createKey))) throw new HttpError(400, 'invalid_input', '유효한 Idempotency-Key가 필요합니다.');
        const createOpKey = ownerHash ? digest(`${ownerHash}:POST:assessments:${createKey}`) : null;
        const createHash = digest(JSON.stringify(rawInput));
        const token = ownerHash ? null : randomBytes(32).toString('base64url');
        const hash = ownerHash ?? digest(token!);
        const record: AssessmentRecord = { id: `as_${randomUUID()}`, ownerHash: hash, ...input, status: 'draft', revision: 1,
          createdAt: new Date(now()).toISOString(), expiresAt: new Date(now() + 7 * 86_400_000).toISOString(), prepared: null, result: null,
          answers: [], failure: null, attempt: null, visibility: 'private', shareId: null };
        const created = await store.transaction(db => {
          purgeExpired(db, now());
          if (ownerHash && !Object.values(db.assessments).some(r => r.ownerHash === ownerHash)) throw new HttpError(401, 'unauthorized', '접근 토큰이 유효하지 않습니다.');
          if (createOpKey && db.operations[createOpKey]) {
            const old = db.operations[createOpKey]!;
            if (old.hash !== createHash) throw new HttpError(409, 'idempotency_conflict', '같은 요청 키로 다른 내용을 보낼 수 없습니다.');
            return old.body;
          }
          useQuota(db, 'create-global', 100, now()); useQuota(db, `create:${hash}`, 10, now());
          db.assessments[record.id] = record;
          const body = { assessment_id: record.id, status: record.status, ingestion_status: 'not_started' };
          if (createOpKey) db.operations[createOpKey] = { hash: createHash, state: 'complete', assessmentId: record.id, createdAt: now(), status: 201, body };
          return body;
        });
        return reply({ ...(created as object), ...(token ? { owner_access_token: token } : {}) }, 201);
      }
      if (!id || !ownerHash) throw new HttpError(401, 'unauthorized', '이 결과를 만든 브라우저의 접근 토큰이 필요합니다.');
      const initial = authorized(await store.read(), id, ownerHash, now());
      if (method === 'GET' && !action) return reply(ownerView(initial));
      if (method === 'GET' && action === 'questions') return reply({ questions: snakeCase(initial.prepared?.questions ?? []) });
      if (method === 'GET' && action === 'comparison') {
        if (!initial.result || !initial.previousAssessmentId) throw new HttpError(409, 'comparison_unavailable', '비교할 이전 평가와 완료된 현재 평가가 필요합니다.');
        const previous = authorized(await store.read(), initial.previousAssessmentId, ownerHash, now());
        if (!previous.result) throw new HttpError(409, 'comparison_unavailable', '이전 평가가 완료되지 않았습니다.');
        return reply(snakeCase({ ...compareAssessments(previous.result, initial.result), previousAssessmentId: previous.id, assessmentId: initial.id }));
      }
      if (method === 'GET') throw new HttpError(404, 'not_found', '경로를 찾을 수 없습니다.');
      const data = await bodyOf(request);
      const key = request.headers.get('idempotency-key');
      if (!key || !/^[A-Za-z0-9_-]{8,100}$/.test(key)) throw new HttpError(400, 'invalid_input', '유효한 Idempotency-Key가 필요합니다.');
      const operationKey = digest(`${ownerHash}:${method}:${segments.join('/')}:${key}`);
      const payloadHash = digest(JSON.stringify(data));
      const previous = (await store.read()).operations[operationKey];
      if (previous) {
        if (previous.hash !== payloadHash) throw new HttpError(409, 'idempotency_conflict', '같은 요청 키로 다른 내용을 보낼 수 없습니다.');
        if (previous.state === 'complete') return reply(previous.body, previous.status);
        throw new HttpError(409, 'request_in_progress', '이미 처리 중인 요청입니다. 상태를 확인해주세요.');
      }
      const isStage = method === 'POST' && ['ingest', 'questions', 'finalize', 'retry'].includes(action ?? '');
      if (isStage) {
        onlyKeys(data, []);
        let stage = action!;
        if (action === 'retry') {
          if (initial.attempt && initial.attempt.deadline < now()) stage = initial.attempt.stage;
          else if (initial.status === 'failed' && initial.failure?.retryable) stage = initial.failure.stage;
          else throw new HttpError(409, 'invalid_transition', '재시도 가능한 실패가 없습니다.');
        }
        if (!['ingest', 'questions', 'finalize'].includes(stage)) throw new HttpError(409, 'invalid_transition', '재시도할 단계를 확인해주세요.');
        let provider: EvaluationProvider | undefined;
        if (stage !== 'ingest') {
          if (!(deps.liveEnabled ?? liveConfiguration())) throw new HttpError(503, 'provider_not_configured', '실제 평가 서비스가 아직 설정되지 않았습니다. 예시를 먼저 확인해주세요.');
          try { provider = (deps.provider ?? createAnthropicProviderFromEnv)(); }
          catch { throw new HttpError(503, 'provider_not_configured', '실제 평가 서비스 설정을 확인해주세요.'); }
        }
        const attemptId = randomUUID();
        const working = await store.transaction(db => {
          const record = authorized(db, id, ownerHash, now());
          if (db.operations[operationKey]) throw new HttpError(409, 'request_in_progress', '이미 처리 중인 요청입니다.');
          if (record.attempt && record.attempt.deadline >= now()) throw new HttpError(409, 'request_in_progress', '이미 분석 중입니다.');
          if (action !== 'retry') {
            requireState(record, stage === 'finalize' ? 'awaiting_answers' : 'draft');
            if (stage === 'questions' && !record.prepared) throw new HttpError(409, 'invalid_transition', '저장소를 먼저 수집해주세요.');
          } else if (!(record.status === 'failed' && record.failure?.retryable) && !(record.attempt && record.attempt.deadline < now())) {
            throw new HttpError(409, 'invalid_transition', '재시도 가능한 실패가 없습니다.');
          }
          if (action === 'retry' && stage !== (record.attempt?.stage ?? record.failure?.stage)) throw new HttpError(409, 'stale_attempt', '실패 단계가 변경되었습니다. 상태를 다시 확인해주세요.');
          if (stage !== 'ingest') {
            useQuota(db, 'model-global', positiveLimit(process.env.MYAISCORE_DAILY_MODEL_CALL_LIMIT, 20), now());
            useQuota(db, `model:${ownerHash}`, 6, now());
          } else useQuota(db, 'ingest-global', 100, now());
          record.status = stage === 'ingest' ? 'ingesting' : stage === 'questions' ? 'generating_questions' : 'scoring';
          record.failure = null; record.attempt = { id: attemptId, stage, deadline: now() + 120_000 };
          db.operations[operationKey] = { hash: payloadHash, state: 'pending', assessmentId: id, createdAt: now() };
          return structuredClone(record);
        });
        let prepared: PreparedAssessment | null = working.prepared, result: AssessmentResult | null = null, failure = null;
        try {
          if (stage === 'ingest') prepared = await (deps.prepare ?? prepareAssessment)({ assessmentId: id, repoUrl: working.repoUrl,
            commitRef: working.commitRef, collaborationCase: working.input.collaborationCase as Parameters<typeof prepareAssessment>[0]['collaborationCase'], excerpts: working.input.excerpts });
          else if (stage === 'questions') prepared = await (deps.questions ?? generateAssessmentQuestions)(prepared!, provider!);
          else result = await (deps.finalize ?? finalizeAssessment)(prepared!, working.answers, provider!);
        } catch (error) { failure = safeFailure(error, stage); }
        const completed = await store.transaction(db => {
          const record = authorized(db, id, ownerHash, now());
          if (record.attempt?.id !== attemptId || record.revision !== working.revision || record.attempt.deadline < now()) throw new HttpError(409, 'stale_attempt', '만료된 분석 결과입니다. 상태를 확인하고 재시도해주세요.');
          record.attempt = null;
          if (failure) { record.status = 'failed'; record.failure = failure; }
          else {
            record.prepared = prepared; record.result = result ?? record.result;
            record.status = stage === 'ingest' ? 'draft' : stage === 'questions' ? 'awaiting_answers' : 'done';
            if (stage === 'finalize') {
              // Raw/transient model context is no longer needed after the immutable result.
              record.prepared = null;
              record.input = {}; record.answers = [];
            }
          }
          const body = ownerView(record);
          db.operations[operationKey] = { hash: payloadHash, state: 'complete', assessmentId: id, createdAt: now(), status: failure ? 422 : 200, body };
          return { body, status: failure ? 422 : 200 };
        });
        return reply(completed.body, completed.status);
      }
      const completed = await store.transaction(db => {
        const record = authorized(db, id, ownerHash, now());
        if (db.operations[operationKey]) throw new HttpError(409, 'request_in_progress', '이미 처리 중인 요청입니다.');
        if (activeStates.has(record.status) && !(method === 'DELETE' && !action)) throw new HttpError(409, 'request_in_progress', '분석 중에는 변경할 수 없습니다.');
        let status = 200; let body: unknown;
        if (method === 'PUT' && action === 'answers') {
          requireState(record, 'awaiting_answers'); const answers = answersInput(data);
          const ids = new Set(record.prepared?.questions.map(q => q.questionId));
          if (answers.some(a => !ids.has(a.questionId))) throw new HttpError(400, 'invalid_input', '이 평가의 질문에만 답변할 수 있습니다.');
          record.answers = answers; record.revision++;
        } else if (method === 'PATCH' && action === 'collaboration-case') {
          requireState(record, 'draft'); onlyKeys(data, ['collaboration_case', 'excerpts']);
          record.input = { collaborationCase: collaborationInput(data.collaboration_case), excerpts: excerptsInput(data.excerpts) };
          record.prepared = null; record.revision++;
        } else if (method === 'PATCH' && action === 'visibility') {
          requireState(record, 'done'); onlyKeys(data, ['visibility']);
          if (!['public', 'private'].includes(String(data.visibility))) throw new HttpError(400, 'invalid_input', '공개 범위를 확인해주세요.');
          if (data.visibility === 'public') { if (!record.shareId) record.shareId = randomBytes(24).toString('base64url'); record.visibility = 'public'; }
          else { record.visibility = 'private'; record.shareId = null; }
        } else if (method === 'DELETE' && !action) {
          onlyKeys(data, []); delete db.assessments[id];
          for (const [k, operation] of Object.entries(db.operations)) if (operation.assessmentId === id) delete db.operations[k];
          status = 204;
        } else if (method === 'POST' && action === 'reassess') {
          requireState(record, 'done'); onlyKeys(data, ['commit_ref', 'consent']);
          const input = createInput({ repo_url: record.repoUrl, ...data });
          const fresh: AssessmentRecord = { ...structuredClone(record), ...input, id: `as_${randomUUID()}`, status: 'draft', revision: 1,
            createdAt: new Date(now()).toISOString(), expiresAt: new Date(now() + 7 * 86_400_000).toISOString(), prepared: null, result: null, answers: [], failure: null, attempt: null, visibility: 'private', shareId: null };
          fresh.previousAssessmentId = record.id;
          useQuota(db, 'create-global', 100, now()); useQuota(db, `create:${ownerHash}`, 10, now()); db.assessments[fresh.id] = fresh; body = ownerView(fresh); status = 201;
        } else throw new HttpError(404, 'not_found', '경로를 찾을 수 없습니다.');
        body ??= status === 204 ? null : ownerView(record);
        if (status !== 204) db.operations[operationKey] = { hash: payloadHash, state: 'complete', assessmentId: id, createdAt: now(), status, body };
        return { status, body };
      });
      return reply(completed.body, completed.status);
    } catch (error) {
      if (error instanceof HttpError) return reply({ error: { code: error.code, message: error.message, retryable: error.retryable } }, error.status);
      return reply({ error: { code: 'internal_error', message: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.', retryable: true } }, 500);
    }
  };
}
