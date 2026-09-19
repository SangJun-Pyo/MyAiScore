import { test } from "node:test";
import assert from "node:assert/strict";
import { selectFiles } from "../../src/server/ingestion/fileSelection.js";
import { INGESTION_LIMITS } from "../../src/shared/contracts/ingestion.js";
import type { TreeEntry } from "../../src/server/ingestion/githubApi.js";
import { REPOSITORY_EVIDENCE_ORDER } from "../../src/shared/repositoryReport.js";

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

test("MAS-007: nested fixture metadata cannot displace root config, AI guidance, product code and tests", () => {
  const entries = [
    ...['package.json', 'README.md', 'next.config.ts', 'tsconfig.json', 'AGENTS.md', 'CLAUDE.md', '.github/workflows/ci.yml'].map(path => entry(path)),
    ...Array.from({ length: 50 }, (_, i) => entry(`fixtures/copy-${i}/README.md`)),
    ...Array.from({ length: 50 }, (_, i) => entry(`fixtures/copy-${i}/package.json`)),
    ...Array.from({ length: 50 }, (_, i) => entry(`fixtures/copy-${i}/src/example.test.ts`)),
    ...Array.from({ length: 50 }, (_, i) => entry(`artifacts/run-${i}.json`)),
    ...Array.from({ length: 50 }, (_, i) => entry(`tests/feature-${i}.test.ts`)),
    ...Array.from({ length: 50 }, (_, i) => entry(`docs/design-${i}.md`)),
    ...Array.from({ length: 50 }, (_, i) => entry(`src/feature-${i}.ts`)),
  ];
  const result = selectFiles(entries), paths = result.selected.map(c => c.entry.path);
  assert.equal(paths.length, INGESTION_LIMITS.plannedSelectedFiles); assert.equal(result.selectionLimited, false);
  for (const path of ['package.json', 'README.md', 'AGENTS.md', 'CLAUDE.md', '.github/workflows/ci.yml']) assert.ok(paths.includes(path), path);
  assert.ok(paths.some(path => path.startsWith('src/')));
  assert.ok(paths.some(path => path.startsWith('tests/')));
  assert.ok(paths.some(path => path.startsWith('docs/')));
  assert.ok(!paths.some(path => /^(fixtures|artifacts)\//.test(path)));
  assert.equal(result.candidates.filter(c => /^(fixtures|artifacts)\//.test(c.entry.path)).length, 200, 'reference material is deprioritized, not deleted');
  assert.deepEqual(selectFiles([...entries].reverse()).selected.map(c => c.entry.path), paths);
});

test("MAS-007: explicitly relevant reference paths win while exclusion and file limits still apply", () => {
  const wanted = 'fixtures/copy-1/README.md';
  const entries = [entry(wanted), entry('artifacts/run.json'), entry('fixtures/.env'), entry('fixtures/large.ts', { size: INGESTION_LIMITS.maxFileBytes + 1 }),
    ...Array.from({ length: 70 }, (_, i) => entry(`src/feature-${i}.ts`)), entry('AGENTS.md')];
  const result = selectFiles(entries, [wanted, 'artifacts', 'fixtures/.env', 'fixtures/large.ts']);
  assert.deepEqual(result.selected.slice(0, 2).map(c => c.entry.path), ['artifacts/run.json', wanted]);
  assert.equal(result.selected.length, INGESTION_LIMITS.plannedSelectedFiles);
  assert.ok(result.skipped.some(s => s.path === 'fixtures/.env' && s.reason === 'excluded'));
  assert.ok(result.skipped.some(s => s.path === 'fixtures/large.ts' && s.reason === 'file_too_large'));
});

test("MAS-007: small repositories retain reference files and do not fabricate missing categories", () => {
  const paths = ['README.md', 'fixtures/example/package.json', 'examples/demo.ts', '__fixtures__/input.json', '_archive/old.md', 'artifacts/report.json'];
  const result = selectFiles(paths.map(path => entry(path)));
  assert.deepEqual(result.selected.map(c => c.entry.path).sort(), [...paths].sort());
  assert.equal(result.skipped.length, 0); assert.equal(result.selectionLimited, false);
});

test("tree scan cap retains its original limited meaning and is independent of input order", () => {
  const entries = Array.from({ length: INGESTION_LIMITS.maxTreeEntries + 1 }, (_, i) => entry(`src/file-${String(i).padStart(4, '0')}.ts`));
  const result = selectFiles(entries);
  assert.equal(result.selectionLimited, true); assert.equal(result.candidates.length, INGESTION_LIMITS.maxTreeEntries);
  assert.deepEqual(result.selected.map(c => c.entry.path), selectFiles([...entries].reverse()).selected.map(c => c.entry.path));
});

test("v2 reserves one representative for every observable score signal before general sampling", () => {
  const signalPaths = [
    "README.md", "AGENTS.md", "docs/guide.md", "package.json",
    "openapi.yaml", ".nvmrc",
    "tests/a.test.ts", "tsconfig.json", "CHANGELOG.md", "docs/ADR/0001-choice.md",
    ".github/issue_template/bug.md", "migrations/001.sql", ".github/CODEOWNERS", ".github/workflows/ci.yml",
    ".github/dependabot.yml", "Dockerfile", "scripts/check.ts",
  ];
  const entries = [
    ...signalPaths.map((path, index) => entry(path, { size: 100 + index })),
    ...Array.from({ length: 100 }, (_, index) => entry(`src/feature-${String(index).padStart(3, "0")}.ts`, { size: 200 })),
  ];
  const result = selectFiles(entries, [], { reserveRepositorySignals: true });
  const selected = new Set(result.selected.map(file => file.entry.path));
  for (const path of signalPaths) assert.ok(selected.has(path), path);
  for (const id of REPOSITORY_EVIDENCE_ORDER) assert.ok(result.inventory.signalCandidateCounts[id] > 0, id);
  assert.equal(result.selected.length, INGESTION_LIMITS.plannedSelectedFiles);
  assert.deepEqual(
    selectFiles([...entries].reverse(), [], { reserveRepositorySignals: true }).selected.map(file => file.entry.path),
    result.selected.map(file => file.entry.path),
  );
});

test("inventory uses scanned candidates rather than the selected file sample and records cautious diagnostics", () => {
  const entries = [
    ...Array.from({ length: 60 }, (_, index) => entry(`src/file-${String(index).padStart(3, "0")}.ts`, { size: index === 59 ? 50 * 1024 : 1_000 })),
    ...Array.from({ length: 12 }, (_, index) => entry(`tests/file-${index}.test.ts`, { size: 500 })),
    entry("README.md", { size: 800 }),
    entry("docs/guide.md", { size: 900 }),
    entry(".DS_Store", { size: 10 }),
    entry("node_modules/pkg/index.js", { size: 100 }),
    entry(".env", { size: 20 }),
  ];
  const result = selectFiles(entries);
  assert.equal(result.selected.length, INGESTION_LIMITS.plannedSelectedFiles);
  assert.equal(result.inventory.sourceFiles, 60);
  assert.equal(result.inventory.testFiles, 12);
  assert.equal(result.inventory.documentationFiles, 2);
  assert.equal(result.inventory.oversizedSourceCandidates, 1);
  assert.equal(result.inventory.largestSourceFiles[0]?.path, "src/file-059.ts");
  assert.equal(result.inventory.hygiene.highConfidenceArtifacts, 1);
  assert.equal(result.inventory.hygiene.generatedArtifactCandidates, 1);
  assert.equal(result.inventory.hygiene.secretLikePaths, 1);
});
