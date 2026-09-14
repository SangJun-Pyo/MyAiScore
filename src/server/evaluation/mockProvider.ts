/**
 * A test/offline-only EvaluationProvider that returns a canned response the
 * caller supplies. It never inspects a fixture's expected.json or otherwise
 * computes a "correct" answer -- it is a transport double, not a scoring
 * shortcut (docs/Development/ASTRA_PHASE1_REVIEW.md,
 * CLAUDE_PHASE2_OFFLINE_PROMPT.md section B).
 *
 * Astra Phase 2 review (R2) requires proof that real request wiring (typed
 * request objects carrying trusted instructions + untrusted content) reaches
 * the provider at all -- this class now *records* the exact request object
 * each call received (`lastQuestionRequest`/`lastJudgementRequest`), so
 * tests can assert on it directly instead of trusting that the plumbing
 * exists. It optionally never resolves (`neverResolveQuestions`/
 * `neverResolveJudgement`), to let tests exercise the real timeout wrapper
 * (timeout.ts) against a call that truly never completes on its own, as
 * opposed to a canned `providerError: {code: "timeout"}` response (which
 * only tests that validators handle a timeout-shaped error, not that a
 * runaway call actually gets cut off).
 */
import type { EvaluationMode, EvaluationProvider, RawProviderOutput } from "./provider.js";
import type { JudgementRequest, QuestionGenerationRequest } from "./providerRequest.js";

export class MockProvider implements EvaluationProvider {
  readonly mode: EvaluationMode = "mock";
  readonly providerId = "mock-fixed-response";

  lastQuestionRequest: QuestionGenerationRequest | null = null;
  lastJudgementRequest: JudgementRequest | null = null;

  constructor(
    private readonly config: {
      questionsResponse: RawProviderOutput;
      judgementResponse: RawProviderOutput;
      /** If true, generateQuestions()'s returned promise never settles -- only an external timeout race can end the call. */
      neverResolveQuestions?: boolean;
      /** Same, for judgeCriteria(). */
      neverResolveJudgement?: boolean;
    },
  ) {}

  async generateQuestions(request: QuestionGenerationRequest): Promise<RawProviderOutput> {
    this.lastQuestionRequest = request;
    if (this.config.neverResolveQuestions) {
      return new Promise<RawProviderOutput>(() => {
        /* deliberately never settles */
      });
    }
    return this.config.questionsResponse;
  }

  async judgeCriteria(request: JudgementRequest): Promise<RawProviderOutput> {
    this.lastJudgementRequest = request;
    if (this.config.neverResolveJudgement) {
      return new Promise<RawProviderOutput>(() => {
        /* deliberately never settles */
      });
    }
    return this.config.judgementResponse;
  }
}
