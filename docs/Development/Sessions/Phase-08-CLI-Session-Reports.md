# Phase 8 — CLI-first session reports

Date: 2026-09-15. Base: main@34fecf4. Issue [#26](https://github.com/SangJun-Pyo/MyAiScore/issues/26). Decision [ADR-0014](../../Architecture/ADR/0014-cli-first-session-reports.md).

## User direction

The user asked to remove optional manual input and prioritize fun/low effort through locally readable CLI information, then explicitly approved implementation. This supersedes the old primary repository/case/question flow. The product remains English and retains the established visual palette.

## Work allocation

Root: product decisions, shared instructions/docs, integration, historical labeling and final verification. Core subagent: shared report contract, scoped session parser/discovery, CLI, fixtures and tests in an isolated worktree. Web subagent: primary routes, browser-only report/history/share experience and browser tests in another worktree. Independent review follows implementation of raw-data and score boundaries.

## Boundaries

No service LLM, paid resource, publishing or deployment. No actual private log is read during development; synthetic fixtures test the collector and report. Only validated counts and fixed labels enter new outputs; commands/text/paths/session IDs remain out. Old assessment APIs/data are preserved and not converted into session scores.

## Implementation and source commits

- Shared counts-only contract: source 3790e93, integrated a9f5af1. Four capped activity components, deterministic style/three highlights/challenge, canonical import validation and synthetic origin.
- Collector/CLI: source 37e9b48, integrated 45a1b8c. Follow-up 9a12d2c integrated 53d36c7 bounds directory enumeration and rejects mixed session identities. Input bounds: 8 MiB, 20,000 lines, 512 KiB per line; discovery reads at most 201 directory entries before rejecting an oversized directory. No raw transcript content is exported.
- Primary web: source 6801bb4/6815e0c, integrated e1528c7/7112c3a. Home/New session/Profile/Insights now use browser-only summaries. No questionnaire, assessment API call or service model gate in this flow. A failed import clears the previous preview. Synthetic examples cannot be saved as personal history.
- Root updated ADR-0014, current product/flow/security/architecture contracts, shared agent instructions and roadmap. Old contracts and walkthrough are explicitly historical. Existing assessment APIs and ownership protections remain compatible.

## Actual verification — 2026-09-15

- npm run typecheck: passed. npm run build: passed, all routes generated successfully.
- npm test after final collector follow-up: 263/263 passed, zero skipped.
- Production server on 127.0.0.1:3104 with live provider disabled. Playwright desktop/mobile: 24/24 passed. The first run had four test-locator failures because Next's route announcer also has role=alert; assertions were scoped to main and the full suite reran successfully. Product error behavior was unchanged.
- Browser integration executes the real CLI with --example --json, imports its fragment, checks Curious explorer / 65, verifies fragment removal, no automatic save and disabled synthetic save. Additional browser checks cover safe file import, opt-in history/dedup/removal, malformed/forged/oversized/raw rejection and legacy owner boundaries.
- node bin/myaiscore.mjs --help and npm run session:report -- --example: exit 0. Explicit --example --out and --web-url generated the preserved synthetic JSON and a local fragment link without opening a browser or making a network request.
- Screenshots of desktop/mobile report views were inspected: no clipping or horizontal overflow; existing charcoal/coral styles retained. [Artifacts](../../../artifacts/phase8-session-reports/README.md) distinguish the 65-point CLI example from the browser's 45-point synthetic local-import test.
- Documentation link/placement check and git diff --check passed. Exact final PR/CI evidence is linked from the integration PR.

## Independent review

The review subagent read integrated 45a1b8c/web e1528c7 and later the final 53d36c7 boundary follow-up. No mandatory defect found. It independently ran the 15 focused synthetic tests, including Windows junction, on both reviewed core versions. Additional synthetic sentinel, duplicate/unknown result and forged report checks passed. Review covered scope, bounded discovery/reads, counts-only export, canonical score validation, fragment handling and optional local storage.

## Limitations and next work

No actual private session was read; real Claude Code version compatibility is unverified. Supported check-shaped commands are heuristics, not proof that verification succeeded. Long or unsupported records lower coverage; unsupported/empty activity cannot invent a grade. Identical safe summaries deduplicate in browser history. The activity-mix score is deliberately simple and not calibrated for skill, rankings or quality.

Next: one explicitly selected real session compatibility/utility check, then improve the playful rules from observed feedback. The npm package remains private/unpublished; use the installed checkout command in README. No paid model, deployment, raw-log upload or other-provider adapter was added.
