/**
 * Types for Phase 1 Task 0 calibration fixtures (fixtures/calibration/**).
 *
 * These fixtures are inputs for a FUTURE LLM criterion evaluator (Task 2,
 * not built yet). Nothing here computes a real level, score, or evaluator
 * verdict -- expected.json only records what a correct evaluator *should*
 * conclude, in the qualitative terms docs/Assessment/SCORING_RUBRIC.md and
 * docs/Assessment/CALIBRATION_PLAN.md already define. Do not add a fake
 * numeric "expected score" field; CALIBRATION_PLAN.md explicitly forbids
 * treating an invented exact total as ground truth before a model has run.
 */

export type CriterionCode = "A" | "B" | "C" | "D" | "E";

export type ExpectedStatus = "observed" | "not_observed" | "insufficient_evidence";

export interface ExpectedCriterion {
  criterionCode: CriterionCode;
  expectedStatus: ExpectedStatus;
  /** Only meaningful when expectedStatus is "observed". Inclusive range, e.g. [3, 4]. */
  expectedLevelRange?: [number, number];
  rationale: string;
  /** Repo-relative paths (relative to the fixture's repo dir) that must exist and support this axis. */
  requiredEvidenceRefs: string[];
  /** What an incorrect evaluator would wrongly conclude here, and why it would be wrong. */
  failureCondition: string;
  expectedBlockingConflict?: boolean;
}

export type ExpectedMyAiScoreStatus = "issued" | "withheld" | "not_determinable_without_model";

/**
 * Expected before/after comparison behavior for a criterion, per
 * EVIDENCE_SCHEMA.md section 8 (Comparison). Added in Phase 2 (Astra Phase 1
 * review, docs/Development/ASTRA_PHASE1_REVIEW.md section 3) to replace an
 * earlier draft that put a non-product string like
 * "insufficient_evidence_or_observed_with_caveat" into a status field --
 * every enum value here must be one already defined in the product contract
 * (ExpectedStatus, EvidenceChangeType, BehaviorChangeType). Where the real
 * post-state genuinely cannot be pinned to one value without running a real
 * evaluator, currentStatusOptions lists every status this fixture accepts,
 * instead of inventing a new mixed string.
 */
export type EvidenceChangeType = "added" | "removed" | "modified" | "unchanged";
export type BehaviorChangeType = "supported_improvement" | "supported_regression" | "supported_change" | "not_established";

export interface ExpectedComparison {
  criterionCode: CriterionCode;
  previousStatus: ExpectedStatus;
  /** Non-empty; one entry when the post-state is pinned, more than one when it is a genuinely open question left to Task 2b. */
  currentStatusOptions: ExpectedStatus[];
  expectedEvidenceChange: EvidenceChangeType;
  expectedBehaviorChange: BehaviorChangeType;
  rationale: string;
}

export interface ExpectedOutcome {
  fixtureId: string;
  /** 1-8, matching the CALIBRATION_PLAN.md section 2 table row. */
  calibrationCaseIndex: number;
  description: string;
  criteria: ExpectedCriterion[];
  expectedMyAiScoreStatus: ExpectedMyAiScoreStatus;
  expectedWithheldReasons?: ("insufficient_dimensions" | "ingestion_partial" | "unresolved_conflict")[];
  expectedComparisons?: ExpectedComparison[];
  /** Free-text notes, e.g. what this fixture is NOT trying to prove yet. */
  notes: string;
  /** IDs of other fixtures this one is deliberately linked to (same code, different case, etc.). */
  relatedFixtureIds?: string[];
}

export interface ProvenanceRecord {
  fixtureId: string;
  /** Always true in this phase -- no fixture here is a real captured repository/user session. */
  synthetic: true;
  sourceDescription: string;
  createdAt: string;
  /** Must be null unless a real model/evaluator run actually happened. */
  executedAt: string | null;
  humanReviewed: boolean;
  humanReviewNote: string;
  relatedVariants?: string[];
}
