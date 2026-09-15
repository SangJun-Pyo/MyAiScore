# System Architecture — session reports and legacy v0.3.1

## Current primary flow (v0.4)

[ADR-0014](ADR/0014-cli-first-session-reports.md): local CLI → bounded scoped Claude Code parser → numeric metrics → shared deterministic SessionReport → terminal/new summary file/explicit summary-only fragment → browser validation and recomputation → optional browser-local history/copy summary. No backend assessment, GitHub call, LLM, database or raw-log upload is needed for this flow. [SESSION_REPORT](../Assessment/SESSION_REPORT.md) owns the new contract.

The following sections describe retained **legacy repository assessment** infrastructure. They do not gate the primary CLI experience. Existing private/public record access rules remain in force; do not reinterpret old data as new session reports.

정본 허브: [마스터 플랜](../00_MASTER_PLAN.md). 데이터: [EVIDENCE_SCHEMA](../Assessment/EVIDENCE_SCHEMA.md). API·상태: [API_DATA_CONTRACTS](API_DATA_CONTRACTS.md). 수집: [GITHUB_INGESTION](GITHUB_INGESTION.md).

## 1. 최소 구성과 상태

이 구조를 선택한 이유·대안·한계는 [ADR 인덱스](ADR/README.md)에 기록한다. 이 문서는 현재 구조의 정본이며 과거 결정 이유를 중복 보관하지 않는다.

Next.js/React/TypeScript + 서버 API + Supabase/PostgreSQL adapter를 구현했다. LLM은 서버의 Anthropic Messages adapter로 호출하며 키·정확한 모델 ID·명시적 활성화가 필요하다. Docker/Railway 설정을 준비했으나 계정 배포·실제 비용은 미검증이다. 별도 큐나 워커는 없다.

현재 구현과 미실행 구분은 [Phase 4](../Development/Sessions/Phase-04-Web-MVP.md)를 따른다. API 단계와 합성 end-to-end 검증은 구현됐지만 실제 모델 판정 타당성·Supabase 인스턴스 실행은 미검증이다.

운영 저장은 RLS로 클라이언트 접근을 막은 단일 JSON state row와 revision CAS를 사용한다. 전체 state를 읽고 쓰는 소규모 MVP 방식이며 정규화 테이블/대규모 트래픽 설계는 아니다. 로컬 FileStore는 같은 프로세스의 쓰기만 직렬화하며 운영 모드에서 명시적 허용 없이 fallback하지 않는다. raw owner token은 최초 응답 후 저장하지 않는다.

## 2. 책임

| 모듈 | 역할 |
|---|---|
| Ingestion | URL 검증, SHA 고정, 제한된 파일 수집, 정적 신호·구간 검증 |
| Question Generator | 근거에 연결된 질문 3개 |
| Criterion Evaluator | 각 축의 상태·레벨·지지/반대 근거·판단 이유 |
| Scoring / Confidence | 고정 공식, 발급·보류, 확인 범위 요약 |
| Improvement Builder | 가장 중요한 다음 행동 1개와 검증 가능한 작업서 |
| Result Store / API | 소유 권한, 단계 전이, 불변 결과, 공개 요약, 재평가 |

LLM이 최종 숫자나 관리 권한을 결정하지 않는다. 공유 결과에도 서버 전용 필드나 사용자 원문을 그대로 보내지 않는다.

## 3. 실행 방식: 요청별로 완료를 기다리는 단계 실행

v0.3의 “먼저 응답하고 같은 요청에서 알아서 계속 실행” 가정은 폐기했다. **MVP는 각 처리 요청이 해당 단계를 await하고, 성공/실패를 저장한 뒤 응답하는 방식**으로 구현한다.

1. POST create: draft 평가를 만들고 즉시 201 반환. 처리 작업을 몰래 시작하지 않는다.
2. 사례 입력/건너뛰기 후 POST ingest: ingesting으로 전환, 수집을 기다리고 draft로 돌아가며 ingestion_status 기록.
3. POST questions: generating_questions로 전환, 질문 생성을 기다린 뒤 awaiting_answers.
4. 답변 제출 후 POST finalize: scoring으로 전환, 판정·공식·개선 작업서 생성을 기다리고 done.
5. GET은 권한을 확인한 상태 조회다. 실행·재개 트리거가 아니며 폴링만으로 작업이 진행되지 않는다.

상태 열거형과 전이 조건은 API_DATA_CONTRACTS가 정본이다. 브라우저는 단계 완료 후 다음 명시적 요청을 호출한다. 새로고침 시 저장된 상태와 소유 토큰으로 위치를 복원할 수 있으나, 끊긴 실행의 완료를 보장하지 않는다.

### 시간 제한·중단·동시 실행

- 각 처리 요청은 DB의 조건부 갱신으로 해당 평가의 실행권을 얻는다. attempt_id, active_stage, deadline_at, input_revision을 기록한다.
- 완료 결과는 같은 attempt_id와 input_revision이 유효할 때만 저장한다. 늦게 끝난 이전 시도는 새 결과를 덮어쓸 수 없다.
- 서버 단계 예산 초과 시 AbortController 등으로 외부 요청을 중단하고 가능한 경우 failed를 저장한다. 예산에는 재시도 시간이 포함된다.
- 프로세스 자체가 종료돼 상태를 저장하지 못한 경우에도 deadline_at으로 만료된 시도임을 알 수 있다. GET은 needs_retry=true를 파생해 보여주며 실행하지 않는다.
- POST retry가 소유 권한과 실패/만료·입력 버전을 확인하고 새 attempt_id로 해당 단계를 다시 실행한다. 유효하게 진행 중인 시도는 중복 실행하지 않는다.
- 최초 초안의 플랫폼 제한 “수십 초”를 사실로 고정하지 않는다. 배포 전에 실제 플랜의 요청 제한이 내부 단계 예산보다 충분한지 확인한다.

잠정 예산: ingestion 45초, 질문 생성 45초, finalize 90초. 플랫폼 제한 내에서 여유 시간을 확보해야 한다. 이 값은 실측 목표이며 현재 보장치가 아니다. 맞출 수 없으면 단계 세분화 또는 영속 작업 실행기를 별도 설계한 뒤 구현한다.

응답 후 실행 기능을 후속으로 선택하더라도 Next.js after()는 플랫폼의 최대 실행 시간 제한을 받는다. 자동 재시도·영속 실행을 대신하지 않는다. [Next.js 공식 after 문서](https://nextjs.org/docs/app/api-reference/functions/after), [Vercel 공식 waitUntil 문서](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).

## 4. 캐시와 중복 요청

**공통 캐시는 공개 저장소의 읽기 결과만 대상으로 한다.**

- immutable blob: (repo, full_blob_sha, collector_version).
- 선정된 snapshot: (repo, full_commit_sha, selection_digest, collector_version). selection_digest에는 정렬된 관련 경로, 제한값, 파일 선정 버전을 반영한다.
- 캐시 재사용 전 현재 저장소가 여전히 공개로 접근 가능한지 확인한다. 비공개/삭제 시 기존 캐시를 사용자에게 내보내지 않는다.
- 공통 캐시에 협업 사례, 질문, 답변, 판정, 개선 작업서, 소유 정보, Assessment 전체를 넣지 않는다.
- 완성된 개인 평가를 서로 다른 요청/사용자에게 자동 재사용하지 않는다. 동일 저장소를 다시 제출해도 새 평가가 원칙이다.
- 네트워크 중복 전송만 owner_id + Idempotency-Key + endpoint + 정규화 payload digest로 처리한다. 같은 키·다른 payload는 409. 다른 owner와 결과를 공유하지 않는다.
- 재평가에는 새로운 assessment_id를 발급한다. 모델·프롬프트·추론 설정과 수집/리브릭 버전을 고정한다. 기존 평가를 덮어쓰지 않는다.
- 교정 실험은 새로운 평가 실행으로 수행하고 LLM 판정 결과를 재사용하지 않는다. 공통 정적 수집 캐시 사용 여부는 실험 메타데이터에 명시한다.

## 5. 입력·운영 제한

수집 제한값 정본은 GITHUB_INGESTION, 사용자 입력 제한값 정본은 API_DATA_CONTRACTS다. 같은 숫자를 여러 문서에 복제하지 않는다.

LLM 네트워크/구조화 출력 오류는 단계 예산 안에서 최대 2회 재시도 초안. 비재시도 오류는 즉시 중단한다. 1 owner당 동시 평가 1개, 시간당 새 분석 5회와 IP 기반 보조 제한은 운영 초안이다. 토큰을 새로 발급받아도 IP 제한을 우회하지 않게 하고, 브라우저 지문 수집은 MVP 기본안으로 삼지 않는다.

수집 PoC에서 실제 HTTP 횟수·파일/바이트 수·소요 시간을 측정한다. LLM 시간·토큰·비용은 이후 별도 실험하며 아직 수치를 갖고 있지 않다. 공개 원문 캐시 TTL 기본안 24시간, 소유 데이터 보존은 PRIVACY_SECURITY를 따른다.

## 6. 런타임과 개발 도구

개발용 Claude Code/Codex와 서비스 평가용 LLM API는 별개다. 개인 구독을 서버 추론 예산으로 가정하지 않는다. 제출 저장소의 install/build/test/hooks/MCP는 실행하지 않는다. MyAiScore 자체의 구현과 테스트를 수행하는 것은 이 금지와 구분한다.
