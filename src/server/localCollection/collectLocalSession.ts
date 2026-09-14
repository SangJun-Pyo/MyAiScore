/**
 * Top-level orchestration for the local collaboration-record collection
 * PoC: parse one explicitly-named session file -> extract structural
 * events -> connect touched file paths to the project -> convert to the
 * existing Evidence contract -> build a human-readable local preview.
 *
 * Scope guarded here, per CLAUDE_LOCAL_COLLECTION_POC prompt:
 *  - exactly one project root + one session file, both caller-supplied
 *    (no home-directory or "find all sessions" scanning)
 *  - never executes anything from the target project (no install/build/
 *    test/hooks/MCP) -- this module only reads file paths and file
 *    existence, never runs code
 *  - never calls a real LLM, never uploads/transmits anything
 *  - does not feed into assembleEvaluationInput/provider/scoring -- this
 *    PoC verifies collection+connection only (see the session doc for why)
 */
import { parseClaudeCodeSessionFile, type ParsedSession, type MalformedLine } from "./parseSessionFile.js";
import { extractCollaborationEvents, type CollaborationEvent } from "./extractCollaborationEvents.js";
import { connectFileTouchesToProject, type FileConnection } from "./connectToRepoEvidence.js";
import { convertEventsToEvidence, type EvidenceConversionResult, type ExcludedItem } from "./toEvidence.js";
import { redactSecrets } from "../ingestion/redact.js";
import type { Evidence } from "../../shared/contracts/evaluation.js";

export class LocalCollectionError extends Error {
  constructor(
    message: string,
    public readonly code: "session_parse_failed",
  ) {
    super(message);
  }
}

export interface LocalCollectionResult {
  projectRoot: string;
  sessionFilePath: string;
  parsed: Pick<ParsedSession, "typeCounts" | "malformedLines">;
  events: CollaborationEvent[];
  fileConnections: FileConnection[];
  conversion: EvidenceConversionResult;
}

export function collectLocalSession(params: { projectRoot: string; sessionFilePath: string; assessmentId?: string; repoEvidencePaths?: Set<string> }): LocalCollectionResult {
  const assessmentId = params.assessmentId ?? "local_collection_poc";

  let parsed: ParsedSession;
  try {
    parsed = parseClaudeCodeSessionFile(params.sessionFilePath);
  } catch (err) {
    if (err instanceof Error) {
      throw new LocalCollectionError(err.message, "session_parse_failed");
    }
    throw err;
  }

  const events = extractCollaborationEvents(parsed.records);
  const fileTouches = events.filter((e): e is Extract<CollaborationEvent, { kind: "file_touch" }> => e.kind === "file_touch");
  const fileConnections = connectFileTouchesToProject({ fileTouches, projectRoot: params.projectRoot, repoEvidencePaths: params.repoEvidencePaths });
  const conversion = convertEventsToEvidence({ assessmentId, events, fileConnections, collectedAt: new Date().toISOString() });

  return {
    projectRoot: params.projectRoot,
    sessionFilePath: params.sessionFilePath,
    parsed: { typeCounts: parsed.typeCounts, malformedLines: parsed.malformedLines },
    events,
    fileConnections,
    conversion,
  };
}

/**
 * The ONLY shape any output surface (CLI human preview, CLI --json, and any
 * future consumer) may show to the outside. Deliberately excludes:
 *  - `events` (LocalCollectionResult.events): raw CollaborationEvent[] --
 *    carries session text (assistant_text.text, tool_call.result.
 *    resultTextExcerpt, etc.) BEFORE redactSecrets/truncation.
 *  - `conversion.analysisContext`: the masked+truncated text meant only
 *    for a future provider request (Phase 2 R3 pattern) -- more raw than
 *    the short preview already inside each Evidence.summary.
 *
 * MAS-006 (Astra independent review of claude/local-collection-poc@5978210):
 * the CLI's `--json` branch used to `JSON.stringify(result)` wholesale,
 * which included `events` and therefore leaked unmasked session text (a
 * synthetic secret in `secrets-session.jsonl` reproduced this). The human
 * preview (`printHumanPreview`) never touched `events`/`analysisContext`
 * and was already safe -- but that safety existed only because the two
 * output paths were written separately by hand, not because any single
 * choke point enforced it. This function is that choke point: both output
 * paths must now build their output ONLY from this view, so they can never
 * drift apart again the way MAS-006 happened.
 */
export interface LocalCollectionPublicView {
  projectRoot: string;
  sessionFilePath: string;
  recordTypeCounts: Record<string, number>;
  malformedLines: MalformedLine[];
  fileConnections: FileConnection[];
  evidence: Evidence[];
  excluded: ExcludedItem[];
  maskedEvidenceIds: string[];
}

/** This masks recognized secret patterns, not every possible personal datum. */
function previewText(text: string, max = 2000): string {
  return redactSecrets(text).redacted.slice(0, max);
}

function previewEventTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

export function buildLocalCollectionPublicView(result: LocalCollectionResult): LocalCollectionPublicView {
  return {
    projectRoot: previewText(result.projectRoot),
    sessionFilePath: previewText(result.sessionFilePath),
    recordTypeCounts: result.parsed.typeCounts,
    malformedLines: result.parsed.malformedLines.map(line => ({ ...line, reason: previewText(line.reason) })),
    fileConnections: result.fileConnections.map(connection => ({ ...connection, path: previewText(connection.path), note: previewText(connection.note) })),
    evidence: result.conversion.evidence.map(evidence => ({
      ...evidence,
      summary: previewText(evidence.summary, 120),
      path: evidence.path === null ? null : previewText(evidence.path),
      eventTime: previewEventTime(evidence.eventTime),
      verificationNote: previewText(evidence.verificationNote),
    })),
    excluded: result.conversion.excluded.map(item => ({ ...item, detail: previewText(item.detail) })),
    maskedEvidenceIds: result.conversion.maskedEvidenceIds,
  };
}
