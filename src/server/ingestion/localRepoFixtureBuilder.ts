/**
 * Walks a local synthetic fixture repo directory and builds an offline
 * GitHub API fixture set for it (repo metadata + commit + recursive tree +
 * every blob), so the real ingestRepository() pipeline (Task 1) can be run
 * against a Task 0/Phase 2 calibration fixture without any network access.
 *
 * Moved here from tests/calibration/localRepoToFixtures.ts in Phase 2 so
 * both the test suite and scripts/evaluateOffline.ts (a production CLI
 * entry point) can reuse the same code instead of a CLI importing from
 * tests/. tests/calibration/localRepoToFixtures.ts now re-exports this.
 *
 * Blob SHAs are deterministic hashes of the relative path (these are not
 * real git blob SHAs -- this is a test double, not a git implementation).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import type { FixtureResponse } from "./offlineHttpClient.js";

function repoUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}`;
}
function commitUrl(owner: string, repo: string, ref: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/commits/${ref}`;
}
function treeUrl(owner: string, repo: string, sha: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
}
function blobUrl(owner: string, repo: string, sha: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
}

export function buildFixturesFromLocalRepo(
  dirPath: string,
  opts: { owner: string; repo: string; commitSha: string; defaultBranch?: string },
): Record<string, FixtureResponse | FixtureResponse[]> {
  const files: { path: string; content: string }[] = [];

  function walk(current: string): void {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile()) {
        const rel = relative(dirPath, full).split("\\").join("/");
        files.push({ path: rel, content: readFileSync(full, "utf8") });
      }
    }
  }
  walk(dirPath);

  const entries = files.map((f) => ({
    path: f.path,
    sha: createHash("sha1").update(f.path).digest("hex"),
    size: Buffer.byteLength(f.content, "utf8"),
  }));

  const fixtures: Record<string, FixtureResponse | FixtureResponse[]> = {};
  const branch = opts.defaultBranch ?? "main";
  fixtures[repoUrl(opts.owner, opts.repo)] = { status: 200, body: { default_branch: branch, private: false } };
  fixtures[commitUrl(opts.owner, opts.repo, branch)] = { status: 200, body: { sha: opts.commitSha } };
  fixtures[treeUrl(opts.owner, opts.repo, opts.commitSha)] = {
    status: 200,
    body: { truncated: false, tree: entries.map((e) => ({ path: e.path, mode: "100644", type: "blob", sha: e.sha, size: e.size })) },
  };
  for (const file of files) {
    const sha = createHash("sha1").update(file.path).digest("hex");
    fixtures[blobUrl(opts.owner, opts.repo, sha)] = {
      status: 200,
      body: { sha, size: Buffer.byteLength(file.content, "utf8"), encoding: "base64", content: Buffer.from(file.content, "utf8").toString("base64") },
    };
  }
  return fixtures;
}
