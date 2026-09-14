import type { HttpClient, HttpResponse } from "./httpClient.js";

export interface FixtureResponse {
  status: number;
  headers?: Record<string, string>;
  body: unknown;
}

/**
 * Deterministic, network-free HttpClient for tests. Fixtures are keyed by
 * an exact URL match. A URL can map to an array of responses, consumed in
 * order, to simulate "fails once then succeeds on retry" scenarios.
 *
 * If a requested URL has no fixture, this throws loudly rather than
 * silently falling through to a default -- an unexpected request in a test
 * usually means the code under test changed its call pattern.
 */
export class OfflineHttpClient implements HttpClient {
  private readonly calls: string[] = [];
  private readonly queues = new Map<string, FixtureResponse[]>();

  constructor(fixtures: Record<string, FixtureResponse | FixtureResponse[]>) {
    for (const [url, value] of Object.entries(fixtures)) {
      this.queues.set(url, Array.isArray(value) ? [...value] : [value]);
    }
  }

  getCallLog(): readonly string[] {
    return this.calls;
  }

  async request(url: string): Promise<HttpResponse> {
    this.calls.push(url);
    const queue = this.queues.get(url);
    if (!queue || queue.length === 0) {
      throw new Error(`OfflineHttpClient: no fixture registered for ${url}`);
    }
    const next = queue.length > 1 ? queue.shift()! : queue[0]!;
    return {
      status: next.status,
      headers: next.headers ?? {},
      bodyText: typeof next.body === "string" ? next.body : JSON.stringify(next.body),
    };
  }
}
