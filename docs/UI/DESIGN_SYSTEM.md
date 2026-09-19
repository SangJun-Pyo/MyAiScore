# MyAiScore — shared product design

Visual decision: [ADR-0011](../Architecture/ADR/0011-consistent-assessment-design.md). Primary product flow follows [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md) and [ADR-0016](../Architecture/ADR/0016-persistent-korean-english-interface.md): Korean-default Home, Reports, Guide and repository analysis with a persistent English option. [User flow](USER_FLOW.md) owns behavior; [REPOSITORY_REPORT](../Assessment/REPOSITORY_REPORT.md) owns repository-signal scores. CLI session reports are optional and old assessment contracts apply only to historical result screens.

## v0.5 content language and primary action

Preserve the charcoal/coral visual system below. The Home hero and `/evaluate` prioritize one public GitHub URL field and `내 저장소 분석하기`; account, GitHub login and CLI are not primary CTAs. Results place the repository-signal limitation beside the score, show actual evidence paths as code-like labels and distinguish complete/partial coverage without relying on color alone.

Profile means reports explicitly saved in this browser, not an authenticated person. Insights always exposes the deterministic signal matrix and style rules, then highlights the selected report's style and evidence when present. Empty states use real absence and a new-analysis link; do not fabricate user names, rankings or aggregate statistics.

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

- **Home:** explain public repository analysis, show a labeled synthetic repository preview, and lead to one working URL input. No fake processing or population ranks.
- **Reports:** show only explicitly saved browser-local repository summaries with honest empty/error states. No account identity or automatic example history.
- **Guide:** show all signal values in a horizontally scrollable semantic table, all six style rules in classification order, and the explicit dominant-axis tie priority. Highlight one current style only when a report is selected.
- **Analysis:** accept one public GitHub URL, show progress or localized coded errors, then present coverage, evidence paths, gaps and one next challenge. CLI setup remains a secondary disclosure.
- **Historical results:** preserve the original private/public rules and mark retained English body regions with the correct language semantics.

Product copy supports Korean and English, with Korean as the default. Keep API responses and saved repository reports in their canonical contract language; translate presentation from semantic IDs. Preserve submitted source text and historical personal records without retrospective translation. Synthetic examples remain separate from actual history.

## Interaction and accessibility

Use semantic links, buttons, tabs and disclosures with visible keyboard focus. EvidencePreview starts on D; its tabs support Left/Right/Home/End and normal focus navigation. Keep interfaces usable at narrow widths without hiding essential actions. Motion is optional: the preview has only a brief entrance under `prefers-reduced-motion: no-preference`. The Home hero may include the isolated ThreeUI intro frame as a decorative cue, and `/evaluate` may use the ThreeUI uplink loader while an analysis request is pending. Core product meaning, status and evidence must remain in real text and static repository evidence surfaces.

## References and verification

Kage remains the lower landing composition reference with [pinned provenance and MIT attribution](References/THREEUI_KAGE_LANDING_ADAPTATION.md). The Home headline visual cue uses the registered [ThreeUI Intro Text source](References/THREEUI_INTRO_TEXT_ADAPTATION.md), and the repository analysis loading state uses the registered [ThreeUI Uplink Loader source](References/THREEUI_UPLINK_LOADER_ADAPTATION.md). [ThreeUI browse](https://threeui.com/browse) and [Diagnostics Panel](https://threeui.com/ui-elements/diagnostics-panel) were reviewed. Diagnostics Panel contains three Canvas2D effects (layers, nodes, mesh); none was copied because they do not implement this product workflow. The new review panel is authored for MyAiScore. [Logic Core](References/THREEUI_LOGIC_CORE_ADAPTATION.md) is historical.

Implementation and executed checks belong in [Phase 6](../Development/Sessions/Phase-06-English-Landing.md). This design contract is not a claim of completed browser verification, model accuracy or deployment.
