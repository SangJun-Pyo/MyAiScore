# Changelog

## Phase 1 — 2026-09-10 Task 0·1 구현·검증

CLAUDE_PHASE1_PROMPT.md 지시에 따라 실제 코드·fixture·테스트를 구현하고 검증했다(문서 작성이 아니라 실행 결과). 전체 내역과 측정값은 [PHASE1_REPORT](PHASE1_REPORT.md).

- Task 0: `fixtures/calibration/`에 CALIBRATION_PLAN.md의 8개 필수 사례(사례 8은 3개 하위 변형 포함, 총 10개 fixture)를 synthetic 저장소·협업 사례·`expected.json`·`provenance.json`으로 구현.
- Task 1: `src/server/ingestion/`에 URL 검증, GitHub REST API 어댑터(재시도·budget 포함), 파일 선정(제외/우선순위), 비밀 패턴 마스킹, `IngestionSnapshot` 생성까지 읽기 전용 수집 파이프라인 구현. `scripts/ingest.ts` CLI 제공.
- 검증: node:test 기반 오프라인 테스트 53개 전부 통과(URL 검증, 파일 선정, budget, 수집 파이프라인 엣지 케이스, fixture 구조 검증, Task 0↔Task 1 통합). `tsc --noEmit` 통과.
- Live smoke: `octocat/Hello-World`(공개, 소형)를 실제 GitHub API로 수집해 `complete` 상태와 full commit SHA를 확인. 존재하지 않는 저장소에 대한 404 실패 경로도 실제 네트워크로 확인.
- 계약 변경: `EVIDENCE_SCHEMA.md`의 `IngestionSnapshot`/`Evidence` 정의를 그대로 구현했고, scoring/MVP 원칙은 변경하지 않음. 구현 중 발견한 사소한 표현 차이(필드명 camelCase 매핑 등)는 PHASE1_REPORT.md에 기록.
- 수행하지 않음: LLM 평가(Task 2), 결정적 점수 엔진(Task 3), 개선 작업서 생성기(Task 4), API/DB(Task 5), 웹 UI(Task 6), 반복 실행 실험, 외부 사용자 실험, 사람에 의한 fixture 검토.

## v0.3.1 — 2026-09-10 Astra 문서 검토·보정

- 다섯 축 모두 판정 가능할 때만 총점 발급. 미확인=null, 부분 총점 폐기.
- 축별 4단계 행동 기준·반례와 점수 예시 재작성.
- 공개 코드 수집 캐시와 개인 평가·소유 권한 분리.
- 단계별 await 실행과 timeout·attempt·재시도·정본 상태 전이.
- 근거 변화와 행동 변화의 독립 필드, 모델/프롬프트/설정까지 비교 버전 반영.
- 데이터·API·UI·교정·작업 문서의 필드와 상태 일치 보정.
- Task 0·1용 CLAUDE_PHASE1_PROMPT 작성.
- 이전 풀린 폴더·루트 안내·완료된 프롬프트를 _archive로 이동. 영구 삭제는 자동 승인 검토의 정책 차단으로 수행하지 않음.
- 수정 전 루트 Markdown과 docs 전체를 _archive/v0.3.1의 ZIP으로 보존.

문서 검사 기록: [document-validation.json](../../_archive/v0.3.1/document-validation.json). 실제 검사 결과와 한계는 [ASTRA_REVIEW_BRIEF](ASTRA_REVIEW_BRIEF.md)에 기록한다.

이번 작업에서 앱/fixture/수집 코드 구현, 패키지 설치, GitHub 데이터 수집, 모델 API 호출, DB 연결, 배포, 외부 사용자 실험은 수행하지 않았다. 공식 기술 문서를 참고한 설계와 실제 런타임 검증을 구분한다.

## v0.3 — 2026-09-10 최초 문서 재작성 (과거 기록)

단일 프로젝트·과정 근거·맞춤 질문·개선 작업서 중심으로 기획을 재작성했다. 당시 완료 보고에는 교차검사 완료라고 되어 있었으나 Astra 검토에서 계약 모순이 확인돼 위 v0.3.1에서 수정했다. 당시 원문과 보고서는 수정 전 ZIP에 보존했다.

## v0.2 — 과거 참고

[원본 ZIP](../../MyAiScore_Planning_v0.2_markdown.zip)과 [이전 마스터](../../_archive/v0.2/00_MASTER_PLAN.original.md)를 보존한다. 현재 요구사항의 정본은 아니다.
