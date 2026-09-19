import test from "node:test";
import assert from "node:assert/strict";
import { buildRepositoryStructureDiagnostics } from "../../src/server/repositoryReport/structureDiagnostics.js";
import type { IngestedFile, RepositoryInventory } from "../../src/shared/contracts/ingestion.js";
import { REPOSITORY_EVIDENCE_ORDER } from "../../src/shared/repositoryReport.js";

function file(path: string, lineCount: number): IngestedFile {
  return { path, lineCount, blobSha: "a".repeat(40), byteSize: lineCount, contentSha256: "b".repeat(64), redactedContent: "x", secretPatternMasked: false };
}

const inventory: RepositoryInventory = {
  basis: "scanned_tree", scannedEntries: 10, treeTruncated: false, selectionLimited: false,
  sourceFiles: 4, testFiles: 1, documentationFiles: 1, sourceFilesWithKnownSize: 4, sourceBytes: 1_000,
  oversizedSourceCandidates: 1,
  largestSourceFiles: [
    { path: "src/large.ts", byteSize: 500 }, { path: "src/medium.ts", byteSize: 200 },
    { path: "src/small.ts", byteSize: 100 }, { path: "src/other.ts", byteSize: 50 },
  ],
  signalCandidateCounts: Object.fromEntries(REPOSITORY_EVIDENCE_ORDER.map(id => [id, 0])) as RepositoryInventory["signalCandidateCounts"],
  hygiene: { highConfidenceArtifacts: 0, generatedArtifactCandidates: 0, secretLikePaths: 0 },
};

test("structure diagnostics report concentration without treating generated or test files as refactoring failures", () => {
  const result = buildRepositoryStructureDiagnostics([
    file("src/large.ts", 900), file("src/medium.ts", 450), file("src/small.ts", 100),
    file("src/generated/types.ts", 2_000), file("tests/large.test.ts", 1_200), file("migrations/001.ts", 1_000),
  ], inventory);
  assert.equal(result.selectedSourceFiles, 3);
  assert.equal(result.sourceFilesOver400Lines, 2);
  assert.equal(result.sourceFilesOver800Lines, 1);
  assert.equal(result.largestSelectedSourceFiles[0]?.path, "src/large.ts");
  assert.equal(result.topFiveSourceByteShare, 0.85);
});
