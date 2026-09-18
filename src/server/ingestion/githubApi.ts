import type { HttpClient } from "./httpClient.js";
import type { IngestionBudget } from "./budget.js";

export interface RepoMeta {
  defaultBranch: string;
  isPrivate: boolean;
}

export interface TreeEntry {
  path: string;
  /** git file modes: "100644" file, "100755" executable, "120000" symlink, "160000" submodule, "040000" dir */
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

export interface TreeResult {
  truncated: boolean;
  entries: TreeEntry[];
}

export interface BlobResult {
  sha: string;
  size: number;
  encoding: string;
  content: string;
}

export type GithubApiError =
  | { kind: "not_found" }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "server_error"; status: number }
  | { kind: "budget_exceeded"; reason: "time_budget" | "request_budget" }
  | { kind: "unexpected_status"; status: number }
  | { kind: "network_error"; message: string };

export type GithubApiResult<T> = { ok: true; value: T } | { ok: false; error: GithubApiError };

const API_BASE = "https://api.github.com";
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Thin, testable wrapper over the subset of the GitHub REST API this PoC
 * needs. All requests go through the injected HttpClient so tests can drive
 * this with offline fixtures instead of the network (GITHUB_INGESTION.md
 * section 7). Retries at most once per request, and every request is
 * accounted against the shared IngestionBudget.
 */
export class GithubApiClient {
  constructor(
    private readonly http: HttpClient,
    private readonly budget: IngestionBudget,
    private readonly authToken?: string,
  ) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "myaiscore-phase1-poc",
    };
    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  private async requestJson<T>(path: string): Promise<GithubApiResult<T>> {
    if (!this.budget.canMakeRequest()) {
      return { ok: false, error: { kind: "budget_exceeded", reason: this.budget.timeExceeded() ? "time_budget" : "request_budget" } };
    }
    const url = `${API_BASE}${path}`;
    let attempt = 0;
    // At most one retry per request (INGESTION_LIMITS.maxRetriesPerRequest), and
    // never past the overall request/time budget.
    for (;;) {
      if (!this.budget.canMakeRequest()) {
        return { ok: false, error: { kind: "budget_exceeded", reason: this.budget.timeExceeded() ? "time_budget" : "request_budget" } };
      }
      this.budget.recordRequest();
      let res;
      try {
        res = await this.http.request(url, { headers: this.buildHeaders() });
      } catch (err) {
        if (this.budget.timeExceeded()) {
          return { ok: false, error: { kind: "budget_exceeded", reason: "time_budget" } };
        }
        return { ok: false, error: { kind: "network_error", message: String(err) } };
      }

      this.budget.recordResponseBodyBytes(Buffer.byteLength(res.bodyText, "utf8"));
      if (this.budget.timeExceeded()) {
        return { ok: false, error: { kind: "budget_exceeded", reason: "time_budget" } };
      }

      if (res.status === 404) {
        return { ok: false, error: { kind: "not_found" } };
      }
      if (res.status === 403 || res.status === 429) {
        const remaining = res.headers["x-ratelimit-remaining"];
        const looksRateLimited = res.status === 429 || remaining === "0";
        if (looksRateLimited && attempt < 1) {
          attempt += 1;
          continue; // one retry, budget already re-checked at loop top
        }
        const retryAfterHeader = res.headers["retry-after"];
        return {
          ok: false,
          error: {
            kind: "rate_limited",
            retryAfterSeconds: retryAfterHeader ? Number(retryAfterHeader) : null,
          },
        };
      }
      if (res.status >= 500) {
        if (attempt < 1) {
          attempt += 1;
          continue;
        }
        return { ok: false, error: { kind: "server_error", status: res.status } };
      }
      if (res.status < 200 || res.status >= 300) {
        return { ok: false, error: { kind: "unexpected_status", status: res.status } };
      }

      try {
        return { ok: true, value: JSON.parse(res.bodyText) as T };
      } catch (err) {
        return { ok: false, error: { kind: "network_error", message: `invalid JSON: ${String(err)}` } };
      }
    }
  }

  async getRepoMeta(owner: string, repo: string): Promise<GithubApiResult<RepoMeta>> {
    const result = await this.requestJson<{ default_branch: string; private: boolean }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
    if (!result.ok) return result;
    if (typeof result.value.default_branch !== "string" || !result.value.default_branch || result.value.default_branch.length > 512 ||
        CONTROL_CHARS.test(result.value.default_branch) || result.value.default_branch.includes("..") || result.value.default_branch.includes(" ") ||
        (result.value.private !== false && result.value.private !== true)) {
      return { ok: false, error: { kind: "network_error", message: "invalid repository metadata" } };
    }
    return {
      ok: true,
      value: { defaultBranch: result.value.default_branch, isPrivate: result.value.private },
    };
  }

  /** Resolves a branch/tag/sha ref to a full 40-char commit SHA. */
  async resolveCommitSha(owner: string, repo: string, ref: string): Promise<GithubApiResult<string>> {
    const result = await this.requestJson<{ sha: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`,
    );
    if (!result.ok) return result;
    if (typeof result.value.sha !== "string" || !/^[a-f0-9]{40}$/i.test(result.value.sha)) {
      return { ok: false, error: { kind: "network_error", message: "invalid commit metadata" } };
    }
    return { ok: true, value: result.value.sha };
  }

  /** Recursive tree listing for a fixed commit SHA. Never re-resolves a moving ref. */
  async getTree(owner: string, repo: string, commitSha: string): Promise<GithubApiResult<TreeResult>> {
    const result = await this.requestJson<{ truncated: boolean; tree: TreeEntry[] }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${commitSha}?recursive=1`,
    );
    if (!result.ok) return result;
    if (typeof result.value.truncated !== "boolean" || !Array.isArray(result.value.tree) || result.value.tree.some(entry =>
      !entry || typeof entry.path !== "string" || entry.path.length < 1 || entry.path.length > 4_096 || CONTROL_CHARS.test(entry.path) ||
      typeof entry.mode !== "string" || !["blob", "tree", "commit"].includes(entry.type) ||
      typeof entry.sha !== "string" || entry.sha.length < 1 || entry.sha.length > 100 ||
      (entry.size !== undefined && (!Number.isSafeInteger(entry.size) || entry.size < 0)))) {
      return { ok: false, error: { kind: "network_error", message: "invalid tree metadata" } };
    }
    return { ok: true, value: { truncated: result.value.truncated, entries: result.value.tree } };
  }

  async getBlob(owner: string, repo: string, blobSha: string): Promise<GithubApiResult<BlobResult>> {
    return this.requestJson<BlobResult>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${blobSha}`,
    );
  }
}
