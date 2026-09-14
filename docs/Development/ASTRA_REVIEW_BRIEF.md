# Astra Review Brief — v0.3.1

정본: [마스터 플랜](../00_MASTER_PLAN.md). 변경 판단: [DECISIONS](DECISIONS.md). 이 문서는 Claude의 초기 완료 보고 이후 Astra가 실제 문서를 읽고 보정한 결과다.

## 1. 검토 결론

제품 방향은 유지한다. v0.3 초안의 미관찰 계산, 개인 평가 캐시, 실행 수명, 공통 레벨 기준, 행동 변화 분류에 결함이 있어 v0.3.1로 보정했다. 현재는 **교정 fixture와 수집 PoC 착수 기준**이며 서비스·평가 타당성 인증이 아니다.

## 2. 반영한 핵심 계약

- 종합점수: 다섯 축 모두 판정 가능 + complete 수집 + 유효 근거 + blocking conflict 없음일 때만 issued. 미확인은 null/withheld.
- 평가 기준: 5개 축 × 4단계의 행동과 반례. 확인된 생략 행동과 자료 미제출을 구분.
- 캐시: 공개 코드 수집만 공유. owner별 사례·답변·평가·질문은 공유 캐시 대상 아님.
- 실행: 단계별 요청을 await. GET은 조회만. timeout·attempt fencing·명시적 retry.
- 비교: evidence_change/behavior_change 독립. 과거 로그 추가는 기본 not_established.
- 계약: private GET까지 소유 인증, 공개 DTO 분리, JSON 예시·lifecycle·score status·ingestion status 통일.

## 3. 문서 검사

문서 23개, 상대 링크 137개, JSON 예시 9개를 검사했다. 끊긴 링크/JSON 오류/지정 계약 불일치 0건. 축별 레벨 20개, 가중치 합계 100, 점수 예시 73·100·25와 보류 예시 4건을 재확인했다. 보관한 v0.2 파일 18개도 원본 ZIP과 해시가 일치했다.

검사 기록: [document-validation.json](../../_archive/v0.3.1/document-validation.json). 이 검사는 문서의 파일·링크·JSON·정의·예시 계산을 확인하며, 실제 모델 교정·앱 테스트·실제 GitHub 수집 성공을 뜻하지 않는다.

## 4. 원본과 정리

현재 루트에는 README/CLAUDE/AGENTS, 새 작업 프롬프트, docs, _archive, v0.2 ZIP을 둔다. 이전 폴더·루트 마스터 안내·완료된 기획 프롬프트는 보관 위치로 옮겼다. 수정 전 문서도 별도 ZIP으로 보존했다.

## 5. 남은 불확실성

가중치/레벨 타당성, 실제 평가의 보류율·변별력·반복성, 개인 제출 조작 대응, 실제 배포의 단계 시간·비용, 외부 사용자 효용은 아직 미검증이다. 모든 자료가 있어도 사용자의 일반 역량을 인증할 수 있다는 뜻은 아니다.

다음 Claude 보고에서는 fixture 구조·기대와 자료 연결·입력 검증·full SHA·제한 처리·실제 수집 기록을 먼저 확인한다. 수집 테스트 통과를 평가 모델의 안전성/타당성 검증으로 확대 해석하지 않는다.

## 6. 다음 지시

[CLAUDE_PHASE1_PROMPT](../../CLAUDE_PHASE1_PROMPT.md)를 전달한다. Task 0·1을 실제 구현·검증하고 PHASE1_REPORT를 제출한 뒤 종료한다. LLM 호출·DB·UI·배포는 이어지는 별도 작업이다.
