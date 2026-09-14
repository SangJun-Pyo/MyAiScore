import { normalizeAndValidateRepoUrl, validateCommitRef } from '../ingestion/urlValidation.js';
import { redactSecrets } from '../ingestion/redact.js';
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public retryable = false) { super(message); }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'invalid_input', '입력 형식을 확인해주세요.');
  return value as Record<string, unknown>;
}
export function onlyKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new HttpError(400, 'invalid_input', '허용되지 않은 입력 항목이 있습니다.');
}
export async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) return {};
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'invalid_input', 'JSON 형식이 필요합니다.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65_536) { await reader.cancel(); throw new HttpError(413, 'invalid_input', '입력은 64 KiB 이하여야 합니다.'); }
      chunks.push(value);
    }
    if (!size) return {};
    try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
    catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'invalid_input', 'JSON 형식을 확인해주세요.'); }
  } finally { reader.releaseLock(); }
}
export function textField(value: unknown, max: number, required = false): string {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new HttpError(400, 'invalid_input', '텍스트 길이와 필수 항목을 확인해주세요.');
  return redactSecrets(value.trim()).redacted;
}
export function collaborationInput(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) return undefined;
  const data = object(value);
  const fields = ['problem', 'constraints', 'done_criteria', 'ai_suggestion_summary', 'user_action_detail', 'verification_summary'];
  onlyKeys(data, [...fields, 'user_action']);
  const output: Record<string, string> = {};
  let count = 0;
  for (const field of fields) { output[field] = textField(data[field], 4000); count += typeof data[field] === 'string' ? data[field].length : 0; }
  if (count > 4000) throw new HttpError(400, 'invalid_input', '협업 사례는 전체 4,000자 이하여야 합니다.');
  if (!['accepted', 'rejected', 'modified'].includes(String(data.user_action))) throw new HttpError(400, 'invalid_input', 'AI 제안에 대한 행동을 선택해주세요.');
  output.user_action = String(data.user_action);
  return output;
}
export function excerptsInput(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 3) throw new HttpError(400, 'invalid_input', '발췌는 최대 3건까지 가능합니다.');
  return value.map(text => textField(text, 2000, true));
}
export function createInput(data: Record<string, unknown>) {
  onlyKeys(data, ['repo_url', 'commit_ref', 'collaboration_case', 'excerpts', 'consent']);
  if (data.consent !== true) throw new HttpError(400, 'consent_required', '선택한 자료의 서버 분석에 동의해주세요.');
  const repo = normalizeAndValidateRepoUrl(typeof data.repo_url === 'string' ? data.repo_url.trim() : '');
  if (!repo.ok) throw new HttpError(400, repo.code, repo.message);
  const commitRef = data.commit_ref == null || data.commit_ref === '' ? undefined : textField(data.commit_ref, 256, true);
  if (!validateCommitRef(commitRef).ok || (commitRef && /\s/.test(commitRef))) throw new HttpError(400, 'invalid_input', '커밋 참조를 확인해주세요.');
  return { repoUrl: `https://github.com/${repo.ref.owner}/${repo.ref.repo}`, commitRef,
    input: { collaborationCase: collaborationInput(data.collaboration_case), excerpts: excerptsInput(data.excerpts) } };
}
export function answersInput(data: Record<string, unknown>) {
  onlyKeys(data, ['answers']);
  if (!Array.isArray(data.answers) || data.answers.length > 3) throw new HttpError(400, 'invalid_input', '답변은 최대 3건입니다.');
  const ids = new Set<string>();
  return data.answers.map(item => {
    const answer = object(item); onlyKeys(answer, ['question_id', 'text']);
    const questionId = textField(answer.question_id, 200, true);
    if (ids.has(questionId)) throw new HttpError(400, 'invalid_input', '질문별 답변은 한 건만 제출해주세요.');
    ids.add(questionId);
    return { questionId, text: textField(answer.text, 2000, true) };
  });
}
