# Bugs — 열린 결함과 검증 상태

2026-09-14 Astra 재현 기록을 이관했다. 코드 수정 중이라는 사실만으로 resolved로 바꾸지 않는다. 재현·수정·회귀 검증·검토가 확인될 때 닫는다.

2026-09-14(같은 날, 후속): Claude Code가 MAS-001~004를 코드로 수정하고 회귀 테스트를 추가·통과시켰다(`npm test` 142 pass). 상세는 [PHASE2_FIX_REPORT](Sessions/Phase-02-Fixes.md#fix-report). **Astra 재검토는 아직 없다** -- 아래 상태는 "fixed"이지 "closed"가 아니다. 이 표를 작성한 Claude Code 자신의 회귀 테스트 통과만으로 완료 판정을 내리지 않는다.

| ID | 우선순위 | 문제 | 상태 | 완료 조건 |
|---|---|---|---|---|
| MAS-001 | P1 | 질문 실패 후 판정/100점 발급 가능 | **fixed / Astra 재검토 대기** | 실패 뒤 후속 호출 0회, score=null, CLI 실패 코드 — [회귀 테스트](../../tests/evaluation/pipelineStageFailure.test.ts) 3개 통과, CLI 실측 exit 0/0/1 |
| MAS-002 | P1 | provider에 입력/상세 루브릭 전달 누락 | **fixed / Astra 재검토 대기** | 기록형 provider의 실제 요청·루브릭·timeout 검증 — [회귀 테스트](../../tests/evaluation/providerRequestWiring.test.ts) 5개 통과(끝나지 않는 호출 42ms 강제 종료 실측 포함) |
| MAS-003 | P1 | 발췌 로그 원문이 모델 입력에서 사라짐 | **fixed / Astra 재검토 대기** | 제한·마스킹된 원문 전달, 보존/공개 경계 확인 — [회귀 테스트](../../tests/evaluation/excerptContentPropagation.test.ts) 3개 통과. 부수 발견: subvariant-b evidence_map.json 위치 오류도 함께 수정 |
| MAS-004 | P1 | assessment 소속/입력 형태 검증 부족 | **fixed / Astra 재검토 대기** | 다른 평가 근거 거부, null 안전 실패, 참조 검증 — [회귀 테스트](../../tests/evaluation/inputAssembly.test.ts) 11개 + questionGeneration/criterionJudgement/scoreCalculator 추가 테스트 통과 |

발견 근거: [Phase 2 Astra 검토](Sessions/Phase-02-Offline-Evaluation.md#astra-review). 해결 기록: [Phase 2 Fixes](Sessions/Phase-02-Fixes.md).

## 알려진 미검증 항목

실제 모델 판정 타당성, 인젝션 방어, 실측 토큰/비용, 사람 fixture 검토, 운영 권한·배포는 미검증이다. 미검증을 자동으로 제품 버그나 검증 완료로 취급하지 않는다. 과정 자료 표시·fixture 기대·반복 실험 해석의 보정도 현재 수정 지시 범위에 포함돼 있다.

2026-09-14: 수정 완료 보고를 수신했고 Astra가 typecheck·142개 테스트 통과를 재확인했다. 상세 코드 재검토 전이므로 resolved로 닫지 않았다.
