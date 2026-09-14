#!/usr/bin/env node
/**
 * CLI entry point for the read-only GitHub ingestion PoC.
 *
 * Usage:
 *   npm run ingest -- --repo https://github.com/owner/repo [--ref <branch|tag|sha>] [--paths a/b.ts,c/d.ts]
 *
 * Contract (CLAUDE_PHASE1_PROMPT.md "Task 1"):
 *   - stdout: exactly one JSON document (the IngestionSnapshot, or a failure object)
 *   - stderr: human-readable progress messages only
 *   - exit code 0: ingestion_status is "complete" or "partial"
 *   - exit code 1: ingestion_status is "failed" (includes invalid input)
 *
 * Reads GITHUB_TOKEN from the environment if present (optional, to raise the
 * unauthenticated 60/hour rate limit). The token value itself is never
 * logged, printed, or written to any file by this script.
 */
import { ingestRepository } from "../src/server/ingestion/ingest.js";
import { FetchHttpClient } from "../src/server/ingestion/httpClient.js";

function parseArgs(argv: string[]): { repo?: string; ref?: string; paths?: string[] } {
  const out: { repo?: string; ref?: string; paths?: string[] } = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--repo") out.repo = argv[++i];
    else if (arg === "--ref") out.ref = argv[++i];
    else if (arg === "--paths") out.paths = (argv[++i] ?? "").split(",").filter(Boolean);
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.repo) {
    process.stderr.write("사용법: npm run ingest -- --repo https://github.com/owner/repo [--ref REF] [--paths a,b]\n");
    process.stdout.write(JSON.stringify({ error: "missing --repo argument" }) + "\n");
    process.exitCode = 1;
    return;
  }

  // Token is read but never echoed anywhere in this process's output.
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;

  const snapshot = await ingestRepository(
    { repoUrl: args.repo, commitRef: args.ref, relevantPaths: args.paths },
    {
      httpClient: new FetchHttpClient(),
      authToken: token,
      onProgress: (message) => process.stderr.write(`[ingest] ${message}\n`),
    },
  );

  process.stdout.write(JSON.stringify(snapshot, null, 2) + "\n");
  process.exitCode = snapshot.ingestionStatus === "failed" ? 1 : 0;
}

main().catch((err) => {
  process.stderr.write(`[ingest] unexpected error: ${String(err)}\n`);
  process.stdout.write(JSON.stringify({ error: "unexpected_error", message: String(err) }) + "\n");
  process.exitCode = 1;
});
