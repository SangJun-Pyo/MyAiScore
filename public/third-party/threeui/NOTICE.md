# ThreeUI Community attribution

Portions of `src/components/HeroScene.tsx` are adapted from ThreeUI Community Logic Core by Meng To, used under the [MIT license](LICENSE.txt).

- Project: https://github.com/MengTo/threeui
- Component: https://threeui.com/three-js/structure-flow/logic-core
- Pinned revision: `68802d5428071ada5c20db8094b1649e6bb770ed`
- Source: `src/shaders/neuform-isolated/sources/platform-core.html`, Three.js `initThreeJS` section
- Source HTML SHA-256: `0f6889add89b389ba687fc6828c1f9415e5d8d54005492a91f3a79641ba42e31`
- Accessed: 2026-09-15

Adaptation: local Three.js 0.186 instead of CDN runtime, MyAiScore palette and A–E selection, deterministic cube placement, elapsed-time animation, responsive component host, static SVG fallback, visibility/reduced-motion handling and resource cleanup. This is an adaptation, not a byte-identical upstream renderer.

The upstream full-page UI, remote images/fonts, Tailwind/Iconify scripts and CDN imports are not shipped by MyAiScore. No ThreeUI Pro source is included. The captured public implementation guidance and project-specific adaptation prompt are in [docs/UI/References](https://github.com/SangJun-Pyo/MyAiScore/blob/main/docs/UI/References/THREEUI_LOGIC_CORE_ADAPTATION.md).
