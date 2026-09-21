import { Pool } from "pg";
import type { RepositoryReport } from "../../shared/repositoryReport.js";

export interface LeaderboardEntry {
  owner: string;
  repo: string;
  repoUrl: string;
  commitSha: string;
  score: number;
  axisContext: number;
  axisVerification: number;
  axisTraceability: number;
  axisAutomation: number;
  profileCode: string | null;
  schemaVersion: string;
  ruleVersion: string;
  submittedAt: string;
}

let pool: Pool | null = null;

function normalizedRepoKey(value: string): string {
  return value.toLowerCase();
}

/** Lazily created; throws only when a query is actually attempted without DATABASE_URL configured. */
function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("leaderboard_not_configured");
  pool = new Pool({ connectionString, max: 3, ssl: connectionString.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false } });
  return pool;
}

export function leaderboardConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

function axisValue(report: RepositoryReport, axis: "context" | "verification" | "traceability" | "automation"): number {
  return report.score.axes[axis].value;
}

export function leaderboardRepoIdentity(value: string): { ownerRaw: string; repoRaw: string; owner: string; repo: string; repoUrl: string } {
  const match = /^(?:https:\/\/github\.com\/)?([^/]+)\/([^/]+)$/.exec(value);
  if (!match) throw new Error("invalid_repo_for_leaderboard");
  const ownerRaw = match[1]!;
  const repoRaw = match[2]!;
  return { ownerRaw, repoRaw, owner: normalizedRepoKey(ownerRaw), repo: normalizedRepoKey(repoRaw), repoUrl: `https://github.com/${ownerRaw}/${repoRaw}` };
}

function profileCodeOf(report: RepositoryReport): string | null {
  return "collaborationProfile" in report && report.collaborationProfile.status === "assigned"
    ? report.collaborationProfile.dimensions.map(dimension => dimension.selectedPole).join("")
    : null;
}

/**
 * Upsert by owner/repo using a lower-case key so GitHub's case-insensitive
 * repository identity cannot appear as duplicate leaderboard rows.
 * A resubmission always replaces the previous row -- the leaderboard reflects
 * each repository's most recently re-verified state, not a permanent
 * high-score record, since the underlying repository can change (or regress)
 * over time and this product's whole premise is "signals currently in the
 * repository," not a one-time certificate.
 */
export async function upsertLeaderboardEntry(report: RepositoryReport): Promise<void> {
  const identity = leaderboardRepoIdentity(report.repo);
  await getPool().query(
    `insert into leaderboard_entries
       (owner, repo, repo_url, commit_sha, score, axis_context, axis_verification, axis_traceability, axis_automation, profile_code, schema_version, rule_version, submitted_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
     on conflict (owner, repo) do update set
       repo_url = excluded.repo_url, commit_sha = excluded.commit_sha, score = excluded.score,
       axis_context = excluded.axis_context, axis_verification = excluded.axis_verification,
       axis_traceability = excluded.axis_traceability, axis_automation = excluded.axis_automation,
       profile_code = excluded.profile_code, schema_version = excluded.schema_version,
       rule_version = excluded.rule_version, submitted_at = now()`,
    [identity.owner, identity.repo, identity.repoUrl, report.commitSha, report.score.value,
      axisValue(report, "context"), axisValue(report, "verification"), axisValue(report, "traceability"), axisValue(report, "automation"),
      profileCodeOf(report), report.schemaVersion, report.ruleVersion],
  );
}

export async function listLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const bounded = Number.isSafeInteger(limit) && limit > 0 && limit <= 200 ? limit : 50;
  const result = await getPool().query(
    `select owner, repo, repo_url, commit_sha, score, axis_context, axis_verification, axis_traceability, axis_automation, profile_code, schema_version, rule_version, submitted_at
     from leaderboard_entries order by score desc, submitted_at asc limit $1`,
    [bounded],
  );
  return result.rows.map(row => ({
    owner: row.owner, repo: row.repo, repoUrl: row.repo_url, commitSha: row.commit_sha, score: row.score,
    axisContext: row.axis_context, axisVerification: row.axis_verification, axisTraceability: row.axis_traceability, axisAutomation: row.axis_automation,
    profileCode: row.profile_code, schemaVersion: row.schema_version, ruleVersion: row.rule_version,
    submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : String(row.submitted_at),
  }));
}

/** Coarse per-repository cooldown so the same repo cannot be hammered; the shared
 * repositoryReportAdmission limiter already bounds overall GitHub call volume. */
export async function recentlySubmitted(owner: string, repo: string, withinMs = 60_000): Promise<boolean> {
  const result = await getPool().query(
    `select 1 from leaderboard_entries where owner = $1 and repo = $2 and submitted_at > now() - ($3 || ' milliseconds')::interval`,
    [normalizedRepoKey(owner), normalizedRepoKey(repo), withinMs],
  );
  return (result.rowCount ?? 0) > 0;
}
