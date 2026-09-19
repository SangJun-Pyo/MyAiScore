# MyAiScore 적용 기록 — ThreeUI Structure Flow Logic Core

Date: 2026-09-19. User requested the registered ThreeUI `StructureFlowCollection` Logic Core variant as a natural addition to the Home experience; after visual review, it was integrated into the Home hero example card.

## Source

Complete registered source bundle: <https://threeui.com/source-code/logic-core.json>

Required registered files were fetched and copied into the app with matching SHA-256 hashes:

| File | Role | SHA-256 |
|---|---|---|
| `src/shaders/neuform-isolated/NeuformIsolatedEffects.tsx` | component | `fe9856234253bc3c1a13b3afb84f3d84644dfa6d578e7203bb3e1dd5eced1b75` |
| `src/shaders/neuform-isolated/sources/platform-core.html` | canonical source | `0f6889add89b389ba687fc6828c1f9415e5d8d54005492a91f3a79641ba42e31` |
| `src/shaders/threeui.css` | shared style | `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf` |

## Adaptation

The app exposes a local `@designcodeio/threeui` alias with `StructureFlowCollection`. The requested usage:

```tsx
<StructureFlowCollection
  variant="logic-core"
  hue={0}
  saturation={1.00}
  brightness={1.00}
/>
```

maps to the registered Logic Core canonical HTML inside an isolated iframe. The full registered `NeuformIsolatedEffects.tsx` source is preserved under `src/shaders/neuform-isolated/` with the hash above. Because that registered component belongs to a broader ThreeUI gallery and imports additional HTML sources not included in this Logic Core bundle, the app runtime lives under `src/vendor/designcodeio-threeui/neuform-runtime/` and focuses the exact `platform-core.html` target `#three-canvas-container`.

The component appears only as an `aria-hidden` visual inside the Home hero synthetic example card. It supports the “검증 수호자” preview without becoming a separate demo panel, but it is not a live dependency graph, repository scan, scoring model, or evidence visualization. Product meaning remains in the card's real text, score and signal breakdown.
