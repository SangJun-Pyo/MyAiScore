# Changelog

## 2026-09-14 — Phase 2 Fixes 구현 보고와 실행 확인

- Claude의 R1~R4 수정 보고를 해당 Phase 세션에 편입했다. Astra가 typecheck와 142개 테스트 통과를 재확인했다.
- 상세 코드 검토는 대기 상태이며 BUGS를 review_required로 갱신했다. 수정 코드는 문서 정리와 별도 checkpoint로 보존한다.
- 상세: [Phase 2 Fixes](Sessions/Phase-02-Fixes.md#fix-report).


## 2026-09-14 — 문서 운영·Git 정리

- RobloxLab의 Phase 세션/Changelog/Roadmap/Bugs 구조를 참고해 기존 보고·검토 6개를 Phase 세션 3개로 통합하고 과거 지시문을 Prompts에 이동.
- 현재 상태는 ROADMAP으로 통일, 열린 결함 MAS-001~004를 BUGS에 등록, 세션 기록·변경 요약·본인 변경만 Git commit하는 규칙 반영.
- 초기 Git 기준점을 생성했다. 과거 작업별 commit 이력은 존재하지 않으며 복원하지 않았다. 이후 사용자 요청으로 GitHub main에 기준점과 정리 commit을 업로드했다. 배포는 하지 않았다.
- 상세: [문서·Git 정리 세션](Sessions/Session-2026-09-14-Documentation-And-Git.md).

## 2026-09-14 — Phase 2 오프라인 구현과 검토 (사후 요약)

- Claude가 fixture 연결·질문/판정 검증기·계산/Confidence·mock CLI를 구현했다. 당시 108개 테스트 통과를 보고했고 Astra도 확인했다.
- Astra 추가 검사에서 MAS-001~004를 발견해 최종 수용을 보류했다. 실제 모델 검증은 미수행.
- 상세: [Phase 2](Sessions/Phase-02-Offline-Evaluation.md). 후속: [Phase 2 Fixes](Sessions/Phase-02-Fixes.md).

## 2026-09-14 — Phase 1 후속 검토 (사후 요약)

- smoke:live 명령 수정, API 표기/fixture 기대/인젝션 실험/인간 검토 표기 점검. Claude 제안 일부를 Astra가 보정했다.
- 상세: [Phase 1](Sessions/Phase-01-Fixtures-And-Ingestion.md).


## Phase 1 — 2026-09-10 Task 0·1 구현·검증

CLAUDE_PHASE1_PROMPT.md 지시에 따라 실제 코드·fixture·테스트를 구현하고 검증했다(문서 작성이 아니라 실행 결과). 전체 내역과 측정값은 [PHASE1_REPORT](Sessions/Phase-01-Fixtures-And-Ingestion.md#implementation-report).

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

문서 검사 기록: [document-validation.json](../../_archive/v0.3.1/document-validation.json). 실제 검사 결과와 한계는 [ASTRA_REVIEW_BRIEF](Sessions/Phase-00-Planning.md#planning-review)에 기록한다.

이번 작업에서 앱/fixture/수집 코드 구현, 패키지 설치, GitHub 데이터 수집, 모델 API 호출, DB 연결, 배포, 외부 사용자 실험은 수행하지 않았다. 공식 기술 문서를 참고한 설계와 실제 런타임 검증을 구분한다.

## v0.3 — 2026-09-10 최초 문서 재작성 (과거 기록)

단일 프로젝트·과정 근거·맞춤 질문·개선 작업서 중심으로 기획을 재작성했다. 당시 완료 보고에는 교차검사 완료라고 되어 있었으나 Astra 검토에서 계약 모순이 확인돼 위 v0.3.1에서 수정했다. 당시 원문과 보고서는 수정 전 ZIP에 보존했다.

## v0.2 — 과거 참고

[이전 마스터](../../_archive/v0.2/00_MASTER_PLAN.original.md)를 보존한다. 현재 요구사항의 정본은 아니다.
