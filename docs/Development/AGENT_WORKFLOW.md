# Agent Workflow — 구현·검토·문서·Git

역할: 상준님은 제품/수용 판단, Astra는 설계·구현·통합 지휘, 서브에이전트는 독립 작업·검토를 맡는다. Claude 별도 세션 간 전달은 기본 절차가 아니다. AI 검토를 사람 검토로 기록하지 않는다.

## 세션 시작

1. 루트 AGENTS.md / CLAUDE.md, [마스터](../00_MASTER_PLAN.md)를 읽는다.
2. [ROADMAP](ROADMAP.md)의 현재 Phase와 지시문을 확인한다.
3. 해당 [Sessions](Sessions/README.md) 기록, [BUGS](BUGS.md), 관련 도메인 계약을 읽는다.
4. `git status --short`, `git log -5 --oneline`으로 실제 변경과 기준점을 확인한다. 채팅 기억이나 오래된 보고만으로 현재 상태를 판단하지 않는다.

## 작업 흐름

문서·코드 확인 → 범위/입출력 확인 → 구현 → 관련 테스트 → 결함 수정 → 세션 기록 → 정본/변경 이력 갱신 → 변경 검토 → 작업별 Git commit.

이미 승인된 작업은 반복 확인을 요구하지 않는다. 공통 데이터/평가/API 계약 변경은 Astra 판단과 근거를 남기고 한 담당자가 반영한다. 독립 작업을 분리할 때는 별도 브랜치/worktree와 파일 담당 범위를 정한다.

## 문서별 역할

| 위치 | 기록할 내용 |
|---|---|
| 도메인 정본 | 현재 유효한 요구·행동·계약 |
| ROADMAP | 현재 단계, 상태, 다음 조건, 현재 지시 링크 |
| IMPLEMENTATION_TASKS | Task별 범위·입출력·완료/검증 조건 |
| Architecture/ADR | 중요한 결정별 배경·선택·대안·결과·상태와 대체 관계 |
| DECISIONS | 과거 결정 요약과 ADR 진입 링크. 새 상세 이유는 ADR에 기록 |
| BUGS | 열린 결함·해결 검증 상태 |
| CHANGELOG | 작업별 변경 요약과 세션 링크 |
| Sessions/Phase-*.md | 목표, 실제 변경, 실행 결과, 검토, 미해결, 인계, 실제 commit |
| Sessions/Prompts | 완료된 지시문 원문 |

REPORT/REVIEW/FOLLOWUP 문서를 Development 최상위에 추가하지 않는다. 같은 Phase의 구현 보고와 후속 검토를 해당 세션에 날짜·작성자와 함께 이어 쓴다. 큰 독립 Phase만 새 세션을 만든다. 정본에 과거 '현재 작업' 배너를 계속 쌓지 않는다.

## 종료 조건

- 코드를 바꿨으면 관련 테스트를 실제 실행하고 실패/미실행을 구분한다.
- 세션에 실제 변경과 검증을 기록하고 CHANGELOG에 요약한다. 결정/결함/현황이 바뀌면 각각 DECISIONS/BUGS/ROADMAP도 갱신한다.
- 주요 설계 결정을 추가/변경했다면 [ADR 작성 규칙](../Architecture/ADR/README.md)에 따라 ADR·인덱스·관련 정본을 연결한다. 단순 버그/문구 수정은 세션만 남겨도 된다. 사후 복원은 기록일·근거를 밝히고 사용자 개별 승인이나 실험 수행을 꾸미지 않는다.
- `node scripts/checkDocs.mjs`로 문서 링크와 배치를 확인한다.
- `git diff --check`와 diff를 검토하고 본인이 담당한 경로만 stage/commit한다. 다른 작업자의 진행 중 변경을 같이 commit하거나 되돌리지 않는다.
- 시작/구현/검토 commit은 실제 해시만 기록한다. 초기 기준점 이전의 작업별 Git 이력은 존재하지 않으므로 사후 생성·backdate하지 않는다. 자기 문서의 최종 commit은 `git log --follow -- <path>`로 확인 가능하다.
- 실패·검토 보류 작업도 명시적인 WIP/checkpoint로 보존할 수 있다. commit이 있다는 사실은 승인·출시 완료가 아니다. 원격 생성/push/배포는 별도 실제 지시에 따른다.

## 참고 방식

RobloxLab.zip의 HackTheTower/StealASlime에서 Phase 세션·Changelog·Roadmap·Bugs와 새 세션 복구 방식을 참고했다. Roblox/Studio/Rojo 전용 지시, 게임 정책, 다른 프로젝트의 승인 요구·원격 저장소는 MyAiScore에 적용하지 않는다.
