/**
 * Races a provider call against a hard timeout. Astra Phase 2 review (R2):
 * "끝나지 않는 provider/throw 예외도 제한 시간/명시적 실패로 종료하고 늦은
 * 응답을 무시한다." A provider that never resolves must not hang the
 * pipeline forever; a provider call that throws must not crash it either.
 *
 * The AbortSignal is passed to the provider so a real (Task 2b) provider can
 * cancel its own in-flight request. A MockProvider that never resolves
 * ignores the signal (there is nothing to cancel), but the caller still gets
 * an explicit timeout result on schedule -- and whatever the abandoned
 * promise does afterward (resolve or reject) is discarded here, never
 * flowing into the pipeline's result.
 */
import type { RawProviderOutput } from "./provider.js";

export type TimeoutResult<T> = { timedOut: false; value: T } | { timedOut: true };

export async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<TimeoutResult<T>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<TimeoutResult<T>>((resolvePromise) => {
    timer = setTimeout(() => {
      controller.abort();
      resolvePromise({ timedOut: true });
    }, timeoutMs);
  });

  // A rejecting/throwing provider call is NOT a timeout -- it propagates as a
  // normal rejection so the caller can turn it into an explicit providerError
  // distinct from a genuine timeout. Only the dedicated timeoutPromise above
  // produces {timedOut: true}. If the timeout wins the race, this promise's
  // eventual settlement (resolve or reject) is simply never observed again.
  try {
    // Defer invocation so a synchronous throw is a rejection covered by the
    // race and finally, just like an asynchronous transport failure.
    const callPromise: Promise<TimeoutResult<T>> = Promise.resolve()
      .then(() => fn(controller.signal))
      .then((value) => ({ timedOut: false, value }));
    return await Promise.race([callPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Transport errors must not copy credentials, excerpts or internal paths into results. */
export async function invokeProviderSafely(
  fn: (signal: AbortSignal) => Promise<RawProviderOutput>,
  timeoutMs: number,
): Promise<RawProviderOutput> {
  try {
    const result = await withTimeout(fn, timeoutMs);
    if (result.timedOut) {
      return { providerError: { code: "timeout", message: `provider call exceeded ${timeoutMs}ms`, retryable: true } };
    }
    // Even provider-shaped transport errors can contain raw upstream text.
    if (result.value?.providerError) {
      const code = result.value.providerError.code;
      return { providerError: {
        code: code === "timeout" || code === "rate_limited" ? code : "provider_failure",
        message: code === "timeout" ? "Provider timed out." : code === "rate_limited" ? "Provider rate limit reached." : "Provider request failed.",
        retryable: result.value.providerError.retryable === true,
      } };
    }
    return result.value;
  } catch {
    return { providerError: { code: "provider_failure", message: "Provider request failed.", retryable: false } };
  }
}
