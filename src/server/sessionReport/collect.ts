import { closeSync, lstatSync, openSync, opendirSync, readSync, realpathSync, statSync, type Dirent } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { buildSessionReport, EMPTY_SESSION_METRICS, type SessionReport } from "../../shared/sessionReport.js";

export const MAX_TRANSCRIPT_BYTES = 8 * 1024 * 1024;
export const MAX_TRANSCRIPT_LINES = 20_000;
export const MAX_LINE_BYTES = 512 * 1024;
export class SessionReportError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}
const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const identity = (v: unknown): string | undefined => typeof v === "string" && v.length > 0 && v.length <= 512 ? v : undefined;
const samePath = (a: string, b: string) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
const normalized = (v: string) => path.resolve(v);

/** Deliberately narrow: matches a command at its start, never text quoting a command. */
export function isCheckCommand(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (/(?:^|\s)--(?:help|version)(?:\s|$)/u.test(value)) return false;
  return /^(?:(?:npm|pnpm|yarn|bun)\s+(?:test|build|typecheck|lint|check)(?:\s|$)|(?:npm|pnpm|yarn|bun)\s+run\s+(?:test|build|typecheck|lint|check)(?::[\w-]+)?(?:\s|$)|(?:npx\s+)?(?:tsc|vitest|jest|pytest)(?:\s|$)|(?:npx\s+)?playwright\s+test(?:\s|$)|python(?:3)?\s+-m\s+pytest(?:\s|$)|(?:cargo|go)\s+test(?:\s|$))/u.test(value.trimStart());
}

/** Raw records exist only inside this function; the return value is counts and fixed copy. */
export function analyzeSessionText(text: string, options: { project?: string; limited?: boolean } = {}): SessionReport {
  const metrics = { ...EMPTY_SESSION_METRICS };
  const userIds = new Set<string>();
  const assistantIds = new Set<string>();
  const tools = new Map<string, "read" | "change" | "verification" | "other">();
  const results = new Map<string, "success" | "failure" | "unknown">();
  const sessionIds = new Set<string>();
  let associated = false;
  let supported = 0;
  let limited = options.limited ?? false;
  const lines = text.split("\n");
  if (lines.length > MAX_TRANSCRIPT_LINES) limited = true;
  for (const line of lines.slice(0, MAX_TRANSCRIPT_LINES)) {
    if (!line.trim()) continue;
    if (Buffer.byteLength(line) > MAX_LINE_BYTES) { metrics.malformedLines++; limited = true; continue; }
    let record: unknown;
    try { record = JSON.parse(line); } catch { metrics.malformedLines++; continue; }
    if (!obj(record) || typeof record.type !== "string") { metrics.malformedLines++; continue; }
    const sessionId = identity(record.sessionId);
    if (sessionId) sessionIds.add(sessionId);
    if (sessionIds.size > 1) throw new SessionReportError("mixed_sessions", "This input contains multiple session identities. Select one session transcript.");
    if (options.project && typeof record.cwd === "string") {
      if (!path.isAbsolute(record.cwd) || !samePath(normalized(record.cwd), options.project)) {
        throw new SessionReportError("project_mismatch", "This transcript is not associated exclusively with the selected project. Choose a matching --session file.");
      }
      associated = true;
    }
    if (record.type !== "user" && record.type !== "assistant") {
      const knownMetadata = ["system", "progress", "file-history-delta", "file-history-snapshot", "summary", "queue-operation", "attachment", "mode", "permission-mode", "last-prompt", "ai-title"];
      if (!knownMetadata.includes(record.type)) metrics.unsupportedRecords++;
      continue;
    }
    if (!obj(record.message) || (record.message.role !== record.type) ||
        !(typeof record.message.content === "string" || Array.isArray(record.message.content))) {
      metrics.malformedLines++; continue;
    }
    supported++;
    const blocks: unknown[] = typeof record.message.content === "string"
      ? [{ type: "text", text: record.message.content }] : record.message.content;
    let hasText = false;
    let hasToolResult = false;
    for (const block of blocks) {
      if (!obj(block) || typeof block.type !== "string") { metrics.malformedLines++; continue; }
      if (block.type === "text" && typeof block.text === "string" && block.text.trim()) hasText = true;
      else if (block.type === "tool_use" && record.type === "assistant") {
        const id = identity(block.id);
        if (!id || typeof block.name !== "string" || !obj(block.input)) { metrics.malformedLines++; continue; }
        if (!tools.has(id)) {
          const kind = ["Read", "Glob", "Grep", "LS"].includes(block.name) ? "read"
            : ["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(block.name) ? "change"
              : block.name === "Bash" && isCheckCommand(block.input.command) ? "verification" : "other";
          tools.set(id, kind);
        }
      } else if (block.type === "tool_result" && record.type === "user") {
        hasToolResult = true;
        const id = identity(block.tool_use_id);
        if (!id) { metrics.malformedLines++; continue; }
        const status = block.is_error === true ? "failure" : block.is_error === false ? "success" : "unknown";
        if (results.has(id) && results.get(id) !== status) { results.set(id, "unknown"); metrics.malformedLines++; }
        else results.set(id, status);
      } else if (!["text", "thinking", "redacted_thinking", "image", "document"].includes(block.type)) metrics.unsupportedRecords++;
    }
    if (record.type === "user" && hasText && !hasToolResult && record.isMeta !== true && record.isCompactSummary !== true) {
      const id = identity(record.uuid);
      if (id) userIds.add(id);
      else { metrics.malformedLines++; }
    }
    if (record.type === "assistant") {
      const id = identity(record.message.id) ?? identity(record.uuid);
      if (id) assistantIds.add(id);
      else metrics.malformedLines++;
    }
  }
  if (options.project && !associated) {
    throw new SessionReportError("project_unconfirmed", "The transcript has no matching project association. Select a Claude Code transcript containing the selected project's cwd.");
  }
  metrics.userMessages = userIds.size;
  metrics.assistantMessages = assistantIds.size;
  metrics.toolCalls = tools.size;
  for (const [id, kind] of tools) {
    if (kind === "read") metrics.readCalls++;
    if (kind === "change") metrics.changeCalls++;
    if (kind === "verification") metrics.verificationCalls++;
    const status = results.get(id);
    if (status) {
      metrics.toolResults++;
      if (status === "success") metrics.explicitSuccesses++;
      else if (status === "failure") metrics.explicitFailures++;
      else metrics.unknownResults++;
    }
  }
  for (const id of results.keys()) if (!tools.has(id)) metrics.unmatchedResults++;
  if (!supported && !metrics.unsupportedRecords) metrics.unsupportedRecords = 1;
  return buildSessionReport(metrics, { coverage: limited ? "limited" : metrics.malformedLines || metrics.unsupportedRecords ? "partial" : "complete" });
}

function regularCanonicalFile(file: string): string {
  const resolved = path.resolve(file);
  try {
    if (!samePath(realpathSync(resolved), resolved) || lstatSync(resolved).isSymbolicLink() || !statSync(resolved).isFile()) throw new Error();
  } catch { throw new SessionReportError("unsafe_session", "The selected session must be an accessible regular file without symlink or junction redirection."); }
  return resolved;
}

export function collectSessionReport(session: string, project: string): SessionReport {
  const file = regularCanonicalFile(session);
  let fd: number | undefined;
  try {
    fd = openSync(file, "r");
    const buffer = Buffer.alloc(MAX_TRANSCRIPT_BYTES + 1);
    let total = 0;
    while (total < buffer.length) {
      const read = readSync(fd, buffer, total, buffer.length - total, null);
      if (!read) break;
      total += read;
    }
    const limited = total > MAX_TRANSCRIPT_BYTES;
    let text = buffer.subarray(0, Math.min(total, MAX_TRANSCRIPT_BYTES)).toString("utf8");
    // A byte cap must not turn the cut tail into a fabricated malformed record.
    if (limited) text = text.slice(0, text.lastIndexOf("\n"));
    return analyzeSessionText(text, { project, limited });
  } catch (error) {
    if (error instanceof SessionReportError) throw error;
    throw new SessionReportError("read_failed", "The selected session could not be read.");
  } finally { if (fd !== undefined) closeSync(fd); }
}

export function resolveProject(project: string): string {
  try {
    const resolved = realpathSync(path.resolve(project));
    if (!statSync(resolved).isDirectory()) throw new Error();
    return resolved;
  } catch { throw new SessionReportError("invalid_project", "Select an accessible project directory with --project."); }
}

/** Only one exact project directory is enumerated. No home-wide session search. */
export function discoverSession(project: string, home = homedir(), configDirectory?: string): string {
  const root = realpathSync(home);
  const encoded = project.replace(/[^a-zA-Z0-9]/g, "-");
  const directory = path.join(configDirectory ? path.resolve(configDirectory) : path.join(root, ".claude"), "projects", encoded);
  try {
    if (!samePath(realpathSync(directory), directory) || !statSync(directory).isDirectory()) throw new Error();
  } catch { throw new SessionReportError("session_not_found", "No safely matched Claude Code project directory was found. Use --session with a matching transcript."); }
  const entries: Dirent[] = [];
  const handle = opendirSync(directory);
  try {
    let entry: Dirent | null;
    while ((entry = handle.readSync()) !== null) {
      entries.push(entry);
      if (entries.length > 200) throw new SessionReportError("too_many_sessions", "This project has too many session entries for automatic selection. Choose one with --session.");
    }
  } finally { handle.closeSync(); }
  const files = entries.filter(entry => entry.name.endsWith(".jsonl") && entry.isFile() && !entry.isSymbolicLink())
    .map(entry => {
      const file = regularCanonicalFile(path.join(directory, entry.name));
      return { file, modified: statSync(file).mtimeMs };
    }).sort((a, b) => b.modified - a.modified);
  if (!files.length) throw new SessionReportError("session_not_found", "No regular session transcript was found for this project. Use --session.");
  if (files[1] && files[0]!.modified === files[1].modified) throw new SessionReportError("ambiguous_session", "The latest session is ambiguous. Choose one with --session.");
  // Association is checked by collectSessionReport before any report is produced.
  return files[0]!.file;
}
