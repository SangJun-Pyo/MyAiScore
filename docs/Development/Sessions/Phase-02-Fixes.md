# Development Session — Phase 2 Fixes: 평가 경계 수정

> 최신 판정: [Astra 재검토](#astra-rereview-20260914)에서 MAS-001/003은 해당 오프라인 범위 해결을 확인했다. MAS-002/004 잔여 결함과 MAS-005 실험 입력 식별 문제를 수정한 뒤 재검토한다. 아래 '재검토 대기' 문장은 당시 인계 기록이다.

- 시작 기록: 2026-09-14. 구현자: Claude Code. 검토자: Astra AI.
- 현재 상태: **구현 완료 보고 수신 / 142개 테스트 재실행 통과 / Astra 코드 재검토 대기**.
- 시작 기준점: `957e3c5254f55b19071f231cfc0f4e64287059cc`은 정리 당시 진행 중인 구현도 포함한 WIP 보존점이다.

## 목표와 범위

[현재 수정 지시](../../../CLAUDE_PHASE2_FIX_PROMPT.md)에 따라 MAS-001~004 및 과정 자료 표시·fixture 기대·실험 계획을 보정한다. 실제 LLM 호출·DB·UI·배포는 포함하지 않는다.

## 인수한 문제

[Phase 2 Astra 검토](Phase-02-Offline-Evaluation.md#astra-review), [BUGS](../BUGS.md) 참조. 완료 여부는 코드·회귀 테스트 확인 후 결정한다.

## 구현 내용

상세 원인·수정 파일·회귀 테스트 이름은 [PHASE2_FIX_REPORT](Phase-02-Fixes.md#fix-report)에 전부 기록했다(사용자 지시로 그 경로에 작성). 요약:

- **MAS-001(R1)**: `runOfflineEvaluationForFixture.ts`에 단계 추적(`stages`: ingestion/questions/judgement/scoring, 각 succeeded/failed/not_attempted)과 `pipelineFailed`를 추가. 질문 실패 시 판정 호출 자체가 발생하지 않음. CLI(`scripts/evaluateOffline.ts`) exit code를 `pipelineFailed`에 연결(0/0/1 실측).
- **MAS-002(R2)**: `providerRequest.ts`(신규)로 실제 요청 타입 도입, `rubricCriteria.ts`(신규)로 SCORING_RUBRIC.md 축별 4단계 20개 항목 구조화, `MockProvider`를 기록형으로 변경, `timeout.ts`(신규)로 끝나지 않는 호출 강제 종료(42ms 실측).
- **MAS-003(R3)**: `evidenceMap.ts`의 `resolveExternalExcerpts`가 마스킹·길이 제한된 `analysisContext`를 반환하도록 확장, `fixtureRoot.ts`(신규)로 경로 이탈 차단. 이 과정에서 case-08 subvariant-b `evidence_map.json` 위치가 실제로 잘못돼 있던 별도 버그도 발견·수정.
- **MAS-004(R4)**: `assembleEvaluationInput()`이 조립 시점에 `BundleAssemblyError`로 소속/중복/참조를 검증(astra-probes.mjs의 cross-assessment 재현 차단). 질문/판정 검증기의 null/배열 항목 처리를 TypeError에서 명시적 실패로 변경. `computeMyAiScore`의 `validEvidenceIds`를 필수화하고 열거형 런타임 검증 추가.
- 함께 보정: `deriveProcessEvidenceLevel`(repo_static 단독 링크는 statements_only), case-04b/case-08a/case-08c의 과도한 fixture 확정 4곳 완화, 반복 예산 "174회 상한" 폐기 후 정상 경로 58회로 재산정(재시도 정책은 미확정으로 명시).

## 검증 결과와 한계

`npm run typecheck` 통과, `npm test` 142 pass / 0 fail(기존 108 + 신규 회귀 34, 재구성으로 3개 순감). CLI 3개 시나리오(정상 withheld/issued/파이프라인 실패) 실제 실행, exit code 0/0/1 확인. 산출물: `artifacts/phase2-fix/`.

이전 108 pass는 이번 수정 완료의 근거로 재사용하지 않았다 -- 142개는 이번 세션에서 다시 실행해 확인한 수치다. 실제 LLM 평가·사람 fixture 검토·인젝션 방어 실행은 여전히 미수행이다.

## 검토 결과 / 다음 작업

완료 보고([PHASE2_FIX_REPORT](Phase-02-Fixes.md#fix-report)) 작성 완료, **Astra 재검토는 아직 받지 않았다**. 그전까지 BUGS의 MAS-001~004는 "fixed / Astra 재검토 대기"로 표시하며 open을 완전히 닫지 않는다. 서비스 API·예산은 사용자 답변 '미정'을 유지한다. 남은 미해결 항목(반복 예산 상한 공식, case-06 실제 실험, fixture 사람 검토)은 PHASE2_FIX_REPORT §6 참고.

## 변경·커밋 기록

- `690d5dc`: 완료 보고가 있는 수정의 checkpoint. Astra가 typecheck·142개 테스트 통과를 확인했으며 상세 코드 재검토는 대기다. 일부 구현 파일은 이전 WIP 기준점에 이미 들어 있었으므로 이 commit 하나를 전체 수정 diff로 간주하지 않는다.

작성자는 시작 commit, 구현 commit, 검토 commit을 실제 존재할 때만 적는다. 문서 자신의 미래 commit hash를 미리 만들지 않는다. `git log --follow -- <이 파일 경로>`로 현재 세션 변경을 추적할 수 있다.


## 2026-09-14 — 구현 완료 보고 수신과 실행 확인

Claude의 새 보고를 문서 정리 도중 수신했다. Astra가 현재 파일에서 npm run typecheck와 npm test를 실행해 142 pass / 0 fail을 확인했다. 이것은 상세 코드 재검토 통과가 아니다. MAS-001~004는 review_required 상태로 남기며, 아래는 구현자의 보고 원문이다. 보고에 적힌 실행·해석의 정확성은 후속 코드 검토 대상이다. 수정 파일은 문서 정리와 별도 Git checkpoint로 보존한다.

<a id="fix-report"></a>

# Phase 2 Fix Report — R1~R4 코드 수정과 회귀 검증

정본 허브: [`../00_MASTER_PLAN.md`](../../00_MASTER_PLAN.md). 지시문: [`CLAUDE_PHASE2_FIX_PROMPT.md`](../../../CLAUDE_PHASE2_FIX_PROMPT.md). 검토 대상: [`ASTRA_PHASE2_REVIEW.md`](Phase-02-Offline-Evaluation.md#astra-review)(R1~R4, MAS-001~004). 이전 산출물: [`PHASE2_OFFLINE_REPORT.md`](Phase-02-Offline-Evaluation.md#implementation-report).

**이 문서는 코드 수정 완료 보고다. Astra의 재검토는 아직 받지 않았다.** 실제 LLM 호출·유료 리소스·배포는 이번 범위에서 하지 않았다. 아래 108개(Phase 2 오프라인) → 142개(이번 수정 후)로 늘어난 테스트 통과는 계약/구조 검증이며, 실제 질문 품질·판정 타당성·인젝션 방어가 검증됐다는 뜻이 아니다.

## 0. 실행 로그 (이번 세션에서 실제로 실행한 것만)

```
npm run typecheck   # 통과 (수정 전/중/후 여러 차례 실행, 매번 0 에러)
npm test             # 142 pass, 0 fail (최종 실행)
```

CLI 3개 시나리오 실제 실행(모두 `npx tsx scripts/evaluateOffline.ts ...`, mode=mock, 산출물은 `artifacts/phase2-fix/`):

| 시나리오 | 명령 | exit code | 결과 |
|---|---|---:|---|
| 정상 withheld | `--mock-response case-02-generic-valid.json --answers case-02-fixed-answers.json` | **0** | 4단계 모두 succeeded, `score.status=withheld`(`insufficient_dimensions`, observedDimensions=1) |
| 정상 issued | `--mock-response case-02-full-marks-valid.json --answers case-02-fixed-answers.json` | **0** | 4단계 모두 succeeded, `score.status=issued`, `value=83`(A3/B3/C3/D4/E3 → 검증: (15·75+20·75+15·75+30·100+20·75+50)/100=83) |
| 파이프라인 실패(질문 2개) | `--mock-response malformed-wrong-question-count.json` | **1** | `stages.questions=failed`, `stages.judgement=not_attempted`, `stages.scoring=not_attempted`, `judgement=null`, `score=null` |

산출물: `artifacts/phase2-fix/cli-{withheld,issued,failed}.json` + `.stderr.log`.

## 1. R1 — 질문 실패 후 판정·점수 발급이 계속됨

### 원인

`runOfflineEvaluationForFixture.ts`가 `questions.ok`를 확인하지 않고 항상 `provider.judgeCriteria()`를 호출했다. `artifacts/phase2-review/astra-probes.mjs`의 재현(질문 0개 + 형식상 유효한 5축 level-4 mock)에서 우연히 판정 응답도 잘못돼 있어 결과적으로 점수가 나오지 않았을 뿐, 코드 자체는 질문 실패를 판정/점수 발급으로부터 차단하지 않았다.

### 수정

- `OfflineEvaluationOutcome`에 `stages: {ingestion, questions, judgement, scoring}`(각 `"succeeded" | "failed" | "not_attempted"`)와 `pipelineFailed: boolean`을 추가했다.
- 판정은 `stages.questions.status === "succeeded"`일 때만 호출한다. 점수 계산은 `stages.judgement.status === "succeeded"`일 때만 호출한다. 앞 단계가 실패하면 뒤 단계는 `"not_attempted"`로 기록되고 provider가 호출되지 않는다(질문 실패 시 `judgeCriteria` 호출 횟수 0회를 회귀 테스트로 직접 확인).
- 점수 엔진의 계약 오류(`ScoringContractError`/`IngestionNotScorableError`)는 더 이상 `score: {withheldForContractReason: string}`이라는 임시 형태로 감추지 않는다 -- `stages.scoring = "failed"`로 기록하고 `score = null`을 반환한다.
- `pipelineFailed`는 4단계 중 하나라도 `"failed"`면 `true`다. 정상적인 `withheld`(모든 단계 succeeded, 5축 중 일부만 observed 등)는 `pipelineFailed=false`다.
- CLI(`scripts/evaluateOffline.ts`)는 `process.exitCode = outcome.pipelineFailed ? 1 : 0`으로 변경했다. 이전에는 "항상 exit 0"이었다.

### 수정한 파일

`src/server/evaluation/runOfflineEvaluationForFixture.ts`(전면 재작성), `scripts/evaluateOffline.ts`(exit code 로직).

### 회귀 테스트

`tests/evaluation/pipelineStageFailure.test.ts`:
- `"R1 regression: 0 questions (invalid) + a formally-valid 5x100 judgement mock must NOT produce judgement or a score"` -- astra-probes.mjs와 동일한 입력 형태를 새 인터페이스로 재현. `stages.judgement==="not_attempted"`, `outcome.judgement===null`, `outcome.score===null`, `pipelineFailed===true`를 확인
- `"R1 regression: a judgement failure (after valid questions) must NOT produce a score, and must not run scoring"` -- 질문은 성공했지만 판정이 5축 중 2개만 반환한 경우, 채점이 호출되지 않음을 확인
- `"a legitimate withheld score ... is NOT a pipeline failure"` -- 정상 withheld가 `pipelineFailed=false`임을 대조 확인(오탐 방지)

### 검증 결과

`node --import tsx --test tests/evaluation/pipelineStageFailure.test.ts` → 3 pass, 0 fail. CLI 3번 실행(위 0절)으로 exit code 0/0/1 실측 확인.

## 2. R2 — 실제 판정 입력과 기준이 provider에 연결되지 않음

### 원인

`EvaluationProvider.generateQuestions()`/`judgeCriteria()`가 인수를 받지 않았다. `bundle`/프롬프트는 `manifest`의 해시 계산에만 쓰였고 실제로 provider에 전달되는 값은 없었다. `judgePromptV1.ts`는 자유 텍스트뿐이라 SCORING_RUBRIC.md의 축별 4단계 기준·반례를 담지 못했다.

### 수정

- `src/server/evaluation/providerRequest.ts`(신규): `QuestionGenerationRequest`/`JudgementRequest` 타입. `trustedInstructions`(프롬프트 텍스트·버전, 판정 요청에는 `rubricCriteria`도 포함)와 `untrusted`(evidence, collaborationCase, analysisContext, questions/answers)를 명확히 분리했다.
- `src/server/evaluation/rubricCriteria.ts`(신규): SCORING_RUBRIC.md 4절의 축별(A~E) 4단계 행동·반례를 구조화된 버전 관리 데이터(`RUBRIC_CRITERIA_VERSION`)로 옮겼다. 5개 축 × 4개 레벨 = 20개 항목 전부 포함.
- `src/server/evaluation/provider.ts`: `EvaluationProvider` 메서드가 이제 `(request, signal: AbortSignal)`을 받는다.
- `src/server/evaluation/mockProvider.ts`: `MockProvider`가 **기록형**으로 바뀌었다 -- 마지막으로 받은 요청을 `lastQuestionRequest`/`lastJudgementRequest`에 저장한다. 여전히 요청 내용과 무관하게 테스트가 넣어준 canned response만 반환한다(expected.json을 읽지 않음). `neverResolveQuestions`/`neverResolveJudgement` 옵션도 추가해 "끝나지 않는 실제 호출"을 흉내낼 수 있게 했다.
- `src/server/evaluation/timeout.ts`(신규): `withTimeout()` -- provider 호출을 타임아웃과 경쟁시킨다. 타임아웃이 먼저 끝나면 이후 provider 응답(성공/실패 어느 쪽이든)은 무시된다.
- `runOfflineEvaluationForFixture.ts`: 이제 `provider`를 주입받을 수 있고(옵션), 각 단계에서 실제 `QuestionGenerationRequest`/`JudgementRequest`를 만들어 `withTimeout()`으로 감싸 호출한다. `providerTimeoutMs`(기본 `DEFAULT_PROVIDER_TIMEOUT_MS=30000`)를 옵션으로 받는다.

### 수정한 파일

`src/server/evaluation/{provider,mockProvider,providerRequest(신규),rubricCriteria(신규),timeout(신규),runOfflineEvaluationForFixture}.ts`, `src/server/evaluation/manifest.ts`(rubricCriteriaVersion/Hash 추가).

### 회귀 테스트

`tests/evaluation/providerRequestWiring.test.ts`:
- `"the question-generation request actually carries the real prompt text/version and real evidence"` -- `lastQuestionRequest.trustedInstructions.promptText === QUESTION_PROMPT_TEXT` 등 실측
- `"the judgement request carries the real judge prompt, the versioned per-axis rubric criteria (all 5 axes, 4 levels each), and the actual generated questions"` -- `rubricCriteria.length===5`, 각 축 `levels.length===4` 실측
- `"expected.json is never consulted..."` -- 의도적으로 전부 `not_observed`인 canned response가 그대로 반환됨을 확인(치환되지 않음)
- `"a providerError shaped as a timeout is handled as an ordinary explicit failure (does not need the timeout wrapper to fire)"` -- canned `{providerError:{code:"timeout"}}` 처리 경로
- `"a provider call that never resolves on its own is actually cut off by the timeout wrapper within the configured bound"` -- `neverResolveQuestions:true` + `providerTimeoutMs:40`로 실제 정지 호출을 강제 종료. 42ms 만에 완료됨을 실측(무한 대기 아님을 증명)

**이 둘을 구분한 이유(지시사항 그대로 반영)**: 첫 번째 timeout 테스트는 "provider가 스스로 timeout 모양 오류를 반환"하는 경우만 확인한다. 두 번째 테스트가 실제로 "끝나지 않는 호출을 제한 시간이 강제 종료"하는 것을 증명하는 테스트다.

### 검증 결과

`node --import tsx --test tests/evaluation/providerRequestWiring.test.ts` → 5 pass, 0 fail.

## 3. R3 — 사용자 발췌 원문이 사라짐

### 원인

`resolveExternalExcerpts()`는 발췌 텍스트를 읽어 해시를 계산했지만, 반환하는 `Evidence`에는 파일명 요약(`summary`)만 남기고 원문 자체는 어디에도 보존하지 않았다. astra-probes.mjs가 `UNIQUE_LOG_CONTENT_FAIL_THEN_PASS`라는 고유 문자열로 확인한 대로, 이 문자열은 조립된 bundle 어디에도 존재하지 않았다 -- 실제 모델은 로그의 실패/통과·시각을 읽을 방법이 없었다.

### 수정

- `resolveExternalExcerpts()`가 `ExcerptResolutionResult`(기존 `resolved`/`unresolved`에 `analysisContext: Record<evidenceId, string>` 추가)를 반환하도록 확장했다. 텍스트는 `redactSecrets()`(기존 ingestion 비밀 마스킹 재사용)로 마스킹하고 `MAX_EXCERPT_ANALYSIS_CHARS=2000`(API_DATA_CONTRACTS.md의 "사용자 발췌 건당 2,000자")로 자른다.
- repo_static evidence도 `IngestionSnapshot.files[].redactedContent`를 같은 `analysisContext` 맵에 채워 넣는다 -- 코드 근거 자체도 이전에는 provider에 전달되지 않았다.
- `analysisContext`는 오직 `QuestionGenerationRequest`/`JudgementRequest`의 `untrusted.analysisContext`에만 들어간다. `Evidence` 영구 레코드, `OfflineEvaluationOutcome`(CLI가 출력하는 값)에는 절대 포함되지 않는다 -- 코드로 확인(아래 회귀 테스트).
- `src/server/evaluation/fixtureRoot.ts`(신규): `resolveWithinRoot(root, relativePath)` -- `external_excerpts` 경로가 fixture 루트를 벗어나면(`../` 등) `null`을 반환해 "파일 없음"과 동일하게 처리한다. `runOfflineEvaluationForFixture.ts`의 excerpt 읽기 콜백에 적용했다.

### 수정한 파일

`src/server/evaluation/{evidenceMap,fixtureRoot(신규),runOfflineEvaluationForFixture}.ts`.

### fixture 부수 수정 (이 과정에서 발견한 실제 버그)

새 회귀 테스트를 subvariant-b(실제 `execution_log.txt`가 있는 유일한 fixture)로 작성하던 중, **evidence_map.json이 `runOfflineEvaluationForFixture`가 실제로 찾는 위치와 다른 디렉터리에 있었다**는 사실을 발견했다(Phase 2 오프라인 구현 자체의 버그, R1~R4 지적 사항은 아니지만 R3 검증 도중 드러남):

- `case-08-before-after/subvariant-{a,b}/evidence_map.json`(subvariant 루트)에 있던 파일을 각각 `.../after/evidence_map.json`으로 옮겼다 -- `caseDir`가 항상 `after/`를 가리키므로 `collaboration_case.json`과 같은 디렉터리에 있어야 한다.
- `subvariant-b-real-improvement/after/collaboration_case.json`의 `external_excerpts` 값을 `"after/excerpts/execution_log.txt"` → `"excerpts/execution_log.txt"`로 수정했다(caseDir 기준 상대경로이므로 중복된 `after/` 접두어 제거).
- `tests/evaluation/fixtureEvidenceResolution.test.ts`의 관련 3곳(evidence_map.json 경로 2곳, excerpt 읽기 base 경로 1곳)을 새 위치에 맞게 갱신했다.

이 불일치 때문에 Phase 2 오프라인 구현에서 subvariant-b의 `evidence_map.json`/excerpt는 사실상 한 번도 올바르게 resolve된 적이 없었다(그 fixture를 대상으로 한 이전 테스트가 `caseDir`를 항상 subvariant 루트로 지정했기 때문에 우연히 통과했을 뿐이다).

### 회귀 테스트

`tests/evaluation/excerptContentPropagation.test.ts`(subvariant-b의 실제 `execution_log.txt`, 고유 문자열 `validateOrderTotal.negative.repro.mjs` 사용):
- `"the excerpt's actual content reaches the judgement request's analysisContext"` -- 실측
- `"the excerpt's content never appears in the permanent Evidence record or the returned outcome"` -- `JSON.stringify(outcome)`와 `Evidence` 객체 양쪽에 원문이 없음을 확인
- `"fixture root boundary: a path-traversal external_excerpts entry never escapes the case directory"` -- `resolveWithinRoot()` 직접 검증

### 검증 결과

`node --import tsx --test tests/evaluation/excerptContentPropagation.test.ts` → 3 pass, 0 fail. `tests/evaluation/fixtureEvidenceResolution.test.ts`도 경로 수정 후 재실행해 6 pass 유지 확인.

## 4. R4 — assessment와 입력 구조 검증이 부족함

### 원인

`validateAndBuildQuestions`/`validateAndBuildCriterionResults`는 `bundle.evidence`의 ID 집합만 봤다. `Evidence.assessmentId`가 실제로 현재 assessment와 같은지는 아무도 확인하지 않아, astra-probes.mjs가 `other-assessment` 소속 evidence를 담은 bundle을 만들어도 질문 검증이 그대로 통과했다. `null`/배열/원시값 항목은 `rc.criterion_code` 같은 접근에서 TypeError를 던졌다. `computeMyAiScore`의 `validEvidenceIds`는 선택 인자라 생략하면 참조 검증 자체가 꺼졌다.

### 수정

- `src/server/evaluation/inputAssembly.ts`: `assembleEvaluationInput()`이 조립 시점에 `BundleAssemblyError`를 던지는 구조 검증을 수행한다 -- evidence/question/answer의 `assessmentId`가 실제로 일치하는지, ID가 중복되지 않는지, 답변이 실제 존재하는 질문을 가리키는지(질문당 최대 1개), 답변이 인용하는 evidence ID가 실제로 bundle 안에 있는지. **이는 검증기 이전, 가장 이른 경계에서 차단한다** -- astra-probes.mjs처럼 직접 손으로 오염된 bundle을 만들려는 시도 자체가 이제 예외를 던진다.
- `questionGeneration.ts`/`criterionJudgement.ts`: 배열의 각 항목이 `object`이고 `null`이 아니며 배열이 아닌지 확인한 뒤에만 필드에 접근한다(null/문자열/배열 항목 모두 `output_validation_failed`로 명시적 실패).
- `scoreCalculator.ts`: `validEvidenceIds`를 **필수** 파라미터로 바꿨다(생략 불가). `status`/`ingestionStatus` 값도 TS 타입과 별개로 런타임에 열거형 검사한다(`ScoringContractError`) -- 이 값들이 이미 검증된 provider 출력에서 온다는 가정에 의존하지 않는, 두 번째 독립 경계다.

### 수정한 파일

`src/server/evaluation/{inputAssembly,questionGeneration,criterionJudgement}.ts`, `src/server/scoring/scoreCalculator.ts`(및 모든 호출부: `runOfflineEvaluationForFixture.ts`, `tests/scoring/scoreCalculator.test.ts`).

### 회귀 테스트

`tests/evaluation/inputAssembly.test.ts`(11개, 대표 사례):
- `"evidence belonging to a different assessmentId is rejected at bundle assembly, not later"` -- astra-probes.mjs의 `foreignAssessmentEvidenceAccepted` 재현을 새 인터페이스로 검증
- 중복 evidenceId/questionId, 존재하지 않는 questionId를 가리키는 답변, 질문당 2개 답변, 깨진 evidence 참조를 가진 답변 -- 각각 `BundleAssemblyError`
- `modelInputHash`가 랜덤 ID/시각과 무관하게 동일 논리 입력에서 동일함을 확인(아래 6절과 연결)

`tests/evaluation/questionGeneration.test.ts` / `criterionJudgement.test.ts`에 추가한 null/배열/원시값 테스트(각 3개/2개) -- astra-probes.mjs의 `nullEntryBehavior: {questions: "TypeError", criteria: "TypeError"}`를 재현해, 이제 `TypeError`가 아니라 `{ok:false, failure:{code:"output_validation_failed"}}`임을 확인.

`tests/scoring/scoreCalculator.test.ts`에 추가한 2개 -- `status`/`ingestionStatus`에 TS 타입을 우회한 값(`as never`)을 넣어도 `ScoringContractError`가 던져짐을 확인.

### 검증 결과

`node --import tsx --test tests/evaluation/inputAssembly.test.ts tests/evaluation/questionGeneration.test.ts tests/evaluation/criterionJudgement.test.ts tests/scoring/scoreCalculator.test.ts` → 모두 pass(개별 실행 및 전체 `npm test`에서 재확인).

## 5. 함께 바로잡은 해석과 fixture 기대값

### 과정 자료 표시 (`deriveProcessEvidenceLevel`)

기존 구현은 연결된 evidence가 1개만 있어도(그것이 `repo_static`이어도) `linked_records`를 반환했다. `src/server/scoring/confidenceSummary.ts`를 수정해, `repo_history`/`user_provided_excerpt`/`interview_answer`/`collaboration_case`처럼 실제 과정 기록에 해당하는 sourceType이 하나라도 있을 때만 `linked_records`로 판정하고, `repo_static` 링크만 있으면 `statements_only`로 분류한다(코드 존재 확인 ≠ 과정 검증). 호출부(`runOfflineEvaluationForFixture.ts`)도 evidence 개수 대신 실제 evidence 배열을 넘기도록 바꿨다. 회귀 테스트: `tests/scoring/confidenceSummary.test.ts`(6개).

### fixture 고정 정답 보정

Astra Phase 2 검토가 "제거하라"고 명시한 세 가지 금지된 추론을 되돌렸다:

| 항목 | 이전 (Phase 2 오프라인) | 수정 후 | 이유 |
|---|---|---|---|
| case-04 variant-b, A축 | `observed`, level [1,1] | `insufficient_evidence` | 사후 서술의 모호함만으로 "실제 작업이 모호했다"는 행동을 확정할 수 없음 |
| case-04 variant-b, D축 | `not_observed` | `insufficient_evidence` | 테스트 파일을 언급하지 않았다는 사실만으로 미관찰을 강제할 수 없음(진술 자체는 존재) |
| case-08 subvariant-a, `expectedComparisons[0].currentStatusOptions` | `["insufficient_evidence", "observed"]` | `["insufficient_evidence"]` | 이 subvariant에는 실제 로그 자료가 끝내 없으므로(evidence_map.json: unresolved) observed로 격상될 근거 자체가 없음 -- "지연 제출"과 "자료 부재"를 구분 |
| case-08 subvariant-c, E축 | `observed`, level [1,1] | `insufficient_evidence` | "효과 없는 테스트+미해결 버그"라는 결과는 "무비판적으로 수용했다"는 판단 과정의 증거가 아님(결과 효과성과 수용 과정의 비판성 혼동 금지) |

수정한 파일: `fixtures/calibration/cases/case-04-same-code-different-process/variant-b/expected.json`, `fixtures/calibration/cases/case-08-before-after/subvariant-{a,c}*/expected.json`. `tests/calibration/fixtures.test.ts`의 구조 검증(18개)을 재실행해 여전히 통과함을 확인 -- 이 테스트는 "레벨이 맞다"를 검증하지 않고 "값이 제품 열거형 안에 있고 참조가 유효하다"만 검증하므로, 이 보정이 실제로 옳은 판정인지는 **여전히 사람 검토 전**이다.

### 인젝션 실험 기준

`docs/Development/PHASE1_FOLLOWUP.md` §4/`ASTRA_PHASE1_REVIEW.md` §4가 이미 정의한 "공격 인용은 허용, 명령 복종/증거 오인만 실패"라는 기준을 그대로 유지한다. 이번 세션에서 이 기준의 텍스트 자체를 바꾸지 않았다 -- Astra Phase 2 검토가 지적한 "공격 문구 인용이면 즉시 실패"라는 모순된 문구는 애초에 `PHASE2_OFFLINE_REPORT.md`에 다시 들어간 적이 없음을 확인했다(재확인만 하고 별도 수정 없음).

### 반복 예산 재산정

**이전 산정(PHASE2_OFFLINE_REPORT.md §5.2)의 "58~174회"를 폐기한다.** 그 계산은 정상 호출 수(58)에 "실패마다 최대 2회 재시도"를 단순히 3배($58 \times 3$)해 상한을 구했는데, 이는 Astra Phase 2 검토가 명시적으로 금지한 것과 정확히 같은 오류다: "설계 보정 최대 2회와 요청별 자동 재시도 2회는 다르다. 무조건 세 배 호출하지 않는다."

재산정(정상 경로만, **미승인** 계획):

| 단계 | 대상 | 반복 | 호출 수 |
|---|---|---|---|
| A. 일반 탐색 1회 패스 | 고유 입력 11개(PHASE2_OFFLINE_REPORT.md §5.1과 동일 목록 -- 이번 세션에서 재검토했으나 case-02/06/07 통합은 실제 모델 입력(evidence ID 등)이 동일함을 Task 2b 착수 시 다시 확인해야 한다는 Astra 지적을 반영해 "잠정 통합"으로 표시) | 1 | 22 |
| B. case-07 변동 관찰 | #2와 동일 입력, 추가 4회 | 4 | 8 |
| C. case-06 "after" 변동 관찰 | #7과 동일 입력, 추가 4회 | 4 | 8 |
| D. case-06 판정 격리(질문 고정) | before/after 각 5회, 판정만 | 10 | 10 |
| E. case-06 질문 생성 격리(사례 고정) | before/after 각 5회, 질문만 | 10 | 10 |
| **정상 경로 합계** | | | **58회** |

재시도 정책은 **별도 축**이다: "설계 보정"(프롬프트/기준 자체를 고치는 것)은 최대 2회, 이는 위 58회 실행 전체에 대해 최대 2번 다시 도는 것이지 각 호출마다 3배가 되는 게 아니다. "요청별 자동 재시도"(timeout/5xx 등 일시 오류)는 GITHUB_INGESTION.md의 기존 관례(최대 1회/요청)를 따른다고 가정하면 최악의 경우 58 × 2(자동 재시도) = 116회, 그 위에 설계 보정 2회를 거치면 (58+116) × 2 = 348회? -- **이 곱셈 자체도 확정 산식이 아니다.** 이번 세션은 정확한 상한 공식을 확정하지 않는다. 확정할 것: (1) 자동 재시도 횟수/조건, (2) "설계 보정"이 무엇을 다시 실행함을 의미하는지(전체 58회 재실행인지 실패한 항목만인지)는 Task 2b 착수 전 별도로 결정해야 한다. **이번 세션이 확정하는 것은 "정상 경로 58회"뿐이며, 이전 보고서의 "174회 상한"은 폐기한다.**

### 반복 입력 (모델 입력 hash)

`inputAssembly.ts`에 `computeModelInputHash()`를 추가해 `EvaluationManifest.modelInputHash`로 노출했다. 기존 `bundleTextHash`(랜덤 ID·타임스탬프 포함, 감사용)와 분리했다 -- 반복 실험은 이제 `modelInputHash`가 같은지로 "같은 입력을 반복했다"를 확인할 수 있다. `tests/evaluation/inputAssembly.test.ts`의 세 테스트로 (a) 랜덤 ID/시각이 달라도 동일 논리 입력이면 `modelInputHash`가 같고, (b) 실제 질문 텍스트가 다르면 `modelInputHash`도 다르며, (c) `bundleTextHash`는 논리적으로 같은 입력이라도 항상 다르다는 것을 실측했다.

## 6. 남은 미해결 항목

- **fixture 레벨 값(A~E의 정확한 레벨/상태)은 이번에도 사람이 검토하지 않았다.** `humanReviewed`는 모든 fixture에서 계속 `false`다.
- **case-06 인젝션 방어는 실행하지 않았다.** 이번 세션은 코드 구조(요청 분리, timeout, 원문 마스킹 전달)만 고쳤을 뿐, 실제 before/after 판정 비교 실험은 Task 2b 실행 항목으로 남는다.
- **반복 예산의 정확한 상한 공식**(재시도 정책 포함)은 위 5절에서 확정하지 못했다 -- Task 2b 착수 전 결정 필요.
- **case-02/06/07 입력 통합 가정의 재확인**: Astra Phase 2 검토는 "서술이 비슷해도 case/evidence ID 등이 다르면 실제 전달된 입력이 다를 수 있다"고 지적했다. 이번 세션은 fixture JSON을 다시 비교해 `collaboration_case.json` 원문이 실제로 동일함(case-06 파일의 `note` 필드가 이를 명시)을 재확인했지만, **`modelInputHash`로 실제 동일성을 실측하지는 않았다**(Task 2b에서 실제 프롬프트 조립 후 재확인 필요).
- **모델·접속·예산은 여전히 미정**이다.

## 7. 요약

R1~R4를 모두 실제 코드에서 수정했다(문서 제안에 그치지 않음): 단계별 실패 전파(R1), 실제 요청 객체 배선과 timeout(R2), 발췌/코드 원문의 임시 분석 채널 신설과 fixture 루트 경계(R3), bundle 조립 시점의 소속·중복·참조 검증과 null-safety(R4). 이 과정에서 case-08 subvariant-b의 evidence_map.json 위치 오류라는 별도의 실제 버그도 발견해 함께 고쳤다. 새 회귀 테스트 34개를 추가(기존 108 → 142, 3개는 재구성으로 순감)하고 전부 통과를 확인했다. CLI를 정상/정상 withheld/실패 세 경로 모두 실제 실행해 exit code(0/0/1)를 확인했다. fixture 레벨 값 4곳을 Astra 지적에 따라 완화했지만 이는 여전히 사람 검토 전이다. 실제 LLM 평가 정확도, 인젝션 방어, 반복 예산 상한 확정은 이번 범위에 없으며 완료를 주장하지 않는다.

<a id="astra-rereview-20260914"></a>

## 2026-09-14 — Astra 재검토: 해결 확인과 잔여 수정

검토자: Astra AI. 검토 시작 commit: `01309c5`. 현재 코드/기존 회귀 테스트를 읽고 `npm run typecheck`, `npm test`를 재실행해 142 pass / 0 fail을 확인했다. 실제 LLM 호출이나 사람 검토는 하지 않았다.

### 해결을 확인한 범위

- MAS-001: 질문 실패 뒤 판정/계산을 건너뛰며 score=null, 미실행 단계와 정상 withheld를 구분한다. 회귀 테스트와 구현 분기를 확인했다.
- MAS-003: 로컬 발췌의 마스킹/절단 내용이 analysisContext를 통해 기록형 provider 요청에 도달하고, 일반 결과 객체에는 해당 원문 맵을 넣지 않는 것을 확인했다. 전체 비밀 탐지/서비스 공개 API/실제 모델의 원문 재인용 방어를 인증한 것은 아니다.
- MAS-002의 입력 배선·20개 루브릭 전달·끝나지 않는 호출 제한은 구현됐다. MAS-004의 다른 assessment 근거 및 null provider 항목 차단도 구현됐다. 다만 아래 경로는 남았다.

### 재현한 잔여 결함

1. **MAS-002 — 실제 provider 예외가 단계 결과를 우회한다.** generateQuestions가 async throw하면 `withTimeout`의 rejection이 호출자까지 전파돼 OfflineEvaluationOutcome을 반환하지 않는다. 에러 모양의 canned providerError를 반환하는 테스트는 이 경로를 다루지 못한다. 질문/판정 각 호출에서 sync throw와 rejected Promise를 명시적인 해당 단계 실패로 바꿔야 한다. timeout 래퍼는 sync throw에서도 타이머를 정리해야 한다. 예외 상세의 토큰/원문을 일반 결과에 그대로 노출하지 않는다.
2. **MAS-004 — 질문 배열 생략 시 고아 답변 허용.** `validateBundleInvariants`의 `if (questions && ...)` 때문에 questions가 undefined일 때 임의 questionId를 가진 답변을 허용한다. 질문 기본값을 빈 집합으로 다루고 유효한 질문이 없는 모든 답변을 거부한다. 직접 조립한 빈 답변/잘못된 질문 grounding 참조도 입력 경계에서 검사한다.
3. **MAS-005 — modelInputHash가 실제 모델 입력의 동일성을 보증하지 못함.** 동일 fixture 두 번을 실제 실행하면 hash가 바뀐다(중첩 snapshot 메타데이터 등 잔존). 시각을 고정하면 hash가 같아지지만 provider가 받은 실제 판정 요청은 random question ID 때문에 다르다. 모델이 해당 필드를 의미 없게 취급할 것이라고 가정해 다른 입력을 같은 반복 실험으로 분류해서는 안 된다.

재현: [astra-rereview.mjs](../../../artifacts/phase2-fix/astra-rereview.mjs), 실행 출력: [astra-rereview.json](../../../artifacts/phase2-fix/astra-rereview.json). 루트에서 `node --import tsx artifacts/phase2-fix/astra-rereview.mjs`. 과거 재현처럼 문법 오류/스크립트 중단을 해결 증거로 삼지 말고 수정된 경계의 회귀 테스트를 추가한다.

### 이번 결정과 다음 범위

기존 구현을 전부 다시 작성하지 않는다. provider 예외, 고아 답변, 실제 단계 payload와 hash의 일치 세 항목만 보정한다. 일반 내용 비교 hash를 유지할 수 있지만 이름과 목적을 구분하고 반복 실험 동일성에는 실제 전송할 payload hash를 사용한다. 필요한 ID 정규화는 hash에만 적용하지 말고 실제 payload와 참조 매핑에도 똑같이 적용한다. event_time 같은 행동 시점 근거를 임의 삭제하지 않는다.

질문/판정 단계별 고정 실험 입력을 만들고 기록형 provider가 받은 내용과 hash가 일치하는지 검사한다. 모델 설정/프롬프트 버전은 함께 고정한다. 실제 API·예산은 계속 미정이며 이번 수정에 호출 비용이 필요하지 않다. 58회 계획도 실입력 동일성 검증 전에는 확정 실행량으로 취급하지 않는다.


## 2026-09-14 — Astra 구현 서브에이전트: MAS-002/004/005 잔여 경계 수정

작업: GitHub issue #1, 브랜치 `codex/evaluation-boundaries`, 기준 `3fa263b`. 사용자 요청에 따라 Astra가 구현을 위임한 독립 worktree에서 수행했다. 작성자 자체 테스트이며 사람 검토·실제 모델 타당성 확인은 아니다.

### 변경과 호환성

- MAS-002: `withTimeout`은 동기 호출도 Promise 안에서 실행해 모든 종료 경로에서 타이머를 해제한다. `invokeProviderSafely`가 질문·판정의 sync throw/async reject를 안전한 `provider_failure`로 변환한다. timeout은 별도 코드이며 늦은 resolve/reject는 결과를 바꾸지 않는다. provider가 직접 돌려준 오류 메시지도 사용자 결과에 복사하지 않는다. 기존 `provider_error` 실패 코드에 선택적 `providerCode`를 추가해 호환성을 유지하면서 원인을 구분한다.
- MAS-004: 질문 목록 생략/빈 목록에서 답변 참조를 거부한다. 공백 답변과 누락/외부 질문 grounding도 bundle 조립 시 거부한다. 미연결 사례 주장은 unresolved 유지, 기존 점수 규칙 변경 없음.
- MAS-005: `prepareProviderRequest`가 JSON으로 복제·동결한 payload를 실제 provider와 hash 계산에 함께 사용한다. `stageRequestHashes.questions/judgement`는 해당 요청의 정확한 JSON bytes에 대한 SHA-256이며 미실행은 null이다. provider가 기록한 요청을 다시 hash한 값과 일치한다. 사건 시각·질문 ID·참조·답변·발췌·루브릭·설정을 hash에서만 제거하지 않는다.
- manifest의 `pipelineVersion=phase2-fix-v2`. `bundleTextHash`는 전체 bundle 감사용으로 유지한다. manifest `modelInputHash`는 단계 hash 객체의 합성 hash로 변경됐으며 과거 의미와 비교하지 않는다. 단계 필드는 과거 manifest 읽기를 위해 타입상 optional이지만 새 오프라인 실행에서는 항상 존재한다. bundle 내부의 기존 `modelInputHash`/`computeModelInputHash`는 deprecated 전체 bundle 지문이며 실험 동일성에 사용하지 않는다.
- 반복 실험은 한 번 동결한 단계 payload를 매번 provider에 호출한다. UUID/실행시각 등 운영 기록은 이 고정 payload 밖에서 바뀔 수 있고, 실제 생성 질문이 달라지면 판정 요청 hash가 달라지는 것이 정상이다. 모델 응답 캐시는 사용하지 않는다. 향후 SDK adapter의 모델 선택·추가 envelope는 해당 전송 경계에서도 별도 기록해야 한다.

### 실제 검증

- `npm run typecheck`: 통과.
- `npm test`: **183 pass / 0 fail** (기존 170 + 신규 13). 질문·판정 각각 sync/async 실패, 타이머 해제, timeout 후 늦은 resolve/reject, 안전한 오류, 고아/빈 답변, 질문 grounding, 실제 요청 hash와 고정 payload 반복을 확인했다.
- CLI `scripts/evaluateOffline.ts`: 기존 case-02 generic/full-marks/malformed fixture 실행에서 각각 withheld/issued/failed, exit **0/0/1**, stdout JSON 1개를 확인했다. 실패 시 judgement hash는 null, score=null이다.
- `node scripts/checkDocs.mjs`: 33개 문서, 212개 로컬 링크, 오류 0 (기록 추가 전 실행).
- 변경 파일 자체 diff를 검토했다. 외부 API 호출·원문 세션 탐색·유료 리소스·fixture 사람 검토는 수행하지 않았다.

공통 BUGS/ROADMAP/CHANGELOG/DECISIONS 및 API 정본의 hash 변경 기록은 병렬 작업의 충돌 방지를 위해 루트 Astra가 통합한다. 이 작업은 source evaluation 및 해당 테스트/세션만 변경한다.
