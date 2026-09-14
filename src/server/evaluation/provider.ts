/**
 * Provider-independent interface for question generation and criterion
 * judgement. Task 2a implements only MockProvider (mockProvider.ts); a real
 * provider (Task 2b, out of this phase's scope) implements the same
 * interface against an actual model SDK. No code outside this file and
 * mockProvider.ts should need to change when that happens.
 *
 * Astra Phase 2 review (R2): methods now take the actual typed request
 * (providerRequest.ts) and an AbortSignal so a real provider can honor a
 * timeout/cancellation, instead of being called with no arguments at all.
 */
import type { JudgementRequest, QuestionGenerationRequest } from "./providerRequest.js";

export type EvaluationMode = "mock" | "live";

export interface ProviderError {
  code: "timeout" | "provider_failure" | "rate_limited";
  message: string;
  retryable: boolean;
}

/**
 * `raw` is whatever the provider returned, completely unvalidated -- the
 * questionGeneration/criterionJudgement modules are responsible for parsing
 * and validating it. `providerError` is set instead of `raw` for
 * transport-level failures (timeout, 5xx, rate limit) that never produced a
 * response to validate.
 */
export interface RawProviderOutput {
  raw?: unknown;
  providerError?: ProviderError;
}

export interface EvaluationProvider {
  readonly mode: EvaluationMode;
  /** "mock-fixed-response" in this phase. A real model id only when mode === "live". */
  readonly providerId: string;
  generateQuestions(request: QuestionGenerationRequest, signal: AbortSignal): Promise<RawProviderOutput>;
  judgeCriteria(request: JudgementRequest, signal: AbortSignal): Promise<RawProviderOutput>;
}
