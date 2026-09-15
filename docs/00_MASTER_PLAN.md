# MyAiScore — master plan v0.4

> Discover how you build with AI, one session at a time.

Current execution: [ROADMAP](Development/ROADMAP.md). Decision: [ADR-0014](Architecture/ADR/0014-cli-first-session-reports.md). History: [Sessions](Development/Sessions/README.md).

## Product

MyAiScore turns a local Claude Code session into a playful, explainable report: a session score, collaboration style, three highlights and one next challenge. The user explicitly chose low input burden and fun as the primary goals on 2026-09-15. English is the only product UI language for now.

First audience: people building with AI coding tools. The report describes patterns in the supplied log, not general engineering ability, verified human judgment, hiring suitability or a population percentile. Claude Code is the first supported source; arbitrary provider compatibility is not promised.

## Primary flow

Run the CLI in a project → scoped session discovery or explicit session selection → local parsing and deterministic rules → immediate terminal report → optional safe summary file/browser report → optional local history or summary sharing.

No repository URL, collaboration essay, pasted excerpt or three-question interview is required. GitHub collection is not a prerequisite. The old repository walkthrough and existing assessment result APIs remain historical compatibility features; they do not define the new default onboarding.

## Scope and rules

- Read one selected session for one project. Never execute project commands or scan unrelated project histories.
- Compute from observable structural events. A tool invocation, a returned result and successful verification are distinct claims.
- Export allowlisted counts and fixed generated labels, never transcript text, commands, result excerpts, file paths or credentials.
- Version deterministic, capped scoring rules. Empty/unsupported data cannot receive a fabricated positive or zero ability grade. Partial inputs show their limitation.
- Recompute scores and copy from validated metrics on browser import. Treat local reports as user-supplied and modifiable.
- Clearly identify synthetic examples. Saving to browser history and sharing are explicit user choices; the new report flow needs no server upload or paid LLM.

New report contract: [SESSION_REPORT](Assessment/SESSION_REPORT.md). Product requirements: [PRD](Product/PRD.md). Boundaries: [MVP_SCOPE](Product/MVP_SCOPE.md). Flow: [USER_FLOW](UI/USER_FLOW.md).

## Delivery

Keep Next.js/React/TypeScript and the existing charcoal/coral visual system. Implement a working local CLI and browser consumer before distribution. The npm package remains private; do not advertise an unavailable npx package as installed. Publishing, cloud hosting and a real-session compatibility study are separate follow-up work.

AGENTS.md is the shared instruction entrypoint; CLAUDE.md imports it and ROADMAP. Canonical local checkout is C:/Users/sangj/MyAiScore. Code and docs must be integrated together through Git and synchronized there after merge.

## Historical assessment

The v0.3 five-axis rubric, GitHub evidence collector, owner-authenticated assessment storage and strict public DTOs remain documented for old records. Their API/model/budget requirements do not gate the v0.4 local report. Preserve their tests and user data; do not silently convert old scores into session scores. See [SCORING_RUBRIC](Assessment/SCORING_RUBRIC.md) and Phases 0–7 for that history.
