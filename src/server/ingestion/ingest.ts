import { createHash } from "node:crypto";
import type { HttpClient } from "./httpClient.js";
import { GithubApiClient } from "./githubApi.js";
import { IngestionBudget } from "./budget.js";
import { normalizeAndValidateRepoUrl, validateCommitRef } from "./urlValidation.js";
import { selectFiles, isProbablyBinaryContent } from "./fileSelection.js";
import { redactSecrets } from "./redact.js";
import type {
  IngestionSnapshot,
  IngestionInput,
  IngestedFile,
  SkippedFile,
  EvidenceCandidate,
  SupportStatus,
} from "../../shared/contracts/ingestion.js";
import { INGESTION_LIMITS } from "../../shared/contracts/ingestion.js";

export const COLLECTOR_VERSION = "ingestion-poc-0.1.0";

function nowIso(): string {
  return new Date().toISOString();
}

function detectSupportStatus(paths: string[], hasPackageJsonWithNext: boolean): SupportStatus {
  if (paths.length === 0) return "unknown";
  const tsCount = paths.filter((p) => /\.tsx?$/.test(p)).length;
  const jsCount = paths.filter((p) => /\.jsx?$/.test(p)).length;
  if (hasPackageJsonWithNext && tsCount > 0) return "nextjs_typescript";
  if (tsCount + jsCount === 0) return "other";
  if (hasPackageJsonWithNext) return "nextjs_typescript";
  return "other";
}

function buildStaticSignals(files: IngestedFile[]) {
  const languageFileCounts: Record<string, number> = {};
  const testPaths: string[] = [];
  const ciPaths: string[] = [];
  const aiConfigPaths: string[] = [];
  let dependencies: string[] = [];
  let hasPackageJsonWithNext = false;

  for (const file of files) {
    const ext = file.path.split(".").pop() ?? "unknown";
    languageFileCounts[ext] = (languageFileCounts[ext] ?? 0) + 1;

    if (/\.(test|spec)\.[jt]sx?$/.test(file.path) || file.path.includes("__tests__/")) {
      testPaths.push(file.path);
    }
    if (file.path.startsWith(".github/workflows/")) {
      ciPaths.push(file.path);
    }
    if (/^(CLAUDE\.md|AGENTS\.md|\.mcp\.json)$/.test(file.path) || file.path.startsWith(".claude/") || file.path.startsWith(".cursor/")) {
      aiConfigPaths.push(file.path);
    }
    if (file.path === "package.json") {
      try {
        const pkg = JSON.parse(file.redactedContent) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        dependencies = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
        hasPackageJsonWithNext = dependencies.includes("next");
      } catch {
        // Not valid JSON -- leave dependencies empty rather than guess.
      }
    }
  }

  return {
    signals: {
      basis: "selected_files" as const,
      languageFileCounts,
      dependencies,
      testPaths,
      ciPaths,
      aiConfigPaths,
    },
    hasPackageJsonWithNext,
  };
}

function buildEvidenceCandidates(files: IngestedFile[], repo: string, commitSha: string): EvidenceCandidate[] {
  return files.map((file) => ({
    assessmentId: null,
    sourceType: "repo_static" as const,
    collectionMethod: "github_api" as const,
    summary: `${file.path} (${file.lineCount ?? "?"} lines) collected from ${repo}@${commitSha.slice(0, 12)}`,
    contentSha256: file.contentSha256,
    collectedAt: nowIso(),
    repo,
    commitSha,
    path: file.path,
    locator: { startLine: 1, endLine: file.lineCount ?? 1 },
    eventTime: null,
    verificationNote: "정적 존재 확인. 런타임 동작, 실행 성공, AI 사용 과정은 확인되지 않음.",
  }));
}

function failureSnapshot(
  input: IngestionInput,
  code: string,
  message: string,
  retryable: boolean,
  context?: { repo?: string; startedAt?: number; budget?: IngestionBudget },
): IngestionSnapshot {
  return {
    schemaVersion: "ingestion-snapshot-v0.3.1",
    repo: context?.repo ?? "unknown/unknown",
    commitSha: null,
    collectorVersion: COLLECTOR_VERSION,
    selectionDigest: "",
    ingestionStatus: "failed",
    supportStatus: "unknown",
    collectedAt: nowIso(),
    files: [],
    staticSignals: { basis: "selected_files", languageFileCounts: {}, dependencies: [], testPaths: [], ciPaths: [], aiConfigPaths: [] },
    evidenceCandidates: [],
    coverage: { treeTruncated: false, candidateFiles: null, selectedFiles: 0, readFiles: 0, selectionLimited: false },
    skippedFiles: [],
    warnings: [],
    failure: { code, message, retryable },
    metrics: {
      // Only reported when we actually measured them (i.e. failed after at
      // least one real HTTP attempt) -- a pre-network validation failure
      // (invalid URL, bad commit_ref) truly measured nothing, so those stay null.
      durationMs: context?.startedAt !== undefined ? Date.now() - context.startedAt : null,
      httpRequests: context?.budget?.requestsUsed() ?? null,
      fetchedBytes: context?.budget?.bytesUsed() ?? null,
      cacheHits: 0,
    },
  };
}

export interface IngestOptions {
  httpClient: HttpClient;
  authToken?: string;
  onProgress?: (message: string) => void;
}

/**
 * Orchestrates the full read-only ingestion pipeline: validate URL -> fix
 * commit SHA -> scan tree -> select files -> fetch + redact blobs -> build
 * static signals + evidence candidates + coverage/metrics.
 *
 * Never writes to the repo, never executes anything in it. Returns an
 * IngestionSnapshot per docs/Assessment/EVIDENCE_SCHEMA.md section 2.
 */
export async function ingestRepository(input: IngestionInput, options: IngestOptions): Promise<IngestionSnapshot> {
  const progress = options.onProgress ?? (() => {});
  const startedAt = Date.now();

  const urlResult = normalizeAndValidateRepoUrl(input.repoUrl);
  if (!urlResult.ok) {
    return failureSnapshot(input, urlResult.code, urlResult.message, false);
  }
  const refResult = validateCommitRef(input.commitRef);
  if (!refResult.ok) {
    return failureSnapshot(input, "invalid_commit_ref", refResult.message, false);
  }

  const { owner, repo } = urlResult.ref;
  const repoSlug = `${owner}/${repo}`;
  const budget = new IngestionBudget();
  const api = new GithubApiClient(options.httpClient, budget, options.authToken);
  const ctx = { repo: repoSlug, startedAt, budget };

  progress(`저장소 메타데이터 조회: ${repoSlug}`);
  const metaResult = await api.getRepoMeta(owner, repo);
  if (!metaResult.ok) {
    if (metaResult.error.kind === "not_found") {
      return failureSnapshot(input, "repo_not_found_or_private", "저장소를 찾을 수 없거나 비공개 저장소입니다.", false, ctx);
    }
    return failureSnapshot(input, `github_api_${metaResult.error.kind}`, "저장소 메타데이터 조회에 실패했습니다.", metaResult.error.kind !== "budget_exceeded", ctx);
  }
  if (metaResult.value.isPrivate) {
    return failureSnapshot(input, "repo_not_found_or_private", "비공개 저장소는 분석하지 않습니다.", false, ctx);
  }

  const ref = refResult.ref ?? metaResult.value.defaultBranch;
  progress(`커밋 SHA 고정 중: ${ref}`);
  const shaResult = await api.resolveCommitSha(owner, repo, ref);
  if (!shaResult.ok) {
    if (shaResult.error.kind === "not_found") {
      return failureSnapshot(input, "ref_not_found", `참조 '${ref}'를 찾을 수 없습니다.`, false, ctx);
    }
    return failureSnapshot(input, `github_api_${shaResult.error.kind}`, "커밋 조회에 실패했습니다.", shaResult.error.kind !== "budget_exceeded", ctx);
  }
  const commitSha = shaResult.value;

  progress(`파일 트리 스캔 중: ${commitSha}`);
  const treeResult = await api.getTree(owner, repo, commitSha);
  if (!treeResult.ok) {
    return failureSnapshot(input, `github_api_${treeResult.error.kind}`, "파일 트리 조회에 실패했습니다.", treeResult.error.kind !== "budget_exceeded", ctx);
  }

  const selection = selectFiles(treeResult.value.entries, input.relevantPaths ?? []);
  progress(`후보 ${selection.candidates.length}개 중 ${selection.selected.length}개 파일 선정`);

  const files: IngestedFile[] = [];
  const skipped: SkippedFile[] = [...selection.skipped];
  const warnings: string[] = [];
  let ingestionStatus: "complete" | "partial" = "complete";

  if (treeResult.value.truncated || selection.selectionLimited) {
    ingestionStatus = "partial";
    warnings.push("저장소 트리가 매우 커서 일부만 스캔했습니다 (tree truncated 또는 자체 상한 도달).");
  }

  for (const candidate of selection.selected) {
    if (!budget.canMakeRequest()) {
      skipped.push({ path: candidate.entry.path, reason: "request_budget" });
      ingestionStatus = "partial";
      continue;
    }
    if (budget.timeExceeded()) {
      skipped.push({ path: candidate.entry.path, reason: "request_budget", detail: "time budget exceeded" });
      ingestionStatus = "partial";
      continue;
    }
    if (typeof candidate.entry.size === "number" && !budget.canAddBytes(candidate.entry.size)) {
      skipped.push({ path: candidate.entry.path, reason: "total_budget" });
      ingestionStatus = "partial";
      continue;
    }

    progress(`파일 읽는 중: ${candidate.entry.path}`);
    const blobResult = await api.getBlob(owner, repo, candidate.entry.sha);
    if (!blobResult.ok) {
      skipped.push({ path: candidate.entry.path, reason: "fetch_failed", detail: blobResult.error.kind });
      ingestionStatus = "partial";
      continue;
    }

    const blob = blobResult.value;
    if (blob.encoding !== "base64") {
      skipped.push({ path: candidate.entry.path, reason: "fetch_failed", detail: `unsupported encoding: ${blob.encoding}` });
      ingestionStatus = "partial";
      continue;
    }
    const buffer = Buffer.from(blob.content, "base64");
    if (isProbablyBinaryContent(buffer)) {
      skipped.push({ path: candidate.entry.path, reason: "binary" });
      continue;
    }
    if (!budget.canAddBytes(buffer.byteLength)) {
      skipped.push({ path: candidate.entry.path, reason: "total_budget" });
      ingestionStatus = "partial";
      continue;
    }
    budget.recordBytes(buffer.byteLength);

    const contentSha256 = createHash("sha256").update(buffer).digest("hex");
    const text = buffer.toString("utf8");
    const { redacted, masked } = redactSecrets(text);
    if (masked) {
      warnings.push(`비밀 패턴이 감지되어 마스킹했습니다: ${candidate.entry.path}`);
    }

    files.push({
      path: candidate.entry.path,
      blobSha: candidate.entry.sha,
      byteSize: buffer.byteLength,
      contentSha256,
      lineCount: text.length === 0 ? 0 : text.split("\n").length,
      redactedContent: redacted,
      secretPatternMasked: masked,
    });
  }

  const { signals, hasPackageJsonWithNext } = buildStaticSignals(files);
  const supportStatus = detectSupportStatus(files.map((f) => f.path), hasPackageJsonWithNext);
  const evidenceCandidates = buildEvidenceCandidates(files, repoSlug, commitSha);

  const selectionDigest = createHash("sha256")
    .update(selection.selected.map((f) => f.entry.path).sort().join("\n"))
    .digest("hex");

  if (files.length === 0 && ingestionStatus === "complete") {
    warnings.push("선정된 파일이 없습니다 (지원 스택 신호 부족 또는 빈 저장소일 수 있음).");
  }

  return {
    schemaVersion: "ingestion-snapshot-v0.3.1",
    repo: repoSlug,
    commitSha,
    collectorVersion: COLLECTOR_VERSION,
    selectionDigest,
    ingestionStatus,
    supportStatus,
    collectedAt: nowIso(),
    files,
    staticSignals: signals,
    evidenceCandidates,
    coverage: {
      treeTruncated: treeResult.value.truncated,
      candidateFiles: selection.selectionLimited ? null : selection.candidates.length,
      selectedFiles: selection.selected.length,
      readFiles: files.length,
      selectionLimited: selection.selectionLimited,
    },
    skippedFiles: skipped,
    warnings,
    failure: null,
    metrics: {
      durationMs: Date.now() - startedAt,
      httpRequests: budget.requestsUsed(),
      fetchedBytes: budget.bytesUsed(),
      cacheHits: 0,
    },
  };
}

export { INGESTION_LIMITS };
