# Decisions — v0.3.1 Astra 검토 반영

정본: [마스터 플랜](../00_MASTER_PLAN.md). 과거 참고: [v0.2 원본 마스터](../../_archive/v0.2/00_MASTER_PLAN.original.md). v0.3 초안은 _archive/v0.3.1의 수정 전 ZIP에 보존돼 있다. 2026-09-14 확인 시 루트 v0.2 ZIP은 없어 현재 존재하는 원본 링크로 교체했다.

## 1. 유지한 방향

단일 공개 저장소·대표 협업 사례, 실제 파일 근거, 질문 3개, AI 활용 점수와 코드 품질의 구분, 개선 작업서, 선택 공개, 전후 비교를 유지한다. Private/팀/Local Mode/리더보드/역량 인증서와 별도 Project Quality 총점은 보류한다.

## 2. 검토로 채택한 보정

| 문제 | 결정 | 이유 |
|---|---|---|
| 미관찰을 합산에서 0으로 처리한 부분 발급 | 다섯 축 모두 observed인 경우만 총점 발급. 미확인은 null과 withheld | 표현과 무관하게 총점이 낮아지는 모순 제거 |
| repo/commit 기준 개인 평가 재사용 | 공통 코드 수집 캐시만 재사용. 개인 요청/판정은 owner·입력·버전으로 분리 | 같은 결과물도 다른 과정·사용자를 평가해야 함 |
| 응답 후 실행 주체가 없는 폴링 계획 | 단계별 요청을 await하고 제한 시간·attempt·retry 계약 명시 | 조회와 실행을 구분, 실행 유실을 숨기지 않음 |
| 공통 레벨 설명 하나 | 다섯 축 각각 4개 단계와 반례 작성 | LLM이 축별 기준을 임의 생성하는 여지 축소 |
| 상태/레벨 변화=행동 향상 | evidence_change와 behavior_change 독립 | 과거 자료 추가와 새 행동을 구분 |
| 읽기 권한·DTO·상태 불일치 | 비공개 GET도 owner 인증, 공개 DTO 별도, 상태·필드 정본 통일 | 자료 혼합과 구현자별 다른 계약 방지 |
| 일부 실패를 고지하고 출시하는 교정 기준 | 핵심 점수·권한·실행 결함은 수정/재검증 전 배포하지 않음 | 평가 신뢰성의 필수 조건 |

위 보정은 사용자의 “수정 진행” 요청에 따라 반영했다. 구현 규칙의 채택과 실험적 타당성 검증은 구분한다.

## 3. 아직 교정·실측이 필요한 값

가중치 15/20/15/30/20, 1~4단계 경계, 수집/단계 시간·용량 제한, 실제 모델·프롬프트, 스택·배포 플랜 적합성, 사용자 입력 부담, 보류율, 결과 효용은 검증 전이다.

모든 판정 가능 항목의 최저 점수는 25이다. 향후 0단계를 추가하려면 “미관찰”과 별개인 관찰된 수행 기준으로 새로 정의·교정해야 하며 이번 작업에서는 추가하지 않았다.

## 4. 파일 정리

루트에서 이전 폴더와 안내 파일을 치웠다. 영구 삭제 명령은 자동 승인 검토에서 정책상 차단돼, 원본을 _archive로 옮기는 방식으로 정리했다.

- v0.2 풀린 폴더: _archive/v0.2/MyAiScore_Planning_v0.2_markdown
- 루트 마스터 안내: _archive/v0.3.1/00_MASTER_PLAN.redirect.md
- 완료된 기획 지시문: _archive/v0.3.1/CLAUDE_PLANNING_PROMPT.md
- v0.2 ZIP과 _archive/v0.2/00_MASTER_PLAN.original.md는 보존.

현재 기획 정본은 docs/00_MASTER_PLAN.md 하나다. 이전 자료는 이번 구현의 명령으로 읽지 않는다.

## 5. 실행·문서 관리 결정 (2026-09-14)

- Phase 1 후속 설계 보정: [기록](Sessions/Phase-01-Fixtures-And-Ingestion.md#astra-review).
- Phase 2 검토에서 MAS-001~004 수정 후 재검토 결정: [기록](Sessions/Phase-02-Offline-Evaluation.md#astra-review).
- 현재 상태/지시를 ROADMAP으로 통일하고, Phase별 구현·검토는 Sessions, 변경 요약은 CHANGELOG, 열린 결함은 BUGS로 분리한다.
- Git에 현재 WIP 기준점을 만든 뒤 작업별 commit을 남긴다. 오늘 이전의 세션별 Git 이력은 만들지 않는다. 구현자의 동시 변경은 문서 정리 commit에 포함하지 않는다.
- RobloxLab.zip은 문서/세션 운영 방식 참고 자료다. 타 프로젝트의 실행 규칙이나 원격 저장소 설정은 적용하지 않는다.
- 이번 구조 정리 근거: [세션](Sessions/Session-2026-09-14-Documentation-And-Git.md).

## 6. Phase 2 재검토 — 반복 실험 입력 계약

2026-09-14: 반복 실험의 동일성은 실제 모델에 전달할 단계별 payload와 그 hash로 확인한다. 임의 필드를 hash에서만 제거한 논리 내용 비교를 동일 입력 실험으로 표현하지 않는다. 감사용 hash와 모델 payload hash를 분리한다. 구현 잔여 범위는 MAS-002/004/005로 한정한다. [근거](Sessions/Phase-02-Fixes.md#astra-rereview-20260914).

## 7. 정식 MVP 편입 전의 제한된 로컬 수집 실험 (2026-09-20)

`MVP_SCOPE.md`의 보류 항목("Local Evidence Mode, CLI, IDE 플러그인 — 조작 가능성이 높고 검증 인프라가 없음")은 **폐기하지 않는다.** 대신 사용자·Astra 합의로 아래 조건 하나에 한정해 재검토를 허용한다:

- 대상은 **로컬 협업 기록 수집 PoC 1건**([Phase-03-Local-Collection-PoC](Sessions/Phase-03-Local-Collection-PoC.md))뿐이다. 이 결정은 MVP 범위를 CLI 제품으로 바꾸거나 Local Evidence Mode 전체를 승인하는 것이 아니다.
- 이 PoC가 다루는 것은 사용자가 **명시적으로 지정한** 프로젝트 경로 1개 + 세션 파일 1개뿐이다. 홈 디렉터리 자동 탐색, 여러 세션 통합, 실제 평가 파이프라인(질문 생성·판정·점수) 연결은 이번 결정에 포함되지 않는다.
- 로컬 세션 기록은 GitHub 수집 근거(`repo_static`/`repo_history`, 제3자가 커밋 SHA로 검증 가능)와 신뢰 수준이 다르다 — 항상 `user_provided_excerpt`(사용자 제공, 미검증 자기 자료)로만 표기하고, 이 구분을 코드 타입 수준에서 강제한다.
- 기존 점수 발급 조건(5축 모두 판정 가능할 때만 총점)과 `humanReviewed` 표기 규칙은 이 실험으로 완화하지 않는다.
- 이 PoC의 결과가 긍정적이어도, Local Evidence Mode를 정식 MVP 기능으로 편입하려면 별도의 명시적 사용자·Astra 승인과 MVP_SCOPE.md 갱신이 필요하다 — 이 항목 하나의 구현으로 자동 편입되지 않는다.

근거·구현 상세는 [Phase-03-Local-Collection-PoC](Sessions/Phase-03-Local-Collection-PoC.md)에 있다.

## 8. Astra 직접 구현·서브에이전트와 웹 MVP (2026-09-14)

사용자 지시에 따라 Astra가 구현/통합까지 담당하고 GitHub 이슈와 독립 worktree를 사용한다. 일반 변경은 자체 검토, 원문/권한/점수 경계는 독립 서브에이전트 검토를 한다. 기존 Claude 프롬프트 전달 절차를 필수로 두지 않는다.

실제 모델 API 미정과 웹 구현을 분리한다. Anthropic adapter는 명시적 서버 설정 뒤에만 동작하며 기본 mock 대체를 금지한다. 합성 예시는 제품 탐색용으로 명확히 표시한다. 가중치/실제 판단 교정과 계정 배포는 별도 미완료 이슈다.

웹의 선택 발췌 입력을 구현하되 로컬 CLI의 원본 이벤트 자동 업로드는 포함하지 않는다. 사용자 제공 자료는 출처 확인과 분리한다.

운영 저장은 소규모 구현의 단일 JSON state CAS와 RLS 서버 전용 접근으로 시작한다. 운영 데이터 증가 시 정규화 테이블로 옮겨야 한다. 개발 FileStore는 프로세스 간 경쟁을 처리하지 않으므로 운영 fallback을 명시적 opt-in으로 제한한다.

공개 결과에는 모델 자유 서술을 넣지 않는다. 프롬프트 인젝션이나 모델 재인용이 개인 기록을 공개할 수 있으므로 공개용 축별 요약과 일반 행동 안내만 만든다. 숫자 변화와 행동 개선은 구분한다.

구현/검증 근거: [Phase 4](Sessions/Phase-04-Web-MVP.md).

## 9. 다크 디자인과 Three.js (2026-09-14)

사용자가 Linear/Tokscale 계열의 다크 UI, 네온 glow와 3D 효과로 재설계하도록 지시했다. 시각 방향은 [USER_FLOW](../UI/USER_FLOW.md)에 기록한다. Three.js 0.186을 지연 로딩하는 React 컴포넌트로 구현한다. 현재 React 19.3은 R3F 9.7의 peer 범위 밖이므로 강제 설치나 React 버전 변경 대신 Three.js를 직접 사용한다. 배경 장면은 장식이며 평가 근거/판정으로 취급하지 않는다. 운영 배포·실제 모델 교정 조건은 이 변경과 별개다.
