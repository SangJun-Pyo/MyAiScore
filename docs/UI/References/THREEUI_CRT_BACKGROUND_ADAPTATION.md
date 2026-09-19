# MyAiScore 적용 기록 — ThreeUI CRT Background

Date: 2026-09-19. User requested the registered ThreeUI `CrtBackground` as a decorative background for the Home hero only.

## Source

Complete registered source bundle: <https://threeui.com/source-code/crt.json>

Required registered files were fetched and copied into the app with matching SHA-256 hashes:

| File | Role | SHA-256 |
|---|---|---|
| `src/shaders/crt/CrtBackground.tsx` | component | `20932f2655319c5fc6c6b3c29c890149beec7e4850edc414f909ab24a0c95031` |
| `src/shaders/crt/crtRenderer.ts` | renderer source | `a3eb536e9c50eeb31832e7d6d25021c1535137e8ead5eb1b864e5a27c340af03` |
| `src/shaders/crt/crtShaders.ts` | shader source | `cf3a7c747d1cac495c705529954e2491ad885489ddd5110724f8f4b3553f1592` |
| `src/shaders/crt/crtScreens.ts` | variant renderer source | `e545922e0d3afa19b9d01840d0ea684c56d0799714f9cf77a4712921bfec7adb` |
| `src/shaders/threeui.css` | shared style | `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf` |

## Adaptation

The app exposes a local `@designcodeio/threeui` alias with `CrtBackground`. The requested usage:

```tsx
<CrtBackground
  variant="terminal"
  speed={1.00}
  typeSpeed={1.00}
  motion={1.00}
  hue={0}
  saturation={1.00}
  brightness={1.00}
  opacity={1.00}
/>
```

maps to a JS runtime generated mechanically from the registered `CrtBackground` source. The original component, WebGL renderer, shader source and Canvas 2D screen painters are preserved under `src/shaders/crt/` with the registered hashes above. The generated runtime lives under `src/vendor/designcodeio-threeui/crt-runtime/` so the exact source files can remain hash-stable while this repository's strict TypeScript settings (`noUncheckedIndexedAccess`) continue to pass.

The component appears only as an `aria-hidden` Home hero background layer. MyAiScore lowers the wrapper opacity, scales it slightly past the hero bounds and masks it toward the center so the real H1, body copy, CTA and example card remain the primary content. The component prop `opacity` remains at the requested `1.00`; the visual restraint is handled by the app wrapper.

This background is decorative atmosphere. It is not a live terminal, repository scan transcript, secure connection proof, AI conversation transcript, or evidence used in repository scoring. The repository report remains the only surface that describes collected files, score, evidence and limitations.
