import { createHash } from "node:crypto";
import type { HttpClient } from "./httpClient.js";
import { GithubApiClient } from "./githubApi.js";
import { IngestionBudget } from "./budget.js";
import { normalizeAndValidateRepoUrl, validateCommitRef } from "./urlValidation.js";
import { selectFiles, isProbablyBinaryContent, SELECTION_POLICY_VERSION } from "./fileSelection.js";
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
import { buildRepositoryStructureDiagnostics } from "../repositoryReport/structureDiagnostics.js";

export const COLLECTOR_VERSION = "ingestion-0.3.0";

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
    verificationNote: "Static existence confirmed. Runtime behavior, successful execution and the AI collaboration process have not been verified.",
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
      durationMs: context?.budget?.elapsedMs() ?? null,
      httpRequests: context?.budget?.requestsUsed() ?? null,
      fetchedBytes: context?.budget?.responseBodyBytesUsed() ?? null,
      contentBytes: context?.budget?.contentBytesUsed() ?? null,
      cacheHits: 0,
    },
  };
}

export interface IngestOptions {
  httpClient: HttpClient;
  authToken?: string;
  onProgress?: (message: string) => void;
  /** Injectable clock for deterministic deadline checks in offline tests. */
  clock?: () => number;
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
  const clock = options.clock ?? Date.now;
  const startedAt = clock();

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
  const budget = new IngestionBudget(clock);
  const api = new GithubApiClient(options.httpClient, budget, options.authToken);
  const ctx = { repo: repoSlug, startedAt, budget };

  progress(`Reading repository metadata: ${repoSlug}`);
  const metaResult = await api.getRepoMeta(owner, repo);
  if (!metaResult.ok) {
    if (metaResult.error.kind === "not_found") {
      return failureSnapshot(input, "repo_not_found_or_private", "The repository was not found or is private.", false, ctx);
    }
    return failureSnapshot(input, `github_api_${metaResult.error.kind}`, "Repository metadata could not be retrieved.", metaResult.error.kind !== "budget_exceeded", ctx);
  }
  if (metaResult.value.isPrivate !== false) {
    return failureSnapshot(input, "repo_not_found_or_private", "Private repositories are not analyzed.", false, ctx);
  }

  const ref = refResult.ref ?? metaResult.value.defaultBranch;
  progress(`Resolving commit SHA: ${ref}`);
  const shaResult = await api.resolveCommitSha(owner, repo, ref);
  if (!shaResult.ok) {
    if (shaResult.error.kind === "not_found") {
      return failureSnapshot(input, "ref_not_found", `Reference '${ref}' was not found.`, false, ctx);
    }
    return failureSnapshot(input, `github_api_${shaResult.error.kind}`, "The commit could not be retrieved.", shaResult.error.kind !== "budget_exceeded", ctx);
  }
  const commitSha = shaResult.value;

  progress(`Scanning the file tree: ${commitSha}`);
  const treeResult = await api.getTree(owner, repo, commitSha);
  if (!treeResult.ok) {
    return failureSnapshot(input, `github_api_${treeResult.error.kind}`, "The file tree could not be retrieved.", treeResult.error.kind !== "budget_exceeded", ctx);
  }

  const selection = selectFiles(treeResult.value.entries, input.relevantPaths ?? [], {
    treeTruncated: treeResult.value.truncated,
  });
  progress(`Selected ${selection.selected.length} of ${selection.candidates.length} candidate files`);

  const files: IngestedFile[] = [];
  const skipped: SkippedFile[] = [...selection.skipped];
  const warnings: string[] = [];
  let ingestionStatus: "complete" | "partial" = "complete";
  if (selection.selected.length < selection.candidates.length) {
    warnings.push(`Selected sample: ${selection.selected.length}/${selection.candidates.length} files (${SELECTION_POLICY_VERSION}). This does not verify the entire repository or personal AI skills.`);
  }

  if (treeResult.value.truncated || selection.selectionLimited) {
    ingestionStatus = "partial";
    warnings.push("Only part of the large repository tree was scanned (tree truncated or scan limit reached).");
  }

  for (const candidate of selection.selected) {
    if (budget.timeExceeded()) {
      skipped.push({ path: candidate.entry.path, reason: "time_budget" });
      ingestionStatus = "partial";
      continue;
    }
    if (!budget.canMakeRequest()) {
      skipped.push({ path: candidate.entry.path, reason: "request_budget" });
      ingestionStatus = "partial";
      continue;
    }
    if (typeof candidate.entry.size === "number" && !budget.canAddContentBytes(candidate.entry.size)) {
      skipped.push({ path: candidate.entry.path, reason: "total_budget" });
      ingestionStatus = "partial";
      continue;
    }

    progress(`Reading file: ${candidate.entry.path}`);
    const blobResult = await api.getBlob(owner, repo, candidate.entry.sha);
    if (!blobResult.ok) {
      skipped.push({ path: candidate.entry.path,
        reason: blobResult.error.kind === "budget_exceeded" ? blobResult.error.reason : "fetch_failed",
        detail: blobResult.error.kind });
      ingestionStatus = "partial";
      continue;
    }

    const blob = blobResult.value;
    if (!blob || typeof blob.content !== "string") {
      skipped.push({ path: candidate.entry.path, reason: "fetch_failed", detail: "invalid blob body" });
      ingestionStatus = "partial";
      continue;
    }
    if (blob.encoding !== "base64") {
      skipped.push({ path: candidate.entry.path, reason: "fetch_failed", detail: "unsupported encoding" });
      ingestionStatus = "partial";
      continue;
    }
    const buffer = Buffer.from(blob.content, "base64");
    if (buffer.byteLength > INGESTION_LIMITS.maxFileBytes) {
      skipped.push({ path: candidate.entry.path, reason: "file_too_large", detail: `${buffer.byteLength} decoded bytes` });
      ingestionStatus = "partial";
      continue;
    }
    if (isProbablyBinaryContent(buffer)) {
      skipped.push({ path: candidate.entry.path, reason: "binary" });
      ingestionStatus = "partial";
      continue;
    }
    if (!budget.tryAcceptContentBytes(buffer.byteLength)) {
      skipped.push({ path: candidate.entry.path, reason: "total_budget" });
      ingestionStatus = "partial";
      continue;
    }

    const contentSha256 = createHash("sha256").update(buffer).digest("hex");
    const text = buffer.toString("utf8");
    const { redacted, masked } = redactSecrets(text);
    if (masked) {
      warnings.push(`Detected secret patterns were masked: ${candidate.entry.path}`);
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
    .update(JSON.stringify({ collectorVersion: COLLECTOR_VERSION, selectionPolicyVersion: SELECTION_POLICY_VERSION, selectedPaths: selection.selected.map((f) => f.entry.path).sort() }))
    .digest("hex");

  if (files.length === 0 && ingestionStatus === "complete") {
    warnings.push("No files were selected (the repository may be empty or lack supported stack signals).");
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
    repositoryInventory: selection.inventory,
    repositoryStructure: buildRepositoryStructureDiagnostics(files, selection.inventory),
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
      durationMs: budget.elapsedMs(),
      httpRequests: budget.requestsUsed(),
      fetchedBytes: budget.responseBodyBytesUsed(),
      contentBytes: budget.contentBytesUsed(),
      cacheHits: 0,
    },
  };
}

export { INGESTION_LIMITS };
