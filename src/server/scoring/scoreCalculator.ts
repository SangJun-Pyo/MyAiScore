/**
 * Deterministic scoring engine (Phase 2, Task 3). Pure code, no model calls:
 * given already-validated CriterionResult[5] and an ingestion_status, computes
 * MyAiScore per docs/Assessment/SCORING_RUBRIC.md sections 3 and 5.
 *
 * This module distinguishes two very different situations:
 *  - A normal, valid "not everything is judgeable yet" outcome -- some axis
 *    is not_observed/insufficient_evidence, or ingestion is partial, or a
 *    blocking conflict exists. This is withheld, not an error.
 *  - A structurally broken input -- duplicate/missing axis codes, an
 *    observed axis with a null or out-of-range level, a non-observed axis
 *    with a non-null level, or (when a valid evidence id set is supplied) a
 *    reference to evidence outside the assessment. This throws
 *    ScoringContractError and must never be silently turned into withheld.
 */
import type { CriterionCode, CriterionResult, MyAiScore, WithheldReason } from "../../shared/contracts/evaluation.js";
import type { IngestionStatus } from "../../shared/contracts/ingestion.js";

export const CRITERION_WEIGHTS: Record<CriterionCode, number> = {
  A: 15,
  B: 20,
  C: 15,
  D: 30,
  E: 20,
};

const ALL_CODES: CriterionCode[] = ["A", "B", "C", "D", "E"];
const VALID_STATUSES = ["observed", "not_observed", "insufficient_evidence"];
const VALID_INGESTION_STATUSES: IngestionStatus[] = ["not_started", "complete", "partial", "failed"];

/** A structural/contract violation in the input -- never a normal withheld outcome. */
export class ScoringContractError extends Error {}

/** Calling the scorer at all is a caller bug when ingestion never produced usable evidence. */
export class IngestionNotScorableError extends Error {}

export interface ComputeMyAiScoreParams {
  criterionResults: CriterionResult[];
  ingestionStatus: IngestionStatus;
  /**
   * Required (Astra Phase 2 review R4: "현재 validEvidenceIds는 선택적이라
   * 생략하면 잘못된 참조도 검사하지 않는다"). Every supporting/contrary
   * evidence id in every criterion is checked against this set; a
   * reference outside it is a contract error, not a withheld reason.
   * Callers with no meaningful evidence set (e.g. a synthetic test with no
   * evidence at all) must pass an empty Set explicitly, never omit it.
   */
  validEvidenceIds: Set<string>;
}

function validateStructure(results: CriterionResult[], validEvidenceIds: Set<string>): void {
  const seen = new Set<CriterionCode>();
  for (const r of results) {
    if (!ALL_CODES.includes(r.criterionCode)) {
      throw new ScoringContractError(`invalid criterionCode: ${String(r.criterionCode)}`);
    }
    if (seen.has(r.criterionCode)) {
      throw new ScoringContractError(`duplicate criterionCode: ${r.criterionCode}`);
    }
    seen.add(r.criterionCode);

    // Runtime enum check even though the TS type already constrains this --
    // CriterionResult objects can originate from provider-output validators
    // whose output is only as trustworthy as their own logic; the score
    // engine is a second, independent boundary (Astra Phase 2 review R4:
    // "status/ingestionStatus 열거형을 런타임에서 확인한다").
    if (!VALID_STATUSES.includes(r.status)) {
      throw new ScoringContractError(`criterion ${r.criterionCode} has an invalid status: ${String(r.status)}`);
    }

    if (r.status === "observed") {
      if (r.level === null || !Number.isInteger(r.level) || r.level < 1 || r.level > 4) {
        throw new ScoringContractError(`observed criterion ${r.criterionCode} has an invalid level: ${String(r.level)}`);
      }
      if (r.dimensionScore !== r.level * 25) {
        throw new ScoringContractError(`observed criterion ${r.criterionCode} dimensionScore does not match level*25`);
      }
      if (r.supportingEvidenceIds.length === 0) {
        throw new ScoringContractError(`observed criterion ${r.criterionCode} has no supportingEvidenceIds`);
      }
      if (r.blockingConflict) {
        throw new ScoringContractError(`criterion ${r.criterionCode} is observed but blockingConflict=true (must be insufficient_evidence)`);
      }
    } else {
      if (r.level !== null || r.dimensionScore !== null) {
        throw new ScoringContractError(`non-observed criterion ${r.criterionCode} must have level=null and dimensionScore=null`);
      }
    }

    const cited = [...r.supportingEvidenceIds, ...r.contraryEvidenceIds];
    for (const id of cited) {
      if (!validEvidenceIds.has(id)) {
        throw new ScoringContractError(`criterion ${r.criterionCode} cites evidence outside this assessment: ${id}`);
      }
    }
  }
  if (seen.size !== ALL_CODES.length) {
    const missing = ALL_CODES.filter((c) => !seen.has(c));
    throw new ScoringContractError(`missing criterionCode(s): ${missing.join(", ")}`);
  }
}

export function computeMyAiScore(params: ComputeMyAiScoreParams): MyAiScore {
  const { criterionResults, ingestionStatus, validEvidenceIds } = params;

  if (!VALID_INGESTION_STATUSES.includes(ingestionStatus)) {
    throw new ScoringContractError(`invalid ingestionStatus: ${String(ingestionStatus)}`);
  }

  if (ingestionStatus === "failed" || ingestionStatus === "not_started") {
    throw new IngestionNotScorableError(
      `computeMyAiScore must not be called with ingestionStatus=${ingestionStatus} -- SCORING_RUBRIC.md/GITHUB_INGESTION.md treat this as an assessment failure, not a scorable/withheld state`,
    );
  }

  validateStructure(criterionResults, validEvidenceIds);

  const reasons: WithheldReason[] = [];
  if (ingestionStatus === "partial") reasons.push("ingestion_partial");

  const observed = criterionResults.filter((r) => r.status === "observed");
  const observedDimensions = observed.length;
  if (observedDimensions < ALL_CODES.length) reasons.push("insufficient_dimensions");

  const hasBlockingConflict = criterionResults.some((r) => r.blockingConflict);
  if (hasBlockingConflict) reasons.push("unresolved_conflict");

  if (reasons.length > 0) {
    return { status: "withheld", value: null, reasons, observedDimensions, totalDimensions: 5 };
  }

  // All five observed, ingestion complete, no blocking conflict -> issue a score.
  let weightedSum = 0;
  for (const r of criterionResults) {
    weightedSum += CRITERION_WEIGHTS[r.criterionCode] * (r.dimensionScore as number);
  }
  const value = Math.floor((weightedSum + 50) / 100);

  return { status: "issued", value, reasons: [], observedDimensions: 5, totalDimensions: 5 };
}
