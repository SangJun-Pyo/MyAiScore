/**
 * Builds ConfidenceSummary per docs/Assessment/CONFIDENCE_MODEL.md section 2.
 * Pure mapping from already-known facts (ingestion coverage/status, whether
 * process evidence was actually linked) -- computes no probability, badge,
 * or ability claim. CONFIDENCE_MODEL.md section 1: "개인의 일반 역량을
 * 인증하지 않는다."
 */
import type { CoverageInfo, IngestionStatus } from "../../shared/contracts/ingestion.js";
import type { ConfidenceSummary, Evidence, ProcessEvidenceLevel } from "../../shared/contracts/evaluation.js";

function toSourceVerification(status: IngestionStatus): ConfidenceSummary["sourceVerification"] {
  if (status === "complete") return "complete";
  if (status === "partial") return "partial";
  return "failed";
}

export function computeConfidenceSummary(params: {
  coverage: CoverageInfo;
  ingestionStatus: IngestionStatus;
  processEvidence: ProcessEvidenceLevel;
  remainingUncertainty: string[];
}): ConfidenceSummary {
  return {
    evidenceScope: {
      readFiles: params.coverage.readFiles,
      candidateFiles: params.coverage.candidateFiles,
      selectionLimited: params.coverage.selectionLimited,
    },
    sourceVerification: toSourceVerification(params.ingestionStatus),
    processEvidence: params.processEvidence,
    remainingUncertainty: params.remainingUncertainty,
  };
}

/**
 * Astra Phase 2 review: "deriveProcessEvidenceLevel은 사례가 연결한 정적
 * 파일 한 개만 있어도 linked_records를 반환한다. CONFIDENCE_MODEL은 실제
 * 관련 과정 발췌·변경 기록을 요구한다." A single repo_static link only
 * proves a file exists -- it says nothing about the AI-collaboration
 * *process* (what was asked, tried, rejected, verified). Only evidence
 * whose sourceType is itself a process record --repo_history (a commit/log
 * entry), user_provided_excerpt (a pasted transcript/log), or
 * interview_answer (a question response) -- counts toward "linked_records".
 * A case backed only by repo_static links (or no resolved evidence at all)
 * is "statements_only": there is a narrative, but nothing beyond code
 * existence corroborates it.
 */
const PROCESS_RECORD_SOURCE_TYPES: Evidence["sourceType"][] = ["repo_history", "user_provided_excerpt", "interview_answer", "collaboration_case"];

export function deriveProcessEvidenceLevel(params: { hasCollaborationCase: boolean; resolvedCaseEvidence: Evidence[] }): ProcessEvidenceLevel {
  if (!params.hasCollaborationCase) return "none";
  const hasActualProcessRecord = params.resolvedCaseEvidence.some((e) => PROCESS_RECORD_SOURCE_TYPES.includes(e.sourceType));
  return hasActualProcessRecord ? "linked_records" : "statements_only";
}
