# Roadmap — current task and handoff

Updated: 2026-09-15. Shared entrypoint: C:/Users/sangj/MyAiScore/AGENTS.md → this file → [master](../00_MASTER_PLAN.md) → [Phase 8](Sessions/Phase-08-CLI-Session-Reports.md). CLAUDE.md imports the same files.

## Current direction

The user approved a CLI-first, fun session report. Remove manual collaboration/excerpt/question inputs from primary routes. Read a scoped Claude Code log locally; produce a rule-based session score/style/highlights/challenge. No model key, paid call or GitHub collection is required for this new flow. Existing design colors stay intact.

Active issue: [#26](https://github.com/SangJun-Pyo/MyAiScore/issues/26). Integration branch: codex/cli-session-pivot. Decision: [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md). New contract: [SESSION_REPORT](../Assessment/SESSION_REPORT.md).

## Work and checks

| Area | Current scope |
|---|---|
| CLI | One-project scoped discovery/explicit session, bounded parsing, safe local output |
| Report engine | Strict numeric summary, deterministic capped rules, no personal skill claims |
| Web | CLI onboarding, local report consumption, example, opt-in local history, transparent insights |
| Privacy | No raw log upload/export, no unrelated project discovery, no submitted-code execution |
| Governance | Shared instructions, master/PRD/MVP/flow/ADR/session updated for v0.4 |
| Validation | Synthetic CLI and browser path, boundary regressions and independent review; exact execution results in Phase 8 |

## Next after this implementation

Local implementation and independent review are complete: 263 unit/regression tests, 24 desktop/mobile browser tests, typecheck and production build passed. Actual CLI-to-browser synthetic handoff was verified. See Phase 8 for limitations and the integration PR for final remote CI/merge status.

1. Validate compatibility on one explicitly selected real Claude Code session and review whether the result is fun/useful.
2. Refine session score/style rules from feedback; do not turn uncalibrated numbers into certification or percentiles.
3. Decide packaging/distribution and only then publish an actual CLI package. Current package remains private.
4. Add other providers and hosted summary sharing only when specifically prioritized. LLM/paid services are optional future work, not a current blocker.

## Historical work

[Phase 7](Sessions/Phase-07-Repository-Walkthrough.md): MAS-011 fixed and same-SHA public sample recollected 40/40, [PR #25](https://github.com/SangJun-Pyo/MyAiScore/pull/25). That workflow remains a historical repository assessment demonstration. Phases 0–7 five-axis scoring, live-provider setup and Supabase deployment plans no longer define the v0.4 primary user flow; retain their code, data boundaries and records for compatibility.

Before finishing, run appropriate tests/docs checks, record actual commits/CI, merge the reviewed branch, then fast-forward the clean canonical checkout with code and docs together. Do not reset or copy docs over divergent code.
