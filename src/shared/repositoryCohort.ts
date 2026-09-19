import manifest from "../../docs/Assessment/Cohorts/repository-cohort-v1.json" with { type: "json" };
import type { RepositoryReportCoverage } from "./repositoryReport";

export type RepositoryCohortSizeBand = "small" | "medium" | "large";

export interface RepositoryCohortComparison {
  version: "repository-cohort-v1";
  sourceRuleVersion: "repository-signals-v2.6";
  manifestDigest: string;
  totalSampleSize: 50;
  sizeBand: RepositoryCohortSizeBand;
  coverageStatus: "complete" | "partial";
  comparisonSampleSize: number;
  rankFrom: number;
  rankTo: number;
  topPercentFrom: number;
  topPercentTo: number;
}

type CohortEntry = {
  score: number;
  candidateFiles: number | null;
  coverage: "complete" | "partial";
  sizeBand: RepositoryCohortSizeBand;
};

const entries = manifest.entries as CohortEntry[];

function validManifest(): boolean {
  return manifest.version === "repository-cohort-v1" && manifest.ruleVersion === "repository-signals-v2.6" &&
    manifest.sampleSize === 50 && entries.length === 50 && manifest.failures.length === 0 &&
    /^[a-f0-9]{64}$/.test(manifest.digest) && entries.every(entry => Number.isInteger(entry.score) && entry.score >= 0 && entry.score <= 100 &&
      ["small", "medium", "large"].includes(entry.sizeBand) && ["complete", "partial"].includes(entry.coverage));
}

if (!validManifest()) throw new Error("Invalid repository cohort manifest.");

export function repositoryCohortSizeBand(candidateFiles: number | null): RepositoryCohortSizeBand {
  if (candidateFiles === null || candidateFiles >= 500) return "large";
  if (candidateFiles >= 100) return "medium";
  return "small";
}

export function deriveRepositoryCohortComparison(
  score: number,
  coverage: Pick<RepositoryReportCoverage, "candidateFiles" | "status">,
): RepositoryCohortComparison | null {
  const sizeBand = repositoryCohortSizeBand(coverage.candidateFiles);
  const group = entries.filter(entry => entry.sizeBand === sizeBand && entry.coverage === coverage.status);
  if (group.length < 5) return null;
  const higher = group.filter(entry => entry.score > score).length;
  const equal = group.filter(entry => entry.score === score).length;
  const rankFrom = higher + 1;
  const rankTo = higher + equal + 1;
  const denominator = group.length + 1;
  const topPercentFrom = Math.floor(((rankFrom - 1) / denominator) * 10) * 10;
  const topPercentTo = Math.min(100, Math.max(10, Math.ceil((rankTo / denominator) * 10) * 10));
  return {
    version: "repository-cohort-v1",
    sourceRuleVersion: "repository-signals-v2.6",
    manifestDigest: manifest.digest,
    totalSampleSize: 50,
    sizeBand,
    coverageStatus: coverage.status,
    comparisonSampleSize: group.length,
    rankFrom,
    rankTo,
    topPercentFrom,
    topPercentTo,
  };
}
