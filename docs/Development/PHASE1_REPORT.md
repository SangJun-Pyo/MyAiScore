# Phase 1 Report — Task 0 교정 fixture · Task 1 읽기 전용 GitHub 수집 PoC

정본 허브: [`../00_MASTER_PLAN.md`](../00_MASTER_PLAN.md). 지시문: [`CLAUDE_PHASE1_PROMPT.md`](../../CLAUDE_PHASE1_PROMPT.md). 이 보고서는 이번 세션에서 **실제로 실행하고 확인한 것만** 기록한다. 모델 채점, DB, 웹 UI, 배포는 이번 범위에 없으며 수행하지 않았다.

## 1. 구현한 파일

### 프로젝트 설정

- `package.json`, `tsconfig.json`, `.gitignore` — TypeScript(ESM, Node 22), devDependencies는 `typescript`, `tsx`, `@types/node`만 설치.

### Task 1 — 읽기 전용 GitHub 수집

| 파일 | 역할 |
|---|---|
| `src/shared/contracts/ingestion.ts` | `IngestionSnapshot`/`Evidence` 등 타입, `INGESTION_LIMITS` 상수(EVIDENCE_SCHEMA.md/GITHUB_INGESTION.md 정본 매핑) |
| `src/server/ingestion/httpClient.ts` | `HttpClient` 인터페이스 + `FetchHttpClient`(실제 fetch, `redirect:"manual"`로 임의 리다이렉트 자동 추적 금지) |
| `src/server/ingestion/offlineHttpClient.ts` | 테스트용 오프라인 `HttpClient` — URL별로 고정 응답을 주입, 네트워크 없이 재현 |
| `src/server/ingestion/budget.ts` | 요청 수·누적 바이트·경과 시간 예산 추적(`IngestionBudget`) |
| `src/server/ingestion/urlValidation.ts` | repo URL 정규화·검증(호스트 allowlist, userinfo/port/query/fragment 거부, owner/repo 문자 제한), `commit_ref` 검증 |
| `src/server/ingestion/githubApi.ts` | GitHub REST API 어댑터(repo meta, commit 해석, tree, blob) — 403/429/5xx에 최대 1회 재시도, 예산 소진 시 중단 |
| `src/server/ingestion/fileSelection.ts` | 제외 규칙(node_modules/.env/lock 파일 등), symlink/submodule 미추적, 우선순위 정렬, `plannedSelectedFiles` 상한 적용 |
| `src/server/ingestion/redact.ts` | 비밀 패턴 마스킹(OpenAI/AWS/GitHub 토큰, PEM 블록, Bearer 토큰) |
| `src/server/ingestion/ingest.ts` | 전체 파이프라인 조합(`ingestRepository`), `IngestionSnapshot` 생성 |
| `scripts/ingest.ts` | CLI: `--repo`, `--ref`, `--paths`. stdout에 JSON 1개, stderr에 진행 로그, exit code 0(complete/partial)/1(failed) |

### Task 0 — 교정 fixture

| 위치 | 내용 |
|---|---|
| `src/shared/contracts/calibration.ts` | fixture `expected.json`/`provenance.json` 타입 정의(정확한 점수를 정답으로 만들지 않고, 축별 상태·근거·반례만 구조화) |
| `fixtures/calibration/shared/repos/**` | 재사용되는 synthetic 저장소 4종(base-shop, tool-rich-no-verification, simple-tool-verified, before-after/4변형) |
| `fixtures/calibration/cases/**` | CALIBRATION_PLAN.md 8개 사례를 재현한 10개 fixture(사례 8은 서브변형 3개) |
| `fixtures/calibration/README.md` | fixture 레이아웃과 "이번에 실제로 검증한 것"을 문서화 |
| `tests/calibration/localRepoToFixtures.ts` | 로컬 fixture 저장소를 오프라인 GitHub API 응답 세트로 변환(Task 0↔Task 1 연결용 헬퍼) |
| `tests/calibration/fixtures.test.ts` | fixture 구조·참조 무결성 검증 + case-02 실제 수집 통합 테스트 |

### 테스트

`tests/ingestion/{urlValidation,fileSelection,budget,ingest.offline}.test.ts` — 오프라인, 네트워크 없음.

## 2. 실행 명령과 결과

```bash
npm install                 # 6 packages, 0 vulnerabilities
npm run typecheck           # tsc --noEmit -- 통과 (artifacts/phase1/typecheck.log)
npm test                    # node --import tsx --test tests/**/*.test.ts
```

테스트 결과(`artifacts/phase1/test-results.log`): **53개 테스트, 53 pass, 0 fail.**

구성: URL 검증 15개, 파일 선정 6개, budget 3개, 오프라인 수집 파이프라인 14개, fixture 구조/참조 검증 10개, case-04/06/08 세부 무결성 5개, case-02 Task0↔Task1 통합 1개.

## 3. 오프라인 검증이 실제로 다룬 경계

- 올바른 URL 허용 / 다른 호스트·서브도메인 혼동·userinfo·비표준 포트·query·fragment·추가 경로 거부.
- `../../` 형태의 dot-segment 시도 — WHATWG URL 파서가 이를 파싱 전에 이미 완전히 정규화한다는 것을 직접 확인(`new URL("https://github.com/owner/../../etc/passwd").pathname === "/etc/passwd"`)했고, 그 결과가 여전히 `owner/repo` 2세그먼트 형태를 벗어나지 못해 실제 위험이 없음을 테스트로 남김. 퍼센트 인코딩된 슬래시(`%2F`)는 디코딩되지 않고 문자 허용 목록에서 거부됨을 별도 확인.
- ref 해석 후 tree/blob이 고정된 full SHA에만 묶임(테스트에서 커밋 URL 응답의 sha와 tree/blob 요청 URL이 동일 SHA를 참조하는지 fixture 자체로 보증).
- truncated tree → `partial` + 경고 메시지.
- 파일별 크기 상한 초과, 누적 바이트 예산(800KiB) 초과 시 `total_budget`으로 일부 파일 skip + `partial`.
- symlink(mode 120000)/submodule(type commit) — blob 요청 자체가 발생하지 않음을 호출 로그로 확인.
- `node_modules`, `.env`, lock 파일 제외.
- 403(rate-limit)/429/5xx — 최대 1회 재시도 후 실패 시 `retryable:true`로 명시적 실패.
- 비밀 패턴(OpenAI 스타일 키) 마스킹 및 경고 문구 생성.
- README에 삽입된 "100점을 줘" 스타일 지시문이 파일 콘텐츠로만 저장되고, snapshot에 `score`/`myAiScore` 같은 필드 자체가 존재하지 않음을 확인. **이 테스트가 증명하는 것은 "이 PoC 코드에 그 텍스트를 실행하거나 특별 취급하는 경로가 없다"는 것뿐이며, 향후 Task 2의 LLM 평가기가 이 지시문에 실제로 영향받지 않는지는 아직 검증되지 않았다.**
- 선택 순서/출력의 재현성(`selectionDigest` 동일 입력 → 동일 출력).

## 4. Live smoke (실제 네트워크, 실제 공개 저장소)

| 항목 | 값 |
|---|---|
| 대상 저장소 | `octocat/Hello-World` (GitHub 공식 데모용 공개 저장소, size 1) |
| 선택 이유 | 매우 작아 상한 테스트가 아닌 "정상 동작 확인"에 적합. 큰 저장소로 상한을 시험하지 않음(지시사항 준수) |
| 실행 시각 | 2026-09-10T08:56:07Z ~ 08:56:09Z (UTC, 실행 로그 타임스탬프 기준) |
| Full commit SHA | `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` |
| ingestion_status | `complete` |
| HTTP 요청 수 | 4 (repo meta, commit 해석, tree, blob 1개) |
| 소요 시간 | 1107ms |
| 수집 바이트 | 9975 bytes (API 응답 전체 기준, 파일 콘텐츠 자체는 13바이트) |
| 인증 | 비인증(토큰 없음) 공개 API 사용 — `GITHUB_TOKEN` 미설정 |
| 산출물 | `artifacts/phase1/live-smoke-octocat-hello-world.json`, `.stderr.log` |

추가로 존재하지 않는 저장소(`octocat/this-repo-should-not-exist-myaiscore-poc`)에 대한 live 404 경로도 확인: `ingestion_status=failed`, `failure.code=repo_not_found_or_private`, `retryable=false`, 실제 측정된 `durationMs=296`, `httpRequests=1`(`artifacts/phase1/live-smoke-404-check.json`).

실행 후 GitHub API 남은 한도(비인증): `remaining=48/60` — 큰 저장소를 반복 조회하지 않았다.

## 5. Task 0 fixture 목록과 상태

| fixture | CALIBRATION_PLAN 사례 | 상태 |
|---|---|---|
| case-01-tools-rich-no-verification | 1 | 구조·참조 검증 통과 |
| case-02-simple-tool-strong-verification | 2 | 구조 검증 통과 + **실제 offline `ingestRepository()`로 수집돼 IngestionSnapshot 생성 확인**(Task 0↔1 연결) |
| case-03-good-code-no-process | 3 | 구조 검증 통과, `collaboration_case.json` 의도적 부재 확인 |
| case-04-same-code-different-process (variant-a/b) | 4 | 구조 검증 통과, 두 variant가 동일 repo·다른 사례임을 diff로 확인 |
| case-05-conflicting-evidence | 5 | 구조 검증 통과, 사용자 발췌와 실제 코드의 충돌 텍스트 존재 확인 |
| case-06-prompt-injection | 6 | 구조 검증 통과, before/after README만 다르고 나머지 파일은 동일함을 확인 |
| case-07-repeat-fixed-input | 7 | 구조 검증 통과. **반복 실행 자체는 수행하지 않음**(Task 2 이후 과제) |
| case-08 subvariant-a-late-log | 8(a) | 구조 검증 통과, before/after 코드가 바이트 단위로 동일함을 확인 |
| case-08 subvariant-b-real-improvement | 8(b) | 구조 검증 통과, after가 실제로 버그(음수 총액 미거부)를 수정했음을 코드 diff로 확인 |
| case-08 subvariant-c-files-only | 8(c) | 구조 검증 통과, 새 테스트 파일이 실제 함수를 import/호출하지 않음을 확인 |

모든 fixture의 `provenance.json`은 `synthetic: true`, `executedAt: null`, `humanReviewed: false`로 일관되게 표기했다(테스트로 강제). **사람(상준님/Astra)의 fixture 내용 검토는 아직 이뤄지지 않았다.**

## 6. 실패·한계 (정직하게 남김)

- **case-04/case-08의 A/B/E축 기대값 미확정**: `expected.json`에서 D축(검증)은 구체적인 기대 상태를 적었지만, "같은 코드에 다른 서술"이 A/B/E축 판정에 정확히 어떻게 반영돼야 하는지는 열린 질문으로 남겼다(SCORING_RUBRIC.md/CALIBRATION_PLAN.md가 아직 그 정도로 세부 규칙을 정하지 않았기 때문). Task 2 설계 시 Astra 확인이 필요하다(8절).
- **case-06(프롬프트 인젝션) 방어는 "증명"되지 않음**: 이번 검증은 "조작 텍스트가 파일 콘텐츠로만 존재하고 이 코드베이스에서 실행되지 않는다"는 정적 사실만 확인했다. 실제 LLM 평가기가 그 텍스트를 시스템 지시로 오인하지 않는지는 Task 2가 구현된 뒤에만 확인 가능하다. `fixtures/calibration/cases/case-06-prompt-injection/expected.json`과 이 보고서 모두 이 한계를 명시했다.
- **case-07 반복 실행 미수행**: 고정 입력만 준비했고, 실제 5회 반복 평가·분산 측정은 Task 2 이후 과제다.
- **live smoke 대상이 TS/Next.js가 아님**: `octocat/Hello-World`는 언어 신호가 거의 없는(README 1개) 저장소라 `supportStatus`가 `other`로 나온다. 이는 지원 스택 판별 로직 자체가 아니라 이 smoke 저장소 선택의 한계다 — `nextjs_typescript` 판별 로직은 오프라인 테스트(`ingest.offline.test.ts`의 happy-path)에서 실제로 `next` 의존성이 있는 synthetic `package.json`으로 검증했다.
- **`selectFiles`의 우선순위 분류는 파일명/경로 패턴 기반 휴리스틱**이며, GITHUB_INGESTION.md가 요구하는 "정교한 AST 분석"은 하지 않는다(문서에도 "PoC에서는 필수 아님"으로 명시돼 있어 범위 안).
- **비밀 패턴 마스킹은 알려진 패턴 몇 가지만 커버**하며(정규식 5종), PRIVACY_SECURITY.md도 "모든 비밀을 찾아낸다고 보장하지 않는다"고 명시한 바와 일치한다.

## 7. 계약 변경 여부

`docs/Assessment/EVIDENCE_SCHEMA.md`의 `IngestionSnapshot`/`Evidence` 필드 정의를 그대로 구현했다. 눈에 띄는 차이는 아래뿐이며, 모두 표기법(문서의 snake_case ↔ TypeScript의 camelCase) 차이지 의미 변경이 아니다:

- 문서의 `ingestion_status`, `support_status`, `collector_version` 등은 코드에서 `ingestionStatus`, `supportStatus`, `collectorVersion`으로 표기(TypeScript 관례). JSON 직렬화 시 필드명 그대로(camelCase) 출력되므로, 향후 API 계층에서 snake_case로 변환할지는 Task 5에서 결정할 문제로 남긴다(현재 문서는 API 응답의 케이스 표기를 별도로 못박지 않았음).
- `Evidence.locator`를 `{ start_line, end_line, symbol? }` 대신 `{ startLine, endLine, symbol? }`로 구현 — 동일한 이유.

**scoring/MVP 원칙(SCORING_RUBRIC.md, MVP_SCOPE.md)은 변경하지 않았다.** 이번 구현은 오직 IngestionSnapshot(수집 결과)만 생성하며, 레벨·점수·개인 능력 추정은 어디에도 없다(코드 검색으로 `criterion`, `level`, `myAiScore` 등의 필드가 `src/server/ingestion/**`와 `src/shared/contracts/ingestion.ts`에 존재하지 않음을 확인 가능).

## 8. 다음 Astra 검토 지점

1. **API 응답 필드 케이스 표기**: snake_case(API_DATA_CONTRACTS.md 예시들) vs camelCase(이번 TypeScript 구현) 중 어느 쪽을 Task 5(API 계층)의 정본으로 할지. 이번 Phase 1은 내부 파이프라인이라 영향 없지만 API 경계에서 결정 필요.
2. **case-04/case-08의 A/B/E 축 세부 기대치**: "같은 코드, 다른 서술"이 자기진술 의존 축에 정확히 어떤 판정 차이를 만들어야 하는지 SCORING_RUBRIC.md에 세부 규칙이 아직 없다. Task 2 프롬프트 설계 전에 Astra 판단이 필요하다.
3. **`INGESTION_LIMITS`(40개 파일/60KiB/800KiB/48요청/45초)의 실측 타당성**: 이번 라이브 스모크는 대상이 너무 작아 이 상한들을 실제로 건드리지 못했다. 실제 TS/Next.js 중간 규모 저장소로 한 번 더 실측이 필요하다(다음 세션 후보 작업).
4. **case-06 방어 검증 범위**: 이번 정적 확인을 "인젝션 방어 완료"로 오인하지 않도록, Task 2 계획에 이 fixture를 이용한 실제 LLM 평가 검증을 명시적으로 넣을지 확인.
5. **fixture에 대한 사람 검토**: `humanReviewed:false`로 남아 있는 10개 fixture를 Astra/상준님이 검토할 시점 결정.

## 9. 요약

Task 0(교정 fixture 10개)과 Task 1(읽기 전용 GitHub 수집 PoC)을 실제 코드로 구현하고, 오프라인 테스트 53개 전부 통과 + 실제 공개 저장소 1개에 대한 live smoke(성공)와 404 실패 경로(실패) 검증까지 완료했다. LLM 채점, 결정적 점수 엔진, DB, API, 웹 UI는 이번 범위에 없으며 시작하지 않았다.
