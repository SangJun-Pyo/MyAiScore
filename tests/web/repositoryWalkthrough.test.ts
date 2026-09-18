import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createApi } from '../../src/server/web/api.js';
import type { Store } from '../../src/server/web/store.js';

function isolatedApi() {
  const forbidden = () => { throw new Error('Walkthrough must not access storage or call a provider.'); };
  const store = new Proxy({} as Store, { get: forbidden });
  return createApi({ store, provider: forbidden, prepare: forbidden, questions: forbidden, finalize: forbidden, liveEnabled: false });
}

test('repository walkthrough works with no store/model and separates real collection from scripted interpretation', async () => {
  const response = await isolatedApi()(new Request('http://localhost/api/examples/myaiscore'), ['examples', 'myaiscore']);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.example_kind, 'repository_walkthrough');
  assert.equal(data.commit_sha, '5bd958bcbdfa1766a40052857d2641c1985cdd9c');
  assert.deepEqual([data.collection.read_files, data.collection.selected_files, data.collection.candidate_files], [40, 40, 285]);
  assert.equal(data.provenance.ingestion_status, 'complete');
  assert.ok(data.collection.content_bytes > 0 && data.collection.content_bytes <= 800 * 1024);
  assert.ok(data.collection.fetched_bytes > data.collection.content_bytes);
  assert.equal(data.comparison.original_read_files, 34);
  assert.equal(data.comparison.original_commit_sha, data.commit_sha);
  assert.ok(data.skipped_files.length > 0);
  const readPaths = new Set(data.assessment.evidence.map((e: any) => e.path));
  assert.ok(data.skipped_files.every((s: any) => !readPaths.has(s.path) && typeof s.reason === 'string'));
  assert.equal(data.provenance.user_answer_count, 0);
  assert.equal(data.provenance.service_model_calls, 0);
  const result = data.assessment.result;
  assert.equal(result.mode, 'mock');
  assert.equal(result.source, 'github_repository');
  assert.equal(result.confidence.process_evidence, 'none');
  assert.equal(result.score.status, 'withheld');
  assert.equal(result.score.value, null);
  assert.deepEqual(result.score.reasons, ['insufficient_dimensions']);
  for (const key of ['evaluator_model_id', 'executed_at', 'tokens_used', 'cost_usd']) assert.equal(result.manifest[key], null);
  assert.ok(result.criteria.every((c: any) => c.status === 'insufficient_evidence' && c.level === null && c.dimension_score === null));
  const evidenceIds = new Set(result.evidence.map((e: any) => e.evidence_id));
  assert.equal(evidenceIds.size, 40);
  assert.ok(result.evidence.every((e: any) => e.collection_method === 'github_api' && e.commit_sha === data.commit_sha));
  for (const q of data.questions) assert.ok(q.grounding_evidence_ids.every((id: string) => evidenceIds.has(id)));
  for (const c of result.criteria) assert.ok(c.supporting_evidence_ids.every((id: string) => evidenceIds.has(id)));
  // The captured generator used LF; Git's Windows checkout may materialize CRLF.
  const generator = (await readFile(new URL('../../scripts/buildMyAiScoreWalkthrough.ts', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  assert.equal(data.provenance.generator_sha256, createHash('sha256').update(generator).digest('hex'));
});

test('original partial run and its exact generator remain available as historical evidence', async () => {
  const original = JSON.parse(await readFile(new URL('../../fixtures/walkthroughs/myaiscore.json', import.meta.url), 'utf8'));
  assert.equal(original.collection.read_files, 34);
  assert.equal(original.collection.fetched_bytes, 819270);
  assert.equal(original.provenance.ingestion_status, 'partial');
  const generator = (await readFile(new URL('../../fixtures/walkthroughs/buildMyAiScoreWalkthrough.v1.ts.txt', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  assert.equal(original.provenance.generator_sha256, createHash('sha256').update(generator).digest('hex'));
});

test('curated walkthrough contains no prepared context, source contents, answers or access credentials', async () => {
  const data = await (await isolatedApi()(new Request('http://localhost/api/examples/myaiscore'), ['examples', 'myaiscore'])).json();
  const forbiddenKeys = new Set(['analysisContext', 'analysis_context', 'redactedContent', 'redacted_content', 'bodyText', 'raw', 'collaborationCase', 'collaboration_case', 'answers', 'owner_access_token', 'ownerHash', 'owner_hash']);
  function inspect(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) { assert.equal(forbiddenKeys.has(key), false, key); inspect(child); }
  }
  inspect(data);
  assert.equal(data.assessment.is_example, true);
  assert.equal(data.assessment.executed_at, null);
});

test('walkthrough mutation and action routes are rejected before store access; starter is unchanged', async () => {
  const api = isolatedApi();
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await api(new Request('http://localhost/api/examples/myaiscore', { method }), ['examples', 'myaiscore']);
    assert.equal(response.status, 405);
  }
  assert.equal((await api(new Request('http://localhost/api/examples/myaiscore/finalize'), ['examples', 'myaiscore', 'finalize'])).status, 404);
  const starter = await (await api(new Request('http://localhost/api/examples/starter'), ['examples', 'starter'])).json();
  assert.equal(starter.example_kind, 'synthetic');
  assert.equal(starter.result.source, 'synthetic');
  assert.equal(starter.result.score.value, 71);
});
