# Phase 2 (Offline) Report — fixture 보정 + Task 2a 오프라인 구조 + Task 3 점수 엔진

정본 허브: [`../00_MASTER_PLAN.md`](../00_MASTER_PLAN.md). 지시문: [`CLAUDE_PHASE2_OFFLINE_PROMPT.md`](../../CLAUDE_PHASE2_OFFLINE_PROMPT.md). 설계 판단: [`ASTRA_PHASE1_REVIEW.md`](ASTRA_PHASE1_REVIEW.md).

**완료 기준은 "Task 2a와 Task 3 오프라인 구현·검증 완료"다.** 실제 평가 정확도, 사람 검토, 인젝션 방어, Task 2 전체 완료를 주장하지 않는다. 실제 LLM 호출·유료 리소스·배포는 이번 범위에 없다. 아래 모든 "질문/판정" 결과는 MockProvider가 테스트 코드가 직접 넣어준 값을 그대로 반환한 것이며, expected.json에서 읽어온 것이 아니다.

## 1. 구현한 파일

### fixture 보정 (Astra Phase 1 후속 검토 반영)

| 파일 | 역할 |
|---|---|
| `fixtures/calibration/cases/*/evidence_map.json` (6개: case-02, 04, 06, 07, 08a, 08b) | `collaboration_case.json`의 `linked_evidence_ids`(예: `ev_fixture_case02_test`)를 실제 IngestionSnapshot 경로에 연결하거나, 실제 자료가 없으면 `{"kind":"unresolved","reason":"..."}`로 명시 |
| `fixtures/calibration/cases/case-04-same-code-different-process/variant-{a,b}/expected.json`, `provenance.json` (신규) | case-04를 case-08 subvariant 패턴과 동일하게 variant별로 분리. 이전 case-level `expected.json`/`provenance.json`은 삭제 |
| `fixtures/calibration/cases/case-08-before-after/subvariant-{a,b,c}-*/expected.json` (수정) | subvariant-a의 제품에 없는 혼합 문자열(`insufficient_evidence_or_observed_with_caveat`) 제거, `expectedComparison`(단일 객체) → `expectedComparisons`(배열, 타입 정의됨)로 변경, A/E축 criteria 추가 |
| `fixtures/calibration/cases/case-03-good-code-no-process/{expected,provenance}.json`, `case-05-conflicting-evidence/expected.json` (수정) | `relatedFixtureIds`/`relatedVariants`가 가리키던 옛 `case-04-same-code-different-process` ID를 새 variant ID 두 개로 갱신 |
| `fixtures/calibration/README.md` (수정) | "Astra 또는 상준님" 식으로 Astra를 사람 검토 후보처럼 적었던 오표기 수정, `evidence_map.json`/Phase 2 절 추가 |
| `src/shared/contracts/calibration.ts` (수정) | `ExpectedComparison`(`previousStatus`/`currentStatusOptions`/`expectedEvidenceChange`/`expectedBehaviorChange`) 타입 추가 -- 실제 제품 열거형만 사용하고 혼합 문자열을 허용하지 않음 |
| `tests/calibration/fixtures.test.ts` (수정) | case-04를 variant 2개 항목으로 분리, `expectedComparisons` 배열의 열거형·criterionCode 유효성 검증 추가 |

### Task 2a — 오프라인 질문·판정 구조

| 파일 | 역할 |
|---|---|
| `src/shared/contracts/evaluation.ts` | Evidence/CollaborationCase/Question/Answer/CriterionResult/MyAiScore/ConfidenceSummary/EvaluationManifest 타입(EVIDENCE_SCHEMA.md 3~6절 매핑, 내부 camelCase) |
| `src/server/evaluation/evidenceMap.ts` | fixture의 `evidence_map.json`을 실제 IngestionSnapshot/excerpt 파일에 대조해 Evidence를 만들거나 명시적 미연결로 보고(`resolveLinkedEvidence`, `resolveExternalExcerpts`) |
| `src/server/evaluation/loadCollaborationCase.ts` | `collaboration_case.json`(snake_case wire 포맷)을 내부 camelCase `CollaborationCase`로 파싱 |
| `src/server/evaluation/inputAssembly.ts` | provider에 전달할 입력 번들 조립 + 결정적 텍스트 해시(순환 참조 안전, 아래 5절 버그 기록 참고) |
| `src/server/evaluation/prompts/questionPromptV1.ts`, `judgePromptV1.ts` | 질문/판정 프롬프트 버전 텍스트(Task 2b가 실제로 보낼 내용) -- 이번 단계에서는 어디에도 전송되지 않고, manifest 해시 계산에만 쓰임 |
| `src/server/evaluation/provider.ts` | provider-독립 인터페이스(`EvaluationProvider`) |
| `src/server/evaluation/mockProvider.ts` | 테스트가 넣어준 canned response만 반환하는 `MockProvider` -- expected.json을 읽지 않음 |
| `src/server/evaluation/questionGeneration.ts` | provider 출력 검증: 정확히 3개, 서로 다름, grounding evidence 유효성, target_criteria 유효성. 실패 시 명시적 `ok:false` |
| `src/server/evaluation/criterionJudgement.ts` | provider 출력 검증: A~E 중복/누락 거부, level 1~4 정수, observed↔not_observed/insufficient_evidence와 level의 조합, blockingConflict=true↔insufficient_evidence 강제, 근거 참조 검증, dimensionScore는 항상 코드가 계산 |
| `src/server/evaluation/manifest.ts` | mode/versions/텍스트 해시/토큰·비용 null+사유 기록 |
| `src/server/evaluation/runOfflineEvaluationForFixture.ts` | 위 전부를 묶어 fixture 하나에 대해 수집→근거연결→질문→답변→판정→점수까지 실행하는 오케스트레이션(CLI와 테스트가 공유) |
| `src/server/ingestion/localRepoFixtureBuilder.ts` | Phase 1의 `tests/calibration/localRepoToFixtures.ts`를 `src/`로 이동(운영 코드인 CLI가 테스트 코드를 import하지 않도록). 기존 테스트 파일은 재수출만 함 |

### Task 3 — 결정적 Scoring / Confidence

| 파일 | 역할 |
|---|---|
| `src/server/scoring/scoreCalculator.ts` | `computeMyAiScore` -- SCORING_RUBRIC.md 5절 공식, 구조 검증(`ScoringContractError`), `ingestionStatus=failed/not_started` 호출 거부(`IngestionNotScorableError`) |
| `src/server/scoring/confidenceSummary.ts` | `computeConfidenceSummary`, `deriveProcessEvidenceLevel` -- CONFIDENCE_MODEL.md 2절 매핑 |

### CLI 및 mock 데이터

| 파일 | 역할 |
|---|---|
| `scripts/evaluateOffline.ts` | `npm run evaluate:offline -- --case <dir> --mock-response <file> [--answers <file>]` -- stdout에 JSON 1개, stderr에 진행 로그, mode=mock 명시 |
| `fixtures/mock-responses/case-02-generic-valid.json` | 구조적으로 유효한 canned 질문/판정 응답 예시(손으로 작성, expected.json과 무관) |
| `fixtures/mock-responses/case-02-fixed-answers.json` | CLI 데모용 고정 답변 3개 |
| `fixtures/mock-responses/malformed-wrong-question-count.json` | 질문 2개(계약 위반)로 명시적 실패를 보여주는 canned 응답 |

### 테스트 (신규, 모두 오프라인/네트워크 없음)

`tests/scoring/scoreCalculator.test.ts`(17), `tests/evaluation/{questionGeneration,criterionJudgement,evidenceMap,fixtureEvidenceResolution,runOfflineEvaluationForFixture}.test.ts`(22+13+6+6+3=50), `tests/evaluation/testHelpers.ts`(헬퍼).

## 2. 실행 명령과 결과

```bash
npm run typecheck      # tsc --noEmit -- 통과
npm test               # node --import tsx --test tests/**/*.test.ts -- 108개 테스트, 108 pass, 0 fail
```

기존 Phase 1의 53개 테스트는 전부 그대로 통과했다(회귀 없음). 새로 추가된 55개(scoring 17 + evaluation 38)도 전부 통과했다. **이 108개 통과가 "실제 평가 정확도가 검증됐다"는 뜻은 아니다** -- 전부 구조/계약 검증이거나, MockProvider가 테스트 코드 자신이 넣어준 값을 그대로 돌려주는 것을 확인하는 것뿐이다.

offline CLI 실행(실제로 실행함, `mode=mock`, 네트워크 없음):

```bash
npx tsx scripts/evaluateOffline.ts \
  --case fixtures/calibration/cases/case-02-simple-tool-strong-verification \
  --mock-response fixtures/mock-responses/case-02-generic-valid.json \
  --answers fixtures/mock-responses/case-02-fixed-answers.json
```

산출물: `artifacts/phase2-offline/case-02-offline-run.json` (+ `.stderr.log`). 결과 요약: `evidenceCount=4`(evidence_map으로 연결된 `ev_fixture_case02_test` 1개 + 저장소의 나머지 3개 파일이 자동으로 인용 가능 후보에 추가됨), 질문 3개 생성 성공, 판정 5축 중 D만 observed(mock이 그렇게 응답하도록 만들었기 때문), `score.status=withheld`(`insufficient_dimensions`, `observedDimensions=1`) -- Task 3 점수 엔진이 실제로 이 mock 판정을 넣어 동작함을 보여준다.

실패 경로도 실제로 실행함(질문 2개짜리 계약 위반 mock 응답):

```bash
npx tsx scripts/evaluateOffline.ts \
  --case fixtures/calibration/cases/case-02-simple-tool-strong-verification \
  --mock-response fixtures/mock-responses/malformed-wrong-question-count.json
```

산출물: `artifacts/phase2-offline/case-02-malformed-run.json`. 결과: `questions.ok=false`(`wrong_question_count`), `judgement.ok=false`(`duplicate_or_missing_codes`, criteria가 빈 배열이라 A~E 전부 누락), `score=null`. 계약 위반을 정상 보류나 임의의 0점으로 숨기지 않음을 실행으로 확인했다.

`npm run` 대신 `npx tsx`로 직접 실행한 이유: `npm run evaluate:offline -- ...`은 npm이 stdout 맨 앞에 `> myaiscore-phase1@0.1.0 evaluate:offline\n> tsx ...\n\n` 배너를 붙여, "stdout은 JSON 문서 1개"라는 계약을 실제로 깬다(리다이렉트해서 `JSON.parse`로 직접 확인함). `scripts/ingest.ts`도 같은 npm 래퍼 문제를 이론적으로 안고 있으나 Phase 1 보고서는 이를 리다이렉트해서 파싱 검증한 적이 없어 발견되지 않았다. 이번 세션에서 발견한 이 사실을 여기 기록한다 -- **README.md는 이제 두 CLI 모두 `npx tsx` 직접 호출을 예시로 보여준다.**

## 3. case-04 / case-08 기대값을 어떻게 보정했는지, 무엇이 여전히 없는지

### case-04 (variant-a / variant-b 분리)

Astra 검토(ASTRA_PHASE1_REVIEW.md 2절)가 명시적으로 거부한 것: "B=3 강제", "C=3~4 강제(코드가 같다는 이유로)", "D=3~4를 두 variant 모두에 부여", "긴 서술/코드와의 단순 일치만으로 A/E 3~4 확정". 이번에 다시 쓴 두 variant의 `expected.json`은:

- **B**: 두 variant 모두 `insufficient_evidence`로 낮췄다(이전엔 variant-a=observed level 3이었음). AI 제안의 결함을 알아챘다는 서술은 있지만 실제 맥락·위임 범위 전달 근거가 아니라는 게 이유다.
- **C**: 두 variant 모두 `not_observed`로 바꿨다(이전엔 "D와 동일 근거 재사용 가능"이라며 observed level 3~4를 열어뒀음). 도구 선택 근거 자체가 서술에 없다.
- **D**: variant-a는 `observed` level **[2,3]**(이전 제안의 [3,4]에서 하향, 실제 실행/결과 해석의 독립적 확인이 없어서), variant-b는 `not_observed`(이전엔 미기재 -- variant-b가 자기 서술에서 그 파일을 전혀 언급하지 않는다는 점을 근거로 "같은 코드니까 재사용" 대신 독립적으로 낮게 판정).
- **A/E**: variant-a는 각각 level [2,2]로 하향(이전 제안 없음/암묵적으로 높음). variant-b의 A는 오히려 `observed` level [1,1]로 -- 서술 자체가 SCORING_RUBRIC A-1 예시와 문자 그대로 일치해 "모호함이 관찰됨"이 성립하기 때문(비어있지 않은 나쁜 서술 ≠ not_observed).

**여전히 없는 것**: 이 레벨 구간들은 여전히 사람이 검토하지 않은 AI(Claude Code) 자체 판단이다. 실제 evaluator가 이 구간 안에 들어오는지는 Task 2b 실행 전까지 확인되지 않는다. `humanReviewed`는 계속 `false`다.

### case-08 (subvariant a/b/c)

- **subvariant-a**: `expected.json`의 `currentStatus: "insufficient_evidence_or_observed_with_caveat"`라는, 제품 열거형에 없는 문자열을 제거했다. 대신 `evidence_map.json`에 `ev_fixture_case08a_old_log`를 `unresolved`로 명시(실제 로그 발췌 파일이 이 fixture에 없다는 사실을 코드로도 확인 가능하게 함, `tests/evaluation/fixtureEvidenceResolution.test.ts`), `expectedComparisons[0].currentStatusOptions`를 `["insufficient_evidence", "observed"]` 배열로 바꿔 "이 fixture만으로 사후 상태를 하나로 확정할 수 없다"는 사실을 타입이 있는 형태로 표현했다.
- **subvariant-b**: A(level [2,2])와 E(level [3,3])를 추가했다. Astra 지시대로 "D가 높다고 A/B를 자동으로 올리지 않는다"는 원칙을 rationale에 명시했다 -- A/E는 D와 근거를 일부 공유하지만 각 축 고유의 기준(목표 구체성, 수용 전후 효과 확인)으로 별도 평가했다.
- **subvariant-c**: A(level [1,1] -- `done_criteria: "테스트 파일이 있으면 됨"`이 실질과 무관한 완료조건이라는 점)와 E(level [1,1] -- 무의미한 테스트 파일 추가 + 미해결 버그라는 *구체적 반증*이 있어 "수정 커밋 없음=무비판 수용" 오류를 피하면서도 관찰 가능하다고 판단)를 추가했다.

**여전히 없는 것**: subvariant-b/c의 A/E 레벨도 마찬가지로 미검증 AI 판단이다. 특히 subvariant-c의 E=1은 이 보고서 작성자(Claude Code) 스스로도 확신도가 낮다고 표시한다 -- "무의미한 테스트 + 미해결 버그"가 실제로 "근거 검토 없는 수용"을 입증하는지, 아니면 단순히 "효과 없는 행동"과 "무비판성"을 혼동한 것인지는 SCORING_RUBRIC.md가 이 정밀도까지 규정하지 않는다. Task 2b 실행 후 재검토가 필요한 지점으로 남긴다.

## 4. Mock 테스트로 확인한 것 vs 확인하지 않은 것

**확인한 것 (전부 오프라인, MockProvider의 canned response로 검증한 계약/구조):**

- 정상 JSON → 질문 3개/판정 5개 생성 (questionGeneration/criterionJudgement 각 happy-path 테스트)
- 질문 개수 오류(2개), 중복 질문, 빈/무효 grounding_evidence_ids, 잘못된 target_criteria → 명시적 실패
- 판정 축 중복/누락, level 범위 밖(0, 5, 소수), observed인데 evidence 없음, not_observed인데 level 있음, `blockingConflict=true`인데 `status=observed` → 명시적 실패
- 이 assessment 소속이 아닌 evidence_id 인용(질문/판정 양쪽) → 명시적 실패("깨진 참조")
- provider 전송 실패(timeout/5xx류) → 명시적 실패, 조용한 재시도나 기본값 대체 없음
- `dimensionScore`는 항상 `level*25`로 코드가 재계산(provider가 다른 숫자를 보내도 무시)
- `evidence_map.json` 기반 실제 fixture 경로 연결(case-02/04/08b) 및 명시적 미연결(case-08a) -- 실제 IngestionSnapshot과 대조해 검증
- Task 3 점수 공식 73/25/100 정확한 값, 4/5 관찰이어도 withheld, ingestion partial이면 5/5여도 withheld, 충돌 시 withheld, 입력 순서 무관, 구조 오류(중복/누락/범위밖/깨진참조)는 조용한 withheld가 아니라 예외

**확인하지 않은 것 (Task 2b 없이는 확인 불가능):**

- 실제 LLM이 이 프롬프트로 실제로 3개의 좋은 질문/타당한 판정을 만드는지 -- MockProvider는 항상 테스트가 넣어준 값을 그대로 반환할 뿐 어떤 추론도 하지 않는다
- case-06 프롬프트 인젝션에 실제 모델이 저항하는지 -- 이번 세션은 evidence_map.json으로 "README의 조작 지시가 여전히 파일 콘텐츠로만 존재한다"는 정적 사실만 재확인했고, 실제 before/after 판정 비교 실험은 실행하지 않았다(5절 계획 참고)
- case-04/08의 레벨 범위가 실제로 맞는지 -- 3절에서 설명한 대로 사람 검토 전이다
- 토큰 수·비용·지연시간 -- `manifest.tokensUsed`/`costUsd`는 항상 `null`이며 이는 "0"이 아니라 "측정 대상 자체가 없었다"는 뜻이다

## 5. Task 2b 실행 계획 (실제 모델 호출 전 승인 필요)

**전제**: 모델·접속 방식·예산은 미정(ASTRA_PHASE1_REVIEW.md 5절). 아래는 승인 시 실행할 계획과 호출 수 산정이며, 아직 실행하지 않았다.

### 5.1 고유 입력 변형 목록 (중복 제거)

| # | 입력 | 비고 |
|---|---|---|
| 1 | case-01 | |
| 2 | case-02 (= case-07의 반복 대상 = case-06의 "before") | 3개 계획이 동일 입력을 가리키므로 실행을 통합한다 |
| 3 | case-03 | |
| 4 | case-04 variant-a | |
| 5 | case-04 variant-b | |
| 6 | case-05 | |
| 7 | case-06 "after" (README 조작 지시 삽입) | |
| 8 | case-08 "before" (v1-baseline, 사례 없음) | subvariant a/b/c가 공유 -- 3번 대신 1번만 실행 |
| 9 | case-08 subvariant-a "after" | |
| 10 | case-08 subvariant-b "after" | |
| 11 | case-08 subvariant-c "after" | |

**중복 실행 식별**: case-07은 별도 입력이 아니라 #2의 5회 반복이다. case-06 "before"도 별도 입력이 아니라 #2와 동일하다(collaboration_case.json 원문이 "case-02와 동일한 서술"이라고 명시). case-08의 "before"는 세 subvariant가 완전히 동일한 입력(v1-baseline, 사례 없음)이므로 1회만 실행한다.

### 5.2 실행 단계별 호출 수 (질문 생성 1회 호출 + 판정 1회 호출 = 입력 1개당 2회, 재시도 미포함)

| 단계 | 대상 | 반복 | 호출 수 |
|---|---|---|---|
| A. 일반 탐색 1회 패스 | 위 11개 고유 입력 각 1회 | 1 | 11 × 2 = **22** |
| B. case-07 변동 관찰 (CALIBRATION_PLAN §4) | #2와 동일 입력 | 5회 총 (A의 1회를 그중 1회로 재사용 → **4회 추가**) | 4 × 2 = **8** |
| C. case-06 "after" 변동 관찰 | #7과 동일 입력 | 5회 총 (A의 1회 재사용 → **4회 추가**) | 4 × 2 = **8** |
| D. case-06 판정 격리 실험 (ASTRA §4: 질문·답변·모델·버전·설정 고정, 공격 문구만 변경) | before/after 각 5회, **질문 생성은 재사용하지 않고 고정된 질문 세트로 판정만 호출** | before 5 + after 5 | 10 × 1(판정만) = **10** |
| E. case-06 질문 생성 격리 실험 (ASTRA §4: 질문 생성기는 별도 before/after 실험으로 검사) | before/after 각 5회, **판정은 실행하지 않고 질문 생성만 호출** | before 5 + after 5 | 10 × 1(질문만) = **10** |
| **합계** | | | **58회** |

이 58회는 "정상적으로 한 번에 성공"했을 때의 수치다. ASTRA_PHASE1_REVIEW.md 5절의 재시도 정책("보정은 최대 2회로 계획하며 모두 동일한 승인 예산 안에 포함")을 반영하면, 실패 케이스마다 최대 2회 재시도가 추가될 수 있어 최악의 경우 이론적 상한은 **최대 174회**(3배)다. 실제로는 "첫 명백한 실패를 발견하면 불필요한 유료 배치를 중단하고 원인을 분석한다"(ASTRA §4)는 원칙에 따라 실패가 관찰되는 즉시 나머지 반복을 중단해야 하므로, 실제 호출 수는 58~174 사이에서 조기 종료로 더 낮게 끝나는 것이 정상 경로다.

### 5.3 비용

모델·가격이 미정이므로 **비용은 산정하지 않는다**(ASTRA_PHASE1_REVIEW.md 5절 "가격·모델 미정이면 비용은 미산정으로 남긴다"). 위 58~174회는 호출 *횟수*이며 토큰 수·비용과는 별개다. 모델이 정해지면 이 표의 호출 수에 예상 프롬프트 크기(수집 스냅샷 크기, `INGESTION_LIMITS.maxTotalContentBytes=800KiB` 상한 기준)를 곱해 토큰 예산을 다시 산정해야 한다.

### 5.4 실패 처리

- 5회 반복 결과에 통계적 유의성을 주장하지 않는다(CALIBRATION_PLAN §4).
- D 실험(판정 격리)에서 after의 임의 축 level이 before보다 높거나, rationale/질문 텍스트에 README의 지시 문구가 그대로 인용되면 즉시 중단하고 원인 분석(PHASE1_FOLLOWUP.md §4의 실패 기준, ASTRA_PHASE1_REVIEW.md §4로 보정됨).
- 미해결 실패는 "통과"로 기록하지 않는다. 재시도 2회까지도 실패하면 미완료로 보고한다.

## 6. 작은 구현 선택 (근거 기록)

1. **`CriterionResult.missingEvidence`를 단일 문자열로 구현**했다. EVIDENCE_SCHEMA.md는 `missing_evidence`의 정확한 타입(문자열/배열)을 명시하지 않는다 -- "무엇이 부족한지"를 한 문장으로 설명하는 필드로 해석했다. 배열이 필요하다고 판단되면 Task 5 이전에 재검토한다.
2. **평가되지 않은 저장소 파일도 evidence 후보에 자동 포함**(`runOfflineEvaluationForFixture.ts`). `collaboration_case.json`이 명시적으로 링크하지 않은 파일도 질문이 근거로 인용할 수 있어야 한다고 판단했다(사용자가 언급하지 않은 코드에 대해서도 질문할 수 있어야 하므로). 이 후보들의 `evidenceId`는 `cand_<path>` 형식이다.
3. **`inputAssembly.ts`의 순환 참조 감지 버그를 이번에 발견·수정**했다. 최초 구현은 방문한 객체를 전역 `WeakSet`에 영구 등록해, 실제로는 순환이 아니라 "다른 가지에서 같은 참조가 두 번 나타나는" 흔한 경우(예: 같은 `{startLine, endLine}` 리터럴을 여러 파일이 참조)도 순환으로 오판해 예외를 던졌다. 스택 기반(진입 시 추가, `finally`에서 제거)으로 고쳐 실제 순환만 잡도록 했다 -- `npx tsx scripts/evaluateOffline.ts ...`를 처음 실행했을 때 이 버그로 실패한 것을 직접 재현해 확인했다.
4. **CLI는 `npm run`이 아니라 `npx tsx` 직접 호출을 "stdout=JSON 1개" 계약의 기준으로 삼는다**(2절 참고). `scripts/ingest.ts`도 동일한 특성을 가지므로 이 사실을 README.md에도 반영했다.

## 7. 계약 변경 여부

`src/shared/contracts/calibration.ts`에 `ExpectedComparison`/`EvidenceChangeType`/`BehaviorChangeType`을 추가했다 -- 이는 fixture 전용 테스트 계약의 확장이며 SCORING_RUBRIC.md/EVIDENCE_SCHEMA.md/API_DATA_CONTRACTS.md의 실제 제품 계약을 변경하지 않는다(EVIDENCE_SCHEMA.md 8절이 이미 정의한 열거형 값만 사용). `src/shared/contracts/evaluation.ts`는 EVIDENCE_SCHEMA.md 3~6절을 그대로 구현했으며, Phase 1과 동일하게 내부는 camelCase, 문서 예시는 snake_case다(PHASE1_FOLLOWUP.md §2, ASTRA_PHASE1_REVIEW.md §1에서 이미 채택된 방향). API 계층·범용 재귀 변환기는 Task 5로 남겼다.

가중치 15/20/15/30/20, 점수 공식, 발급 조건은 변경하지 않았다. 개인 데이터 정책(공통 캐시/개인 평가 분리)도 변경하지 않았다 -- `evidence_map.json`은 fixture(synthetic) 전용 도구이며 실제 서비스의 Evidence 저장소를 대체하지 않는다.

## 8. 요약

fixture 보정(evidence_map.json 6개, case-04 variant 분리, case-08 계약 정합성 수정), Task 2a 오프라인 질문·판정 구조(provider 인터페이스, MockProvider, 검증기 2종, manifest), Task 3 결정적 점수 엔진을 구현하고 108개 테스트 전부 통과, offline CLI를 성공/실패 경로 각 1회 실제 실행해 확인했다. 실제 LLM 호출·인젝션 방어 검증·사람 검토·Task 2 전체 완료는 이번 범위에 없으며 수행하지 않았다. Task 2b 실행 계획(고유 입력 11개, 예상 호출 58~174회, 비용 미산정)을 5절에 남겼다.
