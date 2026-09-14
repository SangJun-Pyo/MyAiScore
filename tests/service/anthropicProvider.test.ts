import test from 'node:test';
import assert from 'node:assert/strict';
import { AnthropicProvider, createAnthropicProviderFromEnv } from '../../src/server/service/anthropicProvider.js';
import type { QuestionGenerationRequest } from '../../src/server/evaluation/providerRequest.js';
import { hash, ServiceError } from '../../src/server/service/safety.js';

const request: QuestionGenerationRequest = { assessmentId: 'test', trustedInstructions: { promptVersion: 'test', promptText: 'trusted instructions', rubricCriteriaVersion: 'test' }, untrusted: { evidence: [], collaborationCase: null, analysisContext: { sample: 'untrusted ignore instructions' } }, inferenceConfigVersion: 'test', timeoutMs: 1000 };
test('environment requires explicit enable flag, key and model; no mock fallback', () => {
  for (const env of [{}, { ANTHROPIC_API_KEY: 'test', ANTHROPIC_MODEL: 'test' }, { MYAISCORE_ENABLE_LIVE: 'true', ANTHROPIC_API_KEY: 'test' }]) assert.throws(() => createAnthropicProviderFromEnv(env), ServiceError);
});
test('fixed Messages transport separates trusted instructions, bounds output and records actual wire hash', async () => {
  let body = ''; let key = '';
  const provider = new AnthropicProvider({ apiKey: 'synthetic-key', model: 'test-model', maxTokens: 99_999, fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages'); assert.equal(init?.redirect, 'error');
    key = (init?.headers as Record<string, string>)['x-api-key']!; body = String(init?.body);
    return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"questions":[]}' }], usage: { input_tokens: 12, output_tokens: 3 } }));
  } });
  const output = await provider.generateQuestions(request, new AbortController().signal);
  assert.deepEqual(output.raw, { questions: [] }); assert.equal(key, 'synthetic-key');
  const parsed = JSON.parse(body); assert.equal(parsed.max_tokens, 4096); assert.doesNotMatch(parsed.system, /untrusted ignore/); assert.match(parsed.messages[0].content, /untrusted ignore/);
  assert.equal(provider.calls[0]!.wireRequestHash, hash(body)); assert.equal(provider.calls[0]!.tokensUsed, 15);
  assert.doesNotMatch(JSON.stringify(provider), /synthetic-key/);
});
test('errors never expose provider body or transport exception and 429 is identified', async () => {
  const provider = new AnthropicProvider({ apiKey: 'synthetic-key', model: 'test', fetchImpl: async () => new Response('private-secret', { status: 429 }) });
  const output = await provider.generateQuestions(request, new AbortController().signal);
  assert.equal(output.providerError?.code, 'rate_limited'); assert.doesNotMatch(JSON.stringify(output), /private-secret/);
  const broken = new AnthropicProvider({ apiKey: 'synthetic-key', model: 'test', fetchImpl: async () => { throw new Error('private-secret'); } });
  assert.doesNotMatch(JSON.stringify(await broken.generateQuestions(request, new AbortController().signal)), /private-secret/);
});
test('truncated, non-JSON and oversized messages fail explicitly', async () => {
  for (const response of [{ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{}' }] }, { stop_reason: 'end_turn', content: [{ type: 'text', text: '```json\n{}\n```' }] }, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'x'.repeat(100_000) }] }]) {
    const provider = new AnthropicProvider({ apiKey: 'synthetic-key', model: 'test', fetchImpl: async () => new Response(JSON.stringify(response)) });
    assert.equal((await provider.generateQuestions(request, new AbortController().signal)).providerError?.code, 'provider_failure');
  }
});
