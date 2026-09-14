/**
 * Minimal HTTP abstraction so the GitHub adapter can be driven by either a
 * real fetch() implementation or a deterministic offline fixture during
 * tests. Nothing in this file talks to a specific host -- callers pass a
 * full URL.
 */

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
}

export interface HttpClient {
  request(url: string, init?: { headers?: Record<string, string> }): Promise<HttpResponse>;
}

/** Real HTTP client backed by the platform fetch(). Used for the live smoke test. */
export class FetchHttpClient implements HttpClient {
  async request(url: string, init?: { headers?: Record<string, string> }): Promise<HttpResponse> {
    const res = await fetch(url, { headers: init?.headers, redirect: "manual" });
    // redirect: "manual" -- we never silently follow a redirect to an
    // unexpected host (PRIVACY_SECURITY.md section 4 / GITHUB_INGESTION.md
    // section 1: do not follow arbitrary redirects).
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const bodyText = await res.text();
    return { status: res.status, headers, bodyText };
  }
}
