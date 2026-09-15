# ADR-0011 — One visual system for assessment work

- Status: Accepted
- Date: 2026-09-15, recorded before implementation
- Context: [#20](https://github.com/SangJun-Pyo/MyAiScore/issues/20)
- Supersedes: ADR-0009's current hero choice and ADR-0010's green-tinted surfaces. Retains English UI and the approved lower landing composition.

The product mixed green-gray surfaces, legacy violet text, coral buttons and an unrelated floating 3D platform. Functional pages repeated marketing messages and presented empty dashboard statistics. The result lacked a clear visual hierarchy and consistent purpose.

Use neutral charcoal surfaces, neutral light text and one muted coral accent for primary actions and selection. Reserve other colors for meaningful status. Green is not intrinsically unsuitable, but a green cast across every surface adds no assessment meaning; it also competes with success-state semantics. Define a single token set and shared heading, control, row, disclosure and status styles. Replace accumulated theme overrides rather than adding another theme layer.

Profile is an owner-scoped assessment list, not a simulated account. Insights prioritizes selected observations, linked evidence and missing evidence; rubric detail is available on demand. New assessment is a focused form with optional evidence progressively disclosed. Preserve consent, disabled-live feedback, all submission fields, distinct unobserved/insufficient/missing states and private/public boundaries.

Keep the Home composition from the Approach section onward. Replace Logic Core with a native interactive evidence-review illustration tied to the five criteria. No random score, fictitious evaluation progress or implied real model execution. ThreeUI's Kage chapter structure remains the composition reference; its documentation interface demonstrates restrained controls. The reviewed Diagnostics Panel is effect-only (layers, nodes, mesh), so it is not copied into a task screen. This is a product-specific implementation, not a claim to have imported ThreeUI's diagnostic renderer.

Remove the unused WebGL component and dependency if no production reference remains. Retire its implementation-specific tests with the feature; preserve meaningful keyboard, reduced-motion, responsive, navigation and assessment-flow checks. No new runtime library or external asset is required.

Reference: [ThreeUI browse](https://threeui.com/browse), [Diagnostics Panel](https://threeui.com/ui-elements/diagnostics-panel), [existing Kage source/provenance](../../UI/References/THREEUI_KAGE_LANDING_ADAPTATION.md).
