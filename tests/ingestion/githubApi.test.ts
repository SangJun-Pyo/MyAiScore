import test from "node:test";
import assert from "node:assert/strict";
import { GithubApiClient } from "../../src/server/ingestion/githubApi.js";
import { IngestionBudget } from "../../src/server/ingestion/budget.js";
import { OfflineHttpClient } from "../../src/server/ingestion/offlineHttpClient.js";

const SHA = "a".repeat(40);
const URL = `https://api.github.com/repos/acme/reporter/commits?sha=${SHA}&per_page=20`;

test("commit summaries are pinned to the fixed SHA, bounded and returned only for local aggregate analysis", async () => {
  const http = new OfflineHttpClient({
    [URL]: { status: 200, body: [
      { sha: "b".repeat(40), commit: { message: "fix(api): keep the fixed commit boundary" } },
      { sha: "c".repeat(40), commit: { message: "docs: explain the result" } },
    ] },
  });
  const api = new GithubApiClient(http, new IngestionBudget());
  const result = await api.getCommitSummaries("acme", "reporter", SHA, 20);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.length, 2);
  assert.deepEqual(http.getCallLog(), [URL]);
});

test("commit summary collection rejects moving or malformed refs before making a request", async () => {
  const http = new OfflineHttpClient({});
  const api = new GithubApiClient(http, new IngestionBudget());
  const result = await api.getCommitSummaries("acme", "reporter", "main", 20);
  assert.equal(result.ok, false);
  assert.deepEqual(http.getCallLog(), []);
});
