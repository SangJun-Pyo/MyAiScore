import { createHash } from 'node:crypto';
import { redactSecrets } from '../ingestion/redact.js';

export type ServiceStage = 'input' | 'ingestion' | 'questions' | 'judgement' | 'scoring';
export class ServiceError extends Error {
  constructor(public readonly stage: ServiceStage, public readonly code: string, message: string, public readonly retryable = false) { super(message); this.name = 'ServiceError'; }
}
export const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
/** Defense in depth, not a claim of complete PII detection. Redact before truncation. */
export function safeText(value: string, limit = 2000): string {
  return redactSecrets(value).redacted
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, '***masked***')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '***email***')
    .replace(/\b(api[_-]?key|password|secret|access[_-]?token)\s*[:=]\s*["']?[^\s"',;]+/gi, '$1=***masked***')
    .slice(0, limit);
}
export function inputText(value: unknown, field: string, limit = 2000): string {
  if (typeof value !== 'string' || value.length > limit) throw new ServiceError('input', 'invalid_input', `${field}: text must not exceed ${limit} characters.`);
  return safeText(value.trim(), limit);
}
export async function boundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
      if (size > maxBytes) throw new Error('response_limit'); chunks.push(part.value); }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
