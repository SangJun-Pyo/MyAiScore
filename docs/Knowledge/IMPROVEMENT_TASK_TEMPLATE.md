# Improvement Task Template v0.3.1

정본 허브: [`../00_MASTER_PLAN.md`](../00_MASTER_PLAN.md). 데이터 필드는 [`../Assessment/EVIDENCE_SCHEMA.md`](../Assessment/EVIDENCE_SCHEMA.md) 7절 `ImprovementTask`가 정본이며, 이 문서는 **사용자가 복사해 Claude Code 등에 붙여넣는 최종 텍스트 템플릿**을 정의한다.

## 1. 설계 원칙

- "점수 올리기용 문서 추가"를 보상하지 않는다. 파일·테스트 수가 늘었다는 사실보다, 실제 위험·오류·사용자 문제를 해결했는지를 재평가에서 확인한다([`../Assessment/CALIBRATION_PLAN.md`](../Assessment/CALIBRATION_PLAN.md) 교정 사례 8).
- 서버가 사용자 프로젝트 코드를 실행하거나 자동 수정하는 기능으로 확대하지 않는다. 작업서는 항상 **사용자가 직접 다른 도구에 붙여넣어 실행**하는 텍스트다.
- 작업서 하나는 [`../Assessment/SCORING_RUBRIC.md`](../Assessment/SCORING_RUBRIC.md)의 5개 축 중 **가장 중요한 개선 대상 1개**만 다룬다(여러 개를 나열하지 않음).

## 2. 템플릿

```markdown
# 개선 작업서 — {target_criterion_name} ({repo}@{commit_sha 짧은형})

## 발견된 문제
{problem_summary}

관련 근거:
{related_evidence_list}  <!-- 각 항목: - path:line (요약) 형태 -->

## 이 개선이 필요한 이유
{why_it_matters}

## 수정 범위와 기대하는 동작
{scope}

## 구현 전 확인해야 할 가정
{assumptions_to_check}  <!-- 체크리스트 형태 -->

## 검증할 실패 사례
{failure_cases_to_verify}  <!-- 체크리스트 형태 -->

## 완료 조건
{definition_of_done}

## 재평가에 제공할 근거
작업을 마친 뒤 아래를 새 커밋과 함께 준비해주세요. 재평가에서는 이 자료의 관련성과 실제 행동을 확인합니다. 자료 제출 자체가 점수 발급이나 향상을 보장하지 않습니다.
{reevaluation_evidence_needed}  <!-- 체크리스트 형태 -->

---
이 작업서는 MyAiScore가 {repo}의 커밋 {commit_sha}를 분석해 생성했습니다 (rubric {rubric_version} / pipeline {pipeline_version}).
문서를 추가하거나 테스트 파일 수를 늘리는 것만으로는 재평가 점수가 오르지 않습니다 — 실제로 위 실패 사례가 해결됐는지를 확인합니다.
```

repo/commit/버전과 관련 근거 표시는 Assessment/Evidence에서 가져오고, 나머지 플레이스홀더는 [`../Assessment/EVIDENCE_SCHEMA.md`](../Assessment/EVIDENCE_SCHEMA.md) 7절 `ImprovementTask` 필드와 1:1로 대응한다.

## 3. 완성 예시 (synthetic — 가상 사례, 실제 실행되지 않음)

> 아래는 형식을 보여주기 위한 가상 예시다. 실제 저장소·평가 결과가 아니다.

```markdown
# 개선 작업서 — 검증의 질 (example-org/example-shop@3f1a9c2)

## 발견된 문제
결제 금액 검증 로직(createOrder)에 대한 자동화된 회귀 테스트가 확인되지 않았습니다.

관련 근거:
- src/server/actions/createOrder.ts:40-78 (서버 측 금액 재계산 로직 존재, 분석 범위에서 테스트 파일 미확인)

## 이 개선이 필요한 이유
서버 측 검증 코드가 향후 리팩터링 시 조용히 깨져도 알아챌 수 있는 검증 근거가 이번 분석 범위에서는 확인되지 않았습니다. 결제 금액처럼 조작 시 손실이 발생하는 로직은 검증 근거 없이는 신뢰하기 어렵습니다.

## 수정 범위와 기대하는 동작
createOrder의 금액 재검증 분기에 대해 실패 케이스 테스트 2~3개를 추가합니다. 정상 결제 흐름은 수정하지 않습니다.

## 구현 전 확인해야 할 가정
- [ ] 결제 테스트 환경에서 실제 통화 단위 상수 값을 사용할 수 있는지 확인
- [ ] 기존 정상 결제 테스트가 있다면 그 구조를 재사용할 수 있는지 확인

## 검증할 실패 사례
- [ ] 음수 금액으로 주문 시도 시 거부되는지
- [ ] 통화 단위가 불일치하는 요청이 거부되는지
- [ ] 동시 요청 시 중복 처리되지 않는지

## 완료 조건
새 테스트가 위 실패 케이스에서 거부 응답을 확인하고, CI(또는 로컬 실행)에서 통과합니다.

## 재평가에 제공할 근거
- [ ] 새로 추가한 테스트 파일 경로
- [ ] 테스트 실행 결과(본인이 직접 실행한 로그 또는 CI 링크)

---
이 작업서는 MyAiScore가 example-org/example-shop의 커밋 3f1a9c2를 분석해 생성했습니다 (rubric scoring-rubric-v0.3.1 / pipeline ingestion-pipeline-v0.3.1).
문서를 추가하거나 테스트 파일 수를 늘리는 것만으로는 재평가 점수가 오르지 않습니다 — 실제로 위 실패 사례가 해결됐는지를 확인합니다.
```
