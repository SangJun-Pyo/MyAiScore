import { test, expect } from "@playwright/test";
import { buildRepositoryReport } from "../../src/server/repositoryReport/report.js";
import type { IngestionSnapshot, IngestedFile } from "../../src/shared/contracts/ingestion.js";
import { REPOSITORY_EVIDENCE_ORDER, type RepositoryReportEvidenceId } from "../../src/shared/repositoryReport.js";
import { repositoryPathMatchesEvidence } from "../../src/shared/repositorySignals.js";

function file(path: string, content: string): IngestedFile {
  return { path, blobSha: "b".repeat(40), byteSize: Buffer.byteLength(content), contentSha256: "c".repeat(64), lineCount: content.split("\n").length, redactedContent: content, secretPatternMasked: false };
}

function v2Report() {
  const files = [
    file("README.md", "# Cart\nA checkout service for reliable orders.\n## Install\n`npm install`\n## Usage\n`npm start`\n## Test\n`npm test`"),
    file("package.json", JSON.stringify({ name: "cart", scripts: { test: "node --test", build: "tsc" }, dependencies: { pg: "1" } })),
    file("tests/cart.test.ts", "describe('cart', () => { test('adds', () => expect(add(1, 2)).toBe(3)); });"),
    file("src/large.ts", Array.from({ length: 450 }, (_, index) => `export const value${index} = ${index};`).join("\n")),
  ];
  const signalCandidateCounts = Object.fromEntries(REPOSITORY_EVIDENCE_ORDER.map(id => [id, files.filter(item => repositoryPathMatchesEvidence(id, item.path)).length])) as Record<RepositoryReportEvidenceId, number>;
  const snapshot: IngestionSnapshot = {
    schemaVersion: "ingestion-snapshot-v0.3.1", repo: "example/v2", commitSha: "a".repeat(40), collectorVersion: "test", selectionDigest: "test",
    ingestionStatus: "complete", supportStatus: "other", collectedAt: "2026-09-19T00:00:00Z", files,
    staticSignals: { basis: "selected_files", languageFileCounts: {}, dependencies: ["pg"], testPaths: ["tests/cart.test.ts"], ciPaths: [], aiConfigPaths: [] },
    repositoryInventory: { basis: "scanned_tree", scannedEntries: 24, treeTruncated: false, selectionLimited: false, sourceFiles: 8, testFiles: 2, documentationFiles: 1, sourceFilesWithKnownSize: 8, sourceBytes: 60_000, oversizedSourceCandidates: 1, largestSourceFiles: [{ path: "src/large.ts", byteSize: 50_000 }], signalCandidateCounts, hygiene: { highConfidenceArtifacts: 1, generatedArtifactCandidates: 0, secretLikePaths: 0 } },
    repositoryStructure: { basis: "selected_source_content_and_scanned_tree_sizes", selectedSourceFiles: 1, selectedSourceFilesWithLineCount: 1, sourceFilesOver400Lines: 1, sourceFilesOver800Lines: 0, largestSelectedSourceFiles: [{ path: "src/large.ts", lineCount: 450 }], topFiveSourceByteShare: 0.833 },
    commitTraceability: { basis: "fixed_commit_ancestors", sampledCommits: 4, evaluatedCommits: 4, excludedMergeOrAutomated: 0, nonGenericSubjectRatio: 1, distinctSubjectRatio: 1, scopedSubjectRatio: 0.75, rationaleBodyRatio: 0.5, referenceRatio: 0.25 },
    evidenceCandidates: [], coverage: { treeTruncated: false, candidateFiles: 24, selectedFiles: files.length, readFiles: files.length, selectionLimited: false }, skippedFiles: [], warnings: [], failure: null,
    metrics: { durationMs: 0, httpRequests: 0, fetchedBytes: 0, contentBytes: files.reduce((sum, item) => sum + item.byteSize, 0), cacheHits: 0 },
  };
  return buildRepositoryReport(snapshot);
}

test("v2 report shows content-aware points, commit practice and advisory structure diagnostics", async ({ page }) => {
  const report = v2Report();
  await page.route("**/api/repository-report", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(report) }));
  await page.goto("/evaluate");
  await page.locator('input[name="repo_url"]').fill("https://github.com/example/v2");
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator(".repo-report")).toBeVisible({ timeout: 22_000 });
  await expect(page.locator(".repo-profile-panel")).toBeVisible();
  await expect(page.locator(".repo-profile-dimensions article")).toHaveCount(4);
  await expect(page.locator(".repo-profile-code")).toHaveText(/^[DR][HP][ST][FE]$/);
  await expect(page.locator(".repo-signal-score").first()).toBeVisible();
  await expect(page.locator(".repo-axis-card").nth(2)).toContainText(/커밋 설명 습관|Commit explanation practice/);
  await expect(page.locator(".repo-diagnostics")).toBeVisible();
  await expect(page.locator(".repo-diagnostics")).toContainText("src/large.ts");
  await expect(page.locator(".repo-diagnostics")).toContainText(/450/);
  expect(report.schemaVersion).toBe("repository-report-v2");
  expect(report.ruleVersion).toBe("repository-signals-v2.5");
});
