# ADR-0009 — ThreeUI Community Logic Core의 로컬 포팅

- 상태: Accepted
- 기록일: 2026-09-15
- 결정 주체: 사용자 무료 ThreeUI 스타일 요청에 따른 Astra 선택, [#16](https://github.com/SangJun-Pyo/MyAiScore/issues/16)
- 기록 성격: 구현 착수 시 기록
- 대체 관계: [ADR-0006](0006-decorative-threejs.md)의 런타임·수명 원칙을 유지하고 히어로 장면의 소스만 갱신한다.

## 배경과 결정

사용자가 열어 둔 Chrome ThreeUI 카탈로그에서 Community Logic Core와 공개 Skill.md를 확인했다. 공개 저장소의 MIT LICENSE를 읽고 장면이 연결되는 실제 HTML 소스를 고정 commit으로 확보했다. 가격이 무료라는 표기만으로 이용 허가를 추정하지 않았다.

중앙 코어·등각 플랫폼·궤도 큐브 구성을 기존 HeroScene에 소스 기반으로 포팅한다. MIT 고지와 참조 프롬프트를 보존한다. 원본 r128–r160 계열의 CDN을 로드하는 대신 설치된 Three.js 0.186을 사용하고 색상/5축 선택/시간 보정/정적 대체를 MyAiScore에 맞게 바꾼다. 원본과 픽셀·바이트가 동일한 복제라고 주장하지 않는다.

원본 HTML 전체나 iframe을 삽입하면 무관한 UI와 외부 스크립트/폰트/인물 이미지가 함께 실행되므로 선택한 3D 부분만 옮긴다. 전체 패키지 설치는 한 장면에 필요하지 않아 선택하지 않았다. Pro 소스·계정·유료 기능은 사용하지 않는다.

## 결과와 검증

실제 장면의 출처와 변경 부분을 추적할 수 있고 기존 앱의 네트워크/평가 경계를 유지한다. 원본의 무작위 큐브와 프레임 종속 움직임을 그대로 가져오기보다 고정 배치·경과 시간 기반으로 보정할 수 있다. 이 차이는 적용 문서에 명시한다. 모션 감소/정적 대체·모바일·자원 해제 검증은 기존 기준을 따른다.

[원본 프롬프트](../../UI/References/THREEUI_STRUCTURE_FLOW_REFERENCE.md), [적용 프롬프트·소스](../../UI/References/THREEUI_LOGIC_CORE_ADAPTATION.md), [Phase 5 후속 기록](../../Development/Sessions/Phase-05-Profile-And-Live-Pilot.md). 실제 검증 결과는 세션에서 구현 완료 후 추가한다.
