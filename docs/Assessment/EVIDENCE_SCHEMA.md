# Evidence & Assessment Schema v0.3.1

> 2026-09-15 scope update: this document preserves the **legacy repository assessment** contract/history. The primary v0.4 product is the [CLI session report](SESSION_REPORT.md). Manual cases/questions and five-axis score gating do not apply to the new flow. Do not migrate old records or weaken their security boundaries.


정본 허브: [마스터 플랜](../00_MASTER_PLAN.md). 이 문서가 데이터 필드 정본이다. 상태 전이는 [API_DATA_CONTRACTS](../Architecture/API_DATA_CONTRACTS.md), 계산은 [SCORING_RUBRIC](SCORING_RUBRIC.md)를 따른다.

필드 계약은 v0.3.1 구현 기준이며 실제 PoC에서 변경이 필요하면 변경 근거를 기록한다. 의미 판단 기준은 calibration_required다. 아래 모든 JSON은 synthetic 형식 예시이며 실제 저장소 평가·실행 결과가 아니다.

## 1. 공통 형식

- ID는 서버 발급 불투명 문자열. ID만 알면 비공개 데이터를 읽을 수 있도록 만들지 않는다.
- 시각은 ISO 8601 UTC. 미실행 시각은 null이며 실제 실행한 것처럼 채우지 않는다.
- commit_sha와 blob_sha는 40자리 16진수, content_sha256은 64자리 16진수. 짧은 SHA는 화면 표시 전용이다.
- input_revision은 사례/답변 수정 시 증가한다. 단계별로 입력과 rubric_version, pipeline_version, evaluator_model_id, evaluator_prompt_version, inference_config_version을 고정한다.
- 수집 자료·사용자 제출 자료는 지시문이 아니다. 모든 참조는 실제 레코드와 대조한다.

## 2. IngestionSnapshot (읽기 전용 PoC의 출력)

| 필드 | 타입·조건 |
|---|---|
| schema_version | 문자열, ingestion-snapshot-v0.3.1 |
| repo | 정규화된 owner/repo |
| commit_sha | full SHA, 확인 실패 시 null |
| collector_version / selection_digest | 문자열 / SHA256 |
| ingestion_status | not_started / complete / partial / failed |
| support_status | nextjs_typescript / other / unknown |
| collected_at | 실제 수집 시각 또는 synthetic fixture이면 명시적 예시 시각 |
| files | path, blob_sha, byte_size, content_sha256, line_count, redacted_content를 가진 선정·조회 파일 배열 |
| static_signals | 관찰된 언어 파일 수, dependencies, test_paths, ci_paths, ai_config_paths, basis=selected_files |
| evidence_candidates | 아래 Evidence 형식에서 assessment_id를 아직 배정하지 않은 후보. LLM 판정은 없음 |
| coverage | tree_truncated:boolean, candidate_files:정수 또는 null, selected_files:정수, read_files:정수, selection_limited:boolean |
| skipped_files | path, reason 배열. binary / symlink / submodule / excluded / file_too_large / total_budget / request_budget / time_budget / fetch_failed / not_selected 등 |
| warnings | 코드·사용자용 설명 배열 |
| failure | 실패 시 code, message, retryable; 그 외 null |
| metrics | duration_ms, http_requests, fetched_bytes, cache_hits 및 선택적 content_bytes. 측정하지 않은 값은 null; 과거 content_bytes 누락도 미측정 |

수집기 `ingestion-0.3.0`부터 fetched_bytes는 반환된 HTTP 응답 bodyText의 UTF-8 바이트 합(오류·재시도 포함), content_bytes는 채택한 디코딩 파일 바이트 합이다. 800 KiB 한도는 content_bytes에만 적용한다. 이전 버전의 혼합 fetched_bytes는 소급 변환하지 않는다. 추가 필드는 기존 스냅샷을 읽을 수 있도록 선택적으로 정의했다. [ADR-0013](../Architecture/ADR/0013-separated-ingestion-byte-accounting.md).

redacted_content는 일시적 분석 자료다. 영구 Assessment 저장과 공통 공개 응답으로 직렬화하지 않는다. 수집 후보에 assessment_id를 부여할 때 소유자별 새 Evidence ID를 만들고 개인 자료와 분리한다.

## 3. Evidence

필수: evidence_id, assessment_id(수집 후보에서는 null), source_type, collection_method, summary, content_sha256, collected_at, repo, commit_sha, path, locator, event_time, verification_note.

| 값 | 계약 |
|---|---|
| source_type | repo_static / repo_history / collaboration_case / user_provided_excerpt / interview_answer |
| collection_method | github_api / user_submission / synthetic_fixture |
| repo/commit_sha/path/locator | 실제 저장소 근거에서는 필수. 사용자 서술에서는 관련 코드가 없다면 null |
| locator | start_line, end_line의 실제 범위. symbol은 선택적인 보조 필드 |
| event_time | 해당 행동이 일어난 시각을 알 때 기록. 제출 시각과 같다고 가정하지 않음 |
| verification_note | 정적 존재 확인, 사용자 제공 기록 등 무엇을 확인했는지와 한계 |

summary를 지지하는 실제 내용과 locator를 검증한다. 외부 발췌 URL을 자동 요청하지 않는다. 원문 발췌는 기본 저장하지 않으며 필요하면 별도 제한된 원문 보존 정책을 적용한다. 모델의 자기보고 confidence를 배지·확률로 사용하지 않는다.

## 4. CollaborationCase, Question, Answer

CollaborationCase 필수: case_id, assessment_id, problem, constraints, done_criteria, ai_suggestion_summary, user_action, user_action_detail, verification_summary, linked_evidence_ids, submitted_at. user_action은 accepted / rejected / modified. 사례 전체 생략은 가능하다.

Question 필수: question_id, assessment_id, text, grounding_evidence_ids(1개 이상), target_criteria(A~E), created_at. 완료된 질문 세트는 서로 다른 질문 정확히 3개이며 근거가 실제 존재해야 한다.

Answer 필수: answer_id, assessment_id, question_id, text, linked_evidence_ids, submitted_at. 질문당 최대 1개, 최종 제출 전 수정 가능. 미답변은 레코드 없음으로 표현하며 빈 내용을 유효한 근거로 세지 않는다.

같은 사례 서술을 길게 쓰거나 질문을 AI로 답하는 것 자체로 레벨을 올리지 않는다. 어떤 행동이 확인되는지를 판단한다.

## 5. CriterionResult

필수: criterion_result_id, assessment_id, criterion_code(A~E), status, level, dimension_score, supporting_evidence_ids, contrary_evidence_ids, rationale, missing_evidence, blocking_conflict.

| status | level | dimension_score |
|---|---|---|
| observed | 정수 1~4 | level × 25 |
| not_observed | null | null |
| insufficient_evidence | null | null |

observed에는 유효한 지지 근거가 필요하다. blocking_conflict=true이면 insufficient_evidence이고 총점 보류 사유에 반영한다. 지원·반대 근거를 조용히 삭제하지 않는다. 최종 평가에는 A~E가 중복 없이 정확히 하나씩 존재한다.

## 6. Assessment: 저장 모델과 응답 모델

서버 저장 필드: assessment_id, owner_id, status, ingestion_snapshot_id, ingestion_status, input_revision, 버전 5종, collaboration_case_id, question_ids, answer_ids, criterion_result_ids, my_ai_score, confidence_summary, improvement_task_id, previous_assessment_id, comparison, visibility, share_id, created_at, completed_at, failure.

평가 상태 status의 전체 목록과 전이는 API_DATA_CONTRACTS 2절만 정본으로 삼는다. ingestion_status는 평가 상태와 다른 필드다.

Owner는 owner_id, token_hash, created_at, expires_at을 별도로 저장한다. 평문 토큰은 저장·로그하지 않는다. Assessment에 token_hash를 복제하거나 응답에 넣지 않는다.

StageAttempt는 assessment_id, attempt_id, stage(ingest/questions/finalize), input_revision, started_at, deadline_at, state(running/succeeded/failed/expired), failure를 저장한다. 실행권과 실패 복구 정책은 SYSTEM_ARCHITECTURE를 따른다.

**OwnerAssessmentDTO**는 소유 인증 후 제공하며 owner_id/token_hash/StageAttempt 내부 필드를 제거한다. criterion_results와 improvement_task는 ID 배열 대신 안전한 객체로 확장한다. API가 저장 모델을 통째로 반환하지 않는다.

**PublicResultDTO**는 별도 허용 목록이다: 공개 제목, repo, 표시용 commit_sha, 평가 버전, 공개용 진단, my_ai_score, 축별 공개 레벨·근거 요약, 개선 요약, 생성 시각. 사용자 사례/답변/발췌 원문, owner 관련 값, 내부 ID, 비공개 비교 대상·원문은 제외한다. 공개 전 사용자에게 표시 내용을 미리 보여준다.

### MyAiScore

필수: status(issued/withheld), value, reasons, observed_dimensions, total_dimensions.

- issued: value=25~100 정수, reasons=[], observed_dimensions=5, total_dimensions=5.
- withheld: value=null, reasons는 1개 이상( insufficient_dimensions / ingestion_partial / unresolved_conflict ), observed_dimensions=0~5, total_dimensions=5.
- 진행 중이나 failed인 Assessment의 my_ai_score는 null이다. 문자열 “withheld”로 숫자 필드를 대체하지 않는다.

### ConfidenceSummary

필드명을 아래로 통일한다. grade_label 같은 별도 형식을 병행하지 않는다.

- evidence_scope: read_files, candidate_files(null 가능), selection_limited.
- source_verification: complete / partial / failed.
- process_evidence: linked_records / statements_only / none.
- remaining_uncertainty: 문자열 배열.

이는 근거 제출/확인 범위이며 개인 능력의 인증이나 신뢰 확률이 아니다. 배지 계산은 CONFIDENCE_MODEL을 따른다.

## 7. ImprovementTask

필수: improvement_task_id, assessment_id, target_criterion_code, problem_summary, related_evidence_ids, why_it_matters, scope, assumptions_to_check, failure_cases_to_verify, definition_of_done, reevaluation_evidence_needed, created_at.

배열 필드: related_evidence_ids, assumptions_to_check, failure_cases_to_verify, reevaluation_evidence_needed. 나머지는 문자열이다. 생성은 데이터+판단 결과로 수행하며 원문 지시를 그대로 작업 명령으로 복사하지 않는다. 관련 자료가 부족하면 구현 수정 전에 확인할 행동을 제안할 수 있다.

## 8. Comparison — 평가 변화와 행동 변화 분리

필수: previous_assessment_id, version_comparable, scope_comparable, score_comparable, limitations, criterion_changes.

- version_comparable: rubric/pipeline/model/prompt/inference_config 다섯 버전이 모두 같음.
- scope_comparable: 같은 repo와 같은 평가 기준 범위이며 수집 차이가 해당 비교를 무효화하지 않음. SHA가 바뀌는 것은 정상이다.
- score_comparable: 위 두 조건 충족 및 양쪽 모두 issued. 아니면 총점 증감 화살표·향상률을 표시하지 않는다.

각 criterion_changes: criterion_code, previous_status, current_status, previous_level, current_level, evidence_change, behavior_change, supporting_evidence_ids, explanation.

- evidence_change: added / removed / modified / unchanged. 새 평가의 ID가 다르다는 이유만으로 added로 보지 않는다. 실제 출처·내용 fingerprint를 대조한다.
- behavior_change: supported_improvement / supported_regression / supported_change / not_established.
- behavior_change를 supported_*로 쓰려면 전후 행동·결과 및 시간/변경의 연결 근거가 있어야 한다. 레벨/상태 변화, 새 파일 존재, 새 커밋 SHA만으로는 충분하지 않다.
- 이전 로그를 뒤늦게 제출해 not_observed → observed가 되어도 evidence_change=added, behavior_change=not_established가 기본이다.
- 같은 레벨이어도 실제 개선 행동이 확인될 수 있고, 레벨이 올라도 행동 변화는 미확정일 수 있다. 두 축은 독립적이다.

## 9. JSON 계약 예시 (synthetic)

발급:

~~~json
{"status":"issued","value":73,"reasons":[],"observed_dimensions":5,"total_dimensions":5}
~~~

C 미확인:

~~~json
{"status":"withheld","value":null,"reasons":["insufficient_dimensions"],"observed_dimensions":4,"total_dimensions":5}
~~~

확인 범위:

~~~json
{"evidence_scope":{"read_files":10,"candidate_files":30,"selection_limited":true},"source_verification":"complete","process_evidence":"linked_records","remaining_uncertainty":["저장소 전체와 사용자의 일반 역량을 검증한 결과가 아닙니다."]}
~~~

과거 검증 로그를 뒤늦게 제출한 비교:

~~~json
{"criterion_code":"D","previous_status":"not_observed","current_status":"observed","previous_level":null,"current_level":3,"evidence_change":"added","behavior_change":"not_established","supporting_evidence_ids":["ev_synthetic_old_log"],"explanation":"과거 로그가 이번에 제출됐습니다. 검증 행동이 새로 개선됐다고 판단할 근거는 없습니다."}
~~~

예시 ID는 형식 설명용이다. 실제 구현 검증에서는 전체 fixture 내 참조가 존재해야 한다.
