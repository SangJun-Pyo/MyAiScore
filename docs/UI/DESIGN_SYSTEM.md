# MyAiScore — shared product design

Visual decision: [ADR-0011](../Architecture/ADR/0011-consistent-assessment-design.md). Primary product flow follows [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md): Korean Home, Profile, Insights and New analysis. [User flow](USER_FLOW.md) owns behavior; [REPOSITORY_REPORT](../Assessment/REPOSITORY_REPORT.md) owns repository-signal scores. CLI session reports are optional and old assessment contracts apply only to historical result screens.

## v0.5 content language and primary action

Preserve the charcoal/coral visual system below. The Home hero and `/evaluate` prioritize one public GitHub URL field and `내 저장소 분석하기`; account, GitHub login and CLI are not primary CTAs. Results place the repository-signal limitation beside the score, show actual evidence paths as code-like labels and distinguish complete/partial coverage without relying on color alone.

Profile means reports explicitly saved in this browser, not an authenticated person. Insights explains the selected report's deterministic axes and evidence. Empty states use real absence and a new-analysis link; do not fabricate user names, rankings or aggregate statistics.

## Color and hierarchy

| Role | Value | Use |
|---|---|---|
| Background | `#111213` | Neutral charcoal page canvas |
| Surface | `#18191b` | Forms, records and review panels |
| Raised surface | `#202123` | Secondary surfaces and hover |
| Primary text | `#efeeeb` | Headings and essential content |
| Secondary text | `#a4a5a4` | Supporting explanations and metadata |
| Accent | `#e58c75` | Primary actions, selection and focus |

Use neutral borders to separate rows and sections. Other colors require a meaningful status, not decoration. Avoid tinted page washes, glows, floating platforms, orbs and competing accent palettes. Keep headings, controls, rows, disclosures and status labels consistent across routes; remove superseded styles instead of stacking theme overrides.

## Content by surface

- **Home:** explain local CLI session reports, show a labeled synthetic preview, offer working setup/command instructions. No fake processing or population ranks.
- **Profile:** show only explicitly saved browser-local summaries with honest empty/error states. No account identity or automatic example history.
- **Insights:** explain the selected session's numeric signals and capped rule components. Distinguish recorded calls, returned results and verified outcomes.
- **New session:** CLI instructions and local safe-summary consumption. No collaboration-case, excerpt or interview forms; no service-model gate.
- **Results and sharing:** present score/style/three highlights/one challenge. Label synthetic and partial data. Copy only a safe summary. Historical assessment/result pages keep their original private/public rules.

Product copy is English. Preserve submitted source text and historical personal records without retrospective translation. Synthetic examples remain separate from actual history.

## Interaction and accessibility

Use semantic links, buttons, tabs and disclosures with visible keyboard focus. EvidencePreview starts on D; its tabs support Left/Right/Home/End and normal focus navigation. Keep interfaces usable at narrow widths without hiding essential actions. Motion is optional: the preview has only a brief entrance under `prefers-reduced-motion: no-preference`; no autoplay or continuous effects. No WebGL or Canvas rendering is needed for the current product preview.

## References and verification

Kage remains the lower landing composition reference with [pinned provenance and MIT attribution](References/THREEUI_KAGE_LANDING_ADAPTATION.md). [ThreeUI browse](https://threeui.com/browse) and [Diagnostics Panel](https://threeui.com/ui-elements/diagnostics-panel) were reviewed. Diagnostics Panel contains three Canvas2D effects (layers, nodes, mesh); none was copied because they do not implement this product workflow. The new review panel is authored for MyAiScore. [Logic Core](References/THREEUI_LOGIC_CORE_ADAPTATION.md) is historical.

Implementation and executed checks belong in [Phase 6](../Development/Sessions/Phase-06-English-Landing.md). This design contract is not a claim of completed browser verification, model accuracy or deployment.
