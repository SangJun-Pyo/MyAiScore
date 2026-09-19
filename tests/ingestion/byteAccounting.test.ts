import { test } from "node:test";
import assert from "node:assert/strict";
import { ingestRepository } from "../../src/server/ingestion/ingest.js";
import { INGESTION_LIMITS } from "../../src/shared/contracts/ingestion.js";
import { OfflineHttpClient, type FixtureResponse } from "../../src/server/ingestion/offlineHttpClient.js";
import { buildStandardFixtures, blobUrl, repoUrl } from "./githubFixtures.js";

const commitSha = "a".repeat(40);
const input = { repoUrl: "https://github.com/acme/accounting" };
function sample(count: number, bytes: number, reportedSize?: number) {
  const entries = Array.from({ length: count }, (_, i) => ({
    path: `src/file-${String(i).padStart(2, "0")}.ts`, sha: `blob-${i}`, size: reportedSize,
  }));
  return { entries, fixtures: buildStandardFixtures({ owner: "acme", repo: "accounting", commitSha, entries,
    blobs: entries.map(entry => ({ sha: entry.sha, content: "x".repeat(bytes) })),
  }) };
}
function responseBytes(fixtures: Record<string, FixtureResponse | FixtureResponse[]>) {
  return Object.values(fixtures).flatMap(value => Array.isArray(value) ? value : [value])
    .reduce((sum, res) => sum + Buffer.byteLength(typeof res.body === "string" ? res.body : JSON.stringify(res.body), "utf8"), 0);
}

test("MAS-011: all 40 planned files fit the content budget even when response bodies exceed it", async () => {
  const fileBytes = 18 * 1024;
  const { fixtures } = sample(40, fileBytes, fileBytes);
  const snapshot = await ingestRepository(input, { httpClient: new OfflineHttpClient(fixtures) });
  assert.equal(snapshot.ingestionStatus, "complete");
  assert.equal(snapshot.coverage.readFiles, 40);
  assert.equal(snapshot.metrics.httpRequests, 44);
  assert.equal(snapshot.metrics.contentBytes, 40 * fileBytes);
  assert.equal(snapshot.metrics.fetchedBytes, responseBytes(fixtures));
  assert.ok(snapshot.metrics.fetchedBytes! > INGESTION_LIMITS.maxTotalContentBytes);
  assert.deepEqual(snapshot.skippedFiles, []);
});

test("MAS-011: true decoded-content exhaustion never overshoots, even with absent or incorrect tree sizes", async () => {
  for (const reportedSize of [undefined, 1, 60 * 1024]) {
    const { fixtures, entries } = sample(20, 60 * 1024, reportedSize);
    const snapshot = await ingestRepository(input, { httpClient: new OfflineHttpClient(fixtures) });
    assert.equal(snapshot.ingestionStatus, "partial");
    assert.equal(snapshot.files.length, 13);
    assert.equal(snapshot.metrics.contentBytes, 780 * 1024);
    assert.equal(snapshot.metrics.contentBytes, snapshot.files.reduce((sum, file) => sum + file.byteSize, 0));
    assert.ok(snapshot.metrics.contentBytes <= INGESTION_LIMITS.maxTotalContentBytes);
    assert.deepEqual(snapshot.skippedFiles.map(skip => skip.path), entries.slice(13).map(entry => entry.path));
    assert.ok(snapshot.skippedFiles.every(skip => skip.reason === "total_budget"));
    // Accurate tree sizes avoid fetching known-over-budget blobs; wrong/missing sizes are checked after decoding.
    assert.equal(snapshot.metrics.httpRequests, reportedSize === 60 * 1024 ? 17 : 24);
  }
});

test("MAS-011: actual decoded per-file size is enforced independently of tree and blob size claims", async () => {
  for (const reportedSize of [undefined, 1]) {
    const { fixtures } = sample(1, INGESTION_LIMITS.maxFileBytes + 1, reportedSize);
    (fixtures[blobUrl("acme", "accounting", "blob-0")] as FixtureResponse).body = {
      encoding: "base64", size: 1, content: Buffer.alloc(INGESTION_LIMITS.maxFileBytes + 1, "x").toString("base64"),
    };
    const snapshot = await ingestRepository(input, { httpClient: new OfflineHttpClient(fixtures) });
    assert.equal(snapshot.ingestionStatus, "partial");
    assert.equal(snapshot.metrics.contentBytes, 0);
    assert.equal(snapshot.files.length, 0);
    assert.equal(snapshot.skippedFiles[0]?.reason, "file_too_large");
    assert.equal(snapshot.metrics.fetchedBytes, responseBytes(fixtures));
  }
});

test("MAS-011: response telemetry includes failed and retried bodies without consuming content allowance", async () => {
  const { fixtures } = sample(1, 100, 100);
  const key = blobUrl("acme", "accounting", "blob-0");
  fixtures[key] = [{ status: 500, body: { message: "temporary error 한글" } }, fixtures[key] as FixtureResponse];
  const snapshot = await ingestRepository(input, { httpClient: new OfflineHttpClient(fixtures) });
  assert.equal(snapshot.ingestionStatus, "complete");
  assert.equal(snapshot.metrics.httpRequests, 6);
  assert.equal(snapshot.metrics.contentBytes, 100);
  assert.equal(snapshot.metrics.fetchedBytes, responseBytes(fixtures));

  const limited = { [repoUrl("acme", "accounting")]: [
    { status: 429, body: "rate limited" }, { status: 429, body: "still limited" },
  ] };
  const failed = await ingestRepository(input, { httpClient: new OfflineHttpClient(limited) });
  assert.equal(failed.ingestionStatus, "failed");
  assert.equal(failed.metrics.contentBytes, 0);
  assert.equal(failed.metrics.fetchedBytes, responseBytes(limited));
});

test("MAS-011: request cap records every unread selected path, including a retry that cannot start", async () => {
  const { fixtures } = sample(40, 10, 10);
  for (let i = 0; i < 40; i++) {
    const key = blobUrl("acme", "accounting", `blob-${i}`);
    fixtures[key] = [{ status: 500, body: "retry" }, fixtures[key] as FixtureResponse];
  }
  const snapshot = await ingestRepository(input, { httpClient: new OfflineHttpClient(fixtures) });
  assert.equal(snapshot.ingestionStatus, "partial");
  assert.equal(snapshot.metrics.httpRequests, 48);
  assert.equal(snapshot.files.length, 22);
  assert.equal(snapshot.skippedFiles.length, 18);
  assert.equal(new Set(snapshot.skippedFiles.map(skip => skip.path)).size, 18);
  assert.ok(snapshot.skippedFiles.every(skip => skip.reason === "request_budget"));
  assert.equal(snapshot.metrics.contentBytes, 220);
});

test("MAS-011: elapsed-time exhaustion is distinct from request exhaustion, even on the current response", async () => {
  let now = 0;
  const { fixtures } = sample(3, 10, 10);
  const offline = new OfflineHttpClient(fixtures);
  const snapshot = await ingestRepository(input, { clock: () => now, httpClient: {
    async request(url) {
      const response = await offline.request(url);
      if (url.includes("/git/blobs/")) now = INGESTION_LIMITS.maxDurationMs;
      return response;
    },
  } });
  assert.equal(snapshot.ingestionStatus, "partial");
  assert.equal(snapshot.metrics.httpRequests, 4);
  assert.equal(snapshot.metrics.durationMs, INGESTION_LIMITS.maxDurationMs);
  assert.equal(snapshot.metrics.contentBytes, 0);
  assert.equal(snapshot.files.length, 0);
  assert.equal(snapshot.skippedFiles.length, 3);
  assert.ok(snapshot.skippedFiles.every(skip => skip.reason === "time_budget"));
  assert.ok(snapshot.metrics.fetchedBytes! > 0, "received late response remains in telemetry");
});

test("MAS-011: selected binary, invalid JSON, unsupported encoding and malformed blobs all record safe reasons", async () => {
  const { fixtures } = sample(4, 10, 10);
  fixtures[blobUrl("acme", "accounting", "blob-0")] = { status: 200, body: { encoding: "base64", content: "AA==" } };
  fixtures[blobUrl("acme", "accounting", "blob-1")] = { status: 200, body: "invalid JSON secret-value" };
  fixtures[blobUrl("acme", "accounting", "blob-2")] = { status: 200, body: { encoding: "secret-value", content: "" } };
  fixtures[blobUrl("acme", "accounting", "blob-3")] = { status: 200, body: null };
  const snapshot = await ingestRepository(input, { httpClient: new OfflineHttpClient(fixtures) });
  assert.equal(snapshot.ingestionStatus, "partial");
  assert.equal(snapshot.files.length, 0);
  assert.equal(snapshot.metrics.contentBytes, 0);
  assert.equal(snapshot.skippedFiles.length, 4);
  assert.deepEqual(snapshot.skippedFiles.map(skip => skip.reason), ["binary", "fetch_failed", "fetch_failed", "fetch_failed"]);
  assert.ok(!JSON.stringify(snapshot.skippedFiles).includes("secret-value"));
  assert.equal(snapshot.metrics.fetchedBytes, responseBytes(fixtures));
});

test("MAS-011: pre-network validation retains unknown byte measurements", async () => {
  const snapshot = await ingestRepository({ repoUrl: "https://example.com/private" }, { httpClient: new OfflineHttpClient({}) });
  assert.equal(snapshot.metrics.contentBytes, null);
  assert.equal(snapshot.metrics.fetchedBytes, null);
});
