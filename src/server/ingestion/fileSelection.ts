import type { TreeEntry } from "./githubApi.js";
import {
  EXCLUDED_DIR_SEGMENTS,
  EXCLUDED_FILE_PATTERNS,
  INGESTION_LIMITS,
  type SkipReason,
  type SkippedFile,
} from "../../shared/contracts/ingestion.js";

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

export type PriorityTier = 0 | 1 | 2 | 3 | 4;

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
  const basename = path.split("/").pop() ?? path;
  if (relevantPaths.some((rel) => path === rel || path.startsWith(`${rel.replace(/\/$/, "")}/`))) {
    return 0;
  }
  if (CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(basename))) return 1;
  if (TEST_CI_PATTERNS.some((pattern) => pattern.test(path))) return 2;
  if (AI_CONFIG_PATTERNS.some((pattern) => pattern.test(path))) return 4;
  return 3;
}

/**
 * Applies GITHUB_INGESTION.md section 3's exclusion + priority rules to a
 * flat recursive tree listing. Pure function -- no network calls. Symlinks
 * and submodules are recorded as skipped and never followed.
 */
export function selectFiles(entries: TreeEntry[], relevantPaths: string[] = []): SelectionResult {
  const skipped: SkippedFile[] = [];
  const blobEntries = entries.filter((entry) => entry.type === "blob" || entry.type === "commit");

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
    return a.entry.path.localeCompare(b.entry.path);
  });

  const selected = sorted.slice(0, INGESTION_LIMITS.plannedSelectedFiles);
  const notSelected = sorted.slice(INGESTION_LIMITS.plannedSelectedFiles);
  for (const file of notSelected) {
    skipped.push({ path: file.entry.path, reason: "not_selected" });
  }

  return { candidates, selected, skipped, selectionLimited };
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
