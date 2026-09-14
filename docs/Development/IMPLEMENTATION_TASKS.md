# Implementation Tasks v0.3.1

> 현재 작업: [Phase 2 수정 지시](../../CLAUDE_PHASE2_FIX_PROMPT.md). [Astra 검토](ASTRA_PHASE2_REVIEW.md)에 따라 Task 2a/3의 완료 수용을 보류하고 재현 결함을 수정한다. 아래는 원래 구현 범위다.

정본: [마스터](../00_MASTER_PLAN.md), [AGENT_WORKFLOW](AGENT_WORKFLOW.md). 현재 착수 프롬프트: [CLAUDE_PHASE2_OFFLINE_PROMPT](../../CLAUDE_PHASE2_OFFLINE_PROMPT.md).

이 목록은 구현 계획이다. 2026-09-14 현재 실행 지시는 [Phase 2 오프라인 프롬프트](../../CLAUDE_PHASE2_OFFLINE_PROMPT.md), 설계 보정은 [Astra 검토](ASTRA_PHASE1_REVIEW.md)다. Task 0·1 구현 보고 이후 fixture 보정과 Task 2a·Task 3을 진행한다. 전체 Phase 1의 의미 검증이 끝났다는 뜻은 아니다.

## Task 0 — 교정 fixture

- 목표: [CALIBRATION_PLAN](../Assessment/CALIBRATION_PLAN.md)의 8종을 작은 synthetic 데이터로 재현할 입력 자료 준비.
- 읽을 문서: 평가 기준, 데이터 계약, 교정 계획.
- 선행: v0.3.1 문서 검토 반영.
- 입력/출력: fixtures/calibration에 정적 repo 자료 + case/excerpts + expected.json + provenance.json. 기대는 판정 행동·상태·반례로 표현.
- 수정 범위: fixtures/calibration, 관련 fixture 검증 테스트와 README.
- 완료 조건: 8종과 검증 생략 확인/미제출 변형, 같은 코드·다른 과정 및 과거 로그 추가 변형을 식별 가능.
- 검증: JSON 구조·참조·행동 기대와 자료 연결. 실제 사람이 보지 않았다면 인간 검토 완료라고 기록하지 않음.
- 제출: fixture 목록·synthetic 표시·아직 평가하지 않은 항목.

## Task 1 — GitHub 수집 PoC

- 목표: 공개 URL을 full SHA의 정적 자료로 바꾸는 읽기 전용 스크립트.
- 읽을 문서: [GITHUB_INGESTION](../Architecture/GITHUB_INGESTION.md), [EVIDENCE_SCHEMA](../Assessment/EVIDENCE_SCHEMA.md) IngestionSnapshot, [PRIVACY_SECURITY](../Security/PRIVACY_SECURITY.md).
- 선행: 공통 입력/출력 타입 정의. Task 0 입력 재사용 가능.
- 입출력: {repo_url, commit_ref?, relevant_paths?} → IngestionSnapshot. CLI는 stdout JSON, stderr 진행/오류. LLM 레벨·점수 생성 없음.
- 수정 범위: scripts/ingest.ts, src/server/ingestion, src/shared/contracts, tests/ingestion, 최소 package.json/tsconfig/.gitignore, fixtures, docs 실행 보고.
- 완료 조건: 수집·제외·선정·정적 신호·locator·coverage·metrics·complete/partial/failed 출력.
- 검증: 네트워크 없는 HTTP adapter fixture로 URL 거부, ref 고정, tree truncated, 예산, symlink/binary, API 실패를 재현. 실제 공개 소형 저장소 smoke 1회 별도.
- 제출: 재현 명령, JSON, 실제 HTTP/바이트/시간, offline/live 결과 구분. 실행 대상 저장소의 코드나 dependency 설치 없음.

## Task 2 — 질문·축 판정 PoC (2a 오프라인 / 2b 실제 모델)

- Task 2a: fixture 보정, provider 인터페이스/MockProvider, 버전 프롬프트, 입력·질문·축 판정 계약 검증. 실제 API·예산 없이 착수한다.
- Task 2b: 아래의 실제 모델 실험. 모델/접속/예산 결정은 이 단계의 선행 조건이다. Task 2a 완료를 Task 2 전체 완료로 표시하지 않는다.

- 목표: 고정 snapshot + 협업 자료에서 질문 3개와 답변을 거쳐 CriterionResult A~E 생성.
- 읽을 문서: SCORING_RUBRIC, EVIDENCE_SCHEMA, CALIBRATION_PLAN.
- 선행: Task 0·1 검토 및 실제 LLM 모델/접속/예산 결정.
- 입출력: snapshot/case → Question[3]; evidence/case/answers/versions → CriterionResult[5].
- 수정 범위: src/server/evaluation, src/server/questions, 해당 테스트/버전 프롬프트.
- 완료 조건: 구조·참조 유효, 근거 없는 판정 거부, fixture별 기대와 차이를 설명.
- 검증: 모델 출력 실제 실행 및 사용자 또는 지정 검토자의 검토를 구분해 기록.
- 제출: 실제 모델·프롬프트·설정·토큰·시간·비용·미해결 교정 문제. 정답을 하드코딩하지 않음.

## Task 3 — 결정적 Scoring/Confidence

- 목표: 구조적으로 유효한 입력에 대해 점수·보류·범위를 일관되게 계산.
- 선행: 데이터 계약. 실제 LLM 호출이 없어도 합성 CriterionResult로 구현/검증 가능.
- 입력: {criterion_results, evidence, ingestion_status, coverage, process_materials}. 출력: {my_ai_score, confidence_summary}.
- 수정 범위: src/server/scoring, tests/scoring.
- 완료 조건: 5/5와 partial/충돌/미확인/중복 코드/끊긴 근거를 올바르게 처리.
- 검증: 발급 수치 73·25·100, 미확인=null, 네 축 모두 최고여도 withheld, 입력 순서 독립성·범위 경계.
- 제출: 실행한 테스트와 결과. 모델 평가의 타당성 검증으로 주장하지 않음.

## Task 4 — 개선 작업서·비교

- 목표: 근거에 연결된 개선 행동 1개와 독립적인 evidence_change/behavior_change 생성.
- 선행: Task 2·3.
- 입출력: 완료된 판정/자료 → ImprovementTask; 이전/새 완료 평가 → Comparison.
- 수정 범위: src/server/improvement, src/server/comparison, 해당 테스트.
- 완료 조건: 과거 로그 추가를 자동 행동 개선으로 분류하지 않음. 버전·범위·보류 조건에서 총점 증감 표시 차단.
- 검증: fixture 8의 변형 및 동일 레벨의 실제 행동 변화 사례.
- 제출: synthetic/실제 구분된 작업서·비교 예시, 미해결 판단.

## Task 5 — 최소 API·저장·단계 실행

- 목표: 명시적인 create → ingest → questions → answers → finalize 순서로 처리.
- 선행: Task 1~4 검토, DB/런타임 환경 결정.
- 읽을 문서: API_DATA_CONTRACTS, SYSTEM_ARCHITECTURE, PRIVACY_SECURITY.
- 수정 범위: src/app/api, src/server/store, migrations, 통합 테스트.
- 완료 조건: 토큰 없는 비공개 GET 차단, 다른 owner 개인 결과 격리, stage await·timeout·attempt fencing·idempotency 구현.
- 검증: 단계 API를 실제 호출, 중단/재시도/새로고침/늦은 완료/다른 owner/공개 철회 테스트.
- 제출: 마이그레이션·실제 실행 기록·각 단계 시간. GET 폴링만으로 작업이 진행된다고 테스트하지 않음.

## Task 6 — 사용자 화면과 제출 준비

- 선행: Task 5 API 검토.
- 목표/입출력: [USER_FLOW](../UI/USER_FLOW.md)의 정상·보류·실패·공개·비교를 동일 DTO로 연결.
- 수정 범위: src/app의 화면, src/components, UI 검증.
- 완료 조건: 처음 방문부터 개선 작업서까지 동작하고, 비공개 자료가 공개 화면에 없음.
- 검증/제출: 실제 화면과 사용자 시도, 배포·운영 확인, 명시적인 예시와 제출 자료. 자세한 작업 지시는 Task 5 후 범위를 재확인해 전달한다.
