import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAndValidateRepoUrl, validateCommitRef } from "../../src/server/ingestion/urlValidation.js";

test("accepts a plain github.com owner/repo URL", () => {
  const result = normalizeAndValidateRepoUrl("https://github.com/vercel/next.js");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.ref, { owner: "vercel", repo: "next.js" });
  }
});

test("normalizes a trailing .git suffix", () => {
  const result = normalizeAndValidateRepoUrl("https://github.com/owner/repo.git");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.ref.repo, "repo");
});

test("rejects non-github hosts", () => {
  const result = normalizeAndValidateRepoUrl("https://gitlab.com/owner/repo");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "unsupported_host");
});

test("rejects a host-confusion attempt (github.com as subdomain path trick)", () => {
  const result = normalizeAndValidateRepoUrl("https://github.com.evil.example/owner/repo");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "unsupported_host");
});

test("rejects userinfo in the URL", () => {
  const result = normalizeAndValidateRepoUrl("https://user:pass@github.com/owner/repo");
  assert.equal(result.ok, false);
});

test("rejects a non-default port", () => {
  const result = normalizeAndValidateRepoUrl("https://github.com:8443/owner/repo");
  assert.equal(result.ok, false);
});

test("rejects query strings and fragments", () => {
  assert.equal(normalizeAndValidateRepoUrl("https://github.com/owner/repo?ref=main").ok, false);
  assert.equal(normalizeAndValidateRepoUrl("https://github.com/owner/repo#readme").ok, false);
});

test("rejects extra path segments (non owner/repo paths)", () => {
  assert.equal(normalizeAndValidateRepoUrl("https://github.com/owner/repo/blob/main/x.ts").ok, false);
});

test("dot-segment traversal is neutralized by URL normalization before validation, and a bare '..' segment is rejected explicitly", () => {
  // WHATWG URL parsing fully resolves ../.. before pathname is read, so this
  // collapses to the ordinary-looking 2-segment path "/etc/passwd" -- it
  // cannot reach github's API as anything other than a (nonexistent) repo
  // named "etc/passwd", never as a traversal outside /repos/{owner}/{repo}.
  const collapsed = normalizeAndValidateRepoUrl("https://github.com/owner/../../etc/passwd");
  assert.equal(collapsed.ok, true);
  if (collapsed.ok) assert.deepEqual(collapsed.ref, { owner: "etc", repo: "passwd" });

  // A percent-encoded slash must NOT be decoded into a path separator --
  // it must stay one literal segment, which then fails the owner/repo charset.
  const encodedSlash = normalizeAndValidateRepoUrl("https://github.com/owner%2F..%2Fetc/repo");
  assert.equal(encodedSlash.ok, false);

  // Explicit defense-in-depth: a literal ".."/"." owner or repo segment is
  // rejected even though normal URL parsing cannot produce one.
  assert.equal(normalizeAndValidateRepoUrl("https://github.com/../repo").ok, false);
});

test("rejects http (non-https) scheme", () => {
  assert.equal(normalizeAndValidateRepoUrl("http://github.com/owner/repo").ok, false);
});

test("rejects control characters", () => {
  assert.equal(normalizeAndValidateRepoUrl("https://github.com/owner/re\npo").ok, false);
});

test("rejects empty or absurdly long input", () => {
  assert.equal(normalizeAndValidateRepoUrl("").ok, false);
  assert.equal(normalizeAndValidateRepoUrl("https://github.com/" + "a".repeat(3000)).ok, false);
});

test("commit ref: undefined is allowed (means default branch)", () => {
  const result = validateCommitRef(undefined);
  assert.equal(result.ok, true);
});

test("commit ref: rejects path traversal and spaces", () => {
  assert.equal(validateCommitRef("../../etc/passwd").ok, false);
  assert.equal(validateCommitRef("main branch").ok, false);
});

test("commit ref: accepts a plain branch name or full sha", () => {
  assert.equal(validateCommitRef("main").ok, true);
  assert.equal(validateCommitRef("3f1a9c2b8e0d4a5c6b7e8f9012345678abcdef01").ok, true);
});
