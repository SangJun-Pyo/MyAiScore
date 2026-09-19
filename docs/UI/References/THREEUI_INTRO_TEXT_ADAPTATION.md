# MyAiScore 적용 기록 — ThreeUI Intro Text

Date: 2026-09-19. User requested the registered ThreeUI `TextAnimationCollection` variant `threeui-intro` for the Home headline area.

## Source

Complete registered source bundle: <https://threeui.com/source-code/threeui-intro.json>

Required registered files were fetched and copied into the app with matching SHA-256 hashes:

| File | Role | SHA-256 |
|---|---|---|
| `src/shaders/neuform-isolated/NeuformIsolatedEffects.tsx` | component | `fe9856234253bc3c1a13b3afb84f3d84644dfa6d578e7203bb3e1dd5eced1b75` |
| `src/shaders/neuform-isolated/sources/creator-studio-intro.html` | canonical source | `e14795f24ea8aa9cb0005ea740923289869de3250ac4ea18f58527cd42e18cbe` |
| `src/shaders/threeui.css` | shared style | `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf` |

## Adaptation

The app exposes a local `@designcodeio/threeui` alias with `TextAnimationCollection`. The requested usage:

```tsx
<TextAnimationCollection
  variant="threeui-intro"
  mode="dark"
  hue={0}
  saturation={1.00}
  brightness={1.00}
/>
```

maps to the registered `ThreeUIIntro` export from the fetched source. The original component is an iframe `srcDoc` renderer that isolates the first chromatic wordmark beat and respects reduced motion through the source document.

The Home H1 remains real page text. The ThreeUI intro frame is `aria-hidden` and serves as a visual product cue only; it is not evidence, progress, a score animation or a claim about the analyzed repository.

The registered TSX imports additional ThreeUI source names that are not part of this three-file source bundle. Minimal placeholder HTML files satisfy those unused imports so the exact registered TSX remains byte-for-byte intact while the selected `threeui-intro` variant uses the canonical `creator-studio-intro.html`.
