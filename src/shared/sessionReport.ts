/** Counts-only public boundary. Transcript content must never be added here. */
export interface SessionMetrics {
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  readCalls: number;
  changeCalls: number;
  verificationCalls: number;
  toolResults: number;
  explicitSuccesses: number;
  explicitFailures: number;
  unknownResults: number;
  unmatchedResults: number;
  malformedLines: number;
  unsupportedRecords: number;
}
export type SessionCoverage = "complete" | "partial" | "limited";
export interface SessionReport {
  schemaVersion: "session-report-v1";
  ruleVersion: "activity-mix-v1";
  source: "claude_code";
  origin: "local" | "synthetic";
  coverage: SessionCoverage;
  metrics: SessionMetrics;
  score: {
    value: number | null;
    label: "Session mix";
    explanation: string;
    breakdown: { conversation: number; exploration: number; iteration: number; verification: number };
  };
  style: { id: string; title: string; description: string };
  highlights: Array<{ title: string; description: string }>;
  nextChallenge: { title: string; description: string };
}

export const EMPTY_SESSION_METRICS: SessionMetrics = {
  userMessages: 0, assistantMessages: 0, toolCalls: 0, readCalls: 0, changeCalls: 0,
  verificationCalls: 0, toolResults: 0, explicitSuccesses: 0, explicitFailures: 0,
  unknownResults: 0, unmatchedResults: 0, malformedLines: 0, unsupportedRecords: 0,
};
const metricKeys = Object.keys(EMPTY_SESSION_METRICS) as Array<keyof SessionMetrics>;
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validMetrics(value: unknown): SessionMetrics {
  if (!object(value) || Object.keys(value).length !== metricKeys.length) throw new Error("Invalid session metrics.");
  for (const key of metricKeys) {
    if (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0 || (value[key] as number) > 100_000) {
      throw new Error("Invalid session metrics.");
    }
  }
  const m = value as unknown as SessionMetrics;
  if (m.readCalls + m.changeCalls + m.verificationCalls > m.toolCalls ||
      m.toolResults > m.toolCalls ||
      m.explicitSuccesses + m.explicitFailures + m.unknownResults !== m.toolResults) {
    throw new Error("Inconsistent session metrics.");
  }
  return { ...m };
}

/** A playful activity mix, not an ability grade. Each component saturates at 25. */
export function buildSessionReport(
  metrics: SessionMetrics,
  options: { origin?: "local" | "synthetic"; coverage?: SessionCoverage } = {},
): SessionReport {
  const m = validMetrics(metrics);
  const origin = options.origin ?? "local";
  let coverage = options.coverage ?? "complete";
  if (!["local", "synthetic"].includes(origin) || !["complete", "partial", "limited"].includes(coverage)) {
    throw new Error("Invalid session report options.");
  }
  if (coverage === "complete" && (m.malformedLines || m.unsupportedRecords)) coverage = "partial";
  const breakdown = {
    conversation: Math.min(m.userMessages, 5) * 5,
    exploration: Math.min(m.readCalls, 5) * 5,
    iteration: Math.min(m.changeCalls, 5) * 5,
    verification: Math.min(m.verificationCalls, 5) * 5,
  };
  const active = m.userMessages + m.assistantMessages + m.toolCalls > 0;
  const style = !active
    ? { id: "quiet-session", title: "A quiet session", description: "No supported conversation or tool activity was found in this input." }
    : m.verificationCalls > 0 && m.verificationCalls >= m.changeCalls
      ? { id: "check-and-build", title: "Check & build", description: "Check-shaped commands feature prominently in this session. Their presence does not prove the output was correct." }
      : m.changeCalls > 0 && m.changeCalls >= m.readCalls
        ? { id: "hands-on-builder", title: "Hands-on builder", description: "Editing tools feature prominently in this session. A tool call is an attempt, not proof of a successful change." }
        : m.readCalls > 0
          ? { id: "curious-explorer", title: "Curious explorer", description: "Reading and searching tools feature prominently in this session." }
          : { id: "conversation-first", title: "Conversation first", description: "This session is led by conversation, with little classified tool activity in the available record." };
  const nextChallenge = m.verificationCalls === 0
    ? { title: "Give one change a check", description: "On your next task, ask for one focused test and inspect its actual result. Missing logs do not mean you skipped verification." }
    : m.readCalls === 0
      ? { title: "Explore before the next edit", description: "On your next task, inspect a relevant file before changing it and explain what you learned." }
      : { title: "Try a useful counterexample", description: "On your next task, test one input that could break your preferred solution and inspect what happened." };
  return {
    schemaVersion: "session-report-v1", ruleVersion: "activity-mix-v1", source: "claude_code", origin, coverage, metrics: m,
    score: {
      value: active ? Object.values(breakdown).reduce((sum, value) => sum + value, 0) : null,
      label: "Session mix",
      explanation: "A playful mix of recorded activity, not an ability grade. Conversation, exploration, editing and check-shaped commands each add 5 points per occurrence, capped at 25 each. More activity does not mean better work.",
      breakdown,
    },
    style,
    highlights: [
      { title: "Conversation rhythm", description: `${m.userMessages} user messages and ${m.assistantMessages} assistant messages were recorded. Tool-result wrappers are excluded from user messages.` },
      { title: "Tools in motion", description: `${m.readCalls} reading/searching calls, ${m.changeCalls} editing calls and ${m.verificationCalls} check-shaped command calls were recorded. These are activity signals, not verified outcomes.` },
      { title: "Results in the record", description: `${m.toolResults} calls have matched results: ${m.explicitSuccesses} explicitly marked non-error, ${m.explicitFailures} explicitly marked error and ${m.unknownResults} with unspecified status. ${m.toolCalls - m.toolResults} calls have no matched result.` },
    ],
    nextChallenge,
  };
}

/** Recompute all display copy and numbers; reject extra fields or forged derived output. */
export function parseSessionReport(value: unknown): SessionReport {
  if (!object(value) || value.schemaVersion !== "session-report-v1" || value.ruleVersion !== "activity-mix-v1" ||
      value.source !== "claude_code" || !["local", "synthetic"].includes(String(value.origin)) ||
      !["complete", "partial", "limited"].includes(String(value.coverage))) throw new Error("Unsupported session report.");
  const result = buildSessionReport(validMetrics(value.metrics), {
    origin: value.origin as SessionReport["origin"], coverage: value.coverage as SessionCoverage,
  });
  // Canonical object comparison is independent of JSON key order.
  const canonical = (item: unknown): string => {
    if (Array.isArray(item)) return `[${item.map(canonical).join(",")}]`;
    if (object(item)) return `{${Object.keys(item).sort().map(key => `${JSON.stringify(key)}:${canonical(item[key])}`).join(",")}}`;
    return JSON.stringify(item);
  };
  if (canonical(value) !== canonical(result)) throw new Error("Invalid or modified session report.");
  return result;
}

export function encodeSessionReportFragment(report: SessionReport): string {
  return `#report=${encodeURIComponent(JSON.stringify(parseSessionReport(report)))}`;
}
export function decodeSessionReportFragment(fragment: string): SessionReport {
  if (!fragment.startsWith("#report=") || fragment.length > 16_384) throw new Error("Invalid session report link.");
  try { return parseSessionReport(JSON.parse(decodeURIComponent(fragment.slice(8)))); }
  catch { throw new Error("Invalid session report link."); }
}
export const exampleSessionReport = buildSessionReport({
  ...EMPTY_SESSION_METRICS, userMessages: 4, assistantMessages: 9, toolCalls: 12,
  readCalls: 4, changeCalls: 3, verificationCalls: 2, toolResults: 10,
  explicitSuccesses: 7, explicitFailures: 1, unknownResults: 2,
}, { origin: "synthetic" });
