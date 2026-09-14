/**
 * Typed request payloads a provider (mock now, real in Task 2b) actually
 * receives. Astra Phase 2 review (R2): the old provider interface took no
 * arguments at all -- bundle/prompt/rubric were computed only for manifest
 * hashing, never delivered anywhere. These types make "what was actually
 * sent" a first-class, inspectable value (RecordingMockProvider captures it).
 *
 * The split mirrors EVIDENCE_SCHEMA.md section 1's warning that submitted
 * data is not instructions: `trustedInstructions` is the only part of a
 * request this codebase authored and controls; `untrusted` carries
 * repo/case/excerpt/answer content verbatim, however it reads.
 */
import type { CriterionDefinition } from "./rubricCriteria.js";
import type { Answer, CollaborationCase, Evidence, Question } from "../../shared/contracts/evaluation.js";

export interface TrustedInstructions {
  promptVersion: string;
  promptText: string;
  rubricCriteriaVersion: string;
  /** Only present on judgement requests -- question generation does not need per-level rubric detail. */
  rubricCriteria?: CriterionDefinition[];
}

export interface UntrustedContext {
  evidence: Evidence[];
  collaborationCase: CollaborationCase | null;
  /**
   * evidenceId -> truncated, secret-masked text for evidence whose permanent
   * record (Evidence) intentionally carries no content (repo file bodies via
   * IngestionSnapshot.files, user excerpts via resolveExternalExcerpts). This
   * is the channel Astra Phase 2 review (R3) found missing entirely.
   */
  analysisContext: Record<string, string>;
}

export interface QuestionGenerationRequest {
  assessmentId: string;
  trustedInstructions: TrustedInstructions;
  untrusted: UntrustedContext;
  inferenceConfigVersion: string;
  timeoutMs: number;
}

export interface JudgementRequest {
  assessmentId: string;
  trustedInstructions: TrustedInstructions;
  untrusted: UntrustedContext & { questions: Question[]; answers: Answer[] };
  inferenceConfigVersion: string;
  timeoutMs: number;
}
