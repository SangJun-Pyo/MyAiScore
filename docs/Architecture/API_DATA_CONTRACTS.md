# API & Data Contracts v0.4

정본 허브: [마스터 플랜](../00_MASTER_PLAN.md). 필드: [EVIDENCE_SCHEMA](../Assessment/EVIDENCE_SCHEMA.md). 실행·캐시: [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md). 보안: [PRIVACY_SECURITY](../Security/PRIVACY_SECURITY.md).

웹·API는 구현됐으며 실제 모델/운영 DB 실험은 별도다. 아래 상태·보안 원칙은 유지하고 v0.4의 실제 wire 형태는 이 절을 우선한다. 기존 v0.3.1 JSON은 역사적 설계 예시다.

## v0.4 실제 wire와 저장 경계

- `GET /api/config`: live_enabled/provider_configured/storage_mode와 제한 안내. 키·모델 설정을 반환하지 않는다.
- `GET /api/health`: liveness만 제공. DB·모델 readiness 인증은 아니다.
- create는 `consent:true`, `repo_url`, 선택 `commit_ref`, `collaboration_case`, `excerpts:string[]`를 받는다. 발췌는 최대 3개/각 2,000자이며 파일 경로나 로컬 JSON 업로드를 받지 않는다.
- owner DTO: assessment_id, repo_url, commit_sha, status, ingestion_status, input_revision, created_at, expires_at, questions, evidence, result, failure, visibility, share_id, previous_assessment_id, needs_retry.
- `result`는 criteria/score/confidence/improvement_task/manifest/evidence를 포함한다. 예전 flat `my_ai_score`는 현재 `result.score`, `confidence_summary`는 `result.confidence`다. CriterionResult의 snake_case 필드·점수 공식·근거 참조 원칙은 유지한다.
- 작업서 wire는 title/why/action/steps/done_checklist/done_when/evidence_ids/copy_text/criterion_code다. 문서의 풍부한 작업서 템플릿을 모두 LLM으로 생성하는 기능은 아니다. 현재는 가장 필요한 한 축을 선택하는 결정적 행동·완료 체크 템플릿이다.
- 공개 DTO는 repo_url/commit_sha와 result의 축별 상태·레벨·점수·파일 수 및 일반 안내만 포함한다. 모델 자유 서술 rationale/missing_evidence, 개인 작업서, 원문·답변·발췌·근거 상세는 공개하지 않는다. 예시 endpoint는 별도의 synthetic 데이터 전체를 제공한다.
- `GET /api/assessments/:id/comparison`: reassess로 연결된 이전 평가도 동일 owner인지 검사하고 비교한다. comparison_allowed/score_delta/axes/explanations 및 behavior_change=not_established를 반환한다. 모델·버전·출처·범위·발급 조건이 다르면 delta=null이다.
- manifest는 evaluator_model_id, stage_request_hashes, wire_request_hashes를 기록한다. model_input_hash는 단계별 실제 provider 요청 hash의 집계이며 hash에만 ID/시각을 제거하지 않는다. 실제 Anthropic envelope의 모델/설정은 별도 wire hash로 추적한다.
- 운영 저장은 owner별 별도 SQL 행 대신 서버 전용 state JSON과 CAS를 사용한다. owner token hash로 소유를 판별하며 개인 자료를 다른 owner에게 재사용하지 않는다.
- 인증된 create와 변경 요청은 Idempotency-Key가 필요하다. 무인증 첫 create는 토큰 유실 시 복구하지 않는다. 같은 요청의 pending 상태는 409이며 재시도는 새 키로 명시한다.
- 실제 처리 실패는 422 + owner DTO의 failure, 입력/인증/설정 오류는 error envelope를 사용한다. 만료 시도는 409 stale_attempt다. provider 미설정은 503 provider_not_configured이며 mock 대체가 없다.
- 결과 접근은 7일 뒤 만료한다. 생성 시/정리 CLI로 물리 삭제하며 자동 스케줄러는 아직 없다. 완료 결과 저장 후 PreparedAssessment와 임시 input/answers를 제거한다. 진행 중에도 소유자가 DELETE할 수 있으며 늦은 결과는 폐기한다.
- CLI 호출 수 상한은 웹의 영속 예산과 공유하지 않는다. 웹은 UTC 전역 기본 20회/소유자 6회이며 비용 달러 상한을 보장하지 않는다. API 미설정 상태에서는 유료 호출하지 않는다.

## 1. 소유·공개 접근

- 첫 create는 256비트 이상의 랜덤 owner_access_token을 발급해 201 응답에 한 번 반환한다. 클라이언트는 sessionStorage에 보관하고 이후 Authorization: Bearer 헤더로 전달한다. URL/query에 넣지 않는다.
- 같은 브라우저의 후속 create/reassess는 기존 토큰으로 owner에 연결한다. 첫 응답을 잃은 신규 익명 요청은 다른 owner의 평가로 deduplicate하지 않는다.
- 서버에는 토큰 해시만 Owner에 저장한다. 서비스키·해시·원문 토큰을 다른 응답/로그/공개 결과에 포함하지 않는다.
- **모든** /api/assessments/:id 읽기·질문 조회·사례/답변 수정·처리·재시도·삭제·공개 변경·비교는 해당 owner 인증 필수다. 토큰 누락은 401, 다른 owner의 ID는 404로 처리한다.
- anonymous public 접근은 /api/examples/:slug와 /api/results/:share_id만 가능하다. 공개 전용 DTO를 반환하며 Assessment 전체를 노출하지 않는다.
- 공유 링크는 소유 토큰과 별개다. 비공개 전환·삭제 즉시 철회하고 재공개 시 새 share_id를 만든다.
- 토큰 분실 복구는 MVP에 없다. sessionStorage의 수명과 별도 안전한 보관 필요성을 안내한다. 로그인 없는 것과 인증 없는 비공개 조회를 혼동하지 않는다.

## 2. 평가 상태 정본

전체 status 열거형: **draft / ingesting / generating_questions / awaiting_answers / scoring / done / failed**.

| 전이 | 트리거·조건 |
|---|---|
| 신규 → draft | POST create. ingestion_status=not_started |
| draft → draft | PATCH collaboration-case. 파생 수집이 있으면 무효화하고 input_revision 증가 |
| draft → ingesting → draft | POST ingest. 완료 시 ingestion_status=complete 또는 partial |
| draft → generating_questions → awaiting_answers | POST questions. 수집 complete/partial, 유효한 질문 3개 필요 |
| awaiting_answers → awaiting_answers | PUT answers. 자신의 질문 ID만 허용, 빈 배열은 모두 건너뛰기 |
| awaiting_answers → scoring → done | POST finalize. 판정·계산·개선 작업서 완료 |
| 활성 단계 → failed | 처리 실패. failure에 stage/code/retryable 저장 |
| failed/만료 시도 → 해당 활성 단계 | POST retry. 권한·재시도 가능성·input_revision을 확인 |
| done → 새 draft 평가 생성 | POST reassess. 이전 결과는 불변 |

ingestion_status와 my_ai_score.status는 위 lifecycle과 별개다. done인 결과에서 점수가 withheld일 수 있다. partial은 ingestion_status이며 lifecycle에 추가하지 않는다.

GET은 조회만 한다. 실행 시도와 deadline_at으로 needs_retry를 파생할 수 있으나 작업을 자동 실행하지 않는다. 실행권·attempt fencing은 SYSTEM_ARCHITECTURE 3절을 따른다.

## 3. 엔드포인트와 완료 방식

| 메서드·경로 | 동작 | 응답 |
|---|---|---|
| POST /api/assessments | repo_url, commit_ref?, 선택적 사례로 draft 생성 | 201, ID·초기 상태·필요 시 신규 owner 토큰 |
| GET /api/assessments/:id | 소유자 상태/결과 조회 | 200, OwnerAssessmentDTO |
| PATCH /api/assessments/:id/collaboration-case | draft에서 사례 입력/삭제, 파생 자료 무효화 | 200, input_revision |
| POST /api/assessments/:id/ingest | 수집 완료를 기다림 | 200, draft와 ingestion_status 또는 오류 |
| POST /api/assessments/:id/questions | 질문 생성 완료를 기다림 | 200, awaiting_answers·질문 3개 |
| GET /api/assessments/:id/questions | 생성된 질문을 소유자에게 제공 | 200, 질문 배열 |
| PUT /api/assessments/:id/answers | 답변 목록 저장, input_revision 증가 | 200 |
| POST /api/assessments/:id/finalize | 판정·계산·개선 작업서 완료를 기다림 | 200, done·OwnerAssessmentDTO |
| POST /api/assessments/:id/retry | 실패/만료 단계만 새 시도로 실행 | 200 또는 해당 실패 |
| POST /api/assessments/:id/reassess | 같은 owner/repo의 새 평가 생성 | 201, 새 draft. 비교는 완료 후 제공 |
| PATCH /api/assessments/:id/visibility | done 결과의 공개 범위 선택/철회 | 200, 공개 시 share_id |
| DELETE /api/assessments/:id | 즉시 접근 차단, 삭제 처리 예약 | 204 |
| GET /api/results/:share_id | 유효한 공개 요약 | 200, PublicResultDTO. 철회됐으면 404 |
| GET /api/examples/:slug | 명시적인 synthetic 또는 실제 예시 | 200, 예시 metadata·PublicResultDTO |

처리 요청에 무조건 202를 반환하고 별도 실행기를 전제하지 않는다. 호출한 단계는 같은 요청에서 await하며 프런트엔드는 성공 응답 뒤 다음 단계를 명시적으로 호출한다. 필요하면 별도 GET으로 진행을 표시한다.

## 4. 입력 제한 정본 (proposed)

| 입력 | 제한 |
|---|---|
| repo_url | 2,048자 |
| commit_ref | 256자, 공백/제어문자 거부. URL 인코딩해 API 경로 구성 |
| 협업 사례 | 여섯 서술 필드(problem, constraints, done_criteria, ai_suggestion_summary, user_action_detail, verification_summary) 합계 4,000자 |
| 사용자 발췌 | 최대 3건, 건당 2,000자 |
| 질문 답변 | 최대 3건, 답변당 2,000자 |
| 전체 JSON body | UTF-8 기준 64 KiB |

연결 근거 ID는 같은 assessment 소속이어야 한다. 모델·버전·가중치·owner_id·visibility·관찰 레벨은 사용자가 결과로 제출할 수 없으며 서버가 검증/결정한다. 사용자가 level/status를 임의로 쓰면 거부한다.

## 5. 재전송·재시도·불변성

소유 인증된 변경 요청에는 Idempotency-Key를 요구한다. owner_id + endpoint + key를 범위로 삼고 정규화 payload digest를 저장한다. 같은 키·같은 내용은 같은 처리 결과, 다른 내용은 409. 활성 작업은 stage와 attempt_id를 확인해 중복 실행을 막는다.

repo/commit이 같다는 이유로 기존 Assessment나 개인 질문·답변·판정을 다른 제출에 반환하지 않는다. 같은 owner라도 사례/답변 수정은 input_revision을 변경한다. 완료 결과는 수정하지 않고 새 reassessment를 생성한다.

유효한 단계 전이 외의 요청은 409 invalid_transition. 클라이언트가 먼저 상태를 조회해 이미 완료됐는지 확인한 뒤 재전송하도록 한다. 서버가 끊긴 작업을 무조건 계속 처리한다는 보장은 없다.

## 6. 응답 예시 (유효한 JSON)

create 요청:

~~~json
{"repo_url":"https://github.com/example-org/example-repo","commit_ref":null,"collaboration_case":null}
~~~

최초 create 응답의 토큰 값은 형식 예시이며 실제 비밀이 아니다:

~~~json
{"assessment_id":"as_synthetic_1","status":"draft","ingestion_status":"not_started","owner_access_token":"synthetic-placeholder-not-a-real-token"}
~~~

진행 상태 응답:

~~~json
{"assessment_id":"as_synthetic_1","status":"ingesting","ingestion_status":"not_started","progress_note":"저장소 파일을 읽고 있습니다.","needs_retry":false,"my_ai_score":null,"failure":null}
~~~

부분 근거 결과의 발급 필드:

~~~json
{"status":"withheld","value":null,"reasons":["insufficient_dimensions"],"observed_dimensions":4,"total_dimensions":5}
~~~

최종 OwnerAssessmentDTO는 EVIDENCE_SCHEMA 6절의 필수 필드를 사용한다. 이 문서에서 confidence_summary나 CriterionResult 구조를 다르게 재정의하지 않는다.

오류:

~~~json
{"error":{"code":"stage_timeout","message":"분석 단계의 제한 시간을 초과했습니다.","retryable":true,"stage":"ingest"}}
~~~

오류 code: invalid_url / unsupported_host / invalid_input / repo_not_found_or_private / unsupported_stack / size_limit_exceeded / rate_limited / unauthorized / not_found / invalid_transition / idempotency_conflict / stage_timeout / output_validation_failed / internal_error.

잘못된 입력·접근 불가·지원 불가·계약 충돌은 retryable=false. 일시적 rate limit/timeout/5xx는 true이며 가능한 Retry-After를 제공한다. partial 수집은 실패 응답과 혼동하지 않고 coverage/warnings로 설명한다.

## 7. 공개와 비교

공개는 완료된 요약의 미리보기를 본 사용자가 선택한다. 원문 사례·답변·발췌는 공개 DTO에 없다. 브라우저에서 버튼을 감추는 것만으로 권한을 제어하지 않는다.

비교는 새 assessment가 done일 때 생성하며 EVIDENCE_SCHEMA의 Comparison을 그대로 따른다. 이전 평가 소유 권한을 확인하고, 점수 보류/버전 불일치/범위 차이가 있으면 총점 상승 화살표를 표시하지 않는다. 미확인 → 확인만으로 행동 개선을 선언하지 않는다.

예시 metadata 필수: is_example=true, example_kind(synthetic/live), example_source, executed_at(실제 실행 전 null). synthetic 예시에 실제 분석 날짜를 지어내지 않는다.
