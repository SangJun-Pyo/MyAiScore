# MyAiScore 적용 기록 — ThreeUI Uplink Loader

Date: 2026-09-19. User requested the registered ThreeUI `UplinkLoader` for the repository analysis loading state.

## Source

Complete registered source bundle: <https://threeui.com/source-code/uplink-loader.json>

Required registered files were fetched and copied into the app with matching SHA-256 hashes:

| File | Role | SHA-256 |
|---|---|---|
| `src/shaders/uplink-loader/UplinkLoader.tsx` | component | `763a8ed26e854ad8331bdc530d9fb1570c81d659ca9bc97e3f26f89b0d2ecb67` |
| `src/shaders/uplink-loader/uplink-loader.html` | canonical source | `f73bb2963501b88b1642bd94aca10d20d778f0881f70b71a30c7267a73f9b969` |
| `src/shaders/threeui.css` | shared style | `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf` |

## Adaptation

The app exposes a local `@designcodeio/threeui` alias with `UplinkLoader`. The requested usage:

```tsx
<UplinkLoader />
```

maps to the registered `UplinkLoader` export from the fetched source. The original component renders the canonical HTML in an iframe `srcDoc`, preserving its DOM, CSS, JavaScript progress animation, canvas grain, scanlines, telemetry ticks and reduced-motion behavior.

The loader appears only while `/evaluate` is waiting for `POST /api/repository-report`. The real status text remains outside the iframe in localized page copy, while the ThreeUI frame is `aria-hidden`.

This animation is a product loading cue. It is not a security scan, a network uplink guarantee, a repository certification, or evidence that the analysis succeeded. The completed repository report remains the only surface that describes collected files, score, evidence and limitations.
