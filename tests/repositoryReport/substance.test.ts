import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRepositorySignals } from "../../src/server/repositoryReport/substance.js";
import type { CommitTraceabilitySignals, IngestedFile, RepositoryInventory } from "../../src/shared/contracts/ingestion.js";
import { REPOSITORY_EVIDENCE_ORDER, type RepositoryReportEvidenceId } from "../../src/shared/repositoryReport.js";

function file(path: string, content: string): IngestedFile {
  return { path, blobSha: "b".repeat(40), byteSize: Buffer.byteLength(content), contentSha256: "c".repeat(64), lineCount: content ? content.split("\n").length : 0, redactedContent: content, secretPatternMasked: false };
}

function inventory(overrides: Partial<RepositoryInventory> = {}): RepositoryInventory {
  return {
    basis: "scanned_tree", scannedEntries: 10, treeTruncated: false, selectionLimited: false,
    sourceFiles: 8, testFiles: 2, documentationFiles: 1, sourceFilesWithKnownSize: 8, sourceBytes: 8_000,
    oversizedSourceCandidates: 0, largestSourceFiles: [],
    signalCandidateCounts: Object.fromEntries(REPOSITORY_EVIDENCE_ORDER.map(id => [id, 1])) as Record<RepositoryReportEvidenceId, number>,
    hygiene: { highConfidenceArtifacts: 0, generatedArtifactCandidates: 0, secretLikePaths: 0 },
    ...overrides,
  };
}

function score(id: string, analysis: ReturnType<typeof analyzeRepositorySignals>) {
  return analysis.assessments.find(item => item.id === id)!;
}

test("empty files receive only the gated presence floor", () => {
  const files = [
    file("README.md", ""), file("AGENTS.md", ""), file("docs/guide.md", ""), file("package.json", ""),
    file("tests/a.test.ts", ""), file("tsconfig.json", ""), file("CHANGELOG.md", ""), file("docs/adr/0001.md", ""),
    file(".github/issue_template/bug.md", ""), file("migrations/001.sql", ""), file(".github/workflows/ci.yml", ""),
    file(".github/dependabot.yml", ""), file("Dockerfile", ""), file("scripts/check.sh", ""),
  ];
  const result = analyzeRepositorySignals(files, inventory());
  assert.ok(result.assessments.filter(item => item.id !== "traceability-commit-practice").reduce((sum, item) => sum + item.points, 0) <= 15);
  assert.ok(result.assessments.filter(item => item.presence === 1).every(item => item.quality === 0.15));
});

test("test substance supports JavaScript, Python, Go, Rust and JVM assertions", () => {
  const cases = [
    file("tests/a.test.ts", "describe('cart', () => { test('adds', () => expect(add(1, 2)).toBe(3)); });"),
    file("tests/test_cart.py", "def test_adds():\n    assert add(1, 2) == 3"),
    file("cart_test.go", "func TestAdds(t *testing.T) { if add(1, 2) != 3 { t.Fatal(\"bad\") } }"),
    file("tests/cart.rs", "#[test]\nfn adds() { assert_eq!(add(1, 2), 3); }"),
    file("src/test/CartTest.java", "@Test void adds() { assertEquals(3, add(1, 2)); }"),
  ];
  for (const candidate of cases) {
    const result = analyzeRepositorySignals([candidate], inventory({ sourceFiles: 4, testFiles: 1 }));
    const assessment = score("verification-tests", result);
    assert.equal(assessment.status, "measured", candidate.path);
    assert.ok((assessment.substance ?? 0) > 0.15, candidate.path);
  }
});

test("unsupported test content is withheld instead of treated as failed", () => {
  const result = analyzeRepositorySignals([file("tests/check.exs", "assert useful(result)")], inventory());
  const assessment = score("verification-tests", result);
  assert.equal(assessment.status, "unmeasured");
  assert.equal(assessment.substance, null);
  assert.equal(assessment.quality, 0.15);
});

test("test breadth comes from the scanned inventory rather than selected files", () => {
  const testFile = file("tests/a.test.ts", "test('a', () => expect(a()).toBe(true));\ntest('b', () => expect(b()).toBe(false));");
  const narrow = score("verification-tests", analyzeRepositorySignals([testFile], inventory({ sourceFiles: 100, testFiles: 1 })));
  const broad = score("verification-tests", analyzeRepositorySignals([testFile], inventory({ sourceFiles: 8, testFiles: 2 })));
  assert.ok(broad.breadth > narrow.breadth);
  assert.ok(broad.points > narrow.points);
});

test("fixed-SHA commit aggregates add a bounded traceability bonus without raw messages", () => {
  const commit: CommitTraceabilitySignals = {
    basis: "fixed_commit_ancestors", sampledCommits: 10, evaluatedCommits: 8, excludedMergeOrAutomated: 2,
    nonGenericSubjectRatio: 1, distinctSubjectRatio: 1, scopedSubjectRatio: 0.75, rationaleBodyRatio: 0.5, referenceRatio: 0.25,
  };
  const assessment = score("traceability-commit-practice", analyzeRepositorySignals([], inventory(), commit));
  assert.equal(assessment.status, "measured");
  assert.ok(assessment.points >= 1 && assessment.points <= 5);
  assert.doesNotMatch(JSON.stringify(assessment), /message|subject/);
});

test("database applicability comes from manifest dependencies, not migration output", () => {
  const withoutMigration = analyzeRepositorySignals([
    file("package.json", JSON.stringify({ name: "api", dependencies: { pg: "1.0.0" }, scripts: { test: "node --test" } })),
  ], inventory());
  assert.equal(withoutMigration.databaseLikely, true);
  assert.equal(score("traceability-migrations", withoutMigration).role, "conditional");

  const artifactOnly = analyzeRepositorySignals([file("migrations/001.sql", "CREATE TABLE users(id int);")], inventory());
  assert.equal(artifactOnly.databaseLikely, false);
  assert.equal(score("traceability-migrations", artifactOnly).role, "bonus");
});
