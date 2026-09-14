/**
 * Validates a provider's raw question-generation output against
 * EVIDENCE_SCHEMA.md section 4's Question contract and builds real Question
 * objects only if it passes. A malformed/invalid response is always an
 * explicit failure -- this module never fabricates a placeholder question to
 * force the pipeline to "succeed" (CLAUDE_PHASE2_OFFLINE_PROMPT.md section B).
 */
import { randomUUID } from "node:crypto";
import type { CriterionCode, Question } from "../../shared/contracts/evaluation.js";
import type { EvaluationInputBundle } from "./inputAssembly.js";
import type { ProviderError, RawProviderOutput } from "./provider.js";

const VALID_CRITERIA: CriterionCode[] = ["A", "B", "C", "D", "E"];
const REQUIRED_QUESTION_COUNT = 3;

export interface QuestionGenerationFailure {
  code:
    | "provider_error"
    | "output_validation_failed"
    | "wrong_question_count"
    | "duplicate_questions"
    | "invalid_grounding_evidence"
    | "invalid_target_criteria";
  message: string;
  retryable: boolean;
  providerCode?: ProviderError["code"];
}

export type QuestionGenerationResult = { ok: true; questions: Question[] } | { ok: false; failure: QuestionGenerationFailure };

interface RawQuestion {
  text?: unknown;
  grounding_evidence_ids?: unknown;
  target_criteria?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateAndBuildQuestions(
  output: RawProviderOutput,
  bundle: EvaluationInputBundle,
  clock: { now: () => string } = { now: () => new Date().toISOString() },
): QuestionGenerationResult {
  if (output.providerError) {
    return {
      ok: false,
      failure: { code: "provider_error", message: output.providerError.message, retryable: output.providerError.retryable, providerCode: output.providerError.code },
    };
  }

  const raw = output.raw as { questions?: unknown } | undefined;
  if (typeof raw !== "object" || raw === null || !Array.isArray(raw.questions)) {
    return { ok: false, failure: { code: "output_validation_failed", message: "provider output is not {questions: [...]}", retryable: false } };
  }

  const rawQuestions = raw.questions as unknown[];
  if (rawQuestions.length !== REQUIRED_QUESTION_COUNT) {
    return {
      ok: false,
      failure: { code: "wrong_question_count", message: `expected exactly ${REQUIRED_QUESTION_COUNT} questions, got ${rawQuestions.length}`, retryable: false },
    };
  }

  const validEvidenceIds = new Set(bundle.evidence.map((e) => e.evidenceId));
  const built: Question[] = [];
  const seenTexts = new Set<string>();

  for (const [index, rqUnknown] of rawQuestions.entries()) {
    if (typeof rqUnknown !== "object" || rqUnknown === null || Array.isArray(rqUnknown)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `question[${index}] is not an object`, retryable: false } };
    }
    const rq = rqUnknown as RawQuestion;
    if (!isNonEmptyString(rq.text)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `question[${index}].text is missing or empty`, retryable: false } };
    }
    const normalizedText = rq.text.trim();
    if (seenTexts.has(normalizedText)) {
      return { ok: false, failure: { code: "duplicate_questions", message: `question[${index}] duplicates an earlier question's text`, retryable: false } };
    }
    seenTexts.add(normalizedText);

    const groundingIds = rq.grounding_evidence_ids;
    if (!Array.isArray(groundingIds) || groundingIds.length === 0 || !groundingIds.every(isNonEmptyString)) {
      return { ok: false, failure: { code: "output_validation_failed", message: `question[${index}].grounding_evidence_ids must be a non-empty string array`, retryable: false } };
    }
    const invalidGrounding = groundingIds.filter((id) => !validEvidenceIds.has(id));
    if (invalidGrounding.length > 0) {
      return {
        ok: false,
        failure: { code: "invalid_grounding_evidence", message: `question[${index}] cites evidence not in this assessment: ${invalidGrounding.join(", ")}`, retryable: false },
      };
    }

    const targetCriteria = rq.target_criteria;
    if (!Array.isArray(targetCriteria) || targetCriteria.length === 0 || !targetCriteria.every((c) => VALID_CRITERIA.includes(c as CriterionCode))) {
      return {
        ok: false,
        failure: { code: "invalid_target_criteria", message: `question[${index}].target_criteria must be a non-empty subset of A-E`, retryable: false },
      };
    }

    built.push({
      questionId: `q_${randomUUID()}`,
      assessmentId: bundle.assessmentId,
      text: normalizedText,
      groundingEvidenceIds: groundingIds,
      targetCriteria: targetCriteria as CriterionCode[],
      createdAt: clock.now(),
    });
  }

  return { ok: true, questions: built };
}
