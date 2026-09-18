# ADR-0014: CLI-first playful session reports

Status: accepted as optional detail; primary onboarding superseded by [ADR-0015](0015-anonymous-korean-repository-reports.md). Date: 2026-09-15. [Issue #26](https://github.com/SangJun-Pyo/MyAiScore/issues/26).

## Context

The user explicitly prioritized low effort and fun over formal evaluation accuracy, and asked to remove optional collaboration-case entry and interview questions. The former repository-first five-axis assessment needs explanatory input before it can issue a score, which conflicts with this goal.

## Decision

The primary product reads one Claude Code session locally and produces a rule-based session score, collaboration style, three highlights and one next challenge. Missing or malformed records are reported; no personal skill certification, fabricated percentile, user intent or test success is inferred. Rules are versioned, capped and inspectable. An empty log has no score. These are playful activity-pattern interpretations, not the old five-axis rubric.

The CLI supports the current project with scoped discovery inside that project's expected Claude transcript directory, plus explicit `--project`/`--session` fallback. It must not scan all project directories, read outside selected scope through links, execute project commands or call a model. Discovery remains format-dependent and fails explicitly when the project cannot be established. Implementation testing uses synthetic sessions; no private historical log is read merely because it is present on this machine.

Only an allowlisted, validated numeric summary and fixed labels can leave the parser. Raw messages, thinking, commands, results, file paths, session identifiers and credentials stay out of exported reports. Terminal output is useful by itself. A user can explicitly export a new summary file or open a browser report through a summary-only fragment. Browser parsing and optional history happen locally; no new report backend/model or log upload is required. Fragments are removed after consumption. Imported values are validated and derived scores/copy recomputed, not trusted from the file.

Primary Home/New session/Profile/Insights adopt this flow. Manual collaboration-case/excerpt/question forms leave the primary routes. Historical repository walkthrough and existing assessment result APIs remain for compatibility; historical scores and data are not migrated into session scores. The old scoring/API documents are clearly marked legacy where applicable. The charcoal/coral design is retained.

## Alternatives and boundaries

- Keeping the manual form preserves the previous evaluation premise but does not meet the user's low-friction direction.
- LLM-authored personality/skill claims add cost and uncertain authenticity without being necessary for the first fun report.
- Immediate npm publishing or universal CLI compatibility is not claimed. Provide working commands from an installed checkout and keep the package private until distribution is explicitly handled.

This supersedes the primary onboarding and gating requirements in ADR-0001/0007/0010/0012 and the v0.3 product plan. Their existing data/privacy/legacy compatibility rules remain applicable to old assessment flows. ADR-0011's visual system and ADR-0013's GitHub collector fix remain intact. Source of new report semantics: [SESSION_REPORT](../../Assessment/SESSION_REPORT.md); execution evidence: [Phase 8](../../Development/Sessions/Phase-08-CLI-Session-Reports.md).
