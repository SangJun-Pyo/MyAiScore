import type { HttpClient } from "../ingestion/httpClient.js";
import { ingestRepository } from "../ingestion/ingest.js";
import { boundedText } from "../service/safety.js";
import type { IngestionInput, IngestionSnapshot } from "../../shared/contracts/ingestion.js";
import type { RepositoryReport } from "../../shared/repositoryReport.js";
import { buildRepositoryReport } from "./report.js";

export class RepositoryReportError extends Error {
  constructor(public status: number, public code: string, message: string, public retryable = false) {
    super(message);
  }
}

export interface RepositoryReportAdmissionOptions {
  maxConcurrent?: number;
  tokenMaxStarts?: number;
  tokenWindowMs?: number;
  anonymousMaxStarts?: number;
  anonymousWindowMs?: number;
  cooldownMs?: number;
  now?: () => number;
}

/** Process-local protection for the shared GitHub credential. State stays bounded by maxStarts. */
export class RepositoryReportAdmission {
  private active = 0;
  private readonly pools = {
    token: { starts: [] as number[], blockedUntil: 0 },
    anonymous: { starts: [] as number[], blockedUntil: 0 },
  };
  private readonly maxConcurrent: number;
  private readonly tokenMaxStarts: number;
  private readonly tokenWindowMs: number;
  private readonly anonymousMaxStarts: number;
  private readonly anonymousWindowMs: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(options: RepositoryReportAdmissionOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 2;
    // At 48 requests per ingestion, this is at most 2,880 requests/hour,
    // below GitHub's 5,000 authenticated requests/hour allowance.
    this.tokenMaxStarts = options.tokenMaxStarts ?? 5;
    this.tokenWindowMs = options.tokenWindowMs ?? 5 * 60_000;
    // One unauthenticated ingestion is at most 48 requests, below 60/hour.
    this.anonymousMaxStarts = options.anonymousMaxStarts ?? 1;
    this.anonymousWindowMs = options.anonymousWindowMs ?? 60 * 60_000;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.now = options.now ?? Date.now;
    if (![this.maxConcurrent, this.tokenMaxStarts, this.tokenWindowMs, this.anonymousMaxStarts, this.anonymousWindowMs, this.cooldownMs].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error("Invalid repository report admission options.");
  }

  acquire(hasServerToken: boolean): () => void {
    const timestamp = this.now();
    const pool = hasServerToken ? this.pools.token : this.pools.anonymous;
    const maxStarts = hasServerToken ? this.tokenMaxStarts : this.anonymousMaxStarts;
    const windowMs = hasServerToken ? this.tokenWindowMs : this.anonymousWindowMs;
    pool.starts = pool.starts.filter(start => timestamp - start < windowMs).slice(-maxStarts);
    if (timestamp < pool.blockedUntil) throw new RepositoryReportError(429, "repository_report_rate_limited", "요청이 잠시 많아요. 잠시 뒤 다시 시도해 주세요.", true);
    if (this.active >= this.maxConcurrent) throw new RepositoryReportError(429, "repository_report_busy", "다른 저장소를 읽고 있어요. 잠시 뒤 다시 시도해 주세요.", true);
    if (pool.starts.length >= maxStarts) {
      pool.blockedUntil = timestamp + this.cooldownMs;
      throw new RepositoryReportError(429, "repository_report_rate_limited", "요청이 잠시 많아요. 잠시 뒤 다시 시도해 주세요.", true);
    }
    pool.starts.push(timestamp);
    this.active += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active -= 1;
      }
    };
  }
}

/** One limiter is shared by every createApi instance in this server process. */
export const repositoryReportAdmission = new RepositoryReportAdmission();

export function createSafeGithubHttpClient(fetchImpl: typeof fetch = fetch): HttpClient {
  return {
    async request(url, init) {
      if (new URL(url).origin !== "https://api.github.com") throw new Error("invalid_destination");
      const response = await fetchImpl(url, { headers: init?.headers, redirect: "manual", signal: AbortSignal.timeout(10_000) });
      return { status: response.status, headers: Object.fromEntries(response.headers.entries()), bodyText: await boundedText(response, 2_000_000) };
    },
  };
}

export interface RepositoryReportServiceOptions {
  httpClient?: HttpClient;
  authToken?: string;
}

export async function collectPublicRepository(input: IngestionInput, options: RepositoryReportServiceOptions = {}): Promise<IngestionSnapshot> {
  return ingestRepository(input, {
    httpClient: options.httpClient ?? createSafeGithubHttpClient(),
    authToken: options.authToken?.trim() || undefined,
  });
}

function failure(snapshot: IngestionSnapshot): RepositoryReportError {
  const code = snapshot.failure?.code ?? "ingestion_failed";
  if (["invalid_url", "unsupported_host", "invalid_commit_ref"].includes(code)) {
    return new RepositoryReportError(400, code, "공개 GitHub 저장소 주소 형식을 확인해 주세요.");
  }
  if (code === "repo_not_found_or_private") {
    return new RepositoryReportError(404, code, "공개 저장소를 찾을 수 없어요. 비공개 저장소는 분석하지 않아요.");
  }
  if (code === "github_api_rate_limited") {
    return new RepositoryReportError(429, code, "GitHub 요청 한도에 도달했어요. 잠시 뒤 다시 시도해 주세요.", true);
  }
  return new RepositoryReportError(502, "repository_collection_failed", "공개 저장소를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.", snapshot.failure?.retryable ?? true);
}

export async function generateRepositoryReport(input: IngestionInput, options: RepositoryReportServiceOptions = {}): Promise<RepositoryReport> {
  let snapshot: IngestionSnapshot;
  try {
    snapshot = await collectPublicRepository(input, options);
  } catch {
    throw new RepositoryReportError(502, "repository_collection_failed", "공개 저장소를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.", true);
  }
  if (snapshot.ingestionStatus === "failed") throw failure(snapshot);
  try {
    return buildRepositoryReport(snapshot);
  } catch {
    throw new RepositoryReportError(502, "repository_report_failed", "저장소 리포트를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.", true);
  }
}
