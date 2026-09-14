/**
 * Domain types for Phase 2 Task 2a (offline question/criterion evaluation
 * structure) and Task 3 (deterministic scoring/confidence).
 *
 * Source of truth: docs/Assessment/EVIDENCE_SCHEMA.md sections 3-6,
 * docs/Assessment/SCORING_RUBRIC.md, docs/Assessment/CONFIDENCE_MODEL.md.
 * As with src/shared/contracts/ingestion.ts, this module keeps the
 * internal TypeScript representation in camelCase; the document's
 * snake_case is the wire/API form. See docs/Development/ASTRA_PHASE1_REVIEW.md
 * section 1 for the internal-camelCase / external-snake_case decision.
 *
 * None of these types or the code that produces them call a real LLM.
 * CriterionResult/Question/Answer instances built by this Phase are always
 * produced from a MockProvider (see src/server/evaluation/mockProvider.ts)
 * driven by test-supplied canned responses, never from expected.json.
 */
import type { CriterionCode } from "./calibration.js";

export type { CriterionCode };

// --- Evidence (EVIDENCE_SCHEMA.md section 3) ---------------------------

export type EvidenceSourceType =
  | "repo_static"
  | "repo_history"
  | "collaboration_case"
  | "user_provided_excerpt"
  | "interview_answer";

export type EvidenceCollectionMethod = "github_api" | "user_submission" | "synthetic_fixture";

export interface EvidenceLocator {
  startLine: number;
  endLine: number;
  symbol?: string;
}

export interface Evidence {
  evidenceId: string;
  /** null only for not-yet-claimed ingestion candidates; every evidence object this module builds is assessment-scoped. */
  assessmentId: string | null;
  sourceType: EvidenceSourceType;
  collectionMethod: EvidenceCollectionMethod;
  summary: string;
  contentSha256: string;
  collectedAt: string;
  repo: string | null;
  commitSha: string | null;
  path: string | null;
  locator: EvidenceLocator | null;
  eventTime: string | null;
  verificationNote: string;
}

// --- CollaborationCase / Question / Answer (EVIDENCE_SCHEMA.md section 4) ---

export type UserAction = "accepted" | "rejected" | "modified";

export interface CollaborationCase {
  caseId: string;
  assessmentId: string | null;
  problem: string;
  constraints: string;
  doneCriteria: string;
  aiSuggestionSummary: string;
  userAction: UserAction;
  userActionDetail: string;
  verificationSummary: string;
  /** Synthetic-ID references resolved against a fixture's evidence_map.json in this phase; real deployment resolves them against the assessment's own Evidence store. */
  linkedEvidenceIds: string[];
  /**
   * Repo-relative paths to raw pasted text the user submitted alongside the
   * structured fields above (API_DATA_CONTRACTS.md section 4 "사용자 발췌").
   * Not a formal EVIDENCE_SCHEMA CollaborationCase field -- a Task 0 fixture
   * convenience for referencing files that become user_provided_excerpt Evidence.
   */
  externalExcerpts?: string[];
  submittedAt: string;
}

export interface Question {
  questionId: string;
  assessmentId: string | null;
  text: string;
  /** Must be non-empty and every ID must resolve to a real Evidence in the same assessment. */
  groundingEvidenceIds: string[];
  targetCriteria: CriterionCode[];
  createdAt: string;
}

export interface Answer {
  answerId: string;
  assessmentId: string | null;
  questionId: string;
  text: string;
  linkedEvidenceIds: string[];
  submittedAt: string;
}

// --- CriterionResult (EVIDENCE_SCHEMA.md section 5) ---------------------

export type CriterionStatus = "observed" | "not_observed" | "insufficient_evidence";

export interface CriterionResult {
  criterionResultId: string;
  assessmentId: string | null;
  criterionCode: CriterionCode;
  status: CriterionStatus;
  /** Integer 1-4 when status is "observed"; null otherwise. */
  level: number | null;
  /** Always level*25, computed by code -- never trusted from a provider's own arithmetic. */
  dimensionScore: number | null;
  supportingEvidenceIds: string[];
  contraryEvidenceIds: string[];
  rationale: string;
  /**
   * Free-text description of what evidence would be needed to move this axis
   * from its current status/level. EVIDENCE_SCHEMA.md does not specify this
   * field's shape beyond its name; we choose a single explanatory string
   * (documented small implementation choice -- see PHASE2_OFFLINE_REPORT.md).
   */
  missingEvidence: string;
  blockingConflict: boolean;
}

// --- MyAiScore / ConfidenceSummary (EVIDENCE_SCHEMA.md section 6) -------

export type WithheldReason = "insufficient_dimensions" | "ingestion_partial" | "unresolved_conflict";

export interface MyAiScore {
  status: "issued" | "withheld";
  value: number | null;
  reasons: WithheldReason[];
  observedDimensions: number;
  totalDimensions: 5;
}

export interface EvidenceScopeSummary {
  readFiles: number;
  candidateFiles: number | null;
  selectionLimited: boolean;
}

export type SourceVerification = "complete" | "partial" | "failed";
export type ProcessEvidenceLevel = "linked_records" | "statements_only" | "none";

export interface ConfidenceSummary {
  evidenceScope: EvidenceScopeSummary;
  sourceVerification: SourceVerification;
  processEvidence: ProcessEvidenceLevel;
  remainingUncertainty: string[];
}

// --- Versioning (EVIDENCE_SCHEMA.md section 1) --------------------------

export interface EvaluationVersions {
  rubricVersion: string;
  pipelineVersion: string;
  questionPromptVersion: string;
  evaluatorPromptVersion: string;
  inferenceConfigVersion: string;
}

export type EvaluationMode = "mock" | "live";

export interface EvaluationManifest {
  mode: EvaluationMode;
  /** "mock-fixed-response" for this phase. Never a real model name unless mode === "live". */
  providerId: string;
  versions: EvaluationVersions;
  /** Full-fidelity audit fingerprint of the final (post-answers) bundle, including random IDs/timestamps -- traces one specific run, not expected to match across repeats. */
  bundleTextHash: string;
  /** Legacy aggregate of stageRequestHashes (phase2-fix-v2+); not a semantic similarity hash. */
  modelInputHash: string;
  /** Exact JSON request hashes at the provider interface; null means the stage was not attempted.
   * Optional only to read historical manifests created before phase2-fix-v2.
   */
  stageRequestHashes?: { questions: string | null; judgement: string | null };
  questionPromptTextHash: string;
  judgePromptTextHash: string;
  rubricCriteriaVersion: string;
  rubricCriteriaHash: string;
  tokensUsed: number | null;
  costUsd: number | null;
  costNote: string;
  /** Actual wall-clock time a real provider call happened. Null in mock mode -- never backfilled. */
  executedAt: string | null;
  warnings: string[];
}
