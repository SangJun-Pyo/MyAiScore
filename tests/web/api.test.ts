import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../../src/server/web/api.js';
import { MemoryStore, FileStore, SupabaseStore } from '../../src/server/web/store.js';
import { prepareAssessment, syntheticExample } from '../../src/server/service/assessment.js';
import type { EvaluationProvider } from '../../src/server/evaluation/provider.js';
import type { IngestionSnapshot } from '../../src/shared/contracts/ingestion.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

function snapshot(): IngestionSnapshot {
  return { schemaVersion: 'ingestion-snapshot-v0.3.1', repo: 'example/project', commitSha: 'a'.repeat(40), collectorVersion: 'test', selectionDigest: 'test', ingestionStatus: 'complete', supportStatus: 'nextjs_typescript', collectedAt: '2026-09-14T00:00:00Z',
    files: [{ path: 'index.ts', blobSha: 'b'.repeat(40), byteSize: 15, contentSha256: 'test', lineCount: 1, redactedContent: 'export const PRIVATE_CODE = 1;', secretPatternMasked: false }],
    staticSignals: { basis: 'selected_files', languageFileCounts: { ts: 1 }, dependencies: [], testPaths: [], ciPaths: [], aiConfigPaths: [] },
    evidenceCandidates: [{ assessmentId: null, sourceType: 'repo_static', collectionMethod: 'synthetic_fixture', summary: '정적 파일', contentSha256: 'test', collectedAt: '2026-09-14T00:00:00Z', repo: 'example/project', commitSha: 'a'.repeat(40), path: 'index.ts', locator: { startLine: 1, endLine: 1 }, eventTime: null, verificationNote: '실행되지 않음' }],
    coverage: { treeTruncated: false, candidateFiles: 1, selectedFiles: 1, readFiles: 1, selectionLimited: false }, skippedFiles: [], warnings: [], failure: null, metrics: { durationMs: 0, httpRequests: 0, fetchedBytes: 0, cacheHits: 0 } };
}
const model: EvaluationProvider = { mode: 'mock', providerId: 'synthetic-test',
  async generateQuestions(r) { return { raw: { questions: [0, 1, 2].map(i => ({ text: `질문 ${i}`, grounding_evidence_ids: [r.untrusted.evidence[0]!.evidenceId], target_criteria: ['D'] })) } }; },
  async judgeCriteria(r) { return { raw: { criteria: ['A', 'B', 'C', 'D', 'E'].map(criterion_code => ({ criterion_code, status: 'observed', level: 3, supporting_evidence_ids: [r.untrusted.evidence[0]!.evidenceId], contrary_evidence_ids: [], rationale: 'PRIVATE_RATIONALE', missing_evidence: 'PRIVATE_MISSING', blocking_conflict: false })) } }; },
};
function harness(options: Parameters<typeof createApi>[0] = {}) {
  const store = options.store ?? new MemoryStore();
  const handle = createApi({ store, liveEnabled: true, provider: () => model,
    prepare: input => prepareAssessment(input, { ingest: async () => snapshot() }), ...options });
  let seq = 0;
  async function request(method: string, path: string, body?: unknown, token?: string, key?: string, headers?: HeadersInit) {
    const response = await handle(new Request(`http://localhost/api/${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Idempotency-Key': key ?? `request_${++seq}`, ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), path.split('/'));
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  async function create() { const r = await request('POST', 'assessments', { repo_url: 'https://github.com/example/project', consent: true }); assert.equal(r.status, 201); return { id: r.body.assessment_id as string, token: r.body.owner_access_token as string }; }
  return { store, request, create, handle };
}
test('anonymous example/config works with live disabled and does not fabricate actual execution', async () => {
  const h = harness({ liveEnabled: false });
  const demo = await h.request('GET', 'examples/starter');
  assert.equal(demo.status, 200); assert.equal(demo.body.example_kind, 'synthetic'); assert.equal(demo.body.executed_at, null);
  assert.equal(demo.body.result.manifest.mode, 'mock');
  const { id, token } = await h.create();
  await h.request('POST', `assessments/${id}/ingest`, {}, token);
  assert.equal((await h.request('POST', `assessments/${id}/questions`, {}, token)).status, 503);
});
test('owner tokens are hashed at rest, never returned in subsequent private or public views', async () => {
  const h = harness(); const a = await h.create(), b = await h.create();
  assert.equal((await h.request('GET', `assessments/${a.id}`)).status, 401);
  assert.equal((await h.request('GET', `assessments/${a.id}`, undefined, b.token)).status, 404);
  const mine = await h.request('GET', `assessments/${a.id}`, undefined, a.token); assert.equal(mine.status, 200);
  assert.doesNotMatch(JSON.stringify(await h.store.read()), new RegExp(a.token));
  assert.equal('owner_hash' in mine.body, false); assert.equal('input' in mine.body, false);
});
test('full synthetic flow goes through real validators/scorer and clears transient payload after finalize', async () => {
  const h = harness(); const { id, token } = await h.create(); const path = `assessments/${id}`;
  assert.equal((await h.request('POST', `${path}/finalize`, {}, token)).status, 409);
  assert.equal((await h.request('POST', `${path}/ingest`, {}, token)).status, 200);
  const questions = await h.request('POST', `${path}/questions`, {}, token); assert.equal(questions.body.questions.length, 3);
  assert.equal((await h.request('PUT', `${path}/answers`, { answers: [{ question_id: 'alien', text: 'no' }] }, token)).status, 400);
  assert.equal((await h.request('PUT', `${path}/answers`, { answers: [] }, token)).status, 200);
  const final = await h.request('POST', `${path}/finalize`, {}, token);
  assert.equal(final.status, 200); assert.equal(final.body.result.score.value, 75); assert.equal(final.body.status, 'done');
  assert.doesNotMatch(JSON.stringify(final.body), /PRIVATE_CODE|analysis_context|collaboration_case/);
  assert.equal((await h.store.read()).assessments[id]?.prepared, null);
  assert.equal((await h.request('POST', `${path}/finalize`, {}, token)).status, 409);
});
test('idempotency replay avoids provider calls and different payload is rejected', async () => {
  let calls = 0; const h = harness({ prepare: async input => { calls++; return prepareAssessment(input, { ingest: async () => snapshot() }); } });
  const { id, token } = await h.create(); const path = `assessments/${id}/ingest`;
  const first = await h.request('POST', path, {}, token, 'same_key');
  const second = await h.request('POST', path, {}, token, 'same_key');
  assert.deepEqual(first, second); assert.equal(calls, 1);
  assert.equal((await h.request('POST', path, { extra: true }, token, 'same_key')).status, 409);
});
test('concurrent stage attempts run only once', async () => {
  let release!: () => void, started!: () => void; const signal = new Promise<void>(r => { started = r; });
  const h = harness({ prepare: async input => { started(); await new Promise<void>(r => { release = r; }); return prepareAssessment(input, { ingest: async () => snapshot() }); } });
  const { id, token } = await h.create();
  const first = h.request('POST', `assessments/${id}/ingest`, {}, token);
  await signal;
  assert.equal((await h.request('POST', `assessments/${id}/ingest`, {}, token)).status, 409);
  release(); assert.equal((await first).status, 200);
});
test('authenticated creation replays same key without duplicate assessments', async () => {
  const h = harness(); const owner = await h.create(); const input = { repo_url: 'https://github.com/example/second', consent: true };
  const a = await h.request('POST', 'assessments', input, owner.token, 'create_once');
  const b = await h.request('POST', 'assessments', input, owner.token, 'create_once');
  assert.deepEqual(a, b); assert.equal(Object.keys((await h.store.read()).assessments).length, 2);
  assert.equal((await h.request('POST', 'assessments', { ...input, repo_url: 'https://github.com/example/other' }, owner.token, 'create_once')).status, 409);
});
test('owner can delete an in-flight assessment and late work cannot resurrect it', async () => {
  let release!: () => void, started!: () => void; const signal = new Promise<void>(r => { started = r; });
  const h = harness({ prepare: async input => { started(); await new Promise<void>(r => { release = r; }); return prepareAssessment(input, { ingest: async () => snapshot() }); } });
  const { id, token } = await h.create(); const pending = h.request('POST', `assessments/${id}/ingest`, {}, token);
  await signal; assert.equal((await h.request('DELETE', `assessments/${id}`, undefined, token)).status, 204);
  release(); assert.equal((await pending).status, 404); assert.equal((await h.store.read()).assessments[id], undefined);
});
test('public summary excludes private rationale and revocation/deletion invalidate share URLs', async () => {
  const h = harness(); const { id, token } = await h.create(); const path = `assessments/${id}`;
  for (const stage of ['ingest', 'questions', 'finalize']) assert.equal((await h.request('POST', `${path}/${stage}`, {}, token)).status, 200);
  const shared = await h.request('PATCH', `${path}/visibility`, { visibility: 'public' }, token); const old = shared.body.share_id;
  const publicResult = await h.request('GET', `results/${old}`);
  assert.equal(publicResult.status, 200); assert.doesNotMatch(JSON.stringify(publicResult.body), /PRIVATE_|owner_|analysis_context|submitted_at/);
  await h.request('PATCH', `${path}/visibility`, { visibility: 'private' }, token);
  assert.equal((await h.request('GET', `results/${old}`)).status, 404);
  const fresh = await h.request('PATCH', `${path}/visibility`, { visibility: 'public' }, token); assert.notEqual(fresh.body.share_id, old);
  assert.equal((await h.request('DELETE', path, undefined, token)).status, 204);
  assert.equal((await h.request('GET', `results/${fresh.body.share_id}`)).status, 404);
  assert.equal((await h.request('GET', path, undefined, token)).status, 404);
});
test('input rejects foreign origin, forged score fields, missing consent, oversized body', async () => {
  const h = harness();
  for (const body of [{ repo_url: 'http://127.0.0.1/', consent: true }, { repo_url: 'https://github.com/a/b', score: 100, consent: true }, { repo_url: 'https://github.com/a/b' }]) assert.equal((await h.request('POST', 'assessments', body)).status, 400);
  assert.equal((await h.request('POST', 'assessments', {}, undefined, undefined, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await h.request('POST', 'assessments', { text: 'x'.repeat(66_000) })).status, 413);
});
test('reassessment is fresh and comparison requires the same owner', async () => {
  const h = harness(); const a = await h.create(); const base = `assessments/${a.id}`;
  for (const stage of ['ingest', 'questions', 'finalize']) assert.equal((await h.request('POST', `${base}/${stage}`, {}, a.token)).status, 200);
  const fresh = await h.request('POST', `${base}/reassess`, { consent: true }, a.token);
  assert.equal(fresh.status, 201); assert.equal(fresh.body.result, null); assert.equal(fresh.body.previous_assessment_id, a.id);
  const path = `assessments/${fresh.body.assessment_id}`;
  for (const stage of ['ingest', 'questions', 'finalize']) assert.equal((await h.request('POST', `${path}/${stage}`, {}, a.token)).status, 200);
  const comparison = await h.request('GET', `${path}/comparison`, undefined, a.token);
  assert.equal(comparison.status, 200); assert.equal(comparison.body.behavior_change, 'not_established'); assert.equal(comparison.body.score_delta, null);
  const other = await h.create(); assert.equal((await h.request('GET', `${path}/comparison`, undefined, other.token)).status, 404);
});
test('expired results are unavailable and late stage completion cannot overwrite state', async () => {
  let time = Date.now(); const h = harness({ now: () => time }); const { id, token } = await h.create();
  time += 8 * 86_400_000; assert.equal((await h.request('GET', `assessments/${id}`, undefined, token)).status, 404);
  const l = harness({ now: () => time, prepare: async input => { time += 121_000; return prepareAssessment(input, { ingest: async () => snapshot() }); } });
  const a = await l.create(); assert.equal((await l.request('POST', `assessments/${a.id}/ingest`, {}, a.token)).status, 409);
});
test('failure response never reflects provider exception payload', async () => {
  const h = harness({ prepare: async () => { throw new Error('sk-secret PRIVATE_PATH'); } }); const { id, token } = await h.create();
  const failure = await h.request('POST', `assessments/${id}/ingest`, {}, token);
  assert.equal(failure.status, 422); assert.doesNotMatch(JSON.stringify(failure.body), /sk-secret|PRIVATE_PATH/); assert.equal(failure.body.failure.stage, 'ingest');
});
test('persisted global budget blocks a configured provider before its call', async () => {
  let called = 0; const time = Date.parse('2026-09-14T12:00:00Z');
  const h = harness({ now: () => time, questions: async () => { called++; throw new Error('must not run'); } });
  const { id, token } = await h.create();
  await h.request('POST', `assessments/${id}/ingest`, {}, token);
  await h.store.transaction(db => { db.usage['model-global:2026-09-14'] = 1000; });
  assert.equal((await h.request('POST', `assessments/${id}/questions`, {}, token)).status, 429);
  assert.equal(called, 0);
  assert.equal((await h.request('GET', `assessments/${id}`, undefined, token)).body.status, 'draft');
});
test('file store survives new instances and atomic transactions preserve concurrent updates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'myaiscore-store-'));
  try { const store = new FileStore(directory); await Promise.all(Array.from({ length: 8 }, () => store.transaction(db => { db.usage.count = (db.usage.count ?? 0) + 1; })));
    assert.equal((await new FileStore(directory).read()).usage.count, 8);
  } finally { assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep)); await rm(directory, { recursive: true, force: true }); }
});
test('Supabase adapter uses CAS revision and never falls back on a database failure', async () => {
  let revision = 0, payload = { assessments: {}, operations: {}, usage: {} };
  const store = new SupabaseStore('https://example.supabase.co', 'synthetic-service-key', async (url, init) => {
    if (init?.method === 'PATCH') { assert.match(String(url), new RegExp(`revision=eq.${revision}$`)); const update = JSON.parse(String(init.body)); revision = update.revision; payload = update.payload; return Response.json([{ revision, payload }]); }
    return Response.json([{ revision, payload }]);
  });
  await store.transaction(db => { db.usage.test = 1; }); assert.equal((await store.read()).usage.test, 1); assert.equal(revision, 1);
  const broken = new SupabaseStore('https://example.supabase.co', 'synthetic', async () => new Response('error', { status: 500 }));
  await assert.rejects(broken.read());
});
