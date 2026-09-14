/**
 * Validates a provider's raw criterion-judgement output against
 * EVIDENCE_SCHEMA.md section 5's CriterionResult contract and builds real
 * CriterionResult objects only if it passes. Rejects duplicate/missing axis
 * codes, out-of-range levels, references to evidence outside this
 * assessment, and status/level/blockingConflict combinations the schema
 * forbids. dimension_score is always computed here from level -- a
 * provider's own number for it, if present, is ignored.
 */
import { randomUUID } from "node:crypto";
import type { CriterionCode, CriterionResult, CriterionStatus } from "../../shared/contracts/evaluation.js";
import type { EvaluationInputBundle } from "./inputAssembly.js";
import type { RawProviderOutput } from "./provider.js";

const ALL_CODES: CriterionCode[] = ["A", "B", "C", "D", "E"];
const VALID_STATUSES: CriterionStatus[] = ["observed", "not_observed", "insufficient_evidence"];

export interface CriterionJudgementFailure {
  code:
    | "provider_error"
    | "output_validation_failed"
    | "duplicate_or_missing_codes"
    | "invalid_level"
    | "invalid_evidence_reference"
    | "invalid_status_level_combination"
    | "invalid_blocking_conflict";
  message: string;
  retryable: boolean;
}

export type CriterionJudgementResult = { ok: true; criteria: CriterionResult[] } | { ok: false; failure: CriterionJudgementFailure };

interface RawCriterion {
  criterion_code?: unknown;
  status?: unknown;
  level?: unknown;
  supporting_evidence_ids?: unknown;
  contrary_evidence_ids?: unknown;
  rationale?: unknown;
  missing_evidence?: unknown;
  blocking_conflict?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function validateAndBuildCriterionResults(output: RawProviderOutput, bundle: EvaluationInputBundle): CriterionJudgementResult {
  if (output.providerError) {
    return {
      ok: false,
      failure: { code: "provider_error", message: output.providerError.message, retryable: output.providerError.retryable },
    };
  }

  const raw = output.raw as { criteria?: unknown } | undefined;
  if (typeof raw !== "object" || raw === null || !Array.isArray(raw.criteria)) {
    return { ok: false, failure: { code: "output_validation_failed", message: "provider output is not {criteria: [...]}", retryable: false } };
  }

  const rawCriteria = raw.criteria as unknown[];
  const validEvidenceIds = new Set(bundle.evidence.map((e) => e.evidenceId));
  const seenCodes = new Set<CriterionCode>();
  const built: CriterionResult[] = [];

  for (const [index, rcUnknown] of rawCriteria.entries()) {
    if (typeof rcUnknown !== "object" || rcUnknown === null || Array.isArray(rcUnknown)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `criteria[${index}] is not an object`, retryable: false } };
    }
    const rc = rcUnknown as RawCriterion;
    const code = rc.criterion_code;
    if (typeof code !== "string" || !ALL_CODES.includes(code as CriterionCode)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `criteria[${index}].criterion_code is not a valid axis code`, retryable: false } };
    }
    if (seenCodes.has(code as CriterionCode)) {
      return { ok: false, failure: { code: "duplicate_or_missing_codes", message: `criterion_code ${code} appears more than once`, retryable: false } };
    }
    seenCodes.add(code as CriterionCode);

    const status = rc.status;
    if (typeof status !== "string" || !VALID_STATUSES.includes(status as CriterionStatus)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `criteria[${index}].status is invalid: ${String(status)}`, retryable: false } };
    }

    const blockingConflict = rc.blocking_conflict;
    if (typeof blockingConflict !== "boolean") {
      return { ok: false, failure: { code: "output_validation_failed", message: `criteria[${index}].blocking_conflict must be a boolean`, retryable: false } };
    }
    if (blockingConflict && status !== "insufficient_evidence") {
      return {
        ok: false,
        failure: {
          code: "invalid_blocking_conflict",
          message: `criteria[${index}] (${code}) has blocking_conflict=true but status=${status}; EVIDENCE_SCHEMA.md requires insufficient_evidence when a conflict blocks judgement`,
          retryable: false,
        },
      };
    }

    if (!isNonEmptyString(rc.rationale)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `criteria[${index}].rationale must be a non-empty string`, retryable: false } };
    }
    if (typeof rc.missing_evidence !== "string") {
      return { ok: false, failure: { code: "output_validation_failed", message: `criteria[${index}].missing_evidence must be a string`, retryable: false } };
    }
    if (!isStringArray(rc.supporting_evidence_ids) || !isStringArray(rc.contrary_evidence_ids)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `criteria[${index}] evidence id fields must be string arrays`, retryable: false } };
    }

    const allCitedIds = [...rc.supporting_evidence_ids, ...rc.contrary_evidence_ids];
    const invalidRefs = allCitedIds.filter((id) => !validEvidenceIds.has(id));
    if (invalidRefs.length > 0) {
      return {
        ok: false,
        failure: { code: "invalid_evidence_reference", message: `criteria[${index}] (${code}) cites evidence not in this assessment: ${invalidRefs.join(", ")}`, retryable: false },
      };
    }

    let level: number | null;
    let dimensionScore: number | null;
    if (status === "observed") {
      if (rc.supporting_evidence_ids.length === 0) {
        return {
          ok: false,
          failure: { code: "invalid_status_level_combination", message: `criteria[${index}] (${code}) is observed but has no supporting_evidence_ids`, retryable: false },
        };
      }
      if (typeof rc.level !== "number" || !Number.isInteger(rc.level) || rc.level < 1 || rc.level > 4) {
        return { ok: false, failure: { code: "invalid_level", message: `criteria[${index}] (${code}) observed level must be an integer 1-4, got ${String(rc.level)}`, retryable: false } };
      }
      level = rc.level;
      dimensionScore = level * 25;
    } else {
      if (rc.level !== null && rc.level !== undefined) {
        return {
          ok: false,
          failure: { code: "invalid_status_level_combination", message: `criteria[${index}] (${code}) status=${status} must have level=null, got ${String(rc.level)}`, retryable: false },
        };
      }
      level = null;
      dimensionScore = null;
    }

    built.push({
      criterionResultId: `cr_${randomUUID()}`,
      assessmentId: bundle.assessmentId,
      criterionCode: code as CriterionCode,
      status: status as CriterionStatus,
      level,
      dimensionScore,
      supportingEvidenceIds: rc.supporting_evidence_ids,
      contraryEvidenceIds: rc.contrary_evidence_ids,
      rationale: rc.rationale,
      missingEvidence: rc.missing_evidence,
      blockingConflict,
    });
  }

  if (seenCodes.size !== ALL_CODES.length) {
    const missing = ALL_CODES.filter((c) => !seenCodes.has(c));
    return { ok: false, failure: { code: "duplicate_or_missing_codes", message: `missing criterion codes: ${missing.join(", ")}`, retryable: false } };
  }

  return { ok: true, criteria: built };
}
