/**
 * Adapter: local-session CollaborationEvent[] -> the EXISTING Evidence
 * contract (src/shared/contracts/evaluation.ts). No contract change was
 * needed -- every field already existed:
 *   - sourceType: "user_provided_excerpt" (never repo_static/repo_history --
 *     CLAUDE_LOCAL_COLLECTION_POC prompt: "로컬 기록을 GitHub에서 직접
 *     확인한 근거로 표시하지 않는다")
 *   - collectionMethod: "user_submission"
 *   - path/locator: only set when a file_touch resolved to a known
 *     repo-evidence path (connectToRepoEvidence.ts); null otherwise
 *   - verificationNote: states plainly what was and wasn't confirmed
 *
 * Same permanent-metadata/transient-content split as the GitHub excerpt
 * path (evidenceMap.ts's resolveExternalExcerpts, R3 of PHASE2_FIX_REPORT):
 * the actual (masked, truncated) text never lives on the Evidence object
 * itself, only in the returned `analysisContext` map keyed by evidenceId.
 */
import { createHash, randomUUID } from "node:crypto";
import { redactSecrets } from "../ingestion/redact.js";
import type { Evidence } from "../../shared/contracts/evaluation.js";
import type { CollaborationEvent } from "./extractCollaborationEvents.js";
import type { FileConnection } from "./connectToRepoEvidence.js";

/** API_DATA_CONTRACTS.md "사용자 발췌 건당 2,000자" -- reused for local-session excerpt text, same limit as the GitHub-excerpt path. */
export const MAX_LOCAL_EXCERPT_CHARS = 2000;

export interface ExcludedItem {
  reason: "empty_text" | "unsupported_event";
  detail: string;
}

export interface EvidenceConversionResult {
  evidence: Evidence[];
  analysisContext: Record<string, string>;
  excluded: ExcludedItem[];
  maskedEvidenceIds: string[];
}

function maskAndTruncate(text: string): { text: string; masked: boolean } {
  const { redacted, masked } = redactSecrets(text);
  const truncated = redacted.length > MAX_LOCAL_EXCERPT_CHARS ? `${redacted.slice(0, MAX_LOCAL_EXCERPT_CHARS)}…[truncated]` : redacted;
  return { text: truncated, masked };
}

function shortPreview(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

export function convertEventsToEvidence(params: {
  assessmentId: string;
  events: CollaborationEvent[];
  fileConnections: FileConnection[];
  collectedAt: string;
}): EvidenceConversionResult {
  const { assessmentId, events, fileConnections, collectedAt } = params;
  const connectionByPath = new Map(fileConnections.map((c) => [c.path, c]));

  const evidence: Evidence[] = [];
  const analysisContext: Record<string, string> = {};
  const excluded: ExcludedItem[] = [];
  const maskedEvidenceIds: string[] = [];

  function push(params2: { summaryLabel: string; rawText: string | undefined; verificationNote: string; eventTime: string | null; path?: string | null }) {
    const evidenceId = `local_${randomUUID()}`;
    let summary = params2.summaryLabel;
    if (params2.rawText !== undefined) {
      const { text, masked } = maskAndTruncate(params2.rawText);
      if (masked) maskedEvidenceIds.push(evidenceId);
      analysisContext[evidenceId] = text;
      summary = `${params2.summaryLabel}: ${shortPreview(text)}`;
    }
    evidence.push({
      evidenceId,
      assessmentId,
      sourceType: "user_provided_excerpt",
      collectionMethod: "user_submission",
      summary,
      contentSha256: createHash("sha256").update(params2.rawText ?? params2.summaryLabel, "utf8").digest("hex"),
      collectedAt,
      repo: null,
      commitSha: null,
      path: params2.path ?? null,
      locator: null,
      eventTime: params2.eventTime,
      verificationNote: params2.verificationNote,
    });
  }

  for (const event of events) {
    if (event.kind === "user_message") {
      if (event.text.trim().length === 0) {
        excluded.push({ reason: "empty_text", detail: `user_message ${event.uuid} has no text` });
        continue;
      }
      push({
        summaryLabel: "로컬 세션 사용자 메시지(원문 미검증 자기 자료)",
        rawText: event.text,
        verificationNote: "로컬 Claude Code 세션 로그에서 추출한 사용자 발화. 서비스가 독립적으로 확인한 사실이 아니며, GitHub에서 확인한 근거와 구분한다.",
        eventTime: event.timestamp,
      });
    } else if (event.kind === "assistant_text") {
      if (event.text.trim().length === 0) {
        excluded.push({ reason: "empty_text", detail: `assistant_text ${event.uuid} has no text` });
        continue;
      }
      push({
        summaryLabel: "로컬 세션 AI 응답(원문 미검증 자기 자료)",
        rawText: event.text,
        verificationNote: "로컬 Claude Code 세션 로그에서 추출한 AI 응답 텍스트. 실제로 그 제안이 반영·검증됐는지는 별도 확인이 필요하다.",
        eventTime: event.timestamp,
      });
    } else if (event.kind === "tool_call") {
      const filePath = typeof event.inputSummary.file_path === "string" ? (event.inputSummary.file_path as string) : null;
      const connection = filePath ? connectionByPath.get(filePath.split("\\").join("/")) : undefined;
      const resolvedPath = connection?.status === "path_referenced_in_repo_evidence" ? filePath : null;

      const resultNote =
        event.result.status === "no_result_found"
          ? "도구 호출 기록은 있으나 대응하는 실행 결과가 로그에 없다 -- 성공/실패 여부를 확인할 수 없다"
          : event.result.status === "tool_reported_error"
            ? "도구가 오류를 보고했다(실행 자체의 결과이며, 이것이 사용자의 최종 검증 결론이라고 확대 해석하지 않는다)"
            : "도구가 오류 없이 완료됐다고 보고했다(이것이 곧 '검증 성공'이나 '테스트 통과'를 의미하지 않는다 -- 명령 이름만으로 결과 내용을 판단하지 않는다)";
      const verificationHint = event.inferred.looksLikeVerificationCommand
        ? " 이 명령은 검증 명령처럼 보이는 패턴과 일치한다(수집기의 문자열 패턴 추정일 뿐, 로그에 기록된 사실이 아님)."
        : "";
      const connectionNote = connection ? ` 파일 경로 연결: ${connection.note}` : "";

      push({
        summaryLabel: `로컬 세션 도구 호출: ${event.toolName}`,
        rawText: event.result.resultTextExcerpt,
        verificationNote: `${resultNote}.${verificationHint}${connectionNote}`,
        eventTime: event.timestamp,
        path: resolvedPath,
      });
    } else if (event.kind === "file_touch") {
      const connection = connectionByPath.get(event.path);
      const resolvedPath = connection?.status === "path_referenced_in_repo_evidence" ? event.path : null;
      push({
        summaryLabel: `로컬 세션 파일 변경 추적: ${event.path}`,
        rawText: undefined,
        verificationNote: connection ? connection.note : "연결 정보를 확인할 수 없음",
        eventTime: event.timestamp,
        path: resolvedPath,
      });
    }
  }

  return { evidence, analysisContext, excluded, maskedEvidenceIds };
}
