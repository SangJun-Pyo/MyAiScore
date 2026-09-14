# Bugs — 결함과 검증 상태

공용 checkout에만 남아 있던 `f4f7012`의 MAS-006 원래 경로 재검토는 [Phase 3](Sessions/Phase-03-Local-Collection-PoC.md)에 통합했다. 이후 파서/metadata 보정까지 포함한 아래 최신 상태를 유지한다.

최신 확인: 2026-09-14 Phase 5 통합. 과거 보고의 날짜/검토 대기 문구는 이력으로 보존한다. 아래 종료는 재현한 코드 경계에 한정하며 실제 모델 정확성·운영 인증을 의미하지 않는다.

| ID | 우선순위 | 문제 | 상태 / 근거 |
|---|---|---|---|
| MAS-001 | P1 | 질문 실패 뒤 점수 발급 | closed — 기존 오프라인 회귀 유지 |
| MAS-002 | P1 | provider 요청/실패 경계 | closed — sync/async 예외·timeout·늦은 완료·오류 코드 회귀 |
| MAS-003 | P1 | 발췌 원문 전달 누락 | closed — 임시 context 전달, 결과 DTO와 분리 |
| MAS-004 | P1 | 평가/질문/답변 참조 | closed — 고아/빈 답변·grounding·소속 거부 |
| MAS-005 | P2 | 실제 입력 hash 불일치 | closed — 단계별 실제 payload hash + adapter wire hash·모델 ID |
| MAS-006 | P1 | 로컬 JSON/진단 메시지 원문 노출 | closed — 공개 뷰와 parser 진단/metadata 제한, synthetic CLI 재현·회귀 확인 |
| MAS-007 | P1 | fixture/테스트 편중으로 제품 소스 선정 누락 | closed — 파일군 균형 선정·같은 실제 SHA 재현·독립 검토. [#14](https://github.com/SangJun-Pyo/MyAiScore/issues/14), [Phase 5](Sessions/Phase-05-Profile-And-Live-Pilot.md). 새 정책 전체 API 재수집은 미실행 |
| MAS-008 | P2 | 분석 자료 재클릭 시 결과 소실 및 query 상태 불일치 | closed — 같은 mode 유지·search params 연동·실제 브라우저 회귀. [Phase 5](Sessions/Phase-05-Profile-And-Live-Pilot.md) |

수정·독립 검토는 [Phase 2](Sessions/Phase-02-Fixes.md), [Phase 3](Sessions/Phase-03-Local-Collection-PoC.md), [Phase 4](Sessions/Phase-04-Web-MVP.md)에 있다. 추가 검토에서 분석 중 삭제·인증 create idempotency·provider 재시도 코드·질문/판정 모델 변경 경계도 보정했다.

## 열린 출시 조건

[GitHub #4](https://github.com/SangJun-Pyo/MyAiScore/issues/4)에서 추적한다.

- 실제 모델 판정 타당성, 반복성, 인젝션 방어, 토큰/비용 실측.
- fixture 사람 검토. AI 테스트 통과로 humanReviewed를 바꾸지 않는다.
- 실제 Supabase 인스턴스에서 migration/RLS/CAS 검증, 배포·운영 검증.
- 실제 사용자 지정 Claude Code 세션 호환성.
- 마스킹은 휴리스틱이며 모든 개인정보 탐지 보장은 없다.
- 단일 JSON state 저장은 소규모 MVP용. 대량 데이터/트래픽 전 저장 구조 개선 필요.
