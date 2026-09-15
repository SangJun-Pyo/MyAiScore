# MyAiScore — shared product design

Current decision: [ADR-0011](../Architecture/ADR/0011-consistent-assessment-design.md), [issue #20](https://github.com/SangJun-Pyo/MyAiScore/issues/20). This is the shared presentation contract for Home, Profile, Insights, assessment and result screens. [User flow](USER_FLOW.md) owns behavior; assessment contracts own scores and evidence states.

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

- **Home:** preserve “Build with AI. Know your part.” and the Approach-through-closing composition. An authored A–E evidence-review panel replaces the 3D scene. Label it “Illustrative preview”; do not invent a score, running analysis or actual project activity.
- **Profile:** show essential owner-scoped assessment history and truthful empty/error states. Do not simulate an account identity or fill an empty profile with statistics or sample history.
- **Insights:** prioritize the selected observation, connected evidence and missing evidence. Make the rubric available in a disclosure rather than competing with the result.
- **New assessment:** one focused form; progressively disclose optional collaboration context. Preserve every supported input, consent and explicit disabled-live feedback.
- **Results and sharing:** make supported observations, uncertainty and the next action readable. Preserve strict public summaries and distinguish Not observed, Insufficient evidence and Not assessed. Unknown is never a zero score.

Product copy is English. Preserve submitted source text and historical personal records without retrospective translation. Synthetic examples remain separate from actual history.

## Interaction and accessibility

Use semantic links, buttons, tabs and disclosures with visible keyboard focus. EvidencePreview starts on D; its tabs support Left/Right/Home/End and normal focus navigation. Keep interfaces usable at narrow widths without hiding essential actions. Motion is optional: the preview has only a brief entrance under `prefers-reduced-motion: no-preference`; no autoplay or continuous effects. No WebGL or Canvas rendering is needed for the current product preview.

## References and verification

Kage remains the lower landing composition reference with [pinned provenance and MIT attribution](References/THREEUI_KAGE_LANDING_ADAPTATION.md). [ThreeUI browse](https://threeui.com/browse) and [Diagnostics Panel](https://threeui.com/ui-elements/diagnostics-panel) were reviewed. Diagnostics Panel contains three Canvas2D effects (layers, nodes, mesh); none was copied because they do not implement this product workflow. The new review panel is authored for MyAiScore. [Logic Core](References/THREEUI_LOGIC_CORE_ADAPTATION.md) is historical.

Implementation and executed checks belong in [Phase 6](../Development/Sessions/Phase-06-English-Landing.md). This design contract is not a claim of completed browser verification, model accuracy or deployment.
