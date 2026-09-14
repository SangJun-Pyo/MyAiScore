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
import { parseClaudeCodeSessionFile, type ParsedSession } from "./parseSessionFile.js";
import { extractCollaborationEvents, type CollaborationEvent } from "./extractCollaborationEvents.js";
import { connectFileTouchesToProject, type FileConnection } from "./connectToRepoEvidence.js";
import { convertEventsToEvidence, type EvidenceConversionResult } from "./toEvidence.js";

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
