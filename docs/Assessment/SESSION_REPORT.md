# Session report contract — v1

Current product contract under [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md). Implementation: [sessionReport.ts](../../src/shared/sessionReport.ts). The old [five-axis rubric](SCORING_RUBRIC.md) is not used here.

## Public summary boundary

SessionReport contains schemaVersion=session-report-v1, ruleVersion=activity-mix-v1, source=claude_code, origin=local/synthetic, coverage=complete/partial/limited, numeric metrics and deterministic generated display fields. Never add raw messages, thinking, commands, tool outputs, paths, project/session identifiers, emails, keys or arbitrary user-authored text. A local report can be modified by its owner and is not authenticated evidence.

Metrics: userMessages, assistantMessages, toolCalls, readCalls, changeCalls, verificationCalls, toolResults, explicitSuccesses, explicitFailures, unknownResults, unmatchedResults, malformedLines, unsupportedRecords. Each is a nonnegative safe integer ≤100,000. Read/change/verification are disjoint classifications whose sum cannot exceed toolCalls. Matched results cannot exceed toolCalls. Explicit non-error/error/unknown statuses sum to matched results. A tool-result wrapper is not a user message; streamed messages and calls are deduplicated by structural identifiers.

## Session mix score

Four activity components each contribute min(count,5)×5, capped at 25:

| Component | Count |
|---|---|
| Conversation | userMessages |
| Exploration | readCalls |
| Iteration | changeCalls |
| Verification | verificationCalls (check-shaped command invocations) |

Total range is 0–100 when supported conversation/tool activity exists, null when none exists. This is a playful activity mix; a short effective session can score lower than a long varied one. More activity does not establish better work. No percentile, professional level, verification pass rate or validated skill claim follows from the score. The four categories are not the former A–E dimensions.

## Style and generated copy

No activity → A quiet session. Check calls present and at least as frequent as change calls → Check & build. Otherwise changes present and at least as frequent as reads → Hands-on builder. Otherwise reads present → Curious explorer. Otherwise Conversation first.

Three fixed-template highlights describe message rhythm, classified tool activity and matched result statuses. Explicit non-error is a log flag, not proof that tests passed or code is correct. Missing results stay unknown. The next challenge suggests a focused check, exploration before editing, or a useful counterexample based on absent/present activity categories. No model generates these interpretations.

## Import and coverage

Strict parsing validates exact fields, versions and metrics, then recomputes the report. Derived score/copy mismatch and unknown properties are rejected. Fragments are bounded to 16,384 characters; browser file imports must be bounded too. Synthetic examples stay distinct from personal history.

Complete refers to processing the supported available record. Malformed/unsupported data lowers coverage; limited means a known input bound or uncertainty applies. Empty/unsupported inputs must not imply a personal ability grade. Parser/CLI limits and tested format coverage are recorded in [Phase 8](../Development/Sessions/Phase-08-CLI-Session-Reports.md).

## Source format and compatibility

Claude Code documents JSONL transcripts under a working-directory-derived project folder, with an optional CLAUDE_CONFIG_DIR location override. Its SDK documents encoded cwd as replacing non-alphanumeric characters with hyphens. These identify the intended discovery directory, not proof that every record schema or version is supported. The collector validates the selected transcript's project association and falls back to explicit selection when it cannot establish scope. Sources checked 2026-09-15: [session storage location](https://code.claude.com/docs/en/sessions), [encoded cwd](https://code.claude.com/docs/en/agent-sdk/sessions).
