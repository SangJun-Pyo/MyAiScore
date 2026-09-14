/**
 * Turns parsed SessionRecord[] into a normalized, structural event list.
 * Every event field here is a fact read directly off the transcript
 * (a message existed with this text, a tool was invoked with this name, a
 * tool_result block referencing that call existed or didn't). Nothing here
 * infers success, intent, or a user's accept/reject/modify decision --
 * CLAUDE_LOCAL_COLLECTION_POC prompt: "로그에 있는 사실과 수집기가 추론한
 * 내용을 구분한다... 기록에 없는 판단·행동·성공 결과를 만들어 내지 않는다."
 *
 * The one exception, clearly labeled `inferred: true`, is
 * `looksLikeVerificationCommand` on tool calls -- a pattern match on the
 * command text (e.g. contains "test", "npm run"), kept separate from the
 * tool's own reported `is_error` (a real fact) so a caller can never
 * mistake "this command's name suggests it was a test" for "the test
 * passed". A verification command with no result at all, or one the tool
 * itself reported as errored, must never be read as success.
 */
import type { AssistantRecord, ContentBlock, FileHistoryDeltaRecord, SessionRecord, UserRecord } from "./sessionRecordTypes.js";

export type ToolResultStatus = "tool_reported_ok" | "tool_reported_error" | "no_result_found";

export interface UserMessageEvent {
  kind: "user_message";
  uuid: string;
  timestamp: string;
  text: string;
}

export interface AssistantTextEvent {
  kind: "assistant_text";
  uuid: string;
  timestamp: string;
  text: string;
}

export interface ToolCallEvent {
  kind: "tool_call";
  uuid: string;
  toolUseId: string;
  toolName: string;
  timestamp: string;
  /** Only small, structurally-relevant fields (e.g. Bash's `command`, Write/Edit/Read's `file_path`) -- not the full input object verbatim, to avoid carrying arbitrary large payloads into evidence. */
  inputSummary: Record<string, unknown>;
  result: {
    status: ToolResultStatus;
    /** Present only when a matching tool_result was found. Truncated; masking is applied by the caller before this ever reaches Evidence. */
    resultTextExcerpt?: string;
  };
  /** Pattern-matched guess, not a fact from the log. Never used to claim verification succeeded. */
  inferred: { looksLikeVerificationCommand: boolean };
}

export interface FileTouchEvent {
  kind: "file_touch";
  path: string;
  timestamp: string;
}

export type CollaborationEvent = UserMessageEvent | AssistantTextEvent | ToolCallEvent | FileTouchEvent;

const VERIFICATION_COMMAND_PATTERN = /\b(npm\s+(run\s+)?test|npm\s+run\s+typecheck|pytest|go\s+test|cargo\s+test|node\s+--test|jest|vitest)\b/i;

function isContentBlockArray(content: unknown): content is ContentBlock[] {
  return Array.isArray(content);
}

function extractText(blocks: ContentBlock[], type: "text" | "thinking"): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === type) {
      const text = (b as { text?: string; thinking?: string }).text ?? (b as { thinking?: string }).thinking;
      if (typeof text === "string" && text.length > 0) out.push(text);
    }
  }
  return out;
}

function summarizeToolInput(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  // Keep this to structurally meaningful, small fields per known tool
  // shapes -- never the full arbitrary input object (which could include
  // large file contents for Write, for instance).
  switch (toolName) {
    case "Bash":
      return { command: typeof input.command === "string" ? input.command : undefined };
    case "Write":
    case "Edit":
    case "Read":
      return { file_path: typeof input.file_path === "string" ? input.file_path : undefined };
    default:
      return { keys: Object.keys(input) };
  }
}

function toolResultText(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const texts = content.filter((c): c is { type: string; text: string } => typeof c === "object" && c !== null && (c as { type?: unknown }).type === "text");
    if (texts.length > 0) return texts.map((t) => t.text).join("\n");
  }
  return undefined;
}

export function extractCollaborationEvents(records: SessionRecord[]): CollaborationEvent[] {
  // Pass 1: find every tool_result block anywhere in the transcript, keyed by tool_use_id.
  const resultsByToolUseId = new Map<string, { isError: boolean; text?: string }>();
  for (const r of records) {
    if (r.type !== "user") continue;
    const content = (r as UserRecord).message?.content;
    if (!isContentBlockArray(content)) continue;
    for (const block of content) {
      if (block.type === "tool_result") {
        const tr = block as { tool_use_id: string; content: unknown; is_error?: boolean };
        resultsByToolUseId.set(tr.tool_use_id, { isError: tr.is_error === true, text: toolResultText(tr.content) });
      }
    }
  }

  const events: CollaborationEvent[] = [];

  for (const r of records) {
    if (r.type === "user") {
      const ur = r as UserRecord;
      const content = ur.message?.content;
      if (typeof content === "string" && content.trim().length > 0) {
        events.push({ kind: "user_message", uuid: ur.uuid, timestamp: ur.timestamp, text: content });
      } else if (isContentBlockArray(content)) {
        for (const text of extractText(content, "text")) {
          events.push({ kind: "user_message", uuid: ur.uuid, timestamp: ur.timestamp, text });
        }
      }
    } else if (r.type === "assistant") {
      const ar = r as AssistantRecord;
      const content = ar.message?.content;
      if (!isContentBlockArray(content)) continue;
      for (const text of extractText(content, "text")) {
        events.push({ kind: "assistant_text", uuid: ar.uuid, timestamp: ar.timestamp, text });
      }
      for (const block of content) {
        if (block.type === "tool_use") {
          const tu = block as { id: string; name: string; input: Record<string, unknown> };
          const result = resultsByToolUseId.get(tu.id);
          const inputSummary = summarizeToolInput(tu.name, tu.input ?? {});
          const commandText = typeof inputSummary.command === "string" ? inputSummary.command : "";
          events.push({
            kind: "tool_call",
            uuid: ar.uuid,
            toolUseId: tu.id,
            toolName: tu.name,
            timestamp: ar.timestamp,
            inputSummary,
            result: result
              ? { status: result.isError ? "tool_reported_error" : "tool_reported_ok", resultTextExcerpt: result.text }
              : { status: "no_result_found" },
            inferred: { looksLikeVerificationCommand: VERIFICATION_COMMAND_PATTERN.test(commandText) },
          });
        }
      }
    } else if (r.type === "file-history-delta") {
      const fd = r as FileHistoryDeltaRecord;
      if (typeof fd.trackingPath === "string" && fd.trackingPath.length > 0) {
        events.push({ kind: "file_touch", path: fd.trackingPath.split("\\").join("/"), timestamp: fd.timestamp });
      }
    }
  }

  return events;
}
