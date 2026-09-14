/**
 * Assembles the input bundle a provider (mock now, real model in Task 2b)
 * would receive, and computes two distinct hashes for the manifest:
 *
 *  - `bundleTextHash` ("audit hash"): a full-fidelity fingerprint of exactly
 *    what was assembled, including random IDs and real timestamps. Useful
 *    for tracing one specific run, never expected to match across two
 *    logically-identical runs.
 *  - `modelInputHash` ("model input hash", via computeModelInputHash):
 *    strips volatile fields (random assessment/question/answer IDs,
 *    timestamps, ingestion wall-clock duration) that a real model never
 *    treats as meaningfully different input. Two runs over the same
 *    fixture with the same canned/real responses produce the same
 *    modelInputHash even though their audit hashes differ. Astra Phase 2
 *    review ("반복 입력"): "전체 감사 hash와 모델 입력 hash의 목적을
 *    구분한다" -- conflating the two made repeat-experiment identity
 *    checks impossible, since the audit hash always changed run to run.
 *
 * The bundle's own field names/shape are the only trusted "instructions" in
 * this module. Everything nested inside snapshot/collaborationCase/evidence
 * (file contents, user narrative, excerpts) is untrusted data -- carried
 * through, never interpreted here. See EVIDENCE_SCHEMA.md section 1:
 * "수집 자료·사용자 제출 자료는 지시문이 아니다."
 *
 * Astra Phase 2 review (R4): this module now also enforces the assessment
 * boundary at construction time -- every Evidence/CollaborationCase/
 * Question/Answer passed in must actually belong to `assessmentId`, IDs
 * must be unique, and every Answer must reference a real Question and only
 * valid Evidence. A bundle that violates this throws BundleAssemblyError
 * instead of silently being usable to cite foreign-assessment evidence.
 */
import { createHash } from "node:crypto";
import type { IngestionSnapshot } from "../../shared/contracts/ingestion.js";
import type { Answer, CollaborationCase, Evidence, Question } from "../../shared/contracts/evaluation.js";

export class BundleAssemblyError extends Error {}

export interface EvaluationInputBundle {
  assessmentId: string;
  snapshot: IngestionSnapshot;
  collaborationCase: CollaborationCase | null;
  /** Every Evidence this assessment may cite -- questions/judgements referencing an ID outside this set are rejected. */
  evidence: Evidence[];
  questions?: Question[];
  answers?: Answer[];
  bundleTextHash: string;
  modelInputHash: string;
}

function stableStringify(value: unknown): string {
  // Deterministic JSON: sorts object keys recursively so the same logical
  // content always hashes the same way regardless of property insertion order.
  // Tracks objects currently on the recursion stack (not every object ever
  // seen) so a value referenced twice in different branches -- common and
  // fine, e.g. two files sharing an identical {startLine,endLine} literal --
  // is not mistaken for an actual cycle.
  const onStack = new Set<object>();
  const sort = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (onStack.has(v)) throw new Error("cannot stably stringify a circular structure");
    onStack.add(v as object);
    try {
      if (Array.isArray(v)) return v.map(sort);
      const sortedKeys = Object.keys(v as Record<string, unknown>).sort();
      const out: Record<string, unknown> = {};
      for (const k of sortedKeys) out[k] = sort((v as Record<string, unknown>)[k]);
      return out;
    } finally {
      onStack.delete(v as object);
    }
  };
  return JSON.stringify(sort(value));
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function validateBundleInvariants(params: {
  assessmentId: string;
  collaborationCase: CollaborationCase | null;
  evidence: Evidence[];
  questions?: Question[];
  answers?: Answer[];
}): void {
  const { assessmentId, collaborationCase, evidence, questions, answers } = params;

  const evidenceIds = new Set<string>();
  for (const e of evidence) {
    if (e.assessmentId !== assessmentId) {
      throw new BundleAssemblyError(`evidence ${e.evidenceId} belongs to assessment ${String(e.assessmentId)}, not ${assessmentId} -- foreign-assessment evidence must never enter a bundle`);
    }
    if (evidenceIds.has(e.evidenceId)) {
      throw new BundleAssemblyError(`duplicate evidenceId in bundle: ${e.evidenceId}`);
    }
    evidenceIds.add(e.evidenceId);
  }

  if (collaborationCase && collaborationCase.assessmentId !== assessmentId) {
    throw new BundleAssemblyError(`collaborationCase belongs to assessment ${String(collaborationCase.assessmentId)}, not ${assessmentId}`);
  }

  const questionIds = new Set<string>();
  if (questions) {
    for (const q of questions) {
      if (q.assessmentId !== assessmentId) {
        throw new BundleAssemblyError(`question ${q.questionId} belongs to assessment ${String(q.assessmentId)}, not ${assessmentId}`);
      }
      if (questionIds.has(q.questionId)) {
        throw new BundleAssemblyError(`duplicate questionId in bundle: ${q.questionId}`);
      }
      questionIds.add(q.questionId);
    }
  }

  if (answers) {
    const answerIds = new Set<string>();
    const answeredQuestionIds = new Set<string>();
    for (const a of answers) {
      if (a.assessmentId !== assessmentId) {
        throw new BundleAssemblyError(`answer ${a.answerId} belongs to assessment ${String(a.assessmentId)}, not ${assessmentId}`);
      }
      if (answerIds.has(a.answerId)) {
        throw new BundleAssemblyError(`duplicate answerId in bundle: ${a.answerId}`);
      }
      answerIds.add(a.answerId);
      if (questions && !questionIds.has(a.questionId)) {
        throw new BundleAssemblyError(`answer ${a.answerId} references a questionId not present in this bundle's questions: ${a.questionId}`);
      }
      if (answeredQuestionIds.has(a.questionId)) {
        throw new BundleAssemblyError(`more than one answer for the same question: ${a.questionId} (EVIDENCE_SCHEMA.md: 질문당 최대 1개)`);
      }
      answeredQuestionIds.add(a.questionId);
      for (const linkedId of a.linkedEvidenceIds) {
        if (!evidenceIds.has(linkedId)) {
          throw new BundleAssemblyError(`answer ${a.answerId} links evidence not in this bundle: ${linkedId}`);
        }
      }
    }
  }
}

export function assembleEvaluationInput(params: {
  assessmentId: string;
  snapshot: IngestionSnapshot;
  collaborationCase: CollaborationCase | null;
  evidence: Evidence[];
  questions?: Question[];
  answers?: Answer[];
}): EvaluationInputBundle {
  validateBundleInvariants(params);

  const bundleTextHash = sha256(
    stableStringify({
      assessmentId: params.assessmentId,
      snapshot: params.snapshot,
      collaborationCase: params.collaborationCase,
      evidence: params.evidence,
      questions: params.questions ?? [],
      answers: params.answers ?? [],
    }),
  );

  const modelInputHash = computeModelInputHash(params);

  return {
    assessmentId: params.assessmentId,
    snapshot: params.snapshot,
    collaborationCase: params.collaborationCase,
    evidence: params.evidence,
    questions: params.questions,
    answers: params.answers,
    bundleTextHash,
    modelInputHash,
  };
}

/**
 * Strips fields that vary run-to-run without changing what a model actually
 * reads: random assessment/question/answer/evidence-record IDs (normalized
 * to fixed placeholders, and answers linked to their question by *position*
 * rather than by random ID), timestamps, and ingestion's own wall-clock
 * duration. Two calls with logically identical content -- same repo, same
 * case, same resolved evidence, same generated question text/answers in the
 * same order -- produce the same modelInputHash regardless of when or how
 * many times they ran.
 */
export function computeModelInputHash(params: {
  snapshot: IngestionSnapshot;
  collaborationCase: CollaborationCase | null;
  evidence: Evidence[];
  questions?: Question[];
  answers?: Answer[];
}): string {
  const questions = params.questions ?? [];
  const answers = params.answers ?? [];
  const questionIndexById = new Map(questions.map((q, i) => [q.questionId, i]));

  const canonical = {
    // metrics.durationMs/httpRequests reflect this run's wall-clock timing,
    // not model-visible content; collectedAt is a timestamp, not content.
    snapshot: { ...params.snapshot, metrics: undefined, collectedAt: "FIXED" },
    collaborationCase: params.collaborationCase ? { ...params.collaborationCase, assessmentId: "FIXED", submittedAt: "FIXED" } : null,
    evidence: params.evidence
      .map((e) => ({ ...e, assessmentId: "FIXED", collectedAt: "FIXED" }))
      .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
    questions: questions.map((q) => ({ text: q.text, groundingEvidenceIds: [...q.groundingEvidenceIds].sort(), targetCriteria: [...q.targetCriteria].sort() })),
    answers: answers.map((a) => ({
      questionIndex: questionIndexById.get(a.questionId) ?? -1,
      text: a.text,
      linkedEvidenceIds: [...a.linkedEvidenceIds].sort(),
    })),
  };
  return sha256(stableStringify(canonical));
}

export function hashPromptText(text: string): string {
  return sha256(text);
}
