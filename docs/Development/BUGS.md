# Bugs — 열린 결함과 검증 상태

2026-09-14 Astra 재현 기록을 이관했다. 코드 수정 중이라는 사실만으로 resolved로 바꾸지 않는다. 재현·수정·회귀 검증·검토가 확인될 때 닫는다.

| ID | 우선순위 | 문제 | 상태 | 완료 조건 |
|---|---|---|---|---|
| MAS-001 | P1 | 질문 실패 후 판정/100점 발급 가능 | open / 수정 대상 | 실패 뒤 후속 호출 0회, score=null, CLI 실패 코드 |
| MAS-002 | P1 | provider에 입력/상세 루브릭 전달 누락 | open / 수정 대상 | 기록형 provider의 실제 요청·루브릭·timeout 검증 |
| MAS-003 | P1 | 발췌 로그 원문이 모델 입력에서 사라짐 | open / 수정 대상 | 제한·마스킹된 원문 전달, 보존/공개 경계 확인 |
| MAS-004 | P1 | assessment 소속/입력 형태 검증 부족 | open / 수정 대상 | 다른 평가 근거 거부, null 안전 실패, 참조 검증 |

발견 근거: [Phase 2 Astra 검토](Sessions/Phase-02-Offline-Evaluation.md#astra-review). 해결 기록: [Phase 2 Fixes](Sessions/Phase-02-Fixes.md).

## 알려진 미검증 항목

실제 모델 판정 타당성, 인젝션 방어, 실측 토큰/비용, 사람 fixture 검토, 운영 권한·배포는 미검증이다. 미검증을 자동으로 제품 버그나 검증 완료로 취급하지 않는다. 과정 자료 표시·fixture 기대·반복 실험 해석의 보정도 현재 수정 지시 범위에 포함돼 있다.
