# MyAiScore — 제 AI 활용 점수는요?

실제 프로젝트와 AI 협업 근거로 이번 프로젝트의 활용 방식을 진단하고, 가장 중요한 다음 개선 행동을 제안한다.

## 현재 단계

기획 문서 v0.3.1 — Astra 검토 반영. Phase 1(Task 0 교정 fixture + Task 1 읽기 전용 GitHub 수집 PoC)과 Phase 2 오프라인 범위(fixture 보정 + Task 2a 오프라인 질문·판정 구조 + Task 3 결정적 점수 엔진)를 구현·검증했다. 실제 LLM 호출·DB·웹 UI·배포는 아직 없다. 상세 결과는 [PHASE1_REPORT.md](docs/Development/PHASE1_REPORT.md), [PHASE2_OFFLINE_REPORT.md](docs/Development/PHASE2_OFFLINE_REPORT.md) 참고.

**정본: [docs/00_MASTER_PLAN.md](docs/00_MASTER_PLAN.md)**. 루트의 이전 마스터 안내 파일은 정리했다.

## 실제로 실행해 확인한 명령

```bash
npm install
npm run typecheck                 # tsc --noEmit, 에러 없음 확인됨
npm test                          # node:test, 108개 테스트 모두 통과 확인됨
npm run ingest -- --repo https://github.com/octocat/Hello-World   # 실제 공개 저장소 live smoke, 성공 확인됨 (Phase 1)
npx tsx scripts/evaluateOffline.ts --case fixtures/calibration/cases/case-02-simple-tool-strong-verification \
  --mock-response fixtures/mock-responses/case-02-generic-valid.json \
  --answers fixtures/mock-responses/case-02-fixed-answers.json   # mode=mock, 실제 LLM 미호출 (Phase 2)
```

`evaluate:offline`은 `npm run`으로도 실행되지만, npm이 stdout 앞에 배너 줄을 붙이므로 "stdout=JSON 1개" 계약을 그대로 확인하려면 위처럼 `npx tsx`로 직접 실행한다(둘 다 산출물은 같다). 이 저장소는 아직 웹 앱이나 배포된 서비스가 아니다. 위 명령은 로컬 CLI/테스트 실행만 가능하다는 뜻이며, 서비스 배포를 의미하지 않는다.

## 읽는 순서

1. [마스터 플랜](docs/00_MASTER_PLAN.md)
2. [Astra 검토 결과](docs/Development/ASTRA_REVIEW_BRIEF.md), [결정 기록](docs/Development/DECISIONS.md)
3. [평가 기준](docs/Assessment/SCORING_RUBRIC.md), [데이터 계약](docs/Assessment/EVIDENCE_SCHEMA.md)
4. [수집 설계](docs/Architecture/GITHUB_INGESTION.md), [API 계약](docs/Architecture/API_DATA_CONTRACTS.md)
5. [작업 목록](docs/Development/IMPLEMENTATION_TASKS.md), [Claude 다음 작업 프롬프트](CLAUDE_PHASE1_PROMPT.md)

전체 문서 지도는 마스터 플랜에 있다. CLAUDE.md와 AGENTS.md는 협업 지침이며 제품 정책 전체를 복제하지 않는다.

## 이번 보정

- 5개 축 모두 판정 가능할 때만 총점 발급. 미확인은 null/보류.
- 개인 평가 캐시와 소유 권한 분리.
- 요청별 단계 실행 및 중단·재시도 계약.
- 축별 4단계 기준·반례.
- 새 근거와 실제 행동 변화를 분리한 비교.

## 원본 보관

- [v0.2 전체 ZIP](MyAiScore_Planning_v0.2_markdown.zip)
- [v0.2 마스터 원문](_archive/v0.2/00_MASTER_PLAN.original.md)
- 이전 폴더·완료된 지시문·루트 안내는 _archive에 보관했다. 현재 요구사항이 아니다.
- 수정 전 v0.3 전체 문서 ZIP은 _archive/v0.3.1 안에 있다.

아직 npm 실행 명령·서비스 주소·테스트 통과를 제품 상태로 제시하지 않는다. 구현 후 확인된 명령과 결과만 갱신한다.
