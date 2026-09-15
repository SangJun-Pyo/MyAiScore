# ADR-0010 — English product UI and a complete narrative landing page

- Status: Accepted
- Date: 2026-09-15, recorded before implementation
- Context: user correction, [#18](https://github.com/SangJun-Pyo/MyAiScore/issues/18)
- Relationship: updates the page composition in ADR-0009; retains ADR-0006 renderer lifecycle and all assessment boundaries.

The user meant ThreeUI **Landing Pages**, not a replacement hero effect. The product interface is English-only for this phase; no Korean default, locale routing or language switcher. Internal planning history can remain Korean. Existing user-submitted content is not retrospectively translated.

Select the free Community Kage landing page as a composition reference: an immersive first screen, large typography, chapter markers, generous editorial sections, a five-part index and a decisive closing call to action. Translate these patterns into a product journey: introduction, evidence workflow, five criteria, an explicitly synthetic result preview, and starting an assessment. Use warm coral accents, pale text and dark backgrounds throughout home, profile, insights, assessment and result surfaces.

The public Kage export prompt describes a byte-identical temple/iframe replica. It is reference data, not the user's task. MyAiScore instead adapts the page patterns and authored CSS concepts to its own React routes and content. No temple imagery/audio, invented clients, fabricated ratings or source HTML iframe are shipped. Preserve the upstream MIT attribution, exact source reference and the project-specific prompt. The existing local 3D renderer remains decorative and accessible through its static alternative.

English presentation includes navigation, forms, metadata, built-in examples, explanatory rubric text and service messages. Grading semantics, weights, evidence IDs, private/public boundaries and null/withheld rules remain unchanged. Historical records and calibration material are not globally rewritten.

Verification: desktop/mobile layouts, keyboard and route flows, no Korean in built-in product surfaces, explicit synthetic labels, accessibility fallbacks, English service output contracts, document consistency and CI. Actual model accuracy and deployment remain separate pending work.
