import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PreparedAssessment, AssessmentResult } from '../service/assessment.js';

export type Status = 'draft' | 'ingesting' | 'generating_questions' | 'awaiting_answers' | 'scoring' | 'done' | 'failed';
export interface AssessmentRecord {
  id: string; ownerHash: string; repoUrl: string; commitRef?: string;
  input: { collaborationCase?: Record<string, unknown>; excerpts?: string[] };
  status: Status; revision: number; createdAt: string; expiresAt: string;
  prepared: PreparedAssessment | null; result: AssessmentResult | null;
  answers: { questionId: string; text: string }[];
  failure: { stage: string; code: string; message: string; retryable: boolean } | null;
  attempt: { id: string; stage: string; deadline: number } | null;
  visibility: 'private' | 'public'; shareId: string | null;
  previousAssessmentId?: string;
}
export interface SavedOperation { hash: string; state: 'pending' | 'complete'; assessmentId: string; status?: number; body?: unknown; createdAt: number }
export interface Database { assessments: Record<string, AssessmentRecord>; operations: Record<string, SavedOperation>; usage: Record<string, number> }
export interface Store { read(): Promise<Database>; transaction<T>(fn: (db: Database) => T): Promise<T> }
export const emptyDatabase = (): Database => ({ assessments: {}, operations: {}, usage: {} });
export class StorageError extends Error {}

/** Single process development store. Production uses the CAS-backed database store. */
export class FileStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory = resolve(process.env.MYAISCORE_DATA_DIR ?? '.data')) {}
  async read(): Promise<Database> {
    try { return JSON.parse(await readFile(join(this.directory, 'assessments.json'), 'utf8')) as Database; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyDatabase(); throw new StorageError('storage_unavailable'); }
  }
  transaction<T>(fn: (db: Database) => T): Promise<T> {
    const operation = this.queue.then(async () => {
      const db = await this.read();
      const result = fn(db);
      await mkdir(this.directory, { recursive: true });
      const path = join(this.directory, `${randomUUID()}.tmp`);
      await writeFile(path, JSON.stringify(db), { mode: 0o600 });
      await rename(path, join(this.directory, 'assessments.json'));
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}

export class MemoryStore implements Store {
  private data = emptyDatabase();
  async read() { return structuredClone(this.data); }
  async transaction<T>(fn: (db: Database) => T) {
    const copy = structuredClone(this.data);
    const result = fn(copy);
    this.data = copy;
    return result;
  }
}

/** A singleton JSON document with optimistic compare-and-swap. Callback must be pure. */
export class SupabaseStore implements Store {
  constructor(private url: string, private key: string, private fetcher: typeof fetch = fetch) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.username || parsed.password) throw new StorageError('invalid_storage_configuration');
  }
  private async request(path: string, init: RequestInit = {}) {
    let response: Response;
    try {
      response = await this.fetcher(`${this.url.replace(/\/$/, '')}/rest/v1/${path}`, {
        ...init, redirect: 'error', signal: AbortSignal.timeout(10_000),
        headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers },
      });
    } catch { throw new StorageError('storage_unavailable'); }
    if (!response.ok) throw new StorageError('storage_unavailable');
    return response.json();
  }
  private async row(): Promise<{ revision: number; payload: Database }> {
    const rows = await this.request('myaiscore_state?id=eq.1&select=revision,payload');
    if (!Array.isArray(rows) || rows.length !== 1) throw new StorageError('storage_not_initialized');
    return rows[0];
  }
  async read() { return (await this.row()).payload; }
  async transaction<T>(fn: (db: Database) => T): Promise<T> {
    for (let i = 0; i < 12; i++) {
      const row = await this.row();
      const result = fn(row.payload);
      const updated = await this.request(`myaiscore_state?id=eq.1&revision=eq.${row.revision}`, {
        method: 'PATCH', body: JSON.stringify({ revision: row.revision + 1, payload: row.payload }),
      });
      if (Array.isArray(updated) && updated.length === 1) return result;
    }
    throw new StorageError('storage_busy');
  }
}

let singleton: Store | undefined;
export function getStore(): Store {
  if (singleton) return singleton;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) singleton = new SupabaseStore(url, key);
  else {
    if (process.env.NODE_ENV === 'production' && process.env.MYAISCORE_ALLOW_FILE_STORE !== 'true') throw new StorageError('production_storage_required');
    singleton = new FileStore();
  }
  return singleton;
}

export function purgeExpired(db: Database, now: number) {
  for (const [id, record] of Object.entries(db.assessments)) if (Date.parse(record.expiresAt) <= now) delete db.assessments[id];
  for (const [key, op] of Object.entries(db.operations)) if (!db.assessments[op.assessmentId] || now - op.createdAt > 86_400_000) delete db.operations[key];
  for (const key of Object.keys(db.usage)) if (!key.endsWith(new Date(now).toISOString().slice(0, 10))) delete db.usage[key];
}
