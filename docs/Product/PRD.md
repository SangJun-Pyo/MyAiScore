# PRD — MyAiScore session reports v0.4

Hub: [master](../00_MASTER_PLAN.md). Decision: [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md).

## User and problem

An AI coding user is curious about their working style and wants an interesting result without writing a retrospective. The former assessment demanded a repository, optional essays/excerpts and follow-up answers before sufficient evidence existed. The user approved changing that premise.

## Experience

One local command should produce a useful report without a model account or manual explanation. The report contains a playful session score, style, three concise observations and an actionable next challenge. Every observation must be traceable to a documented log pattern. Missing data is visible; serious skill certification, comparison percentiles and invented success claims are out of scope.

The CLI handles one Claude Code project/session. Current-project discovery is bounded and validates scope; explicit session selection is the fallback. The user can export a safe summary and view it in the browser. The website provides an example, setup instructions, report details and opt-in browser-local history. Raw transcripts are never uploaded by this flow.

## Required behavior

1. Terminal output works without the website or network.
2. Unknown format, malformed records, missing results and insufficient activity have explicit states.
3. Report exports contain only validated structural counts and fixed labels. Imported scores are recomputed.
4. Home/New session/Profile/Insights consistently describe the new product. Primary onboarding has no manual collaboration fields or interview questions.
5. Example records do not become personal history. Saving/deleting a summary affects browser-local data only.
6. Existing legacy private/public assessment results retain their access boundaries.

## Success hypotheses to test

Can a first user reach a meaningful report from a supported session without writing prose? Do they understand the style and why it was assigned? Do they choose to save/share it and try the next challenge? These are product hypotheses, not measured adoption or accuracy claims.

First implementation validates synthetic log handling and the complete local-to-browser path. Real Claude Code version coverage, cross-platform packaging and first-user feedback are follow-up validation.
