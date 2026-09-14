/**
 * Reads a local Claude Code session transcript file (JSONL) and parses it
 * into SessionRecord[]. Tolerant of individual malformed lines (skipped and
 * reported, never crashes the whole read); explicitly rejects a file that
 * is not this format at all (SessionParseError code "unsupported_format")
 * rather than silently returning an empty, misleadingly-valid result.
 *
 * This module only reads the exact file path the caller supplies -- it
 * never searches the user's home directory or enumerates other sessions
 * (CLAUDE_LOCAL_COLLECTION_POC prompt: "사용자 홈이나 전체 대화 기록을 자동
 * 탐색·수집하지 않는다").
 */
import { readFileSync, statSync } from "node:fs";
import { KNOWN_RECORD_TYPES, type SessionRecord } from "./sessionRecordTypes.js";

export class SessionParseError extends Error {
  constructor(
    message: string,
    public readonly code: "file_not_found" | "unsupported_format" | "empty_file",
  ) {
    super(message);
  }
}

export interface MalformedLine {
  lineNumber: number;
  reason: string;
}

export interface ParsedSession {
  filePath: string;
  records: SessionRecord[];
  malformedLines: MalformedLine[];
  /** Distinct record-type counts, for the human preview and for tests. */
  typeCounts: Record<string, number>;
}

/** Size cap so a multi-GB accidental target doesn't get read into memory whole. Real sessions observed so far are a few MB. */
export const MAX_SESSION_FILE_BYTES = 200 * 1024 * 1024;

export function parseClaudeCodeSessionFile(filePath: string): ParsedSession {
  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    throw new SessionParseError(`session file not found: ${filePath}`, "file_not_found");
  }
  if (!stat.isFile()) {
    throw new SessionParseError(`not a file: ${filePath}`, "file_not_found");
  }
  if (stat.size === 0) {
    throw new SessionParseError(`session file is empty: ${filePath}`, "empty_file");
  }
  if (stat.size > MAX_SESSION_FILE_BYTES) {
    throw new SessionParseError(`session file exceeds ${MAX_SESSION_FILE_BYTES} bytes: ${filePath}`, "unsupported_format");
  }

  const text = readFileSync(filePath, "utf8");
  const lines = text.split("\n");

  const records: SessionRecord[] = [];
  const malformedLines: MalformedLine[] = [];
  let recognizedTypeLines = 0;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line.length === 0) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      malformedLines.push({ lineNumber: index + 1, reason: `invalid JSON: ${err instanceof Error ? err.message : String(err)}` });
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) || typeof (parsed as { type?: unknown }).type !== "string") {
      malformedLines.push({ lineNumber: index + 1, reason: "line is not a JSON object with a string 'type' field" });
      return;
    }
    const record = parsed as SessionRecord;
    if (KNOWN_RECORD_TYPES.has(record.type)) recognizedTypeLines += 1;
    records.push(record);
  });

  if (recognizedTypeLines === 0) {
    throw new SessionParseError(
      `no line in ${filePath} matched a known Claude Code session record type -- this does not look like a supported session transcript`,
      "unsupported_format",
    );
  }

  const typeCounts: Record<string, number> = {};
  for (const r of records) typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;

  return { filePath, records, malformedLines, typeCounts };
}
