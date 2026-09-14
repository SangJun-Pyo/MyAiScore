# Claude Phase 2 수정 지시

> 문서 인계 경로 갱신: 결과와 후속 검토는 docs/Development/Sessions/Phase-02-Fixes.md에 날짜별로 이어 쓰고 CHANGELOG/BUGS/ROADMAP을 동기화한다. 구현 범위는 그대로다. Development 최상위에 별도 보고서를 생성하지 않는다.

루트: C:/Users/sangj/MyAiScore. 이번 지시는 Phase 2 오프라인 구현 보고 이후 Astra 코드 검토에서 발견된 결함을 수정하는 작업이다.

먼저 AGENTS.md, CLAUDE.md, docs/00_MASTER_PLAN.md, docs/Development/Sessions/Phase-02-Offline-Evaluation.md를 읽는다. 이후 해당 평가/신뢰/데이터 정본과 실제 코드를 읽는다. 이전 ASTRA_PHASE1_REVIEW의 원칙도 유지한다.

## 목표

ASTRA_PHASE2_REVIEW의 R1~R4를 실제 코드에서 고치고, 함께 지적한 과정 자료 표시·fixture 기대·실험 계획을 맞춘다. 단순히 문서 제안만 남기지 말고 아래 완료 조건까지 구현한다. LLM API·예산은 여전히 미정이다.

## 구현 범위와 필수 완료 조건

1. **단계 실패 처리:** ingestion/questions/judgement/scoring 단계 결과를 성공·실패·미실행으로 구분한다. 앞 단계 실패 이후 provider/점수 호출이 0회인지 기록형 mock으로 검증한다. 질문 실패+유효한 100점 판정 mock 조합에서도 score=null이어야 한다. 질문 정상·사용자 답변 생략은 정본이 허용하므로 계속 평가하되 근거를 꾸미지 않는다. 구조 오류는 정상 withheld로 바꾸지 않는다. CLI 실패 exit code!=0, 정상 issued/withheld는 0, stdout JSON 1개를 유지한다.
2. **실제 요청 연결:** provider 인터페이스에 typed request와 AbortSignal/제한 시간 계약을 추가하고 실행기에 주입한다. 질문·판정 요청에 올바른 버전 프롬프트, A~E 축별 4단계 기준·반례, 비신뢰 입력과 질문/답변이 실제로 들어가는지 기록형 MockProvider로 검증한다. mock이 fixture 정답을 읽거나 요청에서 정답을 추출하도록 구현하지 않는다. SDK·유료 호출은 추가하지 않는다. 끝나지 않는 provider/throw 예외도 제한 시간/명시적 실패로 종료하고 늦은 응답을 무시한다.
3. **원문 전달:** excerpt 원문을 제한·마스킹한 일시적 분석 컨텍스트에 넣고 Evidence 메타데이터와 ID로 연결한다. 실제 로그 내용이 판정 요청에 도달하는지 고유 synthetic 문자열로 검증한다. 원문 전체를 일반 결과/공개 응답/로그에 복제하지 않는다. 로컬 fixture 경로는 명시적 fixture 루트 경계를 확인하고 크기 제한을 적용한다. 누락 자료를 생성하지 않는다.
4. **계약 검증:** 모든 항목의 assessmentId, 고유 ID, 질문-답변 및 근거 참조를 검사한다. bundle에 다른 assessment의 Evidence 자체가 들어오는 경우를 차단한다. null/primitive/array 형태의 항목은 TypeError 대신 명시적인 validation 실패를 반환한다. 빈 답변은 생략 또는 명시적 오류로 처리하며 근거로 사용하지 않는다. 점수 엔진에 유효 근거 집합/검증된 입력을 필수로 적용하고 임의 status/ingestionStatus를 거부한다.
5. **과정 자료와 fixture:** 정적 테스트 파일 링크만으로 linked_records를 표시하지 않는다. 실제 관련 과정 기록과 자기진술을 구분한다. case-04b의 사후 서술만으로 낮은 수행 확정, 테스트 미언급만으로 미관찰 강제, case-08c의 실패 결과로 무비판 수용 역추론 같은 기대를 제거한다. 단정 가능한 행동과 금지 추론을 구분하고 필요한 근거가 없으면 null 상태를 사용한다. humanReviewed=false를 유지한다.
6. **실험 설계 정합성:** 공격을 지적하는 인용과 공격 복종을 구분한다. 프롬프트 보정 2회와 호출 재시도를 혼동한 174회 상한을 폐기하고 미승인 실행 계획으로 다시 산출한다. 반복 실험용 단계 요청을 고정하고 실제 payload hash가 같은지 확인한다. 전체 감사 hash와 모델 입력 hash의 목적을 구분한다. 모델 미정이면 토큰/비용은 산정하지 않는다.

수정 범위는 관련 src/server/evaluation, src/server/scoring, 최소 공유 타입, fixtures, tests, offline CLI와 관련 docs다. 공통 계약은 위 보정에 필요한 최소 필드/결과 타입만 변경하고 문서와 함께 맞춘다. 가중치·점수 발급 원칙은 유지한다. UI/DB/배포/서비스 API 선택은 이번 범위에 없다.

## 검증 및 보고

- 우선 Astra 재현을 읽고 버그를 재현하는 회귀 테스트를 작성한다. 수정 후 새 테스트와 기존 테스트·typecheck를 실제 실행한다.
- 기존 synthetic 재현 스크립트는 이전 인터페이스로 된 관찰 기록이다. 회귀 테스트는 수정된 인터페이스에 맞게 작성하고 기대 상태를 assert한다. 스크립트가 중단된 것만으로 수정 성공이라 하지 않는다.
- CLI 정상/정상 withheld/실패의 JSON과 exit code를 실제 실행해 확인한다. 테스트 수를 기존 수에 억지로 맞추지 않고 수정·추가·제거 이유와 실제 개수를 보고한다.
- docs/Development/Sessions/Phase-02-Fixes.md에 R1~R4별 원인·수정 파일·회귀 테스트 이름·실행 결과를 기록한다. 산출물은 artifacts/phase2-fix/에 두고 mode=mock 표시를 유지한다.
- 실제 질문 품질·판정 타당성·인젝션 방어가 검증됐다고 주장하지 않는다. 실제 API 호출 없이 위 수정과 검증을 끝낸 뒤 Astra 재검토용으로 보고한다.
