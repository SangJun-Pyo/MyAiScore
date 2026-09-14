/**
 * Types for the on-disk Claude Code session transcript format (JSONL, one
 * JSON object per line). This is NOT a MyAiScore product contract -- it is
 * the third-party file format this PoC's collector reads. The shape below
 * was determined by inspecting a real local session file in this project
 * (~/.claude/projects/<encoded-path>/<session-id>.jsonl), not from
 * documentation, so it only covers what was actually observed:
 *
 *   - "user":      { message: { role: "user", content: string | ContentBlock[] }, uuid, parentUuid, timestamp, cwd, ... }
 *   - "assistant": { message: { role: "assistant", content: ContentBlock[], model, usage, ... }, uuid, parentUuid, timestamp, ... }
 *   - "file-history-delta": { trackingPath, backup: { backupTime, realParentDir, ... }, timestamp, ... }
 *   - other types ("system", "file-history-snapshot", "attachment",
 *     "mode", "permission-mode", "atis-latch", "last-prompt", "ai-title", ...)
 *     are session/UI metadata this PoC does not need and passes through
 *     unparsed as OtherRecord.
 *
 * A record's `type` is the only thing this module trusts structurally.
 * Everything inside `message.content` is untrusted user/model text, exactly
 * like repo file content in the GitHub ingestion path -- never interpreted
 * as an instruction to this codebase.
 */

export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ThinkingContentBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContentBlock {
  type: "tool_result";
  tool_use_id: string;
  /** Usually a string; some tool results are structured. Only string content is summarized in this PoC. */
  content: unknown;
  is_error?: boolean;
}

export type ContentBlock = TextContentBlock | ThinkingContentBlock | ToolUseContentBlock | ToolResultContentBlock | { type: string; [k: string]: unknown };

export interface UserRecord {
  type: "user";
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  cwd?: string;
  message: { role: "user"; content: string | ContentBlock[] };
}

export interface AssistantRecord {
  type: "assistant";
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  cwd?: string;
  message: { role: "assistant"; content: ContentBlock[] };
}

export interface FileHistoryDeltaRecord {
  type: "file-history-delta";
  messageId: string;
  trackingPath: string;
  timestamp: string;
  backup?: { backupTime?: string; realParentDir?: string };
}

export interface OtherRecord {
  type: string;
  [k: string]: unknown;
}

export type SessionRecord = UserRecord | AssistantRecord | FileHistoryDeltaRecord | OtherRecord;

export const KNOWN_RECORD_TYPES = new Set([
  "user",
  "assistant",
  "system",
  "file-history-snapshot",
  "file-history-delta",
  "attachment",
  "mode",
  "permission-mode",
  "atis-latch",
  "last-prompt",
  "ai-title",
]);
