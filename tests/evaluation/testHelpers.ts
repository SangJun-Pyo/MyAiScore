import type { IngestionSnapshot } from "../../src/shared/contracts/ingestion.js";

/** A minimal, structurally valid IngestionSnapshot for tests that only care about evaluation-layer logic. */
export function makeEmptySnapshot(overrides: Partial<IngestionSnapshot> = {}): IngestionSnapshot {
  return {
    schemaVersion: "ingestion-snapshot-v0.3.1",
    repo: "fixture/case",
    commitSha: "b".repeat(40),
    collectorVersion: "test",
    selectionDigest: "c".repeat(64),
    ingestionStatus: "complete",
    supportStatus: "unknown",
    collectedAt: "2026-01-01T00:00:00Z",
    files: [],
    staticSignals: { basis: "selected_files", languageFileCounts: {}, dependencies: [], testPaths: [], ciPaths: [], aiConfigPaths: [] },
    evidenceCandidates: [],
    coverage: { treeTruncated: false, candidateFiles: 0, selectedFiles: 0, readFiles: 0, selectionLimited: false },
    skippedFiles: [],
    warnings: [],
    failure: null,
    metrics: { durationMs: 0, httpRequests: 0, fetchedBytes: 0, cacheHits: 0 },
    ...overrides,
  };
}
