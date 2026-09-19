import type { FixtureResponse } from "../../src/server/ingestion/offlineHttpClient.js";

export interface FakeTreeEntry {
  path: string;
  mode?: string;
  type?: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
}

export interface FakeBlob {
  sha: string;
  content: string; // raw text; base64-encoded automatically
}

const API_BASE = "https://api.github.com";

export function repoUrl(owner: string, repo: string): string {
  return `${API_BASE}/repos/${owner}/${repo}`;
}
export function commitUrl(owner: string, repo: string, ref: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/commits/${ref}`;
}
export function commitHistoryUrl(owner: string, repo: string, sha: string, limit = 20): string {
  return `${API_BASE}/repos/${owner}/${repo}/commits?sha=${sha}&per_page=${limit}`;
}
export function treeUrl(owner: string, repo: string, sha: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
}
export function blobUrl(owner: string, repo: string, sha: string): string {
  return `${API_BASE}/repos/${owner}/${repo}/git/blobs/${sha}`;
}

/**
 * Builds a standard "happy path" fixture set: repo metadata (public),
 * ref -> commit sha, a tree, and blobs for every blob-type entry in it.
 * Individual scenario tests overwrite specific URLs afterward to inject
 * failures/edge cases.
 */
export function buildStandardFixtures(opts: {
  owner: string;
  repo: string;
  ref?: string;
  defaultBranch?: string;
  commitSha: string;
  treeTruncated?: boolean;
  entries: FakeTreeEntry[];
  blobs: FakeBlob[];
  isPrivate?: boolean;
}): Record<string, FixtureResponse | FixtureResponse[]> {
  const { owner, repo, commitSha, entries, blobs } = opts;
  const ref = opts.ref ?? opts.defaultBranch ?? "main";
  const fixtures: Record<string, FixtureResponse | FixtureResponse[]> = {};

  fixtures[repoUrl(owner, repo)] = {
    status: 200,
    body: { default_branch: opts.defaultBranch ?? "main", private: opts.isPrivate ?? false },
  };
  fixtures[commitUrl(owner, repo, ref)] = { status: 200, body: { sha: commitSha } };
  fixtures[treeUrl(owner, repo, commitSha)] = {
    status: 200,
    body: {
      truncated: opts.treeTruncated ?? false,
      tree: entries.map((e) => ({ path: e.path, mode: e.mode ?? "100644", type: e.type ?? "blob", sha: e.sha, size: e.size })),
    },
  };
  for (const blob of blobs) {
    fixtures[blobUrl(owner, repo, blob.sha)] = {
      status: 200,
      body: { sha: blob.sha, size: Buffer.byteLength(blob.content, "utf8"), encoding: "base64", content: Buffer.from(blob.content, "utf8").toString("base64") },
    };
  }
  return fixtures;
}
