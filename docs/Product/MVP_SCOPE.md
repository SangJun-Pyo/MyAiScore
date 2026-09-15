# MVP scope — CLI session reports v0.4

Current decision: [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md). Requirements: [PRD](PRD.md).

## Included

- Claude Code JSONL, one project/session; scoped discovery and explicit-file fallback.
- Bounded local read, structural event aggregation, safe counters-only export.
- Versioned rule-based session score/style/highlights/challenge with empty/limited states.
- Useful terminal output; optional new JSON file and browser summary handoff.
- English Home/New session/Profile/Insights using the existing visual language.
- Browser-side validation, recomputation and optional local summary history/share text.
- Synthetic example, CLI/browser regression tests, independent raw-data/scope review.
- Updated shared agent instructions, ADR and session/current-state records.

## Removed from primary onboarding

GitHub URL entry, collaboration-case form, manual conversation excerpts, three interview questions, the five-axis all-observed score gate and dependence on a configured service LLM. The old code/API contracts remain legacy compatibility; removing their primary UI does not authorize deleting user records.

## Deferred

Public npm publishing, automatic update/distribution, universal session-schema compatibility, private-session real-world validation, multiple AI providers, team comparison, global leaderboard/percentiles, automatic raw-log upload, LLM-generated advice, new hosted sharing backend, paid services and deployment.

## Release conditions

The shipped local command must work from the installed checkout. Empty or malformed input must not look like a valid ability grade. A transcript containing secret-like strings must not leak them through stdout, JSON, URL, browser storage or error messages. Discovery must not escape the selected project scope. Browser import must remain local and validate data rather than trusting supplied narrative or score fields.

Passing synthetic tests demonstrates implementation behavior, not an empirically validated measure of AI skill. A real session is read for validation only when its project/file scope is explicitly selected; do not silently inspect personal history during implementation.
