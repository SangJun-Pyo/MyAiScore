import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { connectFileTouchesToProject } from "../../src/server/localCollection/connectToRepoEvidence.js";
import type { FileTouchEvent } from "../../src/server/localCollection/extractCollaborationEvents.js";

function touch(path: string): FileTouchEvent {
  return { kind: "file_touch", path, timestamp: "2026-09-20T00:00:00.000Z" };
}

test("a path matching a known repo-evidence candidate is connected, without claiming this session authored it", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const connections = connectFileTouchesToProject({
      fileTouches: [touch("src/lib/validateOrderTotal.ts")],
      projectRoot,
      repoEvidencePaths: new Set(["src/lib/validateOrderTotal.ts"]),
    });
    assert.equal(connections.length, 1);
    assert.equal(connections[0]!.status, "path_referenced_in_repo_evidence");
    assert.match(connections[0]!.note, /세션이 이 코드를 작성했다는 뜻이 아니라/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("a path that currently exists in the working tree (but has no known repo-evidence entry) is reported separately, with a time caveat", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    mkdirSync(join(projectRoot, "src"), { recursive: true });
    writeFileSync(join(projectRoot, "src", "current.ts"), "export const x = 1;\n");
    const connections = connectFileTouchesToProject({ fileTouches: [touch("src/current.ts")], projectRoot });
    assert.equal(connections[0]!.status, "path_exists_in_working_tree_now");
    assert.match(connections[0]!.note, /세션 당시 상태와 같다고 가정하지 않는다/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("a path that doesn't exist anywhere is reported as not found, not silently dropped", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const connections = connectFileTouchesToProject({ fileTouches: [touch("src/never-existed.ts")], projectRoot });
    assert.equal(connections[0]!.status, "path_not_found_in_working_tree");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("a path escaping the project root (path traversal) is never resolved against the filesystem -- reported as outside_project_root", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const connections = connectFileTouchesToProject({ fileTouches: [touch("../../other-project/secrets.env")], projectRoot });
    assert.equal(connections[0]!.status, "outside_project_root");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("duplicate file touches for the same path produce exactly one connection entry", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-local-collection-"));
  try {
    const connections = connectFileTouchesToProject({ fileTouches: [touch("a.ts"), touch("a.ts"), touch("a.ts")], projectRoot });
    assert.equal(connections.length, 1);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
