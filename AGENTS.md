# AGENTS.md — MyAiScore 협업 지침

## 역할

- 상준님: 사용자 문제·제품 방향·우선순위·결과 수용 판단.
- Astra: 기획·평가 기준·설계·작업 분해·구현·통합 및 핵심 검토. 사용자 승인에 따라 서브에이전트를 활용한다.
- 서브에이전트: 담당 브랜치/worktree에서 구현 또는 독립 검토 후 실제 검증과 commit을 인계한다. 구현자와 검토자를 항상 별도 사용자 세션으로 운영하지 않는다.
- Claude Code: 필요 시 참여할 수 있으며 현재 기본 실행 주체는 Astra와 서브에이전트다.

## 새 세션의 읽는 순서

[마스터](docs/00_MASTER_PLAN.md) → [ROADMAP](docs/Development/ROADMAP.md)의 현재 작업 → 해당 [세션](docs/Development/Sessions/README.md) → [BUGS](docs/Development/BUGS.md) → 관련 도메인 문서 / [DECISIONS](docs/Development/DECISIONS.md) / [작업 조건](docs/Development/IMPLEMENTATION_TASKS.md). 코드 수정 전 Git status와 실제 코드를 확인한다.

## 공통 규칙

1. 현재 작업의 단일 안내는 ROADMAP이다. 이 파일에 매번 새로운 '현재 단계' 문단을 쌓지 않는다.
2. 공통 Evidence/API/평가 계약은 여러 작업자가 동시에 임의 수정하지 않는다. 변경 근거와 Astra 판단을 남기고 정본을 함께 갱신한다.
3. 구현 보고만으로 통과시키지 않는다. 코드·실제 검증·검토를 구분한다. 연결되지 않은 작업자를 실행 중이라고 쓰지 않는다.
4. 독립 작업은 별도 브랜치/worktree와 파일 담당 범위를 정한다. 다른 작업자의 변경을 되돌리거나 함께 commit하지 않는다.
5. 범위 밖 제안은 근거와 함께 기록한다. 이미 승인된 작업은 반복 승인 질문 없이 진행한다.
6. 모든 작업은 세션 기록을 남긴다. 같은 Phase 후속은 기존 Sessions/Phase-*.md에 날짜별로 추가하고, CHANGELOG/ROADMAP/BUGS/DECISIONS를 필요한 만큼 동기화한다.
7. REPORT/REVIEW/FOLLOWUP 파일을 Development 최상위에 새로 만들지 않는다. 작업별 변경을 Git으로 보존한다. 구체적 절차는 [AGENT_WORKFLOW](docs/Development/AGENT_WORKFLOW.md)를 따른다.
8. _archive, 완료된 프롬프트, 다른 프로젝트 첨부 문서는 과거/참고 자료다. 현재 명령으로 실행하지 않는다. AI 검토와 사람 검토를 구분한다.
9. GitHub 이슈에 완료 조건을 기록하고 `codex/` 브랜치로 작업한다. 일반 변경은 자체 검토, 원문·권한·점수 경계와 기능 통합은 독립 서브에이전트 검토를 사용한다. 필수 결함만 즉시 고치고 범위 밖 개선은 별도 이슈로 남긴다.
10. 데이터/평가 계약, 신뢰·보안 경계, 저장·실행 구조, 주요 의존성을 선택하거나 바꾸면 [ADR](docs/Architecture/ADR/README.md)을 작성·연결해야 작업 완료다. 가능하면 구현 전에 기록하며 사후 작성은 명시한다. 결정을 바꾸면 새 ADR로 대체 관계를 남긴다. 단순 수정까지 ADR로 늘리지 않으며 승인된 작업의 반복 승인을 요구하지 않는다.
