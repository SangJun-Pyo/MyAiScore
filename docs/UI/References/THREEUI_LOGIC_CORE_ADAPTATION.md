# MyAiScore 적용 프롬프트 — ThreeUI Logic Core

2026-09-15 사용자 요청에 따른 Astra의 프로젝트 적용 지시다. [외부 원문](THREEUI_STRUCTURE_FLOW_REFERENCE.md)의 13개 variant 전체/원본 런타임 유지 지시와 구분한다. 사용자는 무료 스타일을 우리 제품에 맞춰 적용하도록 요청했다.

## 선택 근거와 원본

Community 표시의 [Logic Core](https://threeui.com/three-js/structure-flow/logic-core)를 선택한다. 등각 플랫폼 위 중앙 코어와 주변 노드는 프로젝트와 협업 근거를 연결하는 MyAiScore의 시각적 설명에 맞는다. 이는 점수나 실제 처리 진행의 시각화가 아니다.

공개 MIT 소스 기준: `MengTo/threeui@68802d5428071ada5c20db8094b1649e6bb770ed`. 라이선스는 [보존한 고지](../../../public/third-party/threeui/LICENSE.txt)를 포함한다. 원본의 핵심 렌더러는 [platform-core.html](https://github.com/MengTo/threeui/blob/68802d5428071ada5c20db8094b1649e6bb770ed/src/shaders/neuform-isolated/sources/platform-core.html)의 `initThreeJS`다. `StructureFlowCollection.tsx` → `NeuformIsolatedEffects.tsx` → 해당 HTML의 경로를 직접 확인했다. 원본 문서의 묶음 해시를 단일 HTML 해시로 표기하지 않는다.

## 적용할 프롬프트

현재 MyAiScore의 HeroScene을 ThreeUI Community Logic Core 원본의 3D 부분을 기반으로 바꿔 주세요. 등각 카메라, 어두운 플랫폼, 빛나는 세로 코어, 12개 궤도 큐브, 느린 드리프트·맥박·공전 구성에서 출발합니다. 스크린샷만 보고 비슷한 도형을 새로 만드는 방식으로 대체하지 말고 확인한 원본의 기하와 움직임을 포팅합니다.

MyAiScore의 보라·시안 색상을 적용하고 12개 큐브 중 5개를 A~E 선택과 연결합니다. 선택 변경은 기존 씬에 반영하고 재생성하지 않습니다. 기존 프레임 제한, 모션 감소, 화면 밖/탭 비활성 일시 정지, context loss 정적 대체, resize와 자원 해제를 유지합니다. 정적 SVG도 같은 등각 플랫폼·코어·5축을 표현하도록 바꿉니다.

설치된 Three.js 0.186을 계속 사용합니다. 원본 HTML의 CDN 스크립트, Tailwind/아이콘 런타임, 외부 폰트·인물 이미지, iframe, 13개 variant 전체를 도입하지 않습니다. 이들은 선택한 3D 장면에 필요하지 않습니다. 변경된 런타임·팔레트·선택 동작·타이밍 보정은 원본과 동일하다고 주장하지 말고 수정 목록에 남깁니다. 원본 저작권과 MIT 고지는 보존합니다.

홈의 타이포그래피·카드·메뉴 및 프로필/평가/API 계약은 유지합니다. 필요한 히어로 여백과 장면 설명만 조정합니다. 실제 점수나 모델 실행을 추가하지 않습니다. 브라우저에서 데스크톱/모바일, 모션 감소, 5축 변경과 동일 canvas 유지, WebGL 실패, 접근 가능한 평가 동선을 검증합니다.
