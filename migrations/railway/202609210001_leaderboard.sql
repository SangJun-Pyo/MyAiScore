-- Run once against the Railway Postgres plugin's DATABASE_URL before enabling
-- the leaderboard (e.g. `railway run psql "$DATABASE_URL" -f migrations/railway/202609210001_leaderboard.sql`,
-- or paste into Railway's own query console). Independent of the legacy
-- Supabase-backed myaiscore_state store (supabase/migrations) -- this table
-- is dedicated to the public, opt-in repository leaderboard.
create table if not exists leaderboard_entries (
  owner text not null,
  repo text not null,
  repo_url text not null,
  commit_sha text not null,
  score integer not null check (score >= 0 and score <= 100),
  axis_context integer not null check (axis_context >= 0 and axis_context <= 25),
  axis_verification integer not null check (axis_verification >= 0 and axis_verification <= 25),
  axis_traceability integer not null check (axis_traceability >= 0 and axis_traceability <= 25),
  axis_automation integer not null check (axis_automation >= 0 and axis_automation <= 25),
  profile_code text,
  schema_version text not null,
  rule_version text not null,
  submitted_at timestamptz not null default now(),
  primary key (owner, repo)
);
create index if not exists leaderboard_entries_score_idx on leaderboard_entries (score desc, submitted_at asc);
