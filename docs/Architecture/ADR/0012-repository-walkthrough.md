# ADR-0012 — Repository-grounded scripted walkthrough

- Status: Accepted
- Date: 2026-09-15, recorded before implementation
- Context: [#22](https://github.com/SangJun-Pyo/MyAiScore/issues/22)

The user wants to see how their MyAiScore repository passes through the product. Service-model/API/budget selection is still pending. A fully fictional starter example does not answer that question, and presenting an invented personal score as a real assessment would be misleading.

Collect the public repository at a fixed commit through the existing bounded GitHub pipeline. Supply explicitly authored scripted responses to the existing question/judgement validators and deterministic scorer. Submit no invented collaboration case, excerpt or interview answer. Repository facts can support tailored questions and observations; they do not by themselves establish personally attributable collaboration behavior. This repository-only scenario withholds all unsupported levels and the total.

Keep the curated walkthrough outside the assessment store. A fixed read-only example endpoint and a three-stage walkthrough page reuse existing UI components. They neither create owner tokens/history nor enable live assessment. Opening the page replays saved data; it does not recollect GitHub or call a model. Distinguish the real public snapshot from scripted interpretation, show its SHA/date/coverage, and retain null service-model identity, tokens, cost and execution time. Preserve the existing fully synthetic starter example.

Only curated evidence metadata, questions, results and execution provenance enter the repository or browser. PreparedAssessment, raw file contents and analysisContext remain in memory during generation. The generator is restricted to this public repository and pinned commit; new arbitrary uploads or a general mock assessment mode are outside scope. Design tokens/layout are unchanged.

Correct the service result source for runs without user submissions to `github_repository`; retain `github_with_user_submissions` when actual submitted material exists and `synthetic` for the fictional starter. This distinguishes input provenance from `mode: mock | live`. Update its domain contract and regression tests; scoring is unchanged.
