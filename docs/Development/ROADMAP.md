# Roadmap — current task and handoff

Updated: 2026-09-19. Shared entrypoint: C:/Users/sangj/MyAiScore/AGENTS.md → this file → [master](../00_MASTER_PLAN.md) → [Phase 9](Sessions/Phase-09-Anonymous-Repository-Reports.md). CLAUDE.md imports the same files.

## Current direction

The user approved a Korean-default, bilingual no-login public GitHub repository report as the contest entry flow. A visitor pastes one public repository URL and receives a deterministic, playful summary of observable AI-collaboration readiness signals, evidence paths, coverage and one next challenge. It does not claim personal AI ability or task success. The selected Korean/English interface language persists in a validated cookie while the report contract stays canonical.

Repository-report decision: [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md). Language decision: [ADR-0016](../Architecture/ADR/0016-persistent-korean-english-interface.md). Contract: [REPOSITORY_REPORT](../Assessment/REPOSITORY_REPORT.md).

## Released state

| Area | Current scope |
|---|---|
| Core | Strict report contract, four capped repository-signal axes, actual evidence paths |
| API | Stateless bounded public GitHub collection; optional server token; no DB/model/login |
| Web | Korean-default bilingual Home/분석/Profile/Insights, persistent locale, transparent score/style guide, progress/errors, opt-in browser history |
| Compatibility | CLI session reports remain optional; old assessment APIs/walkthrough stay separate |
| Privacy | No repository code execution, no private repository, no token/raw response exposure |
| Validation | 306 unit/API tests, docs/type/build, 34 browser checks, independent PASS, Railway live smoke complete |

## Immediate operation

Repository score v2.3 is in progress under issue [#47](https://github.com/SangJun-Pyo/MyAiScore/issues/47). It replaces dominant 21-point test and 15-point CI signals with six smaller signals per axis, adds bounded contract·reproducibility·ownership evidence, and retains v1/v2.1/v2.2 read compatibility. After this contract lands, the next implementation order is always-assigned profiles with confidence, hidden collection counts, a measured 60-file collection budget, then transparent cohort calibration and ROI advice.

Issue [#28](https://github.com/SangJun-Pyo/MyAiScore/issues/28) shipped through PR [#29](https://github.com/SangJun-Pyo/MyAiScore/pull/29) at main `07389c2`. Production health, Korean/English pages and a real public MyAiScore report passed. Railway now has a server-only `GITHUB_TOKEN`; two consecutive public-repository reports returned 200 without token or raw file content in the response. The token only raises the public API allowance and private repositories remain rejected.

Issue [#39](https://github.com/SangJun-Pyo/MyAiScore/issues/39) refreshes the public README and removes historical prompts, screenshots and run outputs from the current Git tree. Local copies stay under ignored `_archive/`; stable historical links point to pre-cleanup commit `f108be3`. Current product contracts, fixtures and compatibility routes remain versioned.

## Deferred

GitHub login/private repositories, Supabase/account history, hosted public result links, leaderboard, LLM advice and other providers. If private access becomes a priority, design a GitHub App with repository-scoped minimum permissions rather than making login mandatory. Browser-local Claude session-file parsing is a possible secondary usability improvement after the public URL flow works.

## Historical work

[Phase 8](Sessions/Phase-08-CLI-Session-Reports.md) and [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md) remain the implemented optional Claude Code session path. Phases 0–7 five-axis assessment/API flows remain compatibility history and do not define the current onboarding.

Before finishing, record actual commits/tests/review/CI, merge the PR, and fast-forward the clean canonical checkout with code and docs together. Do not reset or copy docs over divergent code.
