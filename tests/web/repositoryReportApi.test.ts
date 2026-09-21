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

async function leaderboardRequest(handle: ReturnType<typeof createApi>, method: string, body?: unknown, url = "http://localhost/api/leaderboard") {
  const response = await handle(new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), ["leaderboard"]);
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
  const invoke = async (origin: string, target = "http://localhost:3104/api/repository-report") => {
    const response = await handle(new Request(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ repo_url: "https://github.com/acme/api" }),
    }), ["repository-report"]);
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await invoke("http://127.0.0.1:3104")).status, 200);
  assert.equal((await invoke("http://[::1]:3104")).status, 200);
  assert.equal((await invoke("https://app.example", "https://app.example/api/repository-report")).status, 200);
  assert.equal((await invoke("http://127.0.0.1:3105")).body.error.code, "forbidden_origin");
  assert.equal((await invoke("https://evil.example")).body.error.code, "forbidden_origin");
  for (const malformed of [
    "", "null", "blob:https://app.example/id", "http://user:password@127.0.0.1:3104/private",
    "http://127.0.0.1:3104/", "http://127.0.0.1:3104/?x=1#private",
  ]) assert.equal((await invoke(malformed)).body.error.code, "forbidden_origin");
  assert.equal(calls, 3);
});

test("same-origin requests behind an HTTPS deployment proxy use the public host without trusting malformed forwarding headers", async () => {
  let calls = 0;
  const handle = createApi({ repositoryReport: async () => { calls += 1; return report; }, githubToken: "configured" });
  const invoke = async (headers: Record<string, string>) => handle(new Request("http://myaiscore.railway.internal:8080/api/repository-report", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ repo_url: "https://github.com/example/project" }),
  }), ["repository-report"]);

  assert.equal((await invoke({ origin: "https://myaiscore-production.up.railway.app", host: "myaiscore-production.up.railway.app", "x-forwarded-proto": "https" })).status, 200);
  assert.equal((await invoke({ origin: "https://evil.example", host: "myaiscore-production.up.railway.app", "x-forwarded-proto": "https" })).status, 403);
  assert.equal((await invoke({ origin: "http://myaiscore.railway.internal:8080", host: "myaiscore-production.up.railway.app", "x-forwarded-proto": "https" })).status, 403);
  assert.equal((await invoke({ origin: "http://localhost:8080", host: "myaiscore-production.up.railway.app", "x-forwarded-proto": "https" })).status, 403);
  assert.equal((await invoke({ origin: "http://127.0.0.1:8080", host: "myaiscore-production.up.railway.app", "x-forwarded-proto": "https" })).status, 403);
  assert.equal((await invoke({ origin: "https://myaiscore-production.up.railway.app", host: "myaiscore-production.up.railway.app", "x-forwarded-proto": "http" })).status, 403);
  assert.equal((await invoke({ origin: "https://myaiscore-production.up.railway.app", host: "myaiscore-production.up.railway.app", "x-forwarded-proto": "https,http" })).status, 403);
  assert.equal((await invoke({ origin: "https://myaiscore-production.up.railway.app", host: "user@myaiscore-production.up.railway.app", "x-forwarded-proto": "https" })).status, 403);
  for (const host of ["myaiscore-production.up.railway.app?", "myaiscore-production.up.railway.app#", "myaiscore-production.up.railway.app:443?", "@myaiscore-production.up.railway.app", ":@myaiscore-production.up.railway.app"]) {
    assert.equal((await invoke({ origin: "https://myaiscore-production.up.railway.app", host, "x-forwarded-proto": "https" })).status, 403);
  }
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

test("leaderboard is unavailable unless storage is configured", async () => {
  let listed = 0;
  const handle = createApi({
    store: forbiddenStore,
    leaderboard: {
      configured: () => false,
      list: async () => { listed += 1; return []; },
      recentlySubmitted: async () => false,
      upsert: async () => {},
    },
  });
  const result = await leaderboardRequest(handle, "GET");
  assert.equal(result.status, 503);
  assert.equal(result.body.error.code, "leaderboard_not_configured");
  assert.equal(listed, 0);
});

test("leaderboard GET returns snake-case public entries with a bounded limit", async () => {
  let requestedLimit: number | undefined;
  const handle = createApi({
    store: forbiddenStore,
    leaderboard: {
      configured: () => true,
      list: async limit => {
        requestedLimit = limit;
        return [{ owner: "acme", repo: "api", repoUrl: "https://github.com/acme/api", commitSha: "a".repeat(40), score: 71, profileCode: "RHTE", submittedAt: "2026-09-21T00:00:00.000Z" }];
      },
      recentlySubmitted: async () => false,
      upsert: async () => {},
    },
  });
  const result = await leaderboardRequest(handle, "GET", undefined, "http://localhost/api/leaderboard?limit=5000");
  assert.equal(result.status, 200);
  assert.equal(requestedLimit, 50);
  assert.deepEqual(result.body.entries[0], {
    owner: "acme",
    repo: "api",
    repo_url: "https://github.com/acme/api",
    commit_sha: "a".repeat(40),
    score: 71,
    profile_code: "RHTE",
    submitted_at: "2026-09-21T00:00:00.000Z",
  });
});

test("leaderboard POST re-verifies server-side and stores only the generated report", async () => {
  let reportCalls = 0;
  let upserted = false;
  const handle = createApi({
    store: forbiddenStore,
    githubToken: "configured-token",
    repositoryReportAdmission: new RepositoryReportAdmission({ anonymousMaxStarts: 10, tokenMaxStarts: 10, anonymousWindowMs: 1_000, tokenWindowMs: 1_000 }),
    repositoryReport: async (input, options) => {
      reportCalls += 1;
      assert.deepEqual(input, { repoUrl: "https://github.com/Acme/api" });
      assert.equal(options?.authToken, "configured-token");
      return report;
    },
    leaderboard: {
      configured: () => true,
      list: async () => [],
      recentlySubmitted: async (owner, repo) => {
        assert.equal(owner, "Acme");
        assert.equal(repo, "api");
        return false;
      },
      upsert: async storedReport => {
        upserted = true;
        assert.deepEqual(storedReport, report);
      },
    },
  });
  const result = await leaderboardRequest(handle, "POST", { repo_url: "https://github.com/Acme/api", score: 999 });
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "invalid_input");
  assert.equal(reportCalls, 0);
  assert.equal(upserted, false);

  const valid = await leaderboardRequest(handle, "POST", { repo_url: "https://github.com/Acme/api" });
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.body, report);
  assert.equal(reportCalls, 1);
  assert.equal(upserted, true);
});

test("leaderboard POST cooldown blocks before re-running repository collection", async () => {
  let reportCalls = 0;
  const handle = createApi({
    store: forbiddenStore,
    repositoryReportAdmission: new RepositoryReportAdmission({ anonymousMaxStarts: 10, tokenMaxStarts: 10, anonymousWindowMs: 1_000, tokenWindowMs: 1_000 }),
    repositoryReport: async () => { reportCalls += 1; return report; },
    leaderboard: {
      configured: () => true,
      list: async () => [],
      recentlySubmitted: async () => true,
      upsert: async () => { throw new Error("cooldown should block before upsert"); },
    },
  });
  const result = await leaderboardRequest(handle, "POST", { repo_url: "https://github.com/acme/api" });
  assert.equal(result.status, 429);
  assert.equal(result.body.error.code, "leaderboard_cooldown");
  assert.equal(reportCalls, 0);
});
