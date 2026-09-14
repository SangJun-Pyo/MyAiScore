# ADR-0001 — 실제 모델 평가를 명시적으로 활성화한다

- 상태: Accepted
- 기록일: 2026-09-14 (Phase 4 사후 기록)
- 결정 주체: Astra, 사용자 위임에 따른 구현 선택. 실제 제공사·모델·예산은 사용자 미정 상태.
- 기준: PR #6 / `db0edd7`; 대체 관계: 없음

## 배경

실제 LLM API와 예산이 미정인 상태에서도 웹 흐름을 구현해야 했다. 모의 응답으로 흐름을 검증한 사실과 실제 모델의 판정 정확성을 구분해야 한다.

## 결정

provider 인터페이스 뒤에 Anthropic Messages adapter를 구현한다. 서버의 API 키, 정확한 모델 ID와 `MYAISCORE_ENABLE_LIVE=true`가 모두 있어야 실제 평가를 호출한다. 설정 오류나 실패를 mock 점수로 대체하지 않는다. 합성 예시는 별도 경로와 표시로 제공한다. 호출 시도 상한을 적용하되 달러 예산 보장으로 표현하지 않는다.

## 대안

- API 결정까지 웹 구현 중단: 입력·상태·근거 화면은 모델 선택과 독립적으로 구현할 수 있어 택하지 않았다.
- 설정이 없으면 mock으로 자동 전환: 실제 평가 성공과 예시를 혼동하게 하므로 배제했다.
- 다중 제공사 자동 선택: 가격·모델 교정이 미정인 MVP에서 비교 조건과 운영 복잡성을 늘리므로 보류했다. Anthropic을 타 제공사보다 정확하다고 검증한 것은 아니다.

## 결과와 재검토 조건

키 없이 제품 흐름을 살펴볼 수 있으나 실제 평가를 완료할 수는 없다. 다른 제공사가 필요하면 adapter와 모델 식별·비용/한계 기록을 추가한다. 실제 평가 품질·인젝션 방어·사람 fixture 검토는 출시 전 별도로 검증한다.

## 근거와 검증 상태

[adapter](../../../src/server/service/anthropicProvider.ts), [서비스](../../../src/server/service/assessment.ts), [API](../../../src/server/web/api.ts), [실행 설정](../../../.env.example), [검증 기록](../../Development/Sessions/Phase-04-Web-MVP.md). transport와 흐름은 synthetic 응답으로 검사했다. 실제 유료 호출과 판정 교정은 [#4](https://github.com/SangJun-Pyo/MyAiScore/issues/4)에 남아 있다.
