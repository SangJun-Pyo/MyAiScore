# Roadmap — current task and handoff

Updated: 2026-09-18. Shared entrypoint: C:/Users/sangj/MyAiScore/AGENTS.md → this file → [master](../00_MASTER_PLAN.md) → [Phase 9](Sessions/Phase-09-Anonymous-Repository-Reports.md). CLAUDE.md imports the same files.

## Current direction

The user approved a Korean, no-login public GitHub repository report as the contest entry flow. A visitor pastes one public repository URL and receives a deterministic, playful summary of observable AI-collaboration readiness signals, evidence paths, coverage and one next challenge. It does not claim personal AI ability or task success.

Tracking issue: [#28](https://github.com/SangJun-Pyo/MyAiScore/issues/28). Integration branch: codex/public-repo-korean-flow. Decision: [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md). Contract: [REPOSITORY_REPORT](../Assessment/REPOSITORY_REPORT.md).

## Active work

| Area | Current scope |
|---|---|
| Core | Strict report contract, four capped repository-signal axes, actual evidence paths |
| API | Stateless bounded public GitHub collection; optional server token; no DB/model/login |
| Web | Korean Home/분석/Profile/Insights, progress/errors, opt-in browser history |
| Compatibility | CLI session reports remain optional; old assessment APIs/walkthrough stay separate |
| Privacy | No repository code execution, no private repository, no token/raw response exposure |
| Validation | Synthetic unit/API/browser checks, independent score/source review, Railway smoke |

## Release order

1. Integrate core and Korean web branches into the issue branch.
2. Run typecheck, unit/API, docs, production build and desktop/mobile browser suites.
3. Independently review source collection, token, scoring and storage boundaries; fix mandatory findings.
4. Merge reviewed PR, sync canonical checkout, then verify the Railway production URL and one public MyAiScore analysis.

## Deferred

GitHub login/private repositories, Supabase/account history, hosted public result links, leaderboard, LLM advice and other providers. If private access becomes a priority, design a GitHub App with repository-scoped minimum permissions rather than making login mandatory. Browser-local Claude session-file parsing is a possible secondary usability improvement after the public URL flow works.

## Historical work

[Phase 8](Sessions/Phase-08-CLI-Session-Reports.md) and [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md) remain the implemented optional Claude Code session path. Phases 0–7 five-axis assessment/API flows remain compatibility history and do not define the current onboarding.

Before finishing, record actual commits/tests/review/CI, merge the PR, and fast-forward the clean canonical checkout with code and docs together. Do not reset or copy docs over divergent code.
