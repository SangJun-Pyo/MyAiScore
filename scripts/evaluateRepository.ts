#!/usr/bin/env node
/** Operator-only interactive CLI. --example never uses network; --live requires explicit env configuration.
 * No repository code or local session paths are executed/read by this command. */
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stderr } from 'node:process';
import { createAnthropicProviderFromEnv } from '../src/server/service/anthropicProvider.js';
import { prepareAssessment, generateAssessmentQuestions, finalizeAssessment, syntheticExample, ServiceError, type CaseSubmission, type AssessmentResult } from '../src/server/service/assessment.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const values: Record<string, string> = {};
  let example = false, live = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--example') example = true;
    else if (arg === '--live') live = true;
    else if (['--repo', '--ref', '--case', '--out'].includes(arg) && args[i + 1] && !args[i + 1]!.startsWith('--')) values[arg] = args[++i]!;
    else throw new ServiceError('input', 'invalid_arguments', '사용법: --example [--out FILE] 또는 --live --repo URL [--ref REF] [--case FILE] [--out FILE]');
  }
  if (example && live) throw new ServiceError('input', 'invalid_arguments', '--example과 --live는 함께 사용할 수 없습니다.');
  let result: AssessmentResult;
  if (example) result = syntheticExample();
  else {
    if (!live || !values['--repo']) throw new ServiceError('input', 'live_confirmation_required', '실제 평가에는 --live --repo URL과 관리자 API 환경 설정이 필요합니다. 무료 예시는 --example을 사용하세요.');
    const provider = createAnthropicProviderFromEnv();
    if (!stdin.isTTY) throw new ServiceError('input', 'interactive_required', '실제 평가의 질문 답변은 대화형 터미널에서 입력해 주세요.');
    let submission: { collaborationCase?: CaseSubmission; excerpts?: string[] } = {};
    if (values['--case']) {
      const text = await readFile(values['--case'], 'utf8');
      if (Buffer.byteLength(text) > 64_000) throw new ServiceError('input', 'input_limit', '사례 JSON은 최대 64KB입니다.');
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ServiceError('input', 'invalid_input', '사례 JSON 객체가 필요합니다.');
      submission = parsed as typeof submission;
    }
    const readline = createInterface({ input: stdin, output: stderr });
    try {
      stderr.write('공개 저장소 코드와 입력한 사례·발췌·답변을 Anthropic API로 전송합니다. 모델 API 비용이 발생할 수 있습니다.\n');
      const confirmation = await readline.question('선택한 자료의 전송과 API 호출을 진행하려면 SEND 입력: ');
      if (confirmation.trim() !== 'SEND') throw new ServiceError('input', 'cancelled', '평가를 취소했습니다. 외부 평가 호출을 하지 않았습니다.');
      const prepared = await prepareAssessment({ assessmentId: `as_${randomUUID()}`, repoUrl: values['--repo'], commitRef: values['--ref'], collaborationCase: submission.collaborationCase, excerpts: submission.excerpts });
      const questioned = await generateAssessmentQuestions(prepared, provider);
      const answers = [];
      for (const q of questioned.questions) answers.push({ questionId: q.questionId, text: await readline.question(`${q.text}\n답변 (Enter로 생략): `) });
      result = await finalizeAssessment(questioned, answers, provider);
    } finally { readline.close(); }
  }
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (values['--out']) await writeFile(values['--out'], serialized, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  else process.stdout.write(serialized);
}
main().catch(error => {
  process.stderr.write(JSON.stringify({ error: error instanceof ServiceError ? error.code : 'evaluation_failed', message: error instanceof ServiceError ? error.message : '평가를 완료하지 못했습니다. 입력 파일과 실행 환경을 확인해 주세요.' }) + '\n');
  process.exitCode = 1;
});
