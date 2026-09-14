# MyAiScore — 마스터 플랜 v0.3.1

> 실제 프로젝트와 AI 협업 과정의 근거로, 이번 프로젝트에서 확인된 활용 방식을 진단하고 가장 중요한 다음 개선 행동을 제안한다.

현재 진행 상태와 실행 지시는 [ROADMAP](Development/ROADMAP.md), 실제 작업·검토 이력은 [Sessions](Development/Sessions/README.md)를 따른다. 이 문서는 제품/평가 원칙의 정본이다.

## 1. 제품과 사용자

제품명: MyAiScore / My AI Score / 제 AI 활용 점수는요?

첫 사용자: AI로 개인 웹 서비스를 만드는 개발자·바이브코더. 개인의 전체 엔지니어링 실력, 범용 AI 역량, 채용 적합성을 인증하지 않는다.

핵심 질문은 “어떤 판단과 검증으로 문제를 해결했는가?”다. 코드의 기술적 품질과 AI 협업 과정을 구분하고, 점수에 대한 호기심을 실제 개선 행동으로 연결한다.

## 2. 핵심 흐름

로그인 없는 예시 → 공개 GitHub 저장소 1개 → 대표 협업 사례 1개/선택 근거 → SHA 고정 수집 → 맞춤 질문 3개 → 근거와 진단 → 개선 작업서 복사 → 사용자의 개선 → 새 평가 비교.

과정 자료·답변을 생략해도 관찰 가능한 진단은 제공한다. 없는 과정을 추정하지 않고 총점 발급 조건을 충족하지 못하면 보류한다.

## 3. MVP

포함: 공개 단일 저장소, TypeScript/Next.js 우선 지원, 명시적인 실제/synthetic 예시, 읽기 전용 수집, 개인 협업 사례, 질문 3개, 근거·미확인·점수 발급/보류, 개선 작업서 1개, 선택적 공개 요약, 동일 프로젝트 전후 비교, 실패/재시도/범위 제한.

보류: Private/GitHub App/필수 로그인, 다중 저장소/팀 기여도 판정, Local Mode/CLI 배포/IDE 플러그인, 개인 숙련도 등급/인증서/Verified 배지, 리더보드/백분위/소셜/조직 평가, Project Quality 별도 총점, 사용자 저장소 자동 수정/실행/배포.

수용 조건과 축소 순서의 정본은 [MVP_SCOPE](Product/MVP_SCOPE.md)다. 소스 구현용 내부 CLI PoC는 사용자용 Local Mode 제품 기능과 구분한다.

## 4. 평가 원칙

- 좋은 코드·도구 수·토큰 수는 AI 활용 점수의 직접 가산점이 아니다.
- 다섯 축 A 문제정의 / B 맥락위임 / C 도구적합성 / D 검증 / E 판단수정을 본다.
- 축별 1~4단계·가중치 15/20/15/30/20은 교정 초안이며 검증 전이다.
- not_observed/insufficient_evidence는 level=null, dimension_score=null이다. 0으로 합산하거나 관찰 항목만 재정규화하지 않는다.
- **다섯 축 모두 observed, 근거 유효, 수집 complete, 판정을 막는 충돌 없음일 때만 총점 발급.** 나머지는 항목 진단을 제공하며 withheld(value=null).
- 현재 1~4단계 척도에서 발급 점수는 25~100이다. 임의의 정밀 능력 지표나 인증으로 표현하지 않는다.
- LLM은 기준별 레벨·근거·이유를 판단하고 코드가 발급 조건과 최종 숫자를 계산한다. 고정 공식이 평가 타당성을 보장하지는 않는다.
- 출처 확인과 개인 능력 인증을 분리한다. 검증 미제출과 확인된 검증 생략 행동도 분리한다.

계산·행동 기준 정본은 [SCORING_RUBRIC](Assessment/SCORING_RUBRIC.md)다.

## 5. 이번 검토로 고친 구현 규칙

1. 4/5 판정 때 0을 기여시켜 총점을 발급하던 초안을 폐기했다.
2. 공통 캐시는 공개 코드 수집만 재사용한다. 협업 사례·질문·답변·개인 결과는 owner/assessment별로 분리한다.
3. MVP 서버는 단계별 요청의 완료를 기다린 뒤 응답한다. 상태 폴링은 조회만 하며, 별도 실행기를 전제하지 않는다.
4. 축별 4단계 행동 기준과 반례를 마련했다.
5. 근거 변화와 행동 변화를 분리하고 과거 자료 추가를 실력 향상으로 자동 분류하지 않는다.
6. lifecycle·수집 상태·점수 상태와 DTO 필드를 통일했다. 비공개 GET에도 소유 인증을 요구한다.

## 6. 최소 설계와 운영

앱 기본안은 Next.js/React/TypeScript, 저장은 Supabase/PostgreSQL. 수집·질문·판정·계산·작업서·저장은 모듈로 분리한다. 실제 계정·플랜·런타임·비용은 PoC/배포 전 확인한다.

요청별 제한 시간·attempt_id·input_revision으로 중복·만료·늦은 완료를 처리한다. 완료된 개인 결과는 불변이며 수정은 새 평가로 만든다. 상태 조회만으로 중단 작업이 자동 완료된다고 주장하지 않는다.

서비스는 제출 저장소의 코드·install/build/test/hooks/MCP를 실행하지 않는다. 자체 MyAiScore 구현의 테스트 실행은 이 금지와 별개다. 개발 도구 구독과 서비스 LLM API 비용을 구분한다.

## 7. 사용자에게 보장할 범위

확인한 근거·확인하지 못한 부분·다음 행동을 제공한다. 결과 기본값은 비공개이며, 공개용 요약을 사용자가 선택할 때만 공유한다. 사례·답변·발췌 원문과 관리 정보는 공개 응답에서 제외한다.

새 근거로 레벨이 달라졌다고 개인 능력이 향상됐다고 말하지 않는다. 전후 행동·결과의 연결 근거가 있을 때만 해당 범위의 변화를 설명한다.

## 8. 실행 순서와 일정

구현 순서는 fixture·수집 → 오프라인 평가·계산 → 실제 모델 실험 → 개선/비교 → API·UI다. 단계별 현재 상태는 [ROADMAP](Development/ROADMAP.md)에서 관리한다. API·예산 미정이며 실제 모델 실험 전 확정한다.

이후 평가 PoC → API 단계 실행 → 최소 UI → 외부 사용자 확인 → 제출 준비 순으로 진행한다. 협업 역할: 상준님은 제품과 수용 판단, Astra는 설계·작업 분해·검토, Claude Code는 구현과 근거 있는 결과 보고.

대회 기준 일정: 참가 접수 2026-09-18 23:59:59, 과제 제출 2026-09-20 23:59:59. [공식 안내](https://static.wanted.co.kr/ai-championship/2026/landing.html). 실제 실행일 기준 남은 기간으로 [ROADMAP](Development/ROADMAP.md)을 조정한다.

## 9. 정본과 읽는 순서

이 마스터의 합의된 범위·원칙 안에서 상세 도메인 문서가 필드·공식·상태를 정의한다. 원칙과 충돌하는 상세값을 조용히 우선 적용하지 말고 불일치를 보고·수정한다.

| 영역 | 문서 |
|---|---|
| 제품 | [PRD](Product/PRD.md), [MVP_SCOPE](Product/MVP_SCOPE.md) |
| 평가 | [SCORING_RUBRIC](Assessment/SCORING_RUBRIC.md), [EVIDENCE_SCHEMA](Assessment/EVIDENCE_SCHEMA.md), [CONFIDENCE_MODEL](Assessment/CONFIDENCE_MODEL.md), [CALIBRATION_PLAN](Assessment/CALIBRATION_PLAN.md) |
| 설계 | [SYSTEM_ARCHITECTURE](Architecture/SYSTEM_ARCHITECTURE.md), [GITHUB_INGESTION](Architecture/GITHUB_INGESTION.md), [API_DATA_CONTRACTS](Architecture/API_DATA_CONTRACTS.md) |
| 보안·화면 | [PRIVACY_SECURITY](Security/PRIVACY_SECURITY.md), [USER_FLOW](UI/USER_FLOW.md), [IMPROVEMENT_TASK_TEMPLATE](Knowledge/IMPROVEMENT_TASK_TEMPLATE.md) |
| 개발 | [ROADMAP](Development/ROADMAP.md), [AGENT_WORKFLOW](Development/AGENT_WORKFLOW.md), [IMPLEMENTATION_TASKS](Development/IMPLEMENTATION_TASKS.md), [DECISIONS](Development/DECISIONS.md), [CHANGELOG](Development/CHANGELOG.md), [ASTRA_REVIEW_BRIEF](Development/Sessions/Phase-00-Planning.md#planning-review) |

## 10. 검증 상태

채택: MVP 범위·미확인 분리·총점 발급 규칙·개인 데이터 분리·단계 실행·비교 원칙.

미검증: 가중치/레벨 타당성, fixture와 실제 평가 일치, 수집·LLM 시간/비용, 공격 방어 실효성, 외부 사용자 효용. 문서 교차검사를 제품 타당성 실험으로 표현하지 않는다.
