# Changelog

## 2026-09-14 — 에이전트 공통 지침 통합

- AGENTS를 공통 작업 규칙 정본으로 명시하고 기존 CLAUDE의 구현 원칙을 옮겼다. CLAUDE는 AGENTS/ROADMAP import 진입점으로 간소화했다.
- 현재 작업은 ROADMAP에서 읽고, 기존 세션 재읽기와 checkout 기준을 명시했다. 전역 도구 설정이나 실행 중인 Claude 세션은 변경하지 않았다.
- 관련 [#11](https://github.com/SangJun-Pyo/MyAiScore/issues/11), [Phase 4](Sessions/Phase-04-Web-MVP.md).

## 2026-09-14 — 공용 프로젝트 인계 경로 복원

- worktree/원격만 최신이고 원래 checkout은 과거 브랜치에 남아 있던 누락을 확인했다. `C:/Users/sangj/MyAiScore/docs`를 공용 문서 진입점으로 명시하고 코드와 함께 Git으로 동기화하는 종료 절차를 추가했다.
- 원래 폴더의 Claude 재검토 commit `f4f7012`를 merge로 보존하고, 과거 상태와 최신 상태의 충돌은 최신 ROADMAP/BUGS를 유지하며 원문 검토를 세션에 남기는 방식으로 해결했다.
- 관련 [#9](https://github.com/SangJun-Pyo/MyAiScore/issues/9), [Phase 4](Sessions/Phase-04-Web-MVP.md). 앱 소스 변경 없음.

## 2026-09-14 — Phase 4 ADR 사후 기록

- DECISIONS/세션 요약에만 남겼던 주요 설계 6개를 Architecture/ADR에 배경·결정·대안·결과·미검증 범위와 함께 기록했다.
- 사후 기록임을 표시하고 기존 요약에서 상세 ADR로 연결했다. AGENTS/CLAUDE/작업 완료 규칙에 주요 설계 변경의 ADR 작성과 대체 관계를 추가했다.
- 문서만 변경했다. 관련 [#7](https://github.com/SangJun-Pyo/MyAiScore/issues/7), [Phase 4](Sessions/Phase-04-Web-MVP.md).

## 2026-09-14 — Astra·서브에이전트 웹 MVP 통합

- GitHub 이슈 #1~4와 독립 codex worktree를 만들고 Astra가 구현·통합을 맡는 운영으로 변경.
- MAS-002/004/005 보정, MAS-006 JSON 파싱 오류/metadata 잔여 노출 경로 추가 수정.
- 실제 GitHub 수집·서버 모델 adapter·질문/판정/계산·개선 작업서·보수적 비교, 웹 UI 및 인증 API 통합.
- File/Supabase CAS 저장, 공개 요약 분리·철회·삭제·재시도·예산 제한, CI/Docker/Railway 설정.
- #5 후속 디자인: 전체 다크 팔레트, 보라·시안 강조, hover/focus, 실제 Three.js 장면과 정적 대체. 데스크톱·모바일 캡처 확인.
- typecheck, 224개 테스트, production build, 데스크톱/모바일 브라우저 12건 통과. 실제 모델/DB/배포는 미수행.
- 상세: [Phase 4](Sessions/Phase-04-Web-MVP.md). 과거 보고 날짜는 원문을 보존하며 현재 상태는 ROADMAP을 따른다.

## 2026-09-20 — MAS-006 독립 재검토: PASS, 종료

- 구현자와 분리된 독립 검토 서브에이전트가 MAS-006 수정(`187cf52`)을 재검토했다. worktree 격리는 이번 환경에서 사용할 수 없어 메인 작업 트리를 읽기 전용으로 사용(검토 전후 `git status` clean·동일 확인).
- 단순 `grep`이 아니라 `LocalCollectionPublicView`의 허용 필드 목록과 실제 `--json`/artifact 출력의 최상위·중첩 키 구조를 대조해 확인. `secrets-session.jsonl`/`unsupported-format.jsonl`/`corrupted-session.jsonl` 실행 모두에서 synthetic 비밀·원문 미노출을 확인. `npm run typecheck` 통과, `npm test` 170 pass 재확인. `git diff 0e7259e..187cf52`로 MAS-002/004/005·평가 파이프라인과 무관함을 파일 범위로 확인.
- **판정 PASS.** MAS-006을 이번 재현 경로(`--json`의 `events`/`analysisContext` 노출)에 한해 종료(closed) 처리했다 — 다른 개인정보 마스킹 패턴의 완전성까지 보증하는 것은 아니다(BUGS.md에 명시).
- 상세: [Phase 3 — MAS-006 독립 재검토](Sessions/Phase-03-Local-Collection-PoC.md#2026-09-20-후속--mas-006-독립-재검토-pass).

## 2026-09-20 — MAS-006 수정 (로컬 수집 PoC CLI 원문 노출)

- 독립 검토(`0e7259e`)가 발견한 P1 결함 MAS-006(`scripts/collectLocalSession.ts --json`이 마스킹 전 세션 원문을 그대로 출력)을 수정했다. `secrets-session.jsonl`로 먼저 재현(회귀 테스트 3/4 실패 확인) 후 수정.
- `collectLocalSession.ts`에 `LocalCollectionPublicView`/`buildLocalCollectionPublicView()`를 추가해 사람이 읽는 미리보기와 `--json` 출력이 항상 같은 안전한 필드 집합만 사용하도록 통일했다(`events`/`analysisContext`는 CLI 출력에서 완전히 제외).
- 기존 커밋된 `artifacts/local-collection-poc/basic-session.json`(마스킹 전 `events` 포함)을 수정된 CLI로 재생성했다 — 실제 세션 기록은 사용하지 않음(synthetic만).
- 신규 회귀 테스트 `tests/localCollection/cliJsonOutput.test.ts`(4개, CLI를 실제 자식 프로세스로 실행)로 재검증. `npm run typecheck` 통과, `npm test` 170 pass(기존 166 + 신규 4).
- MAS-006을 "수정 완료 / 독립 재검토 대기"로 표시. MAS-002/004/005는 이번과 무관하게 그대로 둠. 상세: [Phase 3 — MAS-006 수정](Sessions/Phase-03-Local-Collection-PoC.md#2026-09-20-후속--mas-006-수정).

## 2026-09-14 — Phase 3 로컬 수집 PoC 독립 검토

- 구현자와 별도로 `claude/local-collection-poc`의 `5978210`(base `c7b3a2e`)을 별도 worktree에서 검토했다. `npm run typecheck`/`npm test`(166 pass) 재실행 확인, synthetic fixture 7종 전부로 CLI를 직접 재현 실행했다.
- 수집·연결·Evidence 변환 계층은 결함 없음. `scripts/collectLocalSession.ts --json` 출력이 마스킹·절단 전 세션 원문을 그대로 노출하는 결함 1건(MAS-006, P1)을 발견해 등록 — 다음 실제 세션 실험 전 수정 필요.
- 기존 평가 입력 adapter에는 연결돼 있지 않음(Evidence 생성까지만)을 코드로 재확인. 점수 조건/`humanReviewed`/MAS-002·004·005는 변경되지 않았음을 diff로 확인.
- 상세: [Phase 3 독립 검토](Sessions/Phase-03-Local-Collection-PoC.md#2026-09-14--독립-검토-구현자와-별도-claude-code).

## 2026-09-20 — Phase 3 로컬 협업 기록 수집 PoC

- 사용자·Astra 합의로 `MVP_SCOPE.md`의 Local Evidence Mode 보류를 이 PoC 1건에 한정해 재검토([DECISIONS](DECISIONS.md#7-정식-mvp-편입-전의-제한된-로컬-수집-실험-2026-09-20)). Claude Code 세션 JSONL(실제 프로젝트 파일로 구조 확인) 1개를 읽어 요청/제안/도구 호출·결과를 구조적으로 추출하고, 기존 Evidence 계약(`sourceType:"user_provided_excerpt"`)에 계약 확장 없이 연결하는 로컬 수집기·CLI·synthetic fixture 7종·테스트 24개를 구현했다.
- `npm run typecheck` 통과, `npm test` 166 pass(기존 142 + 신규 24). CLI를 정상/손상/미지원 형식 세 경로로 실제 실행해 exit code(0/0/1)를 확인.
- MAS-002/004/005는 이 작업과 무관하게 미해결로 유지. 상세: [Phase 3](Sessions/Phase-03-Local-Collection-PoC.md).

## 2026-09-14 — Phase 2 Fixes 구현 보고와 실행 확인

- 후속 Astra 재검토: typecheck·142 pass 확인. MAS-001/003은 오프라인 범위 해결 확인, MAS-002/004 잔여 경로와 MAS-005 입력 hash 문제를 재현해 수정 지시를 갱신했다. [검토 기록](Sessions/Phase-02-Fixes.md#astra-rereview-20260914).

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
