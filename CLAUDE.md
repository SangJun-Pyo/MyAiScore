# MyAiScore — Claude Code 작업 지침

프로젝트 루트: C:/Users/sangj/MyAiScore.

## 시작과 인계

[AGENTS](AGENTS.md), [마스터](docs/00_MASTER_PLAN.md), [ROADMAP](docs/Development/ROADMAP.md)의 현재 작업, 해당 [세션](docs/Development/Sessions/README.md), [BUGS](docs/Development/BUGS.md), 관련 정본을 읽고 Git 상태와 실제 코드를 확인한다. 현재 작업은 이 파일에 복제하지 않는다.

## 구현 원칙

- 단일 공개 저장소·협업 사례, 미확인=null, 5축 모두 판정 가능할 때만 총점.
- SCORING_RUBRIC/EVIDENCE_SCHEMA/API_DATA_CONTRACTS가 각 공식·데이터·상태의 정본이다.
- 제출 저장소의 install/build/test/hooks/MCP를 실행하지 않는다. MyAiScore 자체 테스트는 실행한다.
- 개발 도구 구독과 서비스 LLM API는 별개다. 승인된 작업 범위에서 진행하고 미승인 비용·배포를 만들지 않는다.
- 작은 구현 선택은 근거를 남기고 진행한다. 미실행·미검증·사람 검토를 꾸미지 않는다.

## 문서와 형상 관리

[AGENT_WORKFLOW](docs/Development/AGENT_WORKFLOW.md)에 따라 구현 → 테스트 → 해당 Phase 세션 기록 → CHANGELOG/ROADMAP/BUGS/DECISIONS 동기화 → 본인 변경만 Git commit한다.

보고서·검토서는 Sessions의 해당 Phase에 작성한다. Development 최상위에 PHASE*_REPORT.md 같은 새 파일을 만들지 않는다. 코드 작성만 끝내고 세션 기록을 생략하지 않는다. 과거 입력 프롬프트의 출력 경로와 충돌하면 현재 ROADMAP의 세션 경로로 인계한다. 구현 범위 자체는 바꾸지 않는다.
