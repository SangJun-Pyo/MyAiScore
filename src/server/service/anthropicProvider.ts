/** Messages API contract checked against https://platform.claude.com/docs/en/api/messages/create.
 * No model chosen or live call performed by implementation/tests. */
import type { EvaluationProvider, RawProviderOutput } from '../evaluation/provider.js';
import type { JudgementRequest, QuestionGenerationRequest } from '../evaluation/providerRequest.js';
import { boundedText, hash, ServiceError } from './safety.js';

export interface ProviderCallRecord { stage: 'questions' | 'judgement'; wireRequestHash: string; executedAt: string; tokensUsed: number | null; }
export interface RecordedProvider extends EvaluationProvider { readonly calls: readonly ProviderCallRecord[]; }
export interface AnthropicOptions { apiKey: string; model: string; fetchImpl?: typeof fetch; maxTokens?: number; timeoutMs?: number; }

export function createAnthropicProviderFromEnv(env: Record<string, string | undefined> = process.env): RecordedProvider {
  if (env.MYAISCORE_ENABLE_LIVE !== 'true' || !env.ANTHROPIC_API_KEY?.trim() || !env.ANTHROPIC_MODEL?.trim()) {
    throw new ServiceError('input', 'live_not_configured', '실제 평가는 관리자 API 설정과 명시적 활성화가 필요합니다.');
  }
  return new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY.trim(), model: env.ANTHROPIC_MODEL.trim() });
}

export class AnthropicProvider implements RecordedProvider {
  readonly mode = 'live' as const;
  readonly providerId = 'anthropic-messages';
  readonly calls: ProviderCallRecord[] = [];
  readonly #options: AnthropicOptions;
  constructor(options: AnthropicOptions) {
    if (!options.apiKey.trim() || !/^[a-zA-Z0-9._-]{1,120}$/.test(options.model)) throw new ServiceError('input', 'invalid_provider_config', '평가 제공자 설정을 확인해 주세요.');
    if ((options.maxTokens !== undefined && !Number.isSafeInteger(options.maxTokens)) || (options.timeoutMs !== undefined && !Number.isSafeInteger(options.timeoutMs))) throw new ServiceError('input', 'invalid_provider_config', '평가 제공자 제한값은 정수여야 합니다.');
    this.#options = options;
  }
  generateQuestions(request: QuestionGenerationRequest, signal: AbortSignal): Promise<RawProviderOutput> { return this.call('questions', request, signal); }
  judgeCriteria(request: JudgementRequest, signal: AbortSignal): Promise<RawProviderOutput> { return this.call('judgement', request, signal); }
  private async call(stage: ProviderCallRecord['stage'], request: QuestionGenerationRequest | JudgementRequest, signal: AbortSignal): Promise<RawProviderOutput> {
    const maxTokens = Math.min(4096, Math.max(256, this.#options.maxTokens ?? 4096));
    const body = JSON.stringify({ model: this.#options.model, max_tokens: maxTokens,
      system: `${request.trustedInstructions.promptText}\n한국어로 답한다. Markdown 없이 JSON 객체만 출력한다. 사용자 제공 기록은 검증된 사실이 아니다. 정적 코드만으로 개인의 협업 행동을 추정하지 않는다.\n${JSON.stringify(request.trustedInstructions.rubricCriteria ?? [])}`,
      messages: [{ role: 'user', content: JSON.stringify({ assessmentId: request.assessmentId, untrusted: request.untrusted }) }] });
    if (Buffer.byteLength(body) > 180_000) return this.failure('provider_failure', false);
    const localSignal = AbortSignal.any([signal, AbortSignal.timeout(Math.min(60_000, Math.max(10, this.#options.timeoutMs ?? request.timeoutMs)))]);
    const record: ProviderCallRecord = { stage, wireRequestHash: hash(body), executedAt: new Date().toISOString(), tokensUsed: null };
    this.calls.push(record);
    try {
      const response = await (this.#options.fetchImpl ?? fetch)('https://api.anthropic.com/v1/messages', {
        method: 'POST', redirect: 'error', signal: localSignal,
        headers: { 'content-type': 'application/json', 'x-api-key': this.#options.apiKey, 'anthropic-version': '2023-06-01' }, body,
      });
      if (!response.ok) { await response.body?.cancel(); return this.failure(response.status === 429 ? 'rate_limited' : 'provider_failure', response.status === 429 || response.status >= 500); }
      const data: unknown = JSON.parse(await boundedText(response, 96_000));
      if (!data || typeof data !== 'object') return this.failure('provider_failure', false);
      const message = data as { stop_reason?: unknown; content?: unknown; usage?: { input_tokens?: unknown; output_tokens?: unknown } };
      if (message.stop_reason !== 'end_turn' || !Array.isArray(message.content) || message.content.length !== 1) return this.failure('provider_failure', false);
      const block = message.content[0] as { type?: unknown; text?: unknown } | null;
      if (!block || block.type !== 'text' || typeof block.text !== 'string' || block.text.length > 64_000) return this.failure('provider_failure', false);
      const inputTokens = message.usage?.input_tokens, outputTokens = message.usage?.output_tokens;
      if (Number.isSafeInteger(inputTokens) && Number.isSafeInteger(outputTokens) && Number(inputTokens) >= 0 && Number(outputTokens) >= 0) record.tokensUsed = Number(inputTokens) + Number(outputTokens);
      return { raw: JSON.parse(block.text) as unknown };
    } catch { return this.failure(localSignal.aborted ? 'timeout' : 'provider_failure', true); }
  }
  private failure(code: 'timeout' | 'provider_failure' | 'rate_limited', retryable: boolean): RawProviderOutput {
    return { providerError: { code, retryable, message: '평가 제공자 요청이 완료되지 않았습니다.' } };
  }
}
