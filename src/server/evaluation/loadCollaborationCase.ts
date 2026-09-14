/**
 * Parses a fixture's collaboration_case.json (written in the EVIDENCE_SCHEMA.md
 * wire shape, snake_case) into the internal camelCase CollaborationCase type
 * (src/shared/contracts/evaluation.ts). This is the read-side of the
 * internal-camelCase / external-snake_case boundary decision
 * (docs/Development/ASTRA_PHASE1_REVIEW.md section 1) -- fixture JSON plays
 * the role of "external input" here, same shape a real API request would use.
 */
import type { CollaborationCase, UserAction } from "../../shared/contracts/evaluation.js";

interface CollaborationCaseWire {
  case_id: string;
  problem: string;
  constraints: string;
  done_criteria: string;
  ai_suggestion_summary: string;
  user_action: UserAction;
  user_action_detail: string;
  verification_summary: string;
  linked_evidence_ids: string[];
  external_excerpts?: string[];
  submitted_at: string;
  /** Free-text authoring note some fixtures carry; not part of the product contract. */
  note?: string;
}

const VALID_USER_ACTIONS: UserAction[] = ["accepted", "rejected", "modified"];

export class CollaborationCaseParseError extends Error {}

export function parseCollaborationCase(raw: unknown, assessmentId: string | null): CollaborationCase {
  if (typeof raw !== "object" || raw === null) {
    throw new CollaborationCaseParseError("collaboration_case.json must be a JSON object");
  }
  const wire = raw as Partial<CollaborationCaseWire>;
  const required: (keyof CollaborationCaseWire)[] = [
    "case_id",
    "problem",
    "constraints",
    "done_criteria",
    "ai_suggestion_summary",
    "user_action",
    "user_action_detail",
    "verification_summary",
    "linked_evidence_ids",
    "submitted_at",
  ];
  for (const key of required) {
    if (wire[key] === undefined) {
      throw new CollaborationCaseParseError(`collaboration_case.json missing required field: ${key}`);
    }
  }
  if (!VALID_USER_ACTIONS.includes(wire.user_action as UserAction)) {
    throw new CollaborationCaseParseError(`collaboration_case.json has invalid user_action: ${String(wire.user_action)}`);
  }
  if (!Array.isArray(wire.linked_evidence_ids)) {
    throw new CollaborationCaseParseError("collaboration_case.json linked_evidence_ids must be an array");
  }

  return {
    caseId: wire.case_id!,
    assessmentId,
    problem: wire.problem!,
    constraints: wire.constraints!,
    doneCriteria: wire.done_criteria!,
    aiSuggestionSummary: wire.ai_suggestion_summary!,
    userAction: wire.user_action!,
    userActionDetail: wire.user_action_detail!,
    verificationSummary: wire.verification_summary!,
    linkedEvidenceIds: wire.linked_evidence_ids!,
    externalExcerpts: wire.external_excerpts,
    submittedAt: wire.submitted_at!,
  };
}
