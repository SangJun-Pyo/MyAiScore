# Agent Workflow v0.3.1

정본 허브: [`../00_MASTER_PLAN.md`](../00_MASTER_PLAN.md). 최소 공유 규칙은 루트 [`../../AGENTS.md`](../../AGENTS.md). 이 문서는 그 규칙의 상세 계약이다.

## 1. 역할

| 역할 | 담당 |
|---|---|
| **상준님** | 사용자 문제, 제품 방향, 우선순위, 결과 수용 여부 판단 |
| **Astra** | 제품 범위·평가 기준·설계 판단, 작업 분해, 결과와 코드 검토, 통합 판단 |
| **Claude Code** | 구현 가능한 상세화와 작업별 구현. 설계 문제가 있으면 근거와 대안을 제안 |

## 2. 공통 계약 우선

구현을 시작하기 전에 아래 공통 계약을 먼저 정리하고, 이후 작업은 이 계약을 기준으로 분리한다.

1. [`../Assessment/EVIDENCE_SCHEMA.md`](../Assessment/EVIDENCE_SCHEMA.md) — 데이터 필드 정본
2. [`../Architecture/API_DATA_CONTRACTS.md`](../Architecture/API_DATA_CONTRACTS.md) — 요청/응답/상태 정본
3. [`../Assessment/SCORING_RUBRIC.md`](../Assessment/SCORING_RUBRIC.md) — 계산 공식 정본

이 세 문서를 여러 에이전트가 **동시에 임의 수정하지 않는다.** 변경이 필요하면 Astra에게 먼저 제안하고, 합의 후 한 명이 반영한다.

## 3. 작업 분리 (제안 구성)

공통 계약 확정 후 다음처럼 시작한다.

- **Claude Code A — 수집·평가 처리**: [`../Architecture/GITHUB_INGESTION.md`](../Architecture/GITHUB_INGESTION.md), 축 판정(Criterion Evaluator), Scoring/Confidence Engine, Improvement Task Builder.
- **Claude Code B — 사용자 화면**: [`../UI/USER_FLOW.md`](../UI/USER_FLOW.md) 구현, API 호출 클라이언트, 진행/상태 UI, 결과·개선 작업서 화면.

독립적으로 진행 가능한 작업은 별도 브랜치/worktree와 파일 담당 범위를 둔다(예: A는 `src/server/**`와 `src/app/api/**`, B는 API 폴더를 제외한 화면과 `src/components/**`). 두 작업 모두 공통 계약(2절)의 타입/스키마를 import해서 쓰고, 계약 자체를 각자 임의로 바꾸지 않는다.

## 4. 작업 지시 형식

각 작업 지시는 아래 항목을 모두 포함한다. 예시는 [`IMPLEMENTATION_TASKS.md`](IMPLEMENTATION_TASKS.md).

1. **목표** — 이 작업이 끝나면 무엇이 가능해지는가
2. **읽을 문서** — 선행 정본 목록
3. **선행 작업** — 이 작업 전에 끝나 있어야 하는 것
4. **입출력 계약** — 정확한 함수 시그니처/API 계약/데이터 형태
5. **수정 범위** — 건드릴 파일/디렉터리 범위(다른 담당자 영역 침범 금지)
6. **완료 조건** — 관찰 가능한 통과 기준
7. **검증 방법** — 어떻게 확인하는가(수동 테스트, 스크립트, 사람 검토)
8. **제출할 것** — 변경 내역, 결과(로그/스크린샷/JSON), 미해결 사항

## 5. 검토·통합

- 작성자의 완료 보고만으로 통과시키지 않는다. Astra(또는 지정 검토자)가 실제 결과와 근거를 확인한 뒤 통합한다.
- 공통 계약을 건드린 변경은 반드시 검토를 거친 뒤 병합한다.
- 연결되지 않았거나 실행 중이 아닌 에이전트가 작업 중이라고 서술하지 않는다. 진행 상황은 실제 산출물(커밋, 파일, 로그)로만 보고한다.

## 6. 이견·변경 보고

- 합의된 MVP 범위([`../Product/MVP_SCOPE.md`](../Product/MVP_SCOPE.md))를 벗어나는 제안은 즉시 구현하지 않고 [`DECISIONS.md`](DECISIONS.md)에 근거·대안과 함께 기록한 뒤 상준님·Astra의 승인을 받는다.
- 승인 전까지는 현재 범위의 작업을 계속 진행한다(작업을 멈추고 기다리지 않는다).
- 설계 문제를 발견한 Claude Code는 조용히 우회하지 않고, 문제와 대안을 [`DECISIONS.md`](DECISIONS.md) 또는 작업 보고에 명시한다.

## 현재 첫 작업

[CLAUDE_PHASE1_PROMPT](../../CLAUDE_PHASE1_PROMPT.md)의 Task 0·1만 다음 지시 범위다. 아직 연결되지 않은 Claude 작업자를 실행 중으로 표시하지 않는다.
