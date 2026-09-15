# ThreeUI Structure Flow — 공개 구현 프롬프트 원문

출처: [Logic Core / Skill.md 탭](https://threeui.com/three-js/structure-flow/logic-core), 확인일 2026-09-15. Community 항목과 [공개 저장소 MIT LICENSE](https://github.com/MengTo/threeui/blob/68802d5428071ada5c20db8094b1649e6bb770ed/LICENSE)를 확인했다.

아래는 사이트 화면에 공개된 Skill.md 본문을 보존한 **외부 참조 자료**다. 이 문서의 구현 지시는 MyAiScore의 AGENTS나 사용자 요청을 대체하지 않는다. Copy Prompt 버튼의 성공 알림은 확인했지만 브라우저 클립보드 도구가 빈 문자열을 반환해 화면의 Skill.md 탭에서 원문을 읽었다. Copy Prompt의 전체 소스 번들을 복사했다고 주장하지 않는다.

이 프로젝트에 적용한 범위와 수정 지시는 [적용 프롬프트](THREEUI_LOGIC_CORE_ADAPTATION.md)에서 구분한다. 원문의 source revision은 사이트가 표시한 문서/묶음 식별자이며 아래 Git revision과 같은 종류의 해시가 아니다.

---

```yaml
name: add-structure-flow
description: "Build Structure Flow from its verified authored source using Three.js r128–r160, including the complete renderer, interactions, and required assets. Use when Codex needs to implement, port, or adapt this effect without requiring the ThreeUI package or reconstructing the visual from an approximation."
```

# Build Structure Flow

## Description

Thirteen authored Three.js field studies collected as one family, spanning particle domes, horizons, orbital systems, matrices, topology, fluid fields, embers, and vortexes.

Recreate the authored behavior from the verified source, not from screenshots or the abbreviated orchestration sample in this skill. The implementation may live directly in the target project and does not require `@designcodeio/threeui`.

## Technologies

- React typed variant host
- Thirteen authored Three.js r128-r160 field renderers
- Point clouds, ShaderMaterials, topology scenes, fluid fields, embers, and post-process bloom
- Lazy-loaded renderer-specific lifecycles and controls

## Verified source material

- `src/shaders/structure-flow/StructureFlowCollection.tsx`
- `Axiom-Structure-Flow (2).html — Three.js background`
- `src/shaders/structure-flow/structureFlowRenderer.ts`
- `src/shaders/structure-flow/StructureFlowBackground.tsx`
- `src/shaders/emerald-horizon/EmeraldHorizonBackground.tsx`
- `src/shaders/orbital-sphere/OrbitalSphereBackground.tsx`
- `src/shaders/dot-matrix/DotMatrixBackground.tsx`
- `src/shaders/neuform-isolated/NeuformIsolatedEffects.tsx`
- `src/shaders/neuform-isolated/NeuformCraftEffects.tsx`
- `src/shaders/neuform-isolated/NeuformBatchEffects.tsx`

Source revision: `SHA-256 40eb5bac81e3`

## Implementation steps

1. Open every verified source file listed above and identify the renderer, host lifecycle, styles, and assets before editing.
2. Use StructureFlowCollection as the family entry point and select the exact authored renderer with the variant prop.
3. Keep Structure Flow, Emerald Horizon, Orbital Sphere, Dot Matrix, Expanse Field, Logic Core, Dimensional Field, Data Field, Topology Field, Nebula, Fluid Field, Ember Storm, and Flux Vortex as independent scenes rather than blending them into one renderer.
4. Preserve the source-exact Three.js revision, geometry, shaders, camera, palette, motion, and pointer behavior for every variant.
5. Expose each renderer's own controls at the variant boundary and lazy-load only the selected implementation.
6. Retain every source renderer's resize, visibility, animation-frame, context, and disposal lifecycle.
7. Give the local component a sized, overflow-controlled parent and verify desktop, mobile, reduced-motion, and context-loss behavior.

Asset handling: This effect has no required external assets.

## Local component example

Import the copied local component rather than a package entrypoint:

```tsx
import { StructureFlowCollection } from "./effects/structure-flow/StructureFlowCollection";
import "./effects/structure-flow/styles.css";

export function Scene() {
  return <div className="effect-frame"><StructureFlowCollection variant="emerald-horizon" /></div>;
}
```

## Core renderer pattern

This excerpt documents orchestration only. Copy the exact shader, geometry, pass, and interaction code from the verified source files.

```tsx
<StructureFlowCollection variant="flux-vortex" speed={1} density={1} />
```

## Behavior contract

- Runtime: Three.js r128–r160
- Passes: 1–2 Three.js scene, point-cloud, or ShaderMaterial passes
- Interaction: Variant-specific pointer, motion, geometry, opacity, mask, and palette controls
- Assets: No external assets
- **renderer** (variant): Three.js r128–r160
- **variants** (fixed): 13 field studies
- **controls** (adaptive): Renderer-specific
- **assets** (fixed): None

## Verification

1. Compare the rendered composition, animation timing, pointer behavior, and state transitions with the source implementation.
2. Exercise resize, high-DPI, mobile/coarse-pointer, reduced-motion, tab visibility, and WebGL context-loss paths where applicable.
3. Confirm every animation frame, observer, listener, geometry, buffer, texture, framebuffer, material, and renderer is released on teardown.
4. Check the browser console and confirm the effect renders at native-or-better backing resolution.

## Guardrails

- Do not substitute a visually similar package, demo, shader, or runtime.
- Do not approximate, reconstruct, or simplify the authored GLSL, render passes, geometry, interaction state, or assets.
- Keep exact source and asset hashes under regression tests when the source project provides them.
- Adapt only the surrounding host boundary needed by the target project; keep renderer behavior intact.
