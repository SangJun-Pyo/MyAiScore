import { INGESTION_LIMITS } from "../../shared/contracts/ingestion.js";

/**
 * Tracks the request/byte/time budget for a single ingestion run so limits
 * from GITHUB_INGESTION.md section 4 are enforced in one place instead of
 * being re-checked ad hoc at every call site.
 */
export class IngestionBudget {
  private requestCount = 0;
  private totalBytes = 0;
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

  bytesUsed(): number {
    return this.totalBytes;
  }

  canMakeRequest(): boolean {
    return this.requestCount < INGESTION_LIMITS.maxHttpRequests && !this.timeExceeded();
  }

  canAddBytes(byteSize: number): boolean {
    return this.totalBytes + byteSize <= INGESTION_LIMITS.maxTotalContentBytes;
  }

  recordRequest(): void {
    this.requestCount += 1;
  }

  recordBytes(byteSize: number): void {
    this.totalBytes += byteSize;
  }
}
