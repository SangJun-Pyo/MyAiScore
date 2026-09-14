# AGENTS.md — MyAiScore 공유 협업 지침

이 파일은 상준님·Astra·Claude Code(및 향후 구현 에이전트)가 공유하는 **최소** 협업 지침이다. `CLAUDE.md`의 세부 작업 방식이나 `docs/00_MASTER_PLAN.md`의 정책 전체를 복제하지 않는다. 역할과 작업 분해 계약의 전체 설명은 [`docs/Development/AGENT_WORKFLOW.md`](docs/Development/AGENT_WORKFLOW.md)가 정본이다.

## 역할

- **상준님**: 사용자 문제, 제품 방향, 우선순위, 결과 수용 여부 판단.
- **Astra**: 제품 범위·평가 기준·설계 판단, 작업 분해, 결과와 코드 검토, 통합 판단.
- **Claude Code**: 구현 가능한 상세화와 작업별 구현. 설계 문제가 있으면 근거와 대안을 제안한다.

## 정본 읽기 순서

`docs/00_MASTER_PLAN.md` → 관련 도메인 문서 → `docs/Development/DECISIONS.md` → `docs/Development/IMPLEMENTATION_TASKS.md`

## 공유 규칙

1. 공통 계약(`docs/Assessment/EVIDENCE_SCHEMA.md`, `docs/Architecture/API_DATA_CONTRACTS.md`)은 여러 에이전트가 동시에 임의 수정하지 않는다. 변경이 필요하면 먼저 Astra에게 제안하고 합의 후 반영한다.
2. 독립적으로 진행 가능한 작업은 별도 브랜치/worktree와 파일 담당 범위를 정해 진행한다. 예: 수집·평가 처리(Claude Code A)와 사용자 화면(Claude Code B)을 공통 스키마 확정 후 분리.
3. 각 작업 지시는 목표, 읽을 문서, 선행 작업, 입출력 계약, 수정 범위, 완료 조건, 검증 방법, 제출할 변경·결과·미해결 사항을 포함한다. 형식은 [`docs/Development/IMPLEMENTATION_TASKS.md`](docs/Development/IMPLEMENTATION_TASKS.md) 예시를 따른다.
4. 작성자의 완료 보고만으로 통과시키지 않는다. 검토자(Astra 또는 지정된 검토자)가 결과와 근거를 확인한 뒤 통합한다.
5. 연결되지 않았거나 실행 중이 아닌 에이전트가 작업 중이라고 서술하지 않는다.
6. 합의된 MVP 범위를 벗어나는 변경은 이견/변경 제안으로 기록하고 Astra·상준님의 승인 후에만 반영한다. 승인 전에는 현재 범위의 작업을 계속한다.

## 이견·변경 보고

이견이나 범위 변경이 필요하면 `docs/Development/DECISIONS.md`에 근거·대안과 함께 기록하고, 합의된 결정과 미검증 항목을 구분해 남긴다.

## 현재 단계

Phase 2 오프라인 보고 후 [Astra 코드 검토](docs/Development/ASTRA_PHASE2_REVIEW.md)에서 결함을 재현했다. 현재 지시는 [CLAUDE_PHASE2_FIX_PROMPT](CLAUDE_PHASE2_FIX_PROMPT.md)이며 수정 후 재검토한다. 실제 API·예산 미정은 유지한다.

2026-09-14 [Astra 후속 검토](docs/Development/ASTRA_PHASE1_REVIEW.md)에 따라 [CLAUDE_PHASE2_OFFLINE_PROMPT](CLAUDE_PHASE2_OFFLINE_PROMPT.md)의 fixture 보정·Task 2a·Task 3을 진행한다. 실제 LLM API·실험 예산은 미정이며 Task 2b는 후속이다. _archive와 이전 ZIP은 과거 자료이며 현재 작업 명령이 아니다.
