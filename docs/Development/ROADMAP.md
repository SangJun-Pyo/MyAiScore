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
| Validation | v2.7 local/CI validation, Railway live smoke, representative demo matrix and automated accessibility checks |

## Immediate operation

Repository score v2.3 shipped through issue [#47](https://github.com/SangJun-Pyo/MyAiScore/issues/47) / PR [#48](https://github.com/SangJun-Pyo/MyAiScore/pull/48), always-assigned v2.4 profiles through [#49](https://github.com/SangJun-Pyo/MyAiScore/issues/49) / [#50](https://github.com/SangJun-Pyo/MyAiScore/pull/50), and playful names plus the 60-file v2.5 sample through [#51](https://github.com/SangJun-Pyo/MyAiScore/issues/51) / [#52](https://github.com/SangJun-Pyo/MyAiScore/pull/52). Header GitHub navigation shipped through [#53](https://github.com/SangJun-Pyo/MyAiScore/issues/53) / [#54](https://github.com/SangJun-Pyo/MyAiScore/pull/54). ROI advice v2.6 shipped through [#55](https://github.com/SangJun-Pyo/MyAiScore/issues/55) / [#56](https://github.com/SangJun-Pyo/MyAiScore/pull/56) at main `8278286`. Fixed-SHA 50-repository reference cohort v2.7 shipped through [#57](https://github.com/SangJun-Pyo/MyAiScore/issues/57) / [#58](https://github.com/SangJun-Pyo/MyAiScore/pull/58) at main `c06c728`; CI, Railway and live smoke passed.

Issue [#28](https://github.com/SangJun-Pyo/MyAiScore/issues/28) shipped through PR [#29](https://github.com/SangJun-Pyo/MyAiScore/pull/29) at main `07389c2`. Production health, Korean/English pages and a real public MyAiScore report passed. Railway now has a server-only `GITHUB_TOKEN`; two consecutive public-repository reports returned 200 without token or raw file content in the response. The token only raises the public API allowance and private repositories remain rejected.

Issue [#39](https://github.com/SangJun-Pyo/MyAiScore/issues/39) refreshes the public README and removes historical prompts, screenshots and run outputs from the current Git tree. Local copies stay under ignored `_archive/`; stable historical links point to pre-cleanup commit `f108be3`. Current product contracts, fixtures and compatibility routes remain versioned.

Contest demo preflight uses five repositories drawn from the fixed cohort across all supported ecosystems, all size bands and complete/partial coverage. The executable list and operator checklist live in [DEMO_RUNBOOK](DEMO_RUNBOOK.md). Public pages also run automated WCAG A/AA, skip-link, reduced-motion and 320px overflow checks.

## Deferred

GitHub login/private repositories, Supabase/account history, hosted public result links, leaderboard, LLM advice and other providers. If private access becomes a priority, design a GitHub App with repository-scoped minimum permissions rather than making login mandatory. Browser-local Claude session-file parsing is a possible secondary usability improvement after the public URL flow works.

## Historical work

[Phase 8](Sessions/Phase-08-CLI-Session-Reports.md) and [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md) remain the implemented optional Claude Code session path. Phases 0–7 five-axis assessment/API flows remain compatibility history and do not define the current onboarding.

Before finishing, record actual commits/tests/review/CI, merge the PR, and fast-forward the clean canonical checkout with code and docs together. Do not reset or copy docs over divergent code.
