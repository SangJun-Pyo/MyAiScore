/**
 * Types for the read-only GitHub ingestion PoC (Phase 1, Task 1).
 *
 * Source of truth for these shapes is docs/Assessment/EVIDENCE_SCHEMA.md
 * section 2 (IngestionSnapshot) and section 3 (Evidence). This module must
 * stay in sync with that document; if a field here diverges, the divergence
 * and reason must be recorded in docs/Development/PHASE1_REPORT.md.
 *
 * This PoC never produces CriterionResult, my_ai_score, or any evaluation of
 * personal ability. It only turns a public repo + fixed commit into
 * structured, verifiable evidence candidates.
 */

export type IngestionStatus = "not_started" | "complete" | "partial" | "failed";

export type SupportStatus = "nextjs_typescript" | "other" | "unknown";

export interface IngestionInput {
  /** Raw user-supplied URL, e.g. "https://github.com/owner/repo". */
  repoUrl: string;
  /** Optional branch/tag/commit the user asked for. Never executed, only resolved via GitHub API. */
  commitRef?: string;
  /**
   * Optional paths the user's collaboration case referenced. These get
   * selection priority (GITHUB_INGESTION.md section 3, priority 1).
   */
  relevantPaths?: string[];
}

export interface NormalizedRepoRef {
  owner: string;
  repo: string;
}

export type SkipReason =
  | "binary"
  | "symlink"
  | "submodule"
  | "excluded"
  | "file_too_large"
  | "total_budget"
  | "request_budget"
  | "time_budget"
  | "fetch_failed"
  | "not_selected";

export interface SkippedFile {
  path: string;
  reason: SkipReason;
  detail?: string;
}

export interface IngestedFile {
  path: string;
  blobSha: string;
  byteSize: number;
  contentSha256: string;
  lineCount: number | null;
  /** Content with detected secret patterns masked. Never the raw untouched bytes if a pattern matched. */
  redactedContent: string;
  /** True if a likely-secret pattern was found and masked in this file. */
  secretPatternMasked: boolean;
}

export interface StaticSignals {
  /** basis is always "selected_files" -- these are sample-based observations, not repo-wide facts. */
  basis: "selected_files";
  languageFileCounts: Record<string, number>;
  dependencies: string[];
  testPaths: string[];
  ciPaths: string[];
  aiConfigPaths: string[];
}

export interface EvidenceCandidate {
  /** Candidates have no assessment_id yet -- always null until a scoring stage claims them. */
  assessmentId: null;
  sourceType: "repo_static" | "repo_history";
  collectionMethod: "github_api" | "synthetic_fixture";
  summary: string;
  contentSha256: string;
  collectedAt: string;
  repo: string;
  commitSha: string;
  path: string;
  locator: {
    startLine: number;
    endLine: number;
    symbol?: string;
  };
  eventTime: string | null;
  verificationNote: string;
}

export interface CoverageInfo {
  treeTruncated: boolean;
  candidateFiles: number | null;
  selectedFiles: number;
  readFiles: number;
  selectionLimited: boolean;
}

export interface IngestionMetrics {
  durationMs: number | null;
  httpRequests: number | null;
  /** Since ingestion-0.3.0: UTF-8 bytes of received response bodyText, including errors/retries; not wire bytes. Earlier collectors mixed content and response bytes. */
  fetchedBytes: number | null;
  /** Accepted decoded file bytes. Missing/null on older or unmeasured snapshots means unknown. */
  contentBytes?: number | null;
  cacheHits: number | null;
}

export interface IngestionFailure {
  code: string;
  message: string;
  retryable: boolean;
}

export interface IngestionSnapshot {
  schemaVersion: "ingestion-snapshot-v0.3.1";
  repo: string;
  commitSha: string | null;
  collectorVersion: string;
  selectionDigest: string;
  ingestionStatus: IngestionStatus;
  supportStatus: SupportStatus;
  /** Actual collection time, or an explicit example time for a synthetic fixture snapshot. */
  collectedAt: string;
  files: IngestedFile[];
  staticSignals: StaticSignals;
  evidenceCandidates: EvidenceCandidate[];
  coverage: CoverageInfo;
  skippedFiles: SkippedFile[];
  warnings: string[];
  failure: IngestionFailure | null;
  metrics: IngestionMetrics;
}

/** Fixed collection limits (GITHUB_INGESTION.md section 4, proposed / calibration_required). */
export const INGESTION_LIMITS = {
  maxTreeEntries: 2000,
  plannedSelectedFiles: 40,
  maxFileBytes: 60 * 1024,
  maxTotalContentBytes: 800 * 1024,
  maxHttpRequests: 48,
  maxDurationMs: 45_000,
  maxRetriesPerRequest: 1,
} as const;

export const EXCLUDED_DIR_SEGMENTS = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "vendor",
];

export const EXCLUDED_FILE_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\..*)?$/i,
  /(^|\/)\.env\.local$/i,
  /\.pem$/i,
  /\.key$/i,
  /(^|\/)id_rsa$/i,
];
