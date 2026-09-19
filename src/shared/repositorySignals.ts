import {
  REPOSITORY_EVIDENCE_ORDER,
  REPOSITORY_REPORT_COPY,
  type RepositoryReportAxis,
  type RepositoryReportEvidenceId,
} from "./repositoryReport.js";

export interface RepositorySignalPaths {
  id: RepositoryReportEvidenceId;
  axis: RepositoryReportAxis;
  paths: string[];
}

function lower(path: string): string {
  return path.toLowerCase();
}

export function isRepositoryTestPath(path: string): boolean {
  const value = lower(path);
  return /(^|\/)(tests?|__tests__)\//.test(value) || /\.(test|spec)\.[a-z0-9]+$/.test(value);
}

export function isRepositoryDocumentationPath(path: string): boolean {
  return /\.(md|mdx|rst|txt)$/i.test(path);
}

export function isRepositorySourcePath(path: string): boolean {
  return /\.(tsx?|jsx?|mjs|cjs|py|go|rs|java|kt|cs|rb|php|vue|svelte)$/i.test(path) &&
    !isRepositoryTestPath(path) && !/^(scripts?|tools?)\//i.test(path);
}

export function isRepositoryReferencePath(path: string): boolean {
  return /(^|\/)(fixtures|__fixtures__|examples|_archive|artifacts)\//i.test(path);
}

export function repositoryPathMatchesEvidence(id: RepositoryReportEvidenceId, path: string): boolean {
  const value = lower(path);
  switch (id) {
    case "context-readme":
      return /(^|\/)readme(\.[^/]*)?$/.test(value);
    case "context-guidance":
      return /(^|\/)(agents|claude)\.md$/.test(value) || value === ".github/copilot-instructions.md";
    case "context-docs":
      return /^(docs?|documentation)\//.test(value) && /\.(md|mdx|rst|txt)$/.test(value);
    case "context-metadata":
      return /^(package\.json|pyproject\.toml|cargo\.toml|go\.mod|pom\.xml|build\.gradle|composer\.json|gemfile)$/.test(value);
    case "verification-tests":
      return isRepositoryTestPath(value);
    case "verification-config":
      return /(^|\/)(tsconfig(?:\.[^/]*)?\.json|eslint\.config\.[^/]+|\.eslintrc(?:\.[^/]+)?|vitest\.config\.[^/]+|jest\.config\.[^/]+|pytest\.ini|tox\.ini|ruff\.toml|codecov\.ya?ml|\.coveragerc)$/.test(value);
    case "traceability-changelog":
      return /(^|\/)(changelog|changes|history)(\.[^/]*)?$/.test(value);
    case "traceability-decisions":
      return /(^|\/)(adr|adrs|decisions?)(\/|\.)/.test(value) || /(^|\/)adr[-_]?\d+/.test(value);
    case "traceability-templates":
      return value.startsWith(".github/issue_template/") || value.startsWith(".github/pull_request_template");
    case "traceability-migrations":
      return /(^|\/)(migrations?|schema\/migrations?)\//.test(value);
    case "automation-ci":
      return value.startsWith(".github/workflows/") && /\.ya?ml$/.test(value);
    case "automation-dependencies":
      return /(^|\/)(dependabot\.ya?ml|renovate(?:\.json|\.json5|rc)?)$/.test(value);
    case "automation-delivery":
      return /(^|\/)(dockerfile|compose\.ya?ml|docker-compose\.ya?ml|railway\.toml|vercel\.json|netlify\.toml|fly\.toml|render\.ya?ml)$/.test(value);
    case "automation-scripts":
      return /^(scripts?|tools?)\//.test(value) || /(^|\/)(makefile|justfile|taskfile\.ya?ml)$/.test(value);
  }
}

export function repositoryEvidenceIdsForPath(path: string): RepositoryReportEvidenceId[] {
  return REPOSITORY_EVIDENCE_ORDER.filter(id => repositoryPathMatchesEvidence(id, path));
}

export function collectRepositorySignalPaths(paths: string[]): RepositorySignalPaths[] {
  return REPOSITORY_EVIDENCE_ORDER.flatMap(id => {
    const matches = paths.filter(path => repositoryPathMatchesEvidence(id, path));
    return matches.length ? [{ id, axis: REPOSITORY_REPORT_COPY.evidence[id].axis, paths: matches }] : [];
  });
}
