import { INGESTION_LIMITS } from "../../shared/contracts/ingestion.js";

/**
 * Tracks the request/byte/time budget for a single ingestion run so limits
 * from GITHUB_INGESTION.md section 4 are enforced in one place instead of
 * being re-checked ad hoc at every call site.
 */
export class IngestionBudget {
  private requestCount = 0;
  private contentBytes = 0;
  private responseBodyBytes = 0;
  private readonly startedAt: number;
  private readonly clock: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
    this.startedAt = clock();
  }

  elapsedMs(): number {
    return this.clock() - this.startedAt;
  }

  timeExceeded(): boolean {
    return this.elapsedMs() >= INGESTION_LIMITS.maxDurationMs;
  }

  requestsUsed(): number {
    return this.requestCount;
  }

  contentBytesUsed(): number {
    return this.contentBytes;
  }

  responseBodyBytesUsed(): number {
    return this.responseBodyBytes;
  }

  canMakeRequest(): boolean {
    return this.requestCount < INGESTION_LIMITS.maxHttpRequests && !this.timeExceeded();
  }

  canAddContentBytes(byteSize: number): boolean {
    return Number.isSafeInteger(byteSize) && byteSize >= 0 &&
      this.contentBytes + byteSize <= INGESTION_LIMITS.maxTotalContentBytes;
  }

  recordRequest(): void {
    this.requestCount += 1;
  }

  /** Atomically accepts decoded file bytes, never allowing the content cap to be exceeded. */
  tryAcceptContentBytes(byteSize: number): boolean {
    if (!this.canAddContentBytes(byteSize)) return false;
    this.contentBytes += byteSize;
    return true;
  }

  /** UTF-8 bytes of received bodyText, including failed/retried responses; not wire bytes. */
  recordResponseBodyBytes(byteSize: number): void {
    this.responseBodyBytes += byteSize;
  }
}
