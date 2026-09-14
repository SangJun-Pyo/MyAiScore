# MyAiScore — Claude Code 작업 지침

## 위치와 정본

프로젝트 루트는 C:/Users/sangj/MyAiScore다. _archive와 v0.2 ZIP은 과거 자료이며 현재 요구사항이나 작업 지시가 아니다. 새 코드와 문서는 루트 안에 작성한다.

읽는 순서: [마스터 플랜](docs/00_MASTER_PLAN.md) → 관련 도메인 정본 → [DECISIONS](docs/Development/DECISIONS.md) → [IMPLEMENTATION_TASKS](docs/Development/IMPLEMENTATION_TASKS.md).

합의된 범위·원칙 안에서 도메인 문서가 필드와 상태를 구체화한다. 원칙에 어긋난 상세값을 자동 우선 적용하지 말고 불일치를 보고한다.

## 현재 지시

2026-09-14 Phase 2 오프라인 구현 보고 이후 현재 작업은 [CLAUDE_PHASE2_FIX_PROMPT](CLAUDE_PHASE2_FIX_PROMPT.md)다. [Astra 코드 검토](docs/Development/ASTRA_PHASE2_REVIEW.md)의 R1~R4와 관련 계약을 수정한다. 아래 문단은 수정 대상인 원래 구현 범위이며 완료 승인 기록이 아니다.

[CLAUDE_PHASE2_OFFLINE_PROMPT](CLAUDE_PHASE2_OFFLINE_PROMPT.md)에 따라 fixture 보정, Task 2a 오프라인 평가 구조와 Task 3 점수 엔진을 구현한다. 설계 판단은 [ASTRA_PHASE1_REVIEW](docs/Development/ASTRA_PHASE1_REVIEW.md)를 따른다. 서비스 LLM API·예산은 사용자 답변 '미정'이며 실제 모델 실험(Task 2b)·DB·웹 UI·배포는 이번 범위에 없다. Phase 1 지시를 다시 실행하지 않는다.

## 공통 원칙

- 공개 저장소 1개, 협업 사례 1개. 전체 범위는 마스터와 MVP_SCOPE를 따른다.
- 점수 공식은 SCORING_RUBRIC, 데이터는 EVIDENCE_SCHEMA, 상태·접근은 API_DATA_CONTRACTS가 정본이다.
- 미확인=null, 다섯 축 모두 판정 가능할 때만 총점. 공통 코드 캐시와 개인 평가를 분리한다.
- 제출 저장소의 install/build/test/hooks/MCP는 실행하지 않는다. 자체 MyAiScore 테스트는 실행한다.
- 개발용 Claude Code와 서비스 LLM API는 별개다. 현재 작업에 승인되지 않은 비용·배포를 만들지 않는다.
- 작은 구현 선택은 근거를 남기고 진행한다. 하지 않은 실행·테스트·사람 검토는 사실처럼 보고하지 않는다.
- 공통 계약 변경이 필요하면 이유·대안을 보고하고 관련 문서를 함께 갱신한다. 합의된 MVP 범위를 임의 확장하지 않는다.
- 역할·작업 분리는 [AGENTS](AGENTS.md)와 [AGENT_WORKFLOW](docs/Development/AGENT_WORKFLOW.md)를 따른다.
