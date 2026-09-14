# Roadmap — 현재 상태와 다음 작업

최종 확인: 2026-09-14. 현재 상태의 단일 안내 문서다. 구현 사실은 코드와 실행 기록, 제품 요구는 [마스터](../00_MASTER_PLAN.md)와 도메인 정본을 따른다.

## 현재 작업

두 작업이 **서로 독립적으로** 진행 중이다. 하나가 다른 하나를 막지 않는다.

**1) Phase 2 Fixes — Astra 재검토 완료. MAS-001/003은 해결 확인, MAS-002/004의 잔여 경로와 MAS-005를 보정한다.**

- 현재 잔여 수정 지시: [CLAUDE_PHASE2_FIX_PROMPT](../../CLAUDE_PHASE2_FIX_PROMPT.md)
- 기록할 세션: [Phase-02-Fixes](Sessions/Phase-02-Fixes.md)
- 수정할 결함: [BUGS](BUGS.md)의 MAS-002/004/005

**2) Phase 3 — 로컬 협업 기록 수집 PoC (제한적 실험, 정식 MVP 편입 아님).**

- `MVP_SCOPE.md`가 보류한 Local Evidence Mode를 이 PoC 1건에 한정해 재검토한다. 근거: [DECISIONS](DECISIONS.md) §7.
- 기록할 세션: [Phase-03-Local-Collection-PoC](Sessions/Phase-03-Local-Collection-PoC.md)
- 브랜치: `claude/local-collection-poc`(base: `codex/document-governance`). MAS-002/004/005와 코드 경로가 겹치지 않는다 — 이 PoC는 `assembleEvaluationInput`/provider/scoring을 호출하지 않고 Evidence 생성까지만 다룬다.
- 이 실험 완료가 Phase 2 Fixes를 대체하거나 MAS-002/004/005를 닫지 않는다.

서비스 LLM API/예산: 사용자 답변 **미정**. 실제 API 호출·DB·UI·배포는 두 작업 모두 이번 범위에 없다.

## 단계별 상태

| 단계 | 상태 | 근거 / 다음 조건 |
|---|---|---|
| Phase 0 기획 계약 | 채택, 타당성 교정 미완료 | [기록](Sessions/Phase-00-Planning.md) |
| Phase 1 Task 0·1 | 구현/기초 검증 기록 확보 | [기록](Sessions/Phase-01-Fixtures-And-Ingestion.md) |
| Phase 2 Task 2a·3 | 구현 보고 후 수용 보류 | [검토](Sessions/Phase-02-Offline-Evaluation.md#astra-review) |
| Phase 2 Fixes | 재검토 후 잔여 3항목 보정 | [현재 세션](Sessions/Phase-02-Fixes.md) |
| Phase 3 로컬 수집 PoC | MAS-006 구현자 수정 완료, 독립 재검토 대기 — 통과 후 실제 세션 실험. 정식 MVP 편입 아님, Task 순서에 삽입되지 않음 | [현재 세션](Sessions/Phase-03-Local-Collection-PoC.md) |
| Task 2b 실제 모델 실험 | 미착수 | 코드 검토 통과 + 모델/접속/예산 확정 |
| Task 4 개선 작업서·비교 | 미착수 | Task 2·3 검토 |
| Task 5 API·저장 | 미착수 | 데이터 계약·환경 확정 |
| Task 6 UI·사용자 확인·제출 | 미착수 | API 검증 및 실제 서비스 확인 |

## 일정과 범위

기존 계획에 기록된 대회 접수/제출 마감은 각각 09-18/09-20 23:59:59다. 실제 접수·제출 완료는 확인되지 않았다. 이번 문서 정리에서는 대회 일정을 재조회하지 않았다. 시간 계획을 완료 사실로 표시하지 않는다.

구현 순서·완료 조건은 [IMPLEMENTATION_TASKS](IMPLEMENTATION_TASKS.md)에 있다. 일정 압박으로 핵심 결함을 성공으로 바꾸지 않는다. 범위 축소가 필요하면 [MVP_SCOPE](../Product/MVP_SCOPE.md)를 기준으로 판단한다. 호스팅 Railway+Supabase는 이전 추천이며 계정/배포 확정 기록은 없다.
