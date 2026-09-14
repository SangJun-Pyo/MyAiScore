# Astra Phase 2 오프라인 검토 — 2026-09-14

검토자: Astra AI. 대상: [구현 보고서](PHASE2_OFFLINE_REPORT.md), 평가 입력·provider·질문/판정 검증기·오케스트레이션·점수/Confidence 코드. 실제 모델 실험·전체 보안 감사는 아니다.

**판정: 계산과 기본 계약 검증은 진전됐지만 Task 2a/3 최종 수용은 아래 수정 후 재검토한다. 실제 LLM 연결은 아직 진행하지 않는다.**

## 실제 검증

- `npm run typecheck` 통과. `npm test`를 재실행해 108 pass / 0 fail 확인.
- case-02 CLI도 기존 고정 답변/정상 mock으로 재실행했다. stdout JSON 파싱 성공, exit=0, mode=mock, 질문/판정 성공, 정상 withheld 확인.
- 별도 synthetic 경계 입력으로 아래 네 동작을 재현했다. 네트워크/유료 호출 없음.
- 재현 출력 원본: [observed-before-fix.json](../../artifacts/phase2-review/observed-before-fix.json).
- 재현 스크립트: [astra-probes.mjs](../../artifacts/phase2-review/astra-probes.mjs). 루트에서 `node --import tsx artifacts/phase2-review/astra-probes.mjs` 실행. 기존 버그 관찰용 스크립트이며 수정 후 고정된 회귀 테스트를 대신하지 않는다.

```json
{
  "invalidQuestionsThenScore": {"questionsOk": false, "judgementOk": true, "score": {"status": "issued", "value": 100, "reasons": [], "observedDimensions": 5, "totalDimensions": 5}},
  "foreignAssessmentEvidenceAccepted": true,
  "nullEntryBehavior": {"questions": "TypeError", "criteria": "TypeError"},
  "excerptBodyRetained": false
}
```

## 수정 필수

### R1. 질문 실패 후 판정·점수 발급이 계속됨 (P1)

`runOfflineEvaluationForFixture.ts`는 questions.ok=false여도 judgeCriteria를 호출한다. 질문이 0개인 응답과 형식상 유효한 5축 최고 mock을 함께 넣으면 질문 실패와 100점 발급이 동시에 나온다. 기존 실패 데모는 판정 응답도 잘못돼 우연히 점수가 없었을 뿐이다.

수집 실패 → 질문 미실행, 질문 실패 → 판정/점수 미실행, 판정 실패 → 점수 미실행을 강제한다. 미실행과 실패를 구분하고 첫 실패를 보존한다. 점수 계약 오류를 score.withheldForContractReason으로 반환하지 말고 단계 오류와 score=null로 처리한다. CLI의 파이프라인 실패는 비정상 종료 코드, 정상 withheld는 정상 종료 코드로 구분한다.

### R2. 실제 판정 입력과 기준이 provider에 연결되지 않음 (P1)

provider 인터페이스의 generateQuestions()/judgeCriteria()는 인수가 없고 실행기는 항상 MockProvider를 내부 생성한다. bundle과 프롬프트는 manifest hash에만 쓰인다. judgePromptV1에는 축별 20개 행동 기준과 반례가 없으므로 현재 텍스트만 전송해서는 정본의 레벨 의미를 알 수 없다.

provider를 주입하고 단계별 요청(신뢰되는 지시/루브릭, 비신뢰 자료, 질문·답변, 버전·실행 제한)을 실제로 전달한다. 기록형 mock으로 받은 요청을 검사한다. 정본의 축별 기준을 버전 관리된 모델 입력으로 제공하고 실제 전송할 텍스트의 hash를 기록한다. expected.json은 provider 입력이나 mock 응답 생성 경로에 넣지 않는다. timeout 에러 객체 반환 테스트와 실제 끝나지 않는 provider 호출을 제한 시간에 중단하는 테스트를 구분한다.

### R3. 사용자 발췌 원문이 사라짐 (P1)

resolveExternalExcerpts는 로그를 읽고 hash를 계산하지만 반환하는 Evidence에는 파일명 요약만 남긴다. 조립된 bundle에 실제 로그 내용이 없음을 synthetic 고유 문자열로 확인했다. 실제 모델은 로그의 실패/통과·시각·반례를 읽을 수 없다.

Evidence 영구 메타데이터와 일시적인 분석 원문을 분리한다. 제한·마스킹된 내용과 evidence ID의 매핑을 모델 입력에 포함하되 공개 DTO/일반 로그/영구 결과에 원문을 퍼뜨리지 않는다. 협업 사례·답변도 필요한 경우 독립적인 자기진술 출처로 인용할 수 있어야 하며, 이를 검증된 실행 사실로 승격하지 않는다. fixture 로컬 파일 해석은 명시된 fixture 루트 안으로 제한하고 외부 URL을 자동 조회하지 않는다.

### R4. assessment와 입력 구조 검증이 부족함 (P1)

질문/판정 검증은 bundle.evidence의 ID 집합만 검사하고 각 Evidence.assessmentId가 현재 assessment와 같은지 확인하지 않는다. 타 assessment의 근거를 bundle에 넣으면 질문 검증이 통과했다. 입력 조립에도 차단이 없다. 질문/판정 배열의 null 항목은 명시적 실패 대신 TypeError를 일으켰다.

입력 경계에서 case/evidence/question/answer의 소속과 참조를 검사하고 ID 중복을 거부한다. 답변은 실제 질문에 연결돼야 하며 중복 답변·깨진 evidence ID·빈 답변을 유효 근거로 취급하지 않는다. 검증기는 unknown의 null/배열/primitive를 안전하게 거부한다. 점수 엔진도 유효한 assessment/근거 집합을 필수로 받거나 검증 완료 타입을 요구하고 status/ingestion 열거형을 런타임에서 확인한다. 현재 validEvidenceIds는 선택적이라 생략하면 잘못된 참조도 검사하지 않는다.

## 함께 바로잡을 해석과 실험 계획

- **과정 자료 표시:** deriveProcessEvidenceLevel은 사례가 연결한 정적 파일 한 개만 있어도 linked_records를 반환한다. CONFIDENCE_MODEL은 실제 관련 과정 발췌·변경 기록을 요구한다. 자료 타입·연결 내용을 고려하고 사례 없는 답변/과정 발췌도 구분한다. 단순 코드 링크를 검증된 과정으로 표시하지 않는다.
- **fixture 고정 정답:** case-04b의 모호한 사후 답변 문구만으로 A=1을 확정하면 실제 작업 중의 모호한 요청/미확인 행동을 추론하게 된다. 테스트 파일을 언급하지 않았다는 이유만으로 D=not_observed를 강제할 수도 없다. case-08c도 효과 없는 결과와 무비판적 수용을 구분한다. 명시된 자료가 지지하지 않는 정확한 레벨을 gold 정답으로 넣지 말고 미확인/금지 추론을 기록한다. 실제 관련 자료가 없는 08a 로그에는 observed를 허용하는 기대를 그대로 두지 않는다. 뒤늦게 제출된 실제 로그가 있는 별도 변형이라면 근거에 따라 observed가 가능하다.
- **인젝션 기준:** 보고서 §5.4에 다시 들어간 '공격 문구 인용이면 즉시 실패'는 이전 보정과 충돌한다. 공격 식별을 위한 인용은 허용하며 명령 복종/증거 오인/무단 실행이 실패다. 단일 레벨 차이는 조사하고 해소되지 않으면 통과하지 않는다.
- **반복 예산:** 58~174회는 승인된 실행량이 아니다. 설계 보정 최대 2회와 요청별 자동 재시도 2회는 다르다. 무조건 세 배 호출하지 않는다. case-02/06/07은 서술이 비슷해도 case/evidence ID 등이 다르므로 모델에 실제 전달된 입력이 동일한지 확인한 뒤에만 중복 제거한다.
- **반복 입력:** 현재 bundle hash에는 random assessment/question/answer ID, collectedAt, 요청 시간 등이 포함된다. 감사용 전체 실행 hash는 유지하되 반복 실험은 고정된 실제 모델 입력을 사용한다. 운영용 ID의 소유 격리는 유지하면서 테스트 안에서 ID·시각을 주입/고정한다. 다른 입력을 같은 입력 실험이라고 부르지 않는다.

## 다음 범위

[CLAUDE_PHASE2_FIX_PROMPT](../../CLAUDE_PHASE2_FIX_PROMPT.md)로 위 문제를 수정한다. 기존 108개에 더해 회귀 테스트와 실제 요청을 기록하는 mock 통합 테스트를 수행한다. API/예산은 사용자 답변 '미정'을 유지한다. 이번에는 문서 정리만 반복하지 않고 재현 결함의 코드 수정을 완료한다.
