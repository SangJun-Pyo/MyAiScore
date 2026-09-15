# User flow — CLI session reports

Decision: [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md). Report fields/rules: [SESSION_REPORT](../Assessment/SESSION_REPORT.md).

## First use

Home explains the report and offers a clearly synthetic example or New session. New session shows the actual installed-checkout CLI command; it does not claim an unpublished npm package exists. There are no collaboration-case, excerpt or interview fields.

Run the CLI from the project directory. It selects only a matching current-project Claude session, or explains how to pass an explicit session when discovery cannot establish scope. It prints a useful terminal result immediately. No GitHub or service-model call is needed.

## Browser report

Optionally export the generated safe summary or use an explicit browser URL handoff. Import parses JSON in the browser, bounds size, validates the schema and recomputes derived labels/score. A report in a fragment is consumed and the fragment cleared. Raw session files are not accepted as summary reports and are not posted to a server.

Show session score, style, three highlights and one challenge. Details explain raw counters and scoring rules. Complete means the available supported session data was processed, not that user intent or competence was proven.

## History and sharing

Save report locally is an explicit action. Profile describes browser-local summary history and has an honest empty state, with no fabricated identity or population ranking. Insights explains the selected report and its limits. Copying a summary exports only the rendered safe summary; no raw transcript or automatic public posting occurs.

## Compatibility

The historical GitHub walkthrough and old direct assessment/result routes remain separate. New session reports never inherit old owner tokens or assessment scores. Older five-axis screens follow their original security contracts when directly accessed; they are not the normal v0.4 onboarding.
