#!/usr/bin/env node
/**
 * Offline (mock) CLI for Task 2a + Task 3: runs a synthetic snapshot +
 * collaboration case + fixed answers through question generation, criterion
 * judgement, and scoring -- entirely with a MockProvider, no real LLM call.
 *
 * Usage:
 *   npm run evaluate:offline -- --case fixtures/calibration/cases/case-02-simple-tool-strong-verification \
 *     --mock-response fixtures/mock-responses/generic-valid.json
 *
 * Optional:
 *   --repo-ref-file repo_ref_before.json   (default: repo_ref.json)
 *   --case-dir <dir>                       (default: same as --case; case-08 subvariants keep collaboration_case.json under after/)
 *   --answers <file.json>                  (array of {text, linkedEvidenceIds?}, matched positionally to the 3 generated questions)
 *
 * Contract:
 *   - stdout: exactly one JSON document (the full offline evaluation outcome)
 *   - stderr: human-readable progress
 *   - manifest.mode is always "mock"; this never calls a real model.
 *   - exit code: 0 when the pipeline completed (whether the final score is
 *     issued or withheld -- withheld is a normal, valid outcome); non-zero
 *     when outcome.pipelineFailed is true, i.e. some stage (ingestion,
 *     questions, judgement, or scoring) itself failed. This mirrors real
 *     staged execution: a stage failure is not "a JSON that happens to say
 *     ok:false", it is a pipeline failure the caller must notice.
 */
import { readFileSync } from "node:fs";
import { runOfflineEvaluationForFixture } from "../src/server/evaluation/runOfflineEvaluationForFixture.js";
import type { RawProviderOutput } from "../src/server/evaluation/provider.js";

interface MockResponseFile {
  questions: RawProviderOutput;
  judgement: RawProviderOutput;
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i]?.startsWith("--")) {
      out[argv[i]!.slice(2)] = argv[++i] ?? "";
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.case || !args["mock-response"]) {
    process.stderr.write(
      "사용법: npm run evaluate:offline -- --case <fixture-dir> --mock-response <file.json> [--repo-ref-file NAME] [--case-dir DIR] [--answers FILE]\n",
    );
    process.stdout.write(JSON.stringify({ error: "missing required arguments" }) + "\n");
    process.exitCode = 1;
    return;
  }

  process.stderr.write("[evaluate:offline] mode=mock -- 실제 LLM 호출 없음\n");

  const mockResponse = JSON.parse(readFileSync(args["mock-response"]!, "utf8")) as MockResponseFile;
  const fixedAnswers = args.answers ? (JSON.parse(readFileSync(args.answers, "utf8")) as { text: string; linkedEvidenceIds?: string[] }[]) : undefined;

  process.stderr.write(`[evaluate:offline] ingesting fixture repo under ${args.case}\n`);

  const outcome = await runOfflineEvaluationForFixture({
    fixtureDir: args.case!,
    repoRefFile: args["repo-ref-file"],
    caseDir: args["case-dir"],
    mockQuestionsResponse: mockResponse.questions,
    mockJudgementResponse: mockResponse.judgement,
    fixedAnswers,
  });

  process.stderr.write(
    `[evaluate:offline] stages: ingestion=${outcome.stages.ingestion.status} questions=${outcome.stages.questions.status} judgement=${outcome.stages.judgement.status} scoring=${outcome.stages.scoring.status}\n`,
  );
  process.stdout.write(JSON.stringify(outcome, null, 2) + "\n");
  process.exitCode = outcome.pipelineFailed ? 1 : 0;
}

main().catch((err) => {
  process.stderr.write(`[evaluate:offline] unexpected error: ${String(err)}\n`);
  process.stdout.write(JSON.stringify({ error: "unexpected_error", message: String(err) }) + "\n");
  process.exitCode = 1;
});
