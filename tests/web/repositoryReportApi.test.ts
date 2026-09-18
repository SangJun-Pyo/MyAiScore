import test from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../../src/server/web/api.js";
import { buildRepositoryReport } from "../../src/server/repositoryReport/report.js";
import { RepositoryReportAdmission, RepositoryReportError } from "../../src/server/repositoryReport/service.js";
import type { IngestionSnapshot } from "../../src/shared/contracts/ingestion.js";
import type { Store } from "../../src/server/web/store.js";

const snapshot: IngestionSnapshot = {
  schemaVersion: "ingestion-snapshot-v0.3.1", repo: "acme/api", commitSha: "a".repeat(40), collectorVersion: "test", selectionDigest: "test",
  ingestionStatus: "complete", supportStatus: "other", collectedAt: "2026-09-18T00:00:00Z",
  files: [{ path: "README.md", blobSha: "b".repeat(40), byteSize: 1, contentSha256: "c".repeat(64), lineCount: 1, redactedContent: "private body", secretPatternMasked: false }],
  staticSignals: { basis: "selected_files", languageFileCounts: {}, dependencies: [], testPaths: [], ciPaths: [], aiConfigPaths: [] }, evidenceCandidates: [],
  coverage: { treeTruncated: false, candidateFiles: 1, selectedFiles: 1, readFiles: 1, selectionLimited: false }, skippedFiles: [], warnings: [], failure: null,
  metrics: { durationMs: 0, httpRequests: 4, fetchedBytes: 10, contentBytes: 1, cacheHits: 0 },
};
const report = buildRepositoryReport(snapshot);

const forbiddenStore: Store = {
  async read() { throw new Error("repository-report must not read storage"); },
  async transaction() { throw new Error("repository-report must not write storage"); },
};

async function request(handle: ReturnType<typeof createApi>, method: string, body?: unknown) {
  const response = await handle(new Request("http://localhost/api/repository-report", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), ["repository-report"]);
  return { status: response.status, body: await response.json() };
}

test("POST repository-report is stateless, login-free and never exposes the configured token", async () => {
  const token = "github-server-token";
  let calls = 0;
  const handle = createApi({
    store: forbiddenStore,
    githubToken: token,
    repositoryReport: async (input, options) => {
      calls++;
      assert.deepEqual(input, { repoUrl: "https://github.com/acme/api" });
      assert.equal(options?.authToken, token);
      return report;
    },
  });
  const result = await request(handle, "POST", { repo_url: "https://github.com/acme/api" });
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(result.body, report);
  assert.doesNotMatch(JSON.stringify(result.body), new RegExp(token));
});

test("repository-report rejects malformed bodies and unsupported methods before collection or storage", async () => {
  let calls = 0;
  const handle = createApi({ store: forbiddenStore, repositoryReport: async () => { calls++; return report; } });
  for (const body of [{}, { repo_url: 4 }, { repo_url: "https://github.com/acme/api", extra: true }]) {
    const result = await request(handle, "POST", body);
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "invalid_input");
  }
  assert.equal((await request(handle, "GET")).status, 405);
  assert.equal(calls, 0);
});

test("invalid repository URLs are rejected before consuming the anonymous admission slot", async () => {
  let calls = 0;
  const admission = new RepositoryReportAdmission({ anonymousMaxStarts: 1, anonymousWindowMs: 3_600_000 });
  const handle = createApi({
    store: forbiddenStore,
    githubToken: null,
    repositoryReportAdmission: admission,
    repositoryReport: async input => {
      calls++;
      assert.deepEqual(input, { repoUrl: "https://github.com/acme/api" });
      return report;
    },
  });
  const invalid = await request(handle, "POST", { repo_url: "https://example.com/not-github" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "unsupported_host");
  assert.equal((await request(handle, "POST", { repo_url: "https://github.com/acme/api.git" })).status, 200);
  assert.equal(calls, 1);
});

test("local standalone requests accept equivalent loopback aliases but reject other origins and ports", async () => {
  let calls = 0;
  const handle = createApi({ githubToken: "server-token", store: forbiddenStore, repositoryReport: async () => { calls++; return report; } });
  const invoke = async (origin: string) => {
    const response = await handle(new Request("http://localhost:3104/api/repository-report", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ repo_url: "https://github.com/acme/api" }),
    }), ["repository-report"]);
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await invoke("http://127.0.0.1:3104")).status, 200);
  assert.equal((await invoke("http://127.0.0.1:3105")).body.error.code, "forbidden_origin");
  assert.equal((await invoke("https://evil.example")).body.error.code, "forbidden_origin");
  assert.equal(calls, 1);
});

test("repository-report maps private repository rejection without leaking collector details", async () => {
  const handle = createApi({
    store: forbiddenStore,
    repositoryReport: async () => { throw new RepositoryReportError(404, "repo_not_found_or_private", "공개 저장소를 찾을 수 없어요. 비공개 저장소는 분석하지 않아요."); },
  });
  const result = await request(handle, "POST", { repo_url: "https://github.com/acme/private" });
  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { error: { code: "repo_not_found_or_private", message: "공개 저장소를 찾을 수 없어요. 비공개 저장소는 분석하지 않아요.", retryable: false } });
});

test("anonymous repository-report admission is shared, concurrency-bounded and enters cooldown after rate exhaustion", async () => {
  let time = 0;
  const admission = new RepositoryReportAdmission({ maxConcurrent: 1, anonymousMaxStarts: 2, anonymousWindowMs: 1_000, tokenMaxStarts: 2, tokenWindowMs: 1_000, cooldownMs: 500, now: () => time });
  let unblock!: () => void;
  let started!: () => void;
  const startedPromise = new Promise<void>(resolve => { started = resolve; });
  const blocked = new Promise<void>(resolve => { unblock = resolve; });
  const first = createApi({ store: forbiddenStore, repositoryReportAdmission: admission, repositoryReport: async () => { started(); await blocked; return report; } });
  const second = createApi({ store: forbiddenStore, repositoryReportAdmission: admission, repositoryReport: async () => report });
  const pending = request(first, "POST", { repo_url: "https://github.com/acme/api" });
  await startedPromise;
  assert.equal((await request(second, "POST", { repo_url: "https://github.com/acme/api" })).body.error.code, "repository_report_busy");
  unblock();
  assert.equal((await pending).status, 200);
  assert.equal((await request(second, "POST", { repo_url: "https://github.com/acme/api" })).status, 200);
  const limited = await request(second, "POST", { repo_url: "https://github.com/acme/api" });
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, "repository_report_rate_limited");
  time = 400;
  assert.equal((await request(second, "POST", { repo_url: "https://github.com/acme/api" })).body.error.code, "repository_report_rate_limited");
  time = 1_001;
  assert.equal((await request(second, "POST", { repo_url: "https://github.com/acme/api" })).status, 200);
});
