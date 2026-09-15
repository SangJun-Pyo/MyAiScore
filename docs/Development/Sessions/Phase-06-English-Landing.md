# Phase 6 — English landing page experience

Date: 2026-09-15. Base `d611b41` (PR #17). Branch `codex/english-landing-pages`, [issue #18](https://github.com/SangJun-Pyo/MyAiScore/issues/18).

## Request and scope

The user clarified that ThreeUI **Landing Pages** should inform the whole website composition, not just its 3D hero, and that the product should use English only for now. Existing personal input/history and internal planning language are not translated wholesale.

Their screenshot showed failed workflow #13 (`40f4699`); corrected #14 (`93763a6`, run `34932681653`) was freshly verified successful. The historical failure remains visible and is not the main branch's final check. The Node 20 Actions warning was separate from the mobile motion failure fixed in MAS-009.

## Reference and implementation

Astra inspected the user's Chrome Landing Pages: Sketchbook, sublevel.studio and Kage. Selected Kage's full-page chapter composition, read its Skill.md and verified the pinned public HTML, host and MIT license. [Reference and application prompt](../../UI/References/THREEUI_KAGE_LANDING_ADAPTATION.md), [ADR-0010](../../Architecture/ADR/0010-english-landing-page-experience.md).

Root owns the new native React landing page, page-wide styling, provenance/docs and integration. Independent agents translate product UI/browser fixtures and runtime service/rubric copy. Existing assessment routes, private/public boundaries and score formulas remain unchanged.

Service translation original commit `c69cbdd`: error messages, built-in synthetic result, guidance, improvement task, comparison and twenty rubric descriptions translated. Existing synthetic example stays 71 and historical calibration fixtures stay unchanged. Added English/retained-original-data regressions; agent typecheck and 236 tests passed. English-output instructions update question/judge prompt IDs to `question-prompt-v2-en`/`judge-prompt-v2-en`, criteria to `scoring-rubric-v0.3.1-criteria-table-v2-en`, pipeline/inference to `service-v2-en`, synthetic to `synthetic-example-v3-en`, collector text to `ingestion-0.2.1-en`. Methodology `rubricVersion=scoring-rubric-v0.3.1` is unchanged. Actual model compliance has not been tested with a paid call.

## Verification and handoff

Independent review checked translated rubric semantics, scoring/withholding, preserved user input, versioning and integrated routes. No grading change was found. It caught a UI labeling regression (MAS-010): insufficient evidence had been grouped as "Not observed". A shared status label now distinguishes "Not observed", "Insufficient evidence" and missing/unknown "Not assessed" across profile, insights, results, comparison and sharing. A synthetic browser regression covers those surfaces. Small chapter captions were lightened for contrast. Final visual inspection also scoped large chapter headings to the landing title class, so opening the embedded report does not inherit oversized marketing typography.

Executed validation:
- Typecheck and production build pass.
- 236 unit/regression tests pass; the independent reviewer also executed 63 focused service/provider/comparison/API/scoring tests.
- 30 desktop/mobile browser tests pass (`npm run test:e2e -- --workers=2`), including full synthetic input-to-result flow, English built-in pages, chapter/FAQ navigation, separate evidence states, WebGL lifetime/context loss and reduced-motion event reconciliation.
- Manual Chrome inspection covered full desktop composition, 390 px home, and the English synthetic report at 320 px without horizontal overflow. User reduced-motion preference was honored; actual WebGL was exercised in isolated browser tests.
- A later six-worker Windows rerun hit `net::ERR_NO_BUFFER_SPACE` during navigation, before an app assertion. The final full suite was rerun with two workers; no assertion or browser safety check was removed.
- Document check: 51 files, 352 local links, zero problems.
- [Captured full-page screenshots](../../../artifacts/phase6-english/README.md). Kage reference HTML was inspected as source only; no temple assets or executable external page were incorporated.

Integration: [PR #19 and its exact-head CI checks](https://github.com/SangJun-Pyo/MyAiScore/pull/19). Implementation commits are `9289639` (service), `afe553f` (UI translation), and `9de6e0e` (complete landing, status fix and docs). Code and docs are handed off together to main and the canonical checkout only after the current PR head passes CI. The PR retains the merge revision and final remote verdict. Live model evaluation, Supabase operational verification and hosting deployment remain separate pending work under issue #4.


## 2026-09-15 — Follow-up: consistent assessment work (#20)

The current follow-up uses `codex/consistent-assessment-design` from `aca0d25`. [Issue #20](https://github.com/SangJun-Pyo/MyAiScore/issues/20), [ADR-0011](../../Architecture/ADR/0011-consistent-assessment-design.md) and the [shared design contract](../../UI/DESIGN_SYSTEM.md) define the revised scope. Earlier #18 validation above remains historical and is not the verification result for this change.

Root reviewed ThreeUI browse and [Diagnostics Panel](https://threeui.com/ui-elements/diagnostics-panel). The panel contains three Canvas2D effect variants (layers, nodes, mesh), not an evidence-review workflow. No diagnostic renderer code was copied. Existing pinned Kage provenance and MIT attribution remain; the former Logic Core integration is retired and preserved as history.

The new authored EvidencePreview presents A–E tabs, default D, followed by Project evidence, Your decision and Review. It explicitly says Illustrative preview and contains no fabricated score or progress. Keyboard navigation uses Left/Right/Home/End and motion reduction disables its entrance animation. HeroScene/WebGL and unused Three.js dependencies are removed. Approach and subsequent landing content remain unchanged.

Neutral charcoal `#111213`, surfaces `#18191b`/`#202123`, text `#efeeeb`/`#a4a5a4`, and coral `#e58c75` for action/selection replace mixed themes. Profile emphasizes essential assessment history; Insights prioritizes observations and evidence with a collapsible rubric; new assessment is one form with an optional collaboration case. Consent, disabled-live feedback, submission fields, private/public boundaries and distinct unknown states remain required.

Executed checks for #20: typecheck and production build pass; 236 unit/regression tests pass; the final desktop/mobile suite passes all 30 tests on the normal 127.0.0.1:3100 preview (two workers). The tests cover roving A–E tabs, explicit illustrative status, no fabricated score/progress/request, reduced motion, English routes, source/query navigation, owner-only history, distinct evidence states, complete synthetic assessment flow, and preservation of all optional form fields/consent. The retired WebGL tests are replaced by checks of the actual evidence-preview behavior.

Independent review checked the integrated UI, data flow and lower landing styles. Visual inspection of captured desktop/mobile screens caught and removed an unnecessary outer Insights card and corrected its empty notice alignment. A lower-landing CSS selector audit restored scoped file-row/commit-label styles. Final [screenshots](../../../artifacts/phase6-consistency/README.md) include empty and synthetic populated states; these are not real evaluations. Chrome DOM navigation worked, but its screenshot transport timed out, so visual inspection used the isolated browser suite captures. Temporary Windows socket errors required an intermediate port; the final server and suite returned to 3100 without changing system settings or test assertions.

Document/link validation and remote exact-head CI are recorded at integration below. Live API/model/budget decisions, Supabase operational validation and deployment remain pending under #4. Code and docs are synchronized together after the PR's exact head passes CI.
