# Claude Phase 2 — fixture 보정 + 오프라인 평가 구조 + 점수 엔진

프로젝트: C:/Users/sangj/MyAiScore

이번 지시는 완료된 Phase 1 지시를 대신하는 다음 작업이다. Astra가 설계 판단을 맡고 Claude Code가 구현한다. 서비스 API·예산에 대한 사용자 답변은 '미정'이다. 다음 범위는 추가 승인 질문 없이 구현하며 실제 LLM 호출은 하지 않는다.

## 목표와 읽을 파일

Task 2를 Task 2a(오프라인 구현)와 Task 2b(실제 모델 실험)로 분리하고, 지금 Task 2a 및 독립적인 Task 3 점수 엔진을 구현한다.

읽기 순서:
1. docs/00_MASTER_PLAN.md, AGENTS.md, CLAUDE.md
2. docs/Development/ASTRA_PHASE1_REVIEW.md — 이번 설계 판단
3. docs/Assessment/{SCORING_RUBRIC,EVIDENCE_SCHEMA,CONFIDENCE_MODEL,CALIBRATION_PLAN}.md
4. docs/Development/{DECISIONS,IMPLEMENTATION_TASKS}.md
5. 실제 fixtures, 기존 contracts 및 수집 코드

PHASE1_FOLLOWUP.md §3/4는 미채택 제안이며 ASTRA_PHASE1_REVIEW의 보정을 적용한다. Claude 자신을 Astra라고 기록하지 않는다.

## A. fixture 기대와 근거 연결 보정

- case-04의 variant-a/b, case-08 before/after를 각각 식별해 기대 상태를 표현한다. currentStatus에 제품에 없는 혼합 문자열을 넣지 않는다. 필요하면 테스트 전용 허용 상태/행동 제약을 명시한 최소 타입 확장을 한다.
- case-04 B/C/D 자동 고레벨, case-08 과거 로그에 의한 레벨 변화 금지, 동일 코드라서 A/B 불변이라는 전제를 제거한다.
- 모든 collaboration_case의 linked_evidence_ids와 external_excerpts를 로딩한 실제 Evidence에 연결하는 경로를 검증한다. fixture ID에서 assessment별 ID로 매핑을 명시한다. 자기 사례 전체를 참조로 붙여 순환적으로 모든 주장을 입증하지 않는다.
- 실제 자료가 없는 참조는 실패 또는 명시적인 미연결 주장으로 처리한다. expected 경로 존재 검사만으로 근거 연결 완료를 주장하지 않는다.
- 사례 원문을 원하는 레벨에 맞게 조용히 수정하지 않는다. 입력 보완이 필요하면 별도 synthetic 변형으로 분리하고 왜 필요한지 보고한다. 자료로 결정할 수 없는 레벨은 정확한 숫자를 강제하지 않는다.
- synthetic=true, humanReviewed=false를 유지한다. 이번 모의 실행으로 provenance.executedAt을 실제 모델 평가 시각처럼 채우지 않는다. AI 검토자 오표기를 fixture README/보고서에서 바로잡는다.

## B. Task 2a: 질문·판정의 오프라인 구현

- provider와 독립적인 인터페이스, 테스트용 MockProvider, 질문/판정 프롬프트 버전 파일, 입력 조립과 결과 검증기를 만든다. 아직 특정 제공사의 SDK·키·실제 모델 ID가 필요하지 않다.
- 수집 입력은 기존 IngestionSnapshot을 재사용한다. 코드·사례·발췌·답변을 신뢰하지 않는 자료로 분리하고 expected.json과 정답 레벨은 모델 입력에 넣지 않는다. MockProvider도 expected.json을 읽어 정답을 반환하는 구조로 만들지 않는다.
- source/assessment ID와 실제 자료 범위를 검증한다. 사용자 URL을 자동 조회하거나 제출 저장소의 코드/install/build/test/hooks/MCP를 실행하지 않는다.
- 질문: 서로 다른 정확히 3개, 유효한 groundingEvidenceIds, 허용된 targetCriteria. 근거가 없어 질문 생성 계약을 충족할 수 없으면 명시적인 실패로 처리하고 가짜 질문을 만들지 않는다.
- 판정: A~E 각 1개, 허용 상태, observed의 1~4 정수 레벨과 유효 근거, 미확인의 null, blockingConflict 규칙을 검사한다. 다른 assessment의 근거·깨진 참조·중복/누락 축·범위 밖 레벨을 거부한다.
- dimensionScore는 level에서 코드로 도출한다. 모델의 임의 숫자를 신뢰하지 않는다. 최종 숫자와 발급 상태는 Task 3이 계산한다.
- 모의 응답으로 정상·잘못된 JSON·잘못된 열거형·잘못된 참조·시간 초과·provider 실패를 재현한다. 도메인 오류를 임의의 0점이나 정상 보류로 숨기지 않는다.
- CLI에서 synthetic snapshot/case/고정 답변 → 질문 결과/축 판정/점수 결과를 확인할 수 있게 한다. 모든 출력과 manifest에 mode=mock, 실제 LLM 미호출을 표시한다. 토큰·비용을 측정하지 않았다면 null과 사유를 기록한다.
- 텍스트 hash, rubric/pipeline/question/evaluator/inference-config 버전을 manifest에 기록한다. mock ID와 실제 모델 ID를 혼동하지 않는다.

## C. Task 3: 결정적 Scoring / Confidence

- src/server/scoring 및 관련 테스트를 구현한다. LLM이 없이 합성 CriterionResult로 검증한다.
- 5개 축 모두 observed + 수집 complete + 유효 근거 + 미해결 blocking conflict 없음일 때만 issued.
- 73 / 25 / 100 계산, missing dimension과 null 처리, 네 축 최고/하나 미확인, partial, 충돌, 중복·누락 코드, 입력 순서 독립성을 검증한다.
- '미확인 상태인 축이 존재함'은 정상 withheld지만 '축 레코드 자체 누락/중복/깨진 참조'는 계약 오류다. failed 수집은 평가 실패로 처리한다.
- ConfidenceSummary는 정본의 자료 범위·출처·과정 자료·남은 불확실성을 설명한다. 자료 연결이 개인 능력 인증이나 진위 보증이 되지 않게 한다.
- API DTO는 Task 5로 남긴다. 내부 camelCase, 외부 snake_case 경계 결정만 문서에 반영하고 API 서버나 범용 재귀 변환기를 지금 만들지 않는다.

## 수정 범위

src/server/{questions,evaluation,scoring}, src/shared/contracts의 필요한 타입, tests, fixtures/calibration, scripts의 오프라인 실행 명령, 최소 package 설정, 관련 docs 및 README.

현재 승인된 fixture 계약 보정 외 평가 축·가중치·발급 공식·개인 데이터 정책을 변경하지 않는다. UI, DB, 배포, 실제 API 어댑터, 모델 호출은 Task 2b/5/6의 후속 범위다. 로컬 자체 테스트용 의존성 설치는 가능하되 필요한 만큼만 추가한다.

## 검증과 완료 보고

1. npm run typecheck, npm test와 새 offline CLI를 실제 실행한다.
2. case-04/08 기대값을 어떻게 보정했고 어떤 근거는 여전히 없는지 기록한다.
3. Mock 테스트에서 확인한 계약과 실제 모델에서 미검증인 의미 판단/인젝션 방어를 구분한다. 53개 기존 테스트가 통과한 것만으로 새 기능 완료를 보고하지 않는다.
4. docs/Development/PHASE2_OFFLINE_REPORT.md에 파일 목록, 실행 명령/결과, 모의 JSON 산출물 위치, 미해결 항목을 기록한다. 실행 산출물은 artifacts/phase2-offline/에 둔다.
5. Task 2b의 실행 계획을 준비한다: 모든 실제 입력 변형 목록, 일반 사례 초기 1회, case-07 동일 입력 5회, case-06 판정 before/after 각 5회와 별도 질문 생성 검사. 중복 실행은 식별하고 총 호출 수를 단계별로 산출한다. 가격·모델 미정이면 비용은 미산정으로 남긴다.
6. 프롬프트·설정·입력이 바뀐 실행을 같은 반복 실험으로 합치지 않는다. 비용 승인 후에도 재시도/최대 2회 보정이 동일 총예산에 들어가도록 계획한다.

완료 기준은 'Task 2a와 Task 3 오프라인 구현·검증 완료'다. 실제 평가 정확도, 사람 검토, 인젝션 방어, Task 2 전체 완료를 주장하지 않는다. 이번 범위가 끝날 때까지 작은 구현 선택은 근거를 기록하고 진행한다.
