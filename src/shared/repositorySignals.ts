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
  return /(^|\/)(tests?|__tests__)\//.test(value) || /\.(test|spec)\.[a-z0-9]+$/.test(value) ||
    /(^|\/)test_[^/]+\.py$/.test(value) || /_test\.go$/.test(value);
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
    case "context-contracts":
      return /(^|\/)(openapi|swagger)(\.[^/]*)?$/.test(value) || /\.(graphqls?|proto)$/.test(value) || /(^|\/)(schemas?|contracts?)\//.test(value);
    case "context-reproducibility":
      return /(^|\/)(\.nvmrc|\.node-version|\.python-version|\.tool-versions|mise\.toml|devcontainer\.json)$/.test(value) || value.startsWith(".devcontainer/");
    case "verification-tests":
      return isRepositoryTestPath(value);
    case "verification-config":
      return /(^|\/)(tsconfig(?:\.[^/]*)?\.json|eslint\.config\.[^/]+|\.eslintrc(?:\.[^/]+)?|vitest\.config\.[^/]+|jest\.config\.[^/]+|pytest\.ini|tox\.ini|ruff\.toml|codecov\.ya?ml|\.coveragerc)$/.test(value);
    case "verification-entrypoint":
      return repositoryPathMatchesEvidence("context-metadata", value) || /(^|\/)(makefile|justfile|taskfile\.ya?ml)$/.test(value);
    case "verification-test-substance":
    case "verification-test-breadth":
    case "verification-edge-cases":
      return isRepositoryTestPath(value);
    case "verification-static-analysis":
      return /(^|\/)(tsconfig(?:\.[^/]*)?\.json|eslint\.config\.[^/]+|\.eslintrc(?:\.[^/]+)?|pyproject\.toml|mypy\.ini|pyrightconfig\.json|ruff\.toml|clippy\.toml)$/.test(value);
    case "verification-coverage":
      return /(^|\/)(vitest\.config\.[^/]+|jest\.config\.[^/]+|pytest\.ini|pyproject\.toml|tox\.ini|codecov\.ya?ml|\.coveragerc)$/.test(value) || value.startsWith(".github/workflows/");
    case "traceability-changelog":
      return /(^|\/)(changelog|changes|history)(\.[^/]*)?$/.test(value);
    case "traceability-decisions":
      return /(^|\/)(adr|adrs|decisions?)(\/|\.)/.test(value) || /(^|\/)adr[-_]?\d+/.test(value);
    case "traceability-templates":
      return value.startsWith(".github/issue_template/") || value.startsWith(".github/pull_request_template");
    case "traceability-migrations":
      return /(^|\/)(migrations?|schema\/migrations?)\//.test(value);
    case "traceability-ownership":
      return /(^|\/)(codeowners|maintainers)$/.test(value);
    case "automation-ci":
      return value.startsWith(".github/workflows/") && /\.ya?ml$/.test(value);
    case "automation-ci-tests":
    case "automation-ci-quality":
      return value.startsWith(".github/workflows/") && /\.ya?ml$/.test(value);
    case "automation-dependencies":
      return /(^|\/)(dependabot\.ya?ml|renovate(?:\.json|\.json5|rc)?)$/.test(value);
    case "automation-delivery":
      return /(^|\/)(dockerfile|compose\.ya?ml|docker-compose\.ya?ml|railway\.toml|vercel\.json|netlify\.toml|fly\.toml|render\.ya?ml)$/.test(value);
    case "automation-scripts":
      return /^(scripts?|tools?)\//.test(value) || /(^|\/)(makefile|justfile|taskfile\.ya?ml)$/.test(value);
    case "automation-environment":
      return repositoryPathMatchesEvidence("context-reproducibility", value) || /(^|\/)(dockerfile|compose\.ya?ml|docker-compose\.ya?ml)$/.test(value);
  }
}

export function repositoryEvidenceIdsForPath(path: string): RepositoryReportEvidenceId[] {
  return REPOSITORY_EVIDENCE_ORDER.filter(id => repositoryPathMatchesEvidence(id, path));
}

export function collectRepositorySignalPaths(paths: string[], order: readonly RepositoryReportEvidenceId[] = REPOSITORY_EVIDENCE_ORDER): RepositorySignalPaths[] {
  return order.flatMap(id => {
    const matches = paths.filter(path => repositoryPathMatchesEvidence(id, path));
    return matches.length ? [{ id, axis: REPOSITORY_REPORT_COPY.evidence[id].axis, paths: matches }] : [];
  });
}
