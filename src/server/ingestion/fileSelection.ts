import type { TreeEntry } from "./githubApi.js";
import {
  EXCLUDED_DIR_SEGMENTS,
  EXCLUDED_FILE_PATTERNS,
  INGESTION_LIMITS,
  type RepositoryInventory,
  type SkipReason,
  type SkippedFile,
} from "../../shared/contracts/ingestion.js";
import { REPOSITORY_EVIDENCE_ORDER, type RepositoryReportEvidenceId } from "../../shared/repositoryReport.js";
import {
  isRepositoryDocumentationPath,
  isRepositoryReferencePath,
  isRepositorySourcePath,
  isRepositoryTestPath,
  repositoryPathMatchesEvidence,
} from "../../shared/repositorySignals.js";

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "svg",
  "woff", "woff2", "ttf", "eot", "otf",
  "zip", "tar", "gz", "7z", "rar",
  "mp3", "mp4", "mov", "avi", "webm",
  "pdf", "exe", "dll", "so", "dylib",
  "wasm", "bin", "sqlite", "db",
]);

const LOCK_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
]);

export type PriorityTier = 0 | 1 | 2 | 3 | 4 | 5;
export const SELECTION_POLICY_VERSION = "representative-categories-v2";
export const REPOSITORY_SCORE_V2_SELECTION_POLICY_VERSION = "repository-signal-reservations-v1";
export const OVERSIZED_SOURCE_CANDIDATE_BYTES = 40 * 1024;

const CONFIG_FILE_PATTERNS = [
  /^package\.json$/,
  /^next\.config\.(js|mjs|ts)$/,
  /^tsconfig(\..*)?\.json$/,
  /^README\.md$/i,
];

const TEST_CI_PATTERNS = [
  /\.(test|spec)\.[jt]sx?$/,
  /(^|\/)__tests__\//,
  /^\.github\/workflows\//,
  /(^|\/)tests?\//,
];

const AI_CONFIG_PATTERNS = [
  /^CLAUDE\.md$/,
  /^AGENTS\.md$/,
  /^\.mcp\.json$/,
  /^\.cursor\//,
  /^\.claude\//,
];

export interface ClassifiedFile {
  entry: TreeEntry;
  priority: PriorityTier;
}

export interface SelectionResult {
  /** Candidate files after exclusion, before the plannedSelectedFiles cap. */
  candidates: ClassifiedFile[];
  selected: ClassifiedFile[];
  skipped: SkippedFile[];
  /** true if our own selection had to cap the tree beyond INGESTION_LIMITS.maxTreeEntries */
  selectionLimited: boolean;
  inventory: RepositoryInventory;
}

export interface SelectionOptions {
  /** Transitional v2 path. The current v1 collector leaves this false. */
  reserveRepositorySignals?: boolean;
  treeTruncated?: boolean;
}

function isExcludedPath(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((segment) => EXCLUDED_DIR_SEGMENTS.includes(segment))) return true;
  if (EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(path))) return true;
  return false;
}

function isLikelyBinaryPath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext !== undefined && BINARY_EXTENSIONS.has(ext);
}

function classifyPriority(path: string, relevantPaths: string[]): PriorityTier {
  if (relevantPaths.some((rel) => path === rel || path.startsWith(`${rel.replace(/\/$/, "")}/`))) {
    return 0;
  }
  if (isReferenceMaterial(path)) return 5;
  // Only root metadata gets reserved slots: nested example package.json/README are not root config.
  if (CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(path))) return 1;
  if (TEST_CI_PATTERNS.some((pattern) => pattern.test(path))) return 2;
  if (AI_CONFIG_PATTERNS.some((pattern) => pattern.test(path))) return 4;
  return 3;
}

function isReferenceMaterial(path: string): boolean {
  return isRepositoryReferencePath(path);
}
type Category = "source" | "tests" | "docs" | "other";
function category(file: ClassifiedFile): Category {
  if (file.priority === 2) return "tests";
  if (/\.(md|mdx|rst|txt)$/i.test(file.entry.path)) return "docs";
  if (/\.(tsx?|jsx?|mjs|cjs|py|go|rs|java|kt|cs|rb|php|vue|svelte)$/i.test(file.entry.path) && !/^scripts?\//.test(file.entry.path)) return "source";
  return "other";
}
function pathOrder(a: ClassifiedFile, b: ClassifiedFile): number {
  return a.entry.path < b.entry.path ? -1 : a.entry.path > b.entry.path ? 1 : 0;
}
function pathDepth(path: string): number {
  return path.split("/").length;
}

function signalCandidateOrder(a: ClassifiedFile, b: ClassifiedFile): number {
  return pathDepth(a.entry.path) - pathDepth(b.entry.path) ||
    (b.entry.size ?? -1) - (a.entry.size ?? -1) || pathOrder(a, b);
}

function representativeSample(sorted: ClassifiedFile[], reserveRepositorySignals: boolean): ClassifiedFile[] {
  const limit = INGESTION_LIMITS.plannedSelectedFiles;
  if (sorted.length <= limit) return sorted; // Small repositories retain every eligible file.
  const selected: ClassifiedFile[] = [];
  const chosen = new Set<ClassifiedFile>();
  const take = (file: ClassifiedFile) => { if (selected.length < limit && !chosen.has(file)) { selected.push(file); chosen.add(file); } };
  sorted.filter(f => f.priority === 0).forEach(take);
  sorted.filter(f => f.priority === 1).slice(0, 6).forEach(take);
  sorted.filter(f => f.priority === 4).slice(0, 4).forEach(take);
  if (reserveRepositorySignals) {
    for (const id of REPOSITORY_EVIDENCE_ORDER) {
      const candidate = sorted
        .filter(file => file.priority !== 5 && repositoryPathMatchesEvidence(id, file.entry.path))
        .sort(signalCandidateOrder)[0];
      if (candidate) take(candidate);
    }
  }
  const groups: Record<Category, ClassifiedFile[]> = { source: [], tests: [], docs: [], other: [] };
  for (const file of sorted) if (!chosen.has(file) && file.priority !== 5) groups[category(file)].push(file);
  for (const group of Object.values(groups)) group.sort(pathOrder);
  groups.source.sort((a, b) => {
    const productRoot = /^(src|app|pages|components|lib|server|client|packages)\//;
    return Number(productRoot.test(b.entry.path)) - Number(productRoot.test(a.entry.path)) || pathOrder(a, b);
  });
  const cycle: Category[] = ["source", "source", "tests", "docs", "other"];
  while (selected.length < limit) {
    let found = false;
    for (const name of cycle) {
      const next = groups[name].shift();
      if (next) { take(next); found = true; }
      if (selected.length === limit) break;
    }
    if (!found) break;
  }
  // Reference projects remain available when capacity permits; explicit relevantPaths were already promoted.
  sorted.filter(f => f.priority === 5).forEach(take);
  return selected;
}

function emptySignalCounts(): Record<RepositoryReportEvidenceId, number> {
  return Object.fromEntries(REPOSITORY_EVIDENCE_ORDER.map(id => [id, 0])) as Record<RepositoryReportEvidenceId, number>;
}

function isHighConfidenceArtifact(path: string): boolean {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  return name === ".ds_store" || name === "thumbs.db" || /\.(swp|swo|tmp|orig)$/.test(name);
}

function isGeneratedArtifactCandidate(path: string): boolean {
  return path.split("/").some(segment => ["node_modules", ".next", "dist", "build", "coverage", "vendor"].includes(segment.toLowerCase()));
}

function isSecretLikePath(path: string): boolean {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  if ([".env.example", ".env.sample", ".env.template"].includes(name)) return false;
  return /^\.env(?:\..+)?$/.test(name) || /\.(pem|key)$/.test(name) || name === "id_rsa";
}

function buildInventory(
  scoped: TreeEntry[],
  candidates: ClassifiedFile[],
  selectionLimited: boolean,
  treeTruncated: boolean,
): RepositoryInventory {
  const eligible = candidates.filter(file => !isRepositoryReferencePath(file.entry.path));
  const signalCandidateCounts = emptySignalCounts();
  for (const file of eligible) {
    for (const id of REPOSITORY_EVIDENCE_ORDER) {
      if (repositoryPathMatchesEvidence(id, file.entry.path)) signalCandidateCounts[id] += 1;
    }
  }

  const sourceEntries = scoped.filter(entry => entry.type === "blob" && isRepositorySourcePath(entry.path) &&
    !isRepositoryReferencePath(entry.path) && !isGeneratedArtifactCandidate(entry.path));
  const knownSourceSizes = sourceEntries.filter(entry => typeof entry.size === "number") as Array<TreeEntry & { size: number }>;
  const largestSourceFiles = [...knownSourceSizes]
    .sort((a, b) => b.size - a.size || a.path.localeCompare(b.path, "en"))
    .slice(0, 5)
    .map(entry => ({ path: entry.path, byteSize: entry.size }));
  const blobPaths = scoped.filter(entry => entry.type === "blob").map(entry => entry.path);

  return {
    basis: "scanned_tree",
    scannedEntries: scoped.length,
    treeTruncated,
    selectionLimited,
    sourceFiles: sourceEntries.length,
    testFiles: eligible.filter(file => isRepositoryTestPath(file.entry.path)).length,
    documentationFiles: eligible.filter(file => isRepositoryDocumentationPath(file.entry.path)).length,
    sourceFilesWithKnownSize: knownSourceSizes.length,
    sourceBytes: knownSourceSizes.reduce((sum, entry) => sum + entry.size, 0),
    oversizedSourceCandidates: knownSourceSizes.filter(entry => entry.size > OVERSIZED_SOURCE_CANDIDATE_BYTES).length,
    largestSourceFiles,
    signalCandidateCounts,
    hygiene: {
      highConfidenceArtifacts: blobPaths.filter(isHighConfidenceArtifact).length,
      generatedArtifactCandidates: blobPaths.filter(isGeneratedArtifactCandidate).length,
      secretLikePaths: blobPaths.filter(isSecretLikePath).length,
    },
  };
}

/**
 * Applies root metadata/AI reservations and category sampling after exclusions to a
 * flat recursive tree listing. Pure function -- no network calls. Symlinks
 * and submodules are recorded as skipped and never followed.
 */
export function selectFiles(entries: TreeEntry[], relevantPaths: string[] = [], options: SelectionOptions = {}): SelectionResult {
  const skipped: SkippedFile[] = [];
  const blobEntries = entries.filter((entry) => entry.type === "blob" || entry.type === "commit")
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

  let selectionLimited = false;
  let scoped = blobEntries;
  if (scoped.length > INGESTION_LIMITS.maxTreeEntries) {
    selectionLimited = true;
    scoped = scoped.slice(0, INGESTION_LIMITS.maxTreeEntries);
  }

  const candidates: ClassifiedFile[] = [];

  for (const entry of scoped) {
    if (entry.type === "commit") {
      skipped.push({ path: entry.path, reason: "submodule" });
      continue;
    }
    if (entry.mode === "120000") {
      skipped.push({ path: entry.path, reason: "symlink" });
      continue;
    }
    if (isExcludedPath(entry.path) || LOCK_FILE_NAMES.has(entry.path.split("/").pop() ?? "")) {
      skipped.push({ path: entry.path, reason: "excluded" });
      continue;
    }
    if (isLikelyBinaryPath(entry.path)) {
      skipped.push({ path: entry.path, reason: "binary" });
      continue;
    }
    if (typeof entry.size === "number" && entry.size > INGESTION_LIMITS.maxFileBytes) {
      skipped.push({ path: entry.path, reason: "file_too_large", detail: `${entry.size} bytes` });
      continue;
    }
    candidates.push({ entry, priority: classifyPriority(entry.path, relevantPaths) });
  }

  const sorted = [...candidates].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return pathOrder(a, b);
  });

  const selected = representativeSample(sorted, options.reserveRepositorySignals ?? false);
  const selectedSet = new Set(selected);
  const notSelected = sorted.filter(file => !selectedSet.has(file));
  for (const file of notSelected) {
    skipped.push({ path: file.entry.path, reason: "not_selected" });
  }

  return {
    candidates,
    selected,
    skipped,
    selectionLimited,
    inventory: buildInventory(scoped, candidates, selectionLimited, options.treeTruncated ?? false),
  };
}

export function isProbablyBinaryContent(buffer: Buffer): boolean {
  const sampleLength = Math.min(buffer.length, 8000);
  for (let i = 0; i < sampleLength; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export const _internal = { isExcludedPath, isLikelyBinaryPath, classifyPriority };
export type { SkipReason };
