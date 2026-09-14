import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApi } from '../../src/server/web/api.js';
import { MemoryStore, type AssessmentRecord, type Store } from '../../src/server/web/store.js';
import { syntheticExample, type PreparedAssessment } from '../../src/server/service/assessment.js';

const NOW = Date.parse('2026-09-14T12:00:00.000Z');
const TOKEN = 'a'.repeat(43), OTHER_TOKEN = 'b'.repeat(43);
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
function record(id: string, token = TOKEN): AssessmentRecord {
  return { id, ownerHash: digest(token), repoUrl: 'https://github.com/example/project', input: { collaborationCase: { problem: 'PRIVATE_CASE' }, excerpts: ['PRIVATE_EXCERPT'] },
    status: 'draft', revision: 1, createdAt: '2026-09-14T10:00:00.000Z', expiresAt: '2026-09-21T10:00:00.000Z', prepared: null, result: null,
    answers: [{ questionId: 'private-question', text: 'PRIVATE_ANSWER' }], failure: null, attempt: null, visibility: 'private', shareId: null };
}
async function call(store: Store, authorization?: string, query = '') {
  const handle = createApi({ store, now: () => NOW, liveEnabled: false });
  const response = await handle(new Request(`http://localhost/api/assessments${query}`, { headers: authorization === undefined ? {} : { authorization } }), ['assessments']);
  return { response, body: await response.json() };
}

test('history requires a correctly formatted Bearer token before reading storage', async () => {
  let reads = 0, writes = 0;
  const store: Store = { async read() { reads++; throw new Error('must_not_read'); }, async transaction() { writes++; throw new Error('must_not_write'); } };
  for (const authorization of [undefined, 'Basic token', 'Bearer short', `Bearer ${TOKEN} trailing`, `Bearer ${'a'.repeat(44)}`]) {
    const { response, body } = await call(store, authorization);
    assert.equal(response.status, 401); assert.equal(body.error.code, 'unauthorized');
  }
  assert.equal(reads, 0); assert.equal(writes, 0);
});

test('valid token without records returns an empty private history', async () => {
  const { response, body } = await call(new MemoryStore(), `Bearer ${TOKEN}`);
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(body, { assessments: [], total: 0, limit: 50, has_more: false });
});

test('history includes only unexpired records owned by this token and does not purge or mutate', async () => {
  const memory = new MemoryStore();
  await memory.transaction(db => {
    db.assessments.mine = record('mine');
    db.assessments.minePublic = { ...record('minePublic'), visibility: 'public', shareId: 'PRIVATE_SHARE_ID' };
    db.assessments.foreign = { ...record('foreign', OTHER_TOKEN), visibility: 'public' };
    db.assessments.expired = { ...record('expired'), expiresAt: new Date(NOW - 1).toISOString() };
    db.assessments.boundary = { ...record('boundary'), expiresAt: new Date(NOW).toISOString() };
    db.assessments.invalidExpiry = { ...record('invalidExpiry'), expiresAt: 'invalid-date' };
  });
  const before = await memory.read(); let reads = 0;
  const store: Store = { async read() { reads++; return memory.read(); }, async transaction() { throw new Error('GET must not mutate storage'); } };
  const { body } = await call(store, `Bearer ${TOKEN}`);
  assert.deepEqual(body.assessments.map((r: { assessment_id: string }) => r.assessment_id), ['mine', 'minePublic']);
  assert.equal(body.total, 2); assert.equal(reads, 1); assert.deepEqual(await memory.read(), before);
});

test('history has a fixed 50 record limit, owner-scoped total, and deterministic newest-first ordering', async () => {
  const store = new MemoryStore();
  await store.transaction(db => {
    // Reverse insertion ensures ordering is not accidentally inherited from object enumeration.
    for (let i = 51; i >= 0; i--) { const id = `as_${String(i).padStart(3, '0')}`; db.assessments[id] = record(id); }
    db.assessments.as_051!.createdAt = '2026-09-14T11:00:00.000Z';
    db.assessments.foreign = record('foreign', OTHER_TOKEN);
    db.assessments.expired = { ...record('expired'), expiresAt: new Date(NOW).toISOString() };
  });
  const first = await call(store, `Bearer ${TOKEN}`, '?limit=10000');
  const second = await call(store, `Bearer ${TOKEN}`);
  assert.deepEqual(first.body, second.body);
  assert.equal(first.body.total, 52); assert.equal(first.body.limit, 50); assert.equal(first.body.has_more, true);
  assert.equal(first.body.assessments.length, 50);
  assert.equal(first.body.assessments[0].assessment_id, 'as_051');
  assert.equal(first.body.assessments[1].assessment_id, 'as_000');
  assert.equal(first.body.assessments.at(-1).assessment_id, 'as_048');
});

test('history exposes only allowlisted summary fields; withheld remains null and raw content stays private', async () => {
  const store = new MemoryStore(); const result = syntheticExample();
  result.criteria[0]!.rationale = 'PRIVATE_RATIONALE'; result.evidence[0]!.summary = 'PRIVATE_EVIDENCE';
  result.improvementTask.copyText = 'PRIVATE_TASK';
  const withheld = structuredClone(result); withheld.score = { ...withheld.score, status: 'withheld', value: null };
  withheld.criteria[0] = { ...withheld.criteria[0]!, status: 'not_observed', level: null, dimensionScore: null };
  await store.transaction(db => {
    db.assessments.done = { ...record('done'), status: 'done', result, shareId: 'PRIVATE_SHARE', visibility: 'public' };
    db.assessments.withheld = { ...record('withheld'), status: 'done', result: withheld };
    db.assessments.failed = { ...record('failed'), status: 'failed', result, failure: { stage: 'judgement', code: 'private-code', message: 'PRIVATE_ERROR', retryable: false } };
    db.assessments.draft = { ...record('draft'), prepared: { snapshot: { commitSha: 'c'.repeat(40) }, analysisContext: { secret: 'PRIVATE_CONTEXT' } } as unknown as PreparedAssessment };
  });
  const { body } = await call(store, `Bearer ${TOKEN}`);
  for (const row of body.assessments) {
    assert.deepEqual(Object.keys(row).sort(), ['assessment_id','repo_url','commit_sha','status','created_at','expires_at','score','criteria','visibility'].sort());
    if (row.score) assert.deepEqual(Object.keys(row.score).sort(), ['status', 'value']);
    for (const axis of row.criteria) assert.deepEqual(Object.keys(axis).sort(), ['criterion_code', 'status', 'level'].sort());
  }
  const find = (id: string) => body.assessments.find((r: { assessment_id: string }) => r.assessment_id === id);
  assert.equal(find('done').score.value, 71);
  assert.deepEqual(find('withheld').score, { status: 'withheld', value: null });
  assert.equal(find('withheld').criteria[0].level, null);
  assert.deepEqual(find('failed').criteria, []); assert.equal(find('failed').score, null);
  assert.equal(find('draft').commit_sha, 'c'.repeat(40)); assert.equal(find('draft').score, null);
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE_|owner_hash|ownerHash|prepared|share_id|rationale|answers|evidence|analysis_context/);
  assert.ok(!JSON.stringify(body).includes(TOKEN)); assert.ok(!JSON.stringify(body).includes(digest(TOKEN)));
});
