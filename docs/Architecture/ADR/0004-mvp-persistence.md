# ADR-0004 — 개발 FileStore와 소규모 Supabase CAS 저장을 사용한다

- 상태: Accepted
- 기록일: 2026-09-14 (Phase 4 사후 기록)
- 결정 주체: Astra, 제한된 MVP 저장 구현 선택
- 기준: PR #6 / `db0edd7`; 대체 관계: 없음

## 배경

계정 연결 없이 로컬에서 실행하면서 운영용 영속 저장의 인터페이스도 필요했다. 소유권, 실행권, 호출 상한과 중복 요청 기록의 동시 갱신을 처리해야 한다.

## 결정

개발은 프로세스 안에서 직렬화하고 파일을 원자적으로 교체하는 FileStore를 사용한다. 운영은 Supabase의 단일 JSON state row와 revision 기반 compare-and-swap(CAS)을 구현한다. DB 접근은 서버 서비스 키로 제한하고 RLS로 클라이언트 접근을 차단한다. 운영 FileStore는 명시적 opt-in이며 DB 실패 때 조용히 파일로 대체하지 않는다. 외부 모델 호출은 재실행 가능한 저장 transaction callback 밖에서 수행한다.

## 대안

- 메모리만 저장: 재시작 시 자료/호출 상한을 잃어 운영 저장으로 배제했다.
- 여러 프로세스에서 FileStore 공유: 프로세스 간 쓰기 제어가 없으므로 지원하지 않는다.
- 평가별 정규화 테이블과 DB transaction/RPC: 확장성과 부분 갱신에는 유리하지만 최초 구현 범위를 줄이기 위해 보류했다. 성능 비교 실험으로 탈락시킨 대안은 아니다.

## 결과와 재검토 조건

전체 JSON을 매번 읽고 갱신하므로 데이터가 커지면 전송량·경합·row 크기가 병목이 된다. 공개 대규모 서비스용 저장 설계로 간주하지 않는다. 운영 부하·저장 크기 측정 후 정규화 이전을 판단한다. 7일 접근 만료와 물리 삭제는 별개이며, 신규 생성 시 정리 외에 비활성 기간의 삭제가 필요하면 별도 prune 작업을 운영해야 한다.

## 근거와 검증 상태

[store](../../../src/server/web/store.ts), [migration](../../../supabase/migrations/202609140001_assessment_store.sql), [검사](../../../tests/web/api.test.ts), [prune CLI](../../../scripts/pruneAssessments.ts), [운영 안내](../../../README.md). FileStore와 모의 Supabase CAS 응답을 검사했다. 실제 migration/RLS/다중 인스턴스/부하 실측은 [#4](https://github.com/SangJun-Pyo/MyAiScore/issues/4)에 남아 있다.
