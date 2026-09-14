import { test } from "node:test";
import assert from "node:assert/strict";
import { selectFiles } from "../../src/server/ingestion/fileSelection.js";
import { INGESTION_LIMITS } from "../../src/shared/contracts/ingestion.js";
import type { TreeEntry } from "../../src/server/ingestion/githubApi.js";

function entry(path: string, extra: Partial<TreeEntry> = {}): TreeEntry {
  return { path, mode: "100644", type: "blob", sha: `sha-${path}`, ...extra };
}

test("excludes node_modules, dist, .env and lock files", () => {
  const result = selectFiles([
    entry("node_modules/x/index.js"),
    entry("dist/bundle.js"),
    entry(".env"),
    entry(".env.local"),
    entry("package-lock.json"),
    entry("src/index.ts"),
  ]);
  const skippedPaths = result.skipped.map((s) => s.path);
  assert.ok(skippedPaths.includes("node_modules/x/index.js"));
  assert.ok(skippedPaths.includes("dist/bundle.js"));
  assert.ok(skippedPaths.includes(".env"));
  assert.ok(skippedPaths.includes(".env.local"));
  assert.ok(skippedPaths.includes("package-lock.json"));
  assert.ok(result.candidates.some((c) => c.entry.path === "src/index.ts"));
});

test("does not follow symlinks or submodules", () => {
  const result = selectFiles([
    entry("link-to-secret", { mode: "120000" }),
    entry("vendored-lib", { type: "commit", mode: "160000" }),
    entry("src/real.ts"),
  ]);
  assert.deepEqual(
    result.skipped.filter((s) => s.reason === "symlink").map((s) => s.path),
    ["link-to-secret"],
  );
  assert.deepEqual(
    result.skipped.filter((s) => s.reason === "submodule").map((s) => s.path),
    ["vendored-lib"],
  );
});

test("skips binary extensions and oversized files before fetching", () => {
  const result = selectFiles([
    entry("logo.png"),
    entry("huge.ts", { size: INGESTION_LIMITS.maxFileBytes + 1 }),
    entry("normal.ts", { size: 100 }),
  ]);
  const reasons = Object.fromEntries(result.skipped.map((s) => [s.path, s.reason]));
  assert.equal(reasons["logo.png"], "binary");
  assert.equal(reasons["huge.ts"], "file_too_large");
  assert.ok(result.candidates.some((c) => c.entry.path === "normal.ts"));
});

test("prioritizes user-relevant paths, then config, then tests, then source, then AI config", () => {
  const result = selectFiles(
    [
      entry("src/app/other.ts"),
      entry("package.json"),
      entry("src/app/__tests__/x.test.ts"),
      entry("src/server/actions/createOrder.ts"),
      entry("CLAUDE.md"),
    ],
    ["src/server/actions/createOrder.ts"],
  );
  const order = result.selected.map((c) => c.entry.path);
  assert.deepEqual(order, [
    "src/server/actions/createOrder.ts",
    "package.json",
    "src/app/__tests__/x.test.ts",
    "src/app/other.ts",
    "CLAUDE.md",
  ]);
});

test("caps selection at plannedSelectedFiles and marks the rest not_selected", () => {
  const many = Array.from({ length: INGESTION_LIMITS.plannedSelectedFiles + 10 }, (_, i) => entry(`src/file${String(i).padStart(3, "0")}.ts`));
  const result = selectFiles(many);
  assert.equal(result.selected.length, INGESTION_LIMITS.plannedSelectedFiles);
  const notSelected = result.skipped.filter((s) => s.reason === "not_selected");
  assert.equal(notSelected.length, 10);
});

test("selection order is deterministic across repeated calls (reproducibility)", () => {
  const entries = [entry("b.ts"), entry("a.ts"), entry("c.ts"), entry("package.json")];
  const first = selectFiles(entries).selected.map((c) => c.entry.path);
  const second = selectFiles([...entries].reverse()).selected.map((c) => c.entry.path);
  assert.deepEqual(first, second);
});
