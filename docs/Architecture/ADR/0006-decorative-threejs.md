# ADR-0006 — Three.js 장식을 지연 로딩하고 정적 대체를 제공한다

- 상태: Accepted
- 기록일: 2026-09-14 (Phase 4 사후 기록)
- 결정 주체: 사용자 디자인 요청에 따른 Astra 구현 선택
- 기준: PR #6 / `db0edd7`; 대체 관계: 없음

## 배경

사용자는 Linear/Tokscale 계열 다크 UI, glow, microinteraction과 3D 효과를 요청했다. 당시 설치한 React 19.3은 확인한 R3F 9.7 peer 범위 밖이었다. 평가 기능이 WebGL이나 지속적인 애니메이션에 의존해서는 안 된다.

## 결정

Three.js 0.186을 React client component에서 직접 지연 로딩한다. 히어로의 다섯 노드와 연결망은 장식이며 점수/진행 상태를 나타내지 않는다. 모션 감소·WebGL 실패/context loss에는 정적 SVG를 제공한다. 화면 밖/탭 비활성에서는 애니메이션을 멈추고 DPR을 제한하며 해제 시 자원을 정리한다. 입력·질문·결과 화면에는 일관된 다크 팔레트를 적용한다.

## 대안

- R3F를 강제 설치: 확인한 peer 범위 충돌을 숨기므로 배제했다.
- React 버전을 바꿔 R3F 사용: 가능하지만 장식 한 컴포넌트를 위해 기반 버전을 변경하지 않았다.
- CSS/SVG만 사용: 대체 화면에는 적합하지만 실제 3D 요청을 구현하기 위해 주 장면은 WebGL을 사용했다.

## 결과와 재검토 조건

React 선언형 3D 라이브러리 대신 renderer와 자원 수명 관리를 직접 담당한다. 외부 모델/이미지 에셋이나 다른 사이트 코드를 복제하지 않았다. 복잡한 씬이 추가되거나 의존성 호환 범위가 바뀌면 R3F 재도입과 성능 측정을 검토한다.

## 근거와 검증 상태

[HeroScene](../../../src/components/HeroScene.tsx), [잠금 파일](../../../package-lock.json), [화면 원칙](../../UI/USER_FLOW.md), [브라우저 검사](../../../tests/browser/experience.spec.ts), [캡처/검증](../../Development/Sessions/Phase-04-Web-MVP.md). Chromium WebGL 렌더링, 모바일/데스크톱 대체 경로 및 가로 폭을 확인했다. 모든 GPU/브라우저의 성능을 보장하는 검증은 아니다.
