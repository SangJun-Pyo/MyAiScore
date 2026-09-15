# ThreeUI Community attribution

The current landing composition adapts ThreeUI Community Kage by Meng To under the [MIT license](LICENSE.txt), as described below. The former Logic Core renderer is retired; its attribution is retained here as implementation history. The current EvidencePreview is authored for MyAiScore and does not include Logic Core or Diagnostics Panel code.

## Historical Logic Core adaptation (retired under issue #20)

The former `src/components/HeroScene.tsx` adapted ThreeUI Community Logic Core by Meng To.

- Project: https://github.com/MengTo/threeui
- Component: https://threeui.com/three-js/structure-flow/logic-core
- Pinned revision: `68802d5428071ada5c20db8094b1649e6bb770ed`
- Source: `src/shaders/neuform-isolated/sources/platform-core.html`, Three.js `initThreeJS` section
- Source HTML SHA-256: `0f6889add89b389ba687fc6828c1f9415e5d8d54005492a91f3a79641ba42e31`
- Accessed: 2026-09-15

Adaptation: local Three.js 0.186 instead of CDN runtime, MyAiScore palette and A–E selection, deterministic cube placement, elapsed-time animation, responsive component host, static SVG fallback, visibility/reduced-motion handling and resource cleanup. This is an adaptation, not a byte-identical upstream renderer.

The upstream full-page UI, remote images/fonts, Tailwind/Iconify scripts and CDN imports are not shipped by MyAiScore. No ThreeUI Pro source is included. The captured public implementation guidance and project-specific adaptation prompt are in [docs/UI/References](https://github.com/SangJun-Pyo/MyAiScore/blob/main/docs/UI/References/THREEUI_LOGIC_CORE_ADAPTATION.md).

## Kage landing page design adaptation (2026-09-15)

The chapter composition and typography/spacing concepts in `src/components/LandingPage.tsx` and `src/app/landing.css` are adapted from the Community Kage landing page, by Meng To under the same MIT license. This is a native MyAiScore redesign, not the original temple document or a byte-identical reproduction.

- Reference: https://threeui.com/landing-pages/kage-landing-page
- Source: `public/landing-pages/kage.html` at the pinned revision above.
- HTML SHA-256: `c8e06b90397ac246baf0ab6f32f5f6b570acc6fe03c7009f711b579fb72d9f49`
- Adaptation: English MyAiScore product journey, neutral charcoal surfaces, restrained coral actions/selection, an authored evidence-review preview, assessment routes, reduced-motion and responsive behavior. No temple images, audio, external fonts or full-page iframe shipped.
- [Reference and adaptation prompt](https://github.com/SangJun-Pyo/MyAiScore/blob/main/docs/UI/References/THREEUI_KAGE_LANDING_ADAPTATION.md).


Diagnostics Panel (`https://threeui.com/ui-elements/diagnostics-panel`) was reviewed as reference only. It contains three Canvas2D effect variants; no implementation was copied or shipped. The pinned Kage revision and hashes above remain unchanged.
