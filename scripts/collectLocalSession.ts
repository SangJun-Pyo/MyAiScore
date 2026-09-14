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
 *
 * Both output modes (default human preview and --json) are built from the
 * SAME LocalCollectionPublicView (see collectLocalSession.ts) -- neither
 * branch is allowed to touch the internal `result.events` or
 * `result.conversion.analysisContext` directly. This is the fix for
 * MAS-006 (Astra independent review of claude/local-collection-poc@5978210):
 * `--json` used to serialize the full internal result, which included raw
 * session text collected before secret-masking/truncation.
 */
import { collectLocalSession, buildLocalCollectionPublicView, LocalCollectionError, type LocalCollectionPublicView } from "../src/server/localCollection/collectLocalSession.js";

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

function printHumanPreview(view: LocalCollectionPublicView): void {
  console.log(`\n=== 로컬 협업 기록 수집 미리보기 (mode=local-collection-poc) ===`);
  console.log(`프로젝트: ${view.projectRoot}`);
  console.log(`세션 파일: ${view.sessionFilePath}`);
  console.log(`\n-- 레코드 유형 개수 --`);
  for (const [type, count] of Object.entries(view.recordTypeCounts)) console.log(`  ${type}: ${count}`);

  if (view.malformedLines.length > 0) {
    console.log(`\n-- 손상된 줄 (건너뜀, 총 ${view.malformedLines.length}개) --`);
    for (const m of view.malformedLines) console.log(`  line ${m.lineNumber}: ${m.reason}`);
  }

  console.log(`\n-- 파일 경로 연결 (${view.fileConnections.length}개) --`);
  for (const c of view.fileConnections) console.log(`  [${c.status}] ${c.path}\n    - ${c.note}`);

  console.log(`\n-- 포함된 근거 (${view.evidence.length}개) --`);
  for (const e of view.evidence) {
    console.log(`  [${e.evidenceId}] ${e.summary}`);
    console.log(`    path=${e.path ?? "null"} eventTime=${e.eventTime ?? "null"}`);
    console.log(`    검증 메모: ${e.verificationNote}`);
  }

  if (view.excluded.length > 0) {
    console.log(`\n-- 제외된 항목 (${view.excluded.length}개) --`);
    for (const x of view.excluded) console.log(`  [${x.reason}] ${x.detail}`);
  }

  if (view.maskedEvidenceIds.length > 0) {
    console.log(`\n-- 비밀 패턴이 마스킹된 근거 (${view.maskedEvidenceIds.length}개) --`);
    for (const id of view.maskedEvidenceIds) console.log(`  ${id}`);
  }

  console.log(`\n(원문 발췌는 근거 요약(마스킹·절단됨)으로만 표시되며, 전체 원문은 이 출력에도 외부로도 전송되지 않았다.)`);
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
    const view = buildLocalCollectionPublicView(result);
    if (args.json) {
      process.stdout.write(JSON.stringify(view, null, 2) + "\n");
    } else {
      printHumanPreview(view);
    }
  } catch (err) {
    if (err instanceof LocalCollectionError) {
      // err.message only ever carries the caller-supplied file path and a
      // static reason string (see parseSessionFile.ts) -- never session content.
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
