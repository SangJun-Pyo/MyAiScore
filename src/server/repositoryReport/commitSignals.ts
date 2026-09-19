import type { CommitSummary } from "../ingestion/githubApi.js";

export interface CommitTraceabilitySignals {
  basis: "fixed_commit_ancestors";
  sampledCommits: number;
  evaluatedCommits: number;
  excludedMergeOrAutomated: number;
  nonGenericSubjectRatio: number | null;
  distinctSubjectRatio: number | null;
  scopedSubjectRatio: number | null;
  rationaleBodyRatio: number | null;
  referenceRatio: number | null;
}

const GENERIC_SUBJECT = /^(wip|update[sd]?|fix(?:e[sd])?|change[sd]?|test(?:s|ing)?|misc|cleanup|수정|업데이트|변경|작업|테스트)[.!\s-]*$/i;
const MERGE_OR_AUTOMATED = /^(merge\b|revert\b|chore\(deps(?:-dev)?\)|bump\b)|\b(dependabot|renovate)\b/i;
const SCOPED_SUBJECT = /^(feat|fix|docs|test|refactor|build|ci|chore|perf)(\([^)]+\))?[!:]\s*\S+/i;
const REFERENCE = /(?:#\d+\b|\b(?:ADR|RFC)[-_ ]?\d+\b|https?:\/\/)/i;

function ratio(count: number, total: number): number | null {
  return total === 0 ? null : count / total;
}

function subject(message: string): string {
  return message.split(/\r?\n/, 1)[0]!.trim().replace(/\s+/g, " ");
}

function hasRationaleBody(message: string): boolean {
  return message.split(/\r?\n/).slice(1).some(line => line.trim().length >= 12);
}

/** Returns only aggregate features. Raw untrusted commit messages never cross into the report contract. */
export function analyzeCommitTraceability(commits: CommitSummary[]): CommitTraceabilitySignals {
  const evaluated = commits.filter(commit => {
    const value = subject(commit.message);
    return value.length > 0 && !MERGE_OR_AUTOMATED.test(value);
  });
  const subjects = evaluated.map(commit => subject(commit.message));
  const normalizedSubjects = subjects.map(value => value.toLocaleLowerCase("en"));
  const total = evaluated.length;

  return {
    basis: "fixed_commit_ancestors",
    sampledCommits: commits.length,
    evaluatedCommits: total,
    excludedMergeOrAutomated: commits.length - total,
    nonGenericSubjectRatio: ratio(subjects.filter(value => value.length >= 6 && !GENERIC_SUBJECT.test(value)).length, total),
    distinctSubjectRatio: ratio(new Set(normalizedSubjects).size, total),
    scopedSubjectRatio: ratio(subjects.filter(value => SCOPED_SUBJECT.test(value) || /[`/][\w.-]+/.test(value)).length, total),
    rationaleBodyRatio: ratio(evaluated.filter(commit => hasRationaleBody(commit.message)).length, total),
    referenceRatio: ratio(evaluated.filter(commit => REFERENCE.test(commit.message)).length, total),
  };
}
