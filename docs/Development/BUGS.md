# Bugs — 열린 결함과 검증 상태

최신 상태: 2026-09-14 Astra 재검토. 코드와 회귀 테스트 확인 범위에서만 닫으며, 실제 모델/배포 검증과 구분한다. 발견·작성자 수정 보고·검토의 전체 이력은 해당 세션에 보존한다.

| ID | 우선순위 | 문제 | 상태 | 다음 완료 조건 |
|---|---|---|---|---|
| MAS-001 | P1 | 질문 실패 뒤 판정/점수 발급 | closed — 오프라인 재검토 확인 | 기존 회귀 유지 |
| MAS-002 | P1 | provider 요청/실패 경계 | reopened — 입력 배선 해결, 직접 예외 경로 남음 | sync throw/async reject를 단계 실패로 변환, 타이머 정리 |
| MAS-003 | P1 | 발췌 원문 전달 누락 | closed — 오프라인 재검토 확인 | 원문 전달/출력 분리 회귀 유지. 실제 모델/API 개인정보 검증은 후속 |
| MAS-004 | P1 | assessment/질문·답변 참조 경계 | reopened — 타 평가 차단 해결, 질문 생략 시 고아 답변 허용 | 질문 생략/빈 목록에서도 참조·빈 답변·grounding 검사 |
| MAS-005 | P2 | 실제 모델 payload와 반복 입력 hash 불일치 | open — Astra 재현 | 실제 payload에 대한 단계별 hash 및 고정 반복 입력 검증 |

근거와 재현: [Phase 2 Fixes Astra 재검토](Sessions/Phase-02-Fixes.md#astra-rereview-20260914). 현재 지시: [Phase 2 Fixes](../../CLAUDE_PHASE2_FIX_PROMPT.md).

## 미검증

실제 모델 판정 타당성/인젝션 방어, 토큰·비용, 사람 fixture 검토, 서비스 권한/배포는 미검증이다. 142개 오프라인 테스트 통과를 이러한 영역의 완료로 표현하지 않는다.
