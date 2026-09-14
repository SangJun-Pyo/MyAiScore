# Claude Phase 2 Fixes — Astra 재검토 후 잔여 수정

> 완료된 과거 지시문입니다. MAS-002/004/005는 Phase 4 통합에서 보정했습니다. 현재 작업은 ROADMAP과 GitHub 이슈를 따르며 이 프롬프트를 재실행하지 않습니다.

루트: C:/Users/sangj/MyAiScore. 현재 지시는 같은 Phase의 후속 보정이다. 기존 R1~R4 전체를 다시 구현하지 않는다. 이전 지시 원문은 Git commit 01309c5에서 확인할 수 있다.

먼저 AGENTS.md, CLAUDE.md, docs/Development/ROADMAP.md, docs/Development/Sessions/Phase-02-Fixes.md의 최신 Astra 재검토 절, docs/Development/BUGS.md와 관련 계약을 읽는다. 신규 REPORT/REVIEW 파일을 Development 최상위에 생성하지 않는다.

## 수정 범위: 세 항목만

### 1. MAS-002: provider 예외를 명시적 단계 실패로 처리

- generateQuestions/judgeCriteria의 sync throw와 rejected Promise를 각각 해당 단계 failed로 처리한다. 호출자에게 미처리 예외만 던지는 것으로 완료하지 않는다.
- 결과에는 stages/pipelineFailed/score=null과 이후 단계 not_attempted가 남아야 한다. CLI stdout JSON 1개와 실패 exit code를 유지한다.
- withTimeout은 동기 예외를 포함한 모든 경로에서 타이머를 정리하고 늦은 완료를 무시한다. timeout과 일반 provider 실패를 구분한다.
- 테스트: 질문 sync throw / async reject, 판정 sync throw / async reject, timeout 후 늦은 resolve/reject. 다음 단계 호출 0회와 명시적 실패를 assert한다. 기존 정상 및 정상 withheld 회귀를 유지한다.
- 원래 예외의 토큰·원문·내부 경로를 사용자용 결과에 그대로 복사하지 않는다. 정상적인 오류 코드/안전한 설명을 제공한다.

### 2. MAS-004: 질문 없는 답변과 입력 참조를 거부

- questions가 undefined이거나 []이면 유효한 질문 집합은 비어 있다. answers가 하나라도 있으면 참조 오류다. 현재 if(questions && ...) 조건으로 검사를 건너뛰는 결함을 수정한다.
- bundle 직접 조립에서도 빈 답변을 유효한 근거로 받지 않는다. 질문 groundingEvidenceIds가 실제 같은 assessment의 Evidence를 가리키는지 확인한다.
- 미연결 협업 사례 주장은 기존처럼 unresolved로 남길 수 있다. 이를 자동으로 유효 근거로 만들지 않는다.
- 테스트: questions 생략+답변 있음, 빈 questions+답변 있음, 빈 답변, 질문의 깨진 근거. 기존 유효한 질문+답변과 답변 생략 경로는 정상이어야 한다.

### 3. MAS-005: 실제 payload와 반복 실험 hash 일치

- computeModelInputHash의 일부 필드 제거만으로 동일 입력 실험이라고 주장하지 않는다. 실제 모델에 전달할 단계별 payload를 한 번 구성하고 provider와 hash 계산이 그 같은 payload를 사용하게 한다.
- 감사용 전체 실행 hash와 단계별 모델 payload hash의 목적을 분리한다. 임의로 hash에서만 ID/시각을 지우지 않는다. ID 정규화가 필요하면 payload 내부 ID와 모든 참조를 함께 매핑한다. 동적 운영 식별자는 모델 입력 바깥 메타데이터로 분리할 수 있다.
- 사건/행동 시각(eventTime), 실제 코드/발췌/답변/질문 내용은 의미 있는 근거다. 반복성을 맞추려고 삭제하지 않는다.
- 반복 실험은 실제 동일한 질문/답변/근거 payload와 버전/설정을 재사용하며 evaluator 결과 캐시는 사용하지 않는다. 일반 생성 실행이 서로 다른 질문을 만들면 다른 판정 입력인 것이 정상이다.
- 테스트: 시각/UUID가 달라지는 두 실행에도 고정 실험 payload가 byte 단위로 같고 hash도 같음; 질문/답변/발췌/루브릭/설정 등 모델에 전달한 내용 변경 시 해당 단계 hash 변경; 기록형 provider가 받은 payload를 다시 hash한 결과와 manifest 값 일치.
- modelInputHash 타입/manifest 필드의 변경이 필요하면 목적과 마이그레이션을 관련 문서에 함께 적는다. 특정 API SDK는 아직 연결하지 않는다.

## 완료 조건과 인계

- 위 결함의 실패 재현 → 코드 수정 → 회귀 테스트 통과를 실행한다. 과거 Astra 재현 스크립트는 관찰 기록이므로 인터페이스 변경 후 중단된 것만으로 통과라고 하지 않는다.
- npm run typecheck, npm test, node scripts/checkDocs.mjs, 관련 CLI 성공/보류/실패를 확인한다. 실제 테스트 수와 실행 결과를 남긴다.
- 결과와 검토 요청은 docs/Development/Sessions/Phase-02-Fixes.md에 날짜·작성자와 함께 이어 쓴다. BUGS/CHANGELOG/ROADMAP을 동기화한다. 작성자 테스트 통과만으로 Astra 검토 완료라고 하지 않는다.
- 작은 구현 선택은 근거를 적고 진행한다. 실제 LLM 호출·배포·DB/UI·제품 범위 확장은 하지 않는다. 모델/예산은 미정 그대로다.
- 본인 담당 변경만 별도 commit한다. 이번 작업은 세 가지 잔여 문제를 고치는 데서 끝낸다.
