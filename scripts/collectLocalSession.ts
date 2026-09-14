#!/usr/bin/env node
/**
 * Dev-only local collection PoC CLI. Reads exactly one project root and one
 * explicitly-named Claude Code session file (no auto-discovery), and prints
 * a human-readable local preview: what was included, what was excluded,
 * what was masked, which file connections resolved, and what remains
 * unresolved. Never sends anything anywhere, never calls a real LLM, never
 * executes anything in the target project.
 *
 * Usage:
 *   npx tsx scripts/collectLocalSession.ts --project <dir> --session <path-to.jsonl> [--json]
 *
 * Not published to npm -- internal development command only.
 */
import { collectLocalSession, LocalCollectionError } from "../src/server/localCollection/collectLocalSession.js";

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--json") {
      out.json = true;
      continue;
    }
    if (argv[i]?.startsWith("--")) out[argv[i]!.slice(2)] = argv[++i] ?? "";
  }
  return out;
}

function printHumanPreview(result: ReturnType<typeof collectLocalSession>): void {
  console.log(`\n=== 로컬 협업 기록 수집 미리보기 (mode=local-collection-poc) ===`);
  console.log(`프로젝트: ${result.projectRoot}`);
  console.log(`세션 파일: ${result.sessionFilePath}`);
  console.log(`\n-- 레코드 유형 개수 --`);
  for (const [type, count] of Object.entries(result.parsed.typeCounts)) console.log(`  ${type}: ${count}`);

  if (result.parsed.malformedLines.length > 0) {
    console.log(`\n-- 손상된 줄 (건너뜀, 총 ${result.parsed.malformedLines.length}개) --`);
    for (const m of result.parsed.malformedLines) console.log(`  line ${m.lineNumber}: ${m.reason}`);
  }

  console.log(`\n-- 파일 경로 연결 (${result.fileConnections.length}개) --`);
  for (const c of result.fileConnections) console.log(`  [${c.status}] ${c.path}\n    - ${c.note}`);

  console.log(`\n-- 포함된 근거 (${result.conversion.evidence.length}개) --`);
  for (const e of result.conversion.evidence) {
    console.log(`  [${e.evidenceId}] ${e.summary}`);
    console.log(`    path=${e.path ?? "null"} eventTime=${e.eventTime ?? "null"}`);
    console.log(`    검증 메모: ${e.verificationNote}`);
  }

  if (result.conversion.excluded.length > 0) {
    console.log(`\n-- 제외된 항목 (${result.conversion.excluded.length}개) --`);
    for (const x of result.conversion.excluded) console.log(`  [${x.reason}] ${x.detail}`);
  }

  if (result.conversion.maskedEvidenceIds.length > 0) {
    console.log(`\n-- 비밀 패턴이 마스킹된 근거 (${result.conversion.maskedEvidenceIds.length}개) --`);
    for (const id of result.conversion.maskedEvidenceIds) console.log(`  ${id}`);
  }

  console.log(`\n(원문 발췌는 이 화면과 analysisContext에만 존재하며, 외부로 전송되지 않았다.)`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.project !== "string" || typeof args.session !== "string") {
    process.stderr.write("사용법: npx tsx scripts/collectLocalSession.ts --project <dir> --session <path-to.jsonl> [--json]\n");
    process.exitCode = 1;
    return;
  }

  try {
    const result = collectLocalSession({ projectRoot: args.project, sessionFilePath: args.session });
    if (args.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      printHumanPreview(result);
    }
  } catch (err) {
    if (err instanceof LocalCollectionError) {
      process.stderr.write(`[collect-local-session] ${err.code}: ${err.message}\n`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  process.stderr.write(`[collect-local-session] unexpected error: ${String(err)}\n`);
  process.exitCode = 1;
});
