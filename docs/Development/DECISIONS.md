# Decisions — 과거 결정 요약과 ADR 안내

## Current product decision — Korean-default bilingual repository reports (2026-09-18)

The user approved replacing CLI-first onboarding with a Korean-default, no-login public GitHub URL analysis for the contest demo, followed by a persistent English interface option. The report scores observable repository collaboration-readiness signals and cites collected paths; it does not certify personal AI skill or code correctness. No account, user OAuth, Supabase or service LLM is required. The optional server `GITHUB_TOKEN` only raises public API allowance and stays secret. CLI session reports remain a secondary feature. Repository decision: [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md). Language decision: [ADR-0016](../Architecture/ADR/0016-persistent-korean-english-interface.md). Execution: [Phase 9](Sessions/Phase-09-Anonymous-Repository-Reports.md).

## Previous product decision — CLI session reports (2026-09-15)

The user approved replacing manual collaboration/case/question onboarding with local CLI-derived playful session reports. New current semantics are [SESSION_REPORT](../Assessment/SESSION_REPORT.md), product [v0.4 master](../00_MASTER_PLAN.md), decision [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md). A model/API/GitHub repository is not required. The five-axis decisions below are historical compatibility rules and must not override the new primary flow. Raw records stay local; exported summaries use a strict numeric allowlist and fixed generated copy. [Phase 8](Sessions/Phase-08-CLI-Session-Reports.md).

새 주요 설계 결정의 상세 기록은 [Architecture/ADR](../Architecture/ADR/README.md)에 둔다. 아래 1~7절의 과거 이력은 유지하며, 8~9절의 Phase 4 결정은 ADR-0001~0006으로 정리했다. 세션은 실행 이력, ADR은 선택 이유와 결과를 담당한다.

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

세부 선택·대안·한계는 다음 ADR에서 관리한다.

- [0001 — 실제 모델 opt-in과 예시 분리](../Architecture/ADR/0001-opt-in-live-evaluation.md)
- [0002 — 요청 단위 단계 실행](../Architecture/ADR/0002-request-bound-stages.md)
- [0003 — 소유 권한과 공개 결과 경계](../Architecture/ADR/0003-owner-and-public-boundaries.md)
- [0004 — FileStore/Supabase CAS](../Architecture/ADR/0004-mvp-persistence.md)
- [0005 — 보수적인 결과 비교](../Architecture/ADR/0005-conservative-comparison.md)

웹 선택 발췌 입력은 구현했지만 로컬 CLI 원본 이벤트 자동 업로드는 포함하지 않는다. 기존 Local Mode 범위는 7절과 MVP_SCOPE를 따른다.

구현/검증 근거: [Phase 4](Sessions/Phase-04-Web-MVP.md).

## 9. 다크 디자인과 Three.js (2026-09-14)

시각 방향은 [USER_FLOW](../UI/USER_FLOW.md), 의존성 선택·3D 수명 관리·정적 대체 결정은 [ADR-0006](../Architecture/ADR/0006-decorative-threejs.md)을 따른다.

## 10. 프로필·항목별 작업 공간과 수집 표본 (2026-09-14)

홈/프로필/항목별 분석/새 평가를 분리하고 기존 익명 토큰으로 이력을 조회한다. 계정 신원·개인 역량 인증을 추가하지 않는다. [ADR-0007](../Architecture/ADR/0007-anonymous-assessment-workspace.md).

실제 MyAiScore 수집에서 발견한 제품 소스 누락은 파일군별 균형 선정으로 보완했다. 수집 상한과 점수 발급 계약은 유지한다. [ADR-0008](../Architecture/ADR/0008-balanced-repository-sampling.md). 실행·검증 범위는 [Phase 5](Sessions/Phase-05-Profile-And-Live-Pilot.md)에서 구분한다.

## 11. ThreeUI 무료 Logic Core 적용 (2026-09-15)

Community 공개 프롬프트와 MIT 원본 소스를 확인하고 히어로의 3D 부분만 기존 React 컴포넌트에 포팅한다. 시각 구조의 출처·고정 revision·원문과 적용 프롬프트·배포 라이선스를 함께 보존한다. [ADR-0009](../Architecture/ADR/0009-threeui-community-logic-core.md). 평가 계약과 API 흐름은 바꾸지 않는다.


## 12. 영어 전용 제품과 전체 랜딩 재구성 (2026-09-15)

사용자 요청은 히어로 효과 추가가 아닌 ThreeUI Landing Pages를 참고한 전체 페이지 구성이다. Kage의 장별 전개를 MyAiScore 소개·실제 평가 흐름·5축·합성 예시·시작 안내로 적용하고, 프로필·분석·평가 화면에도 동일한 시각 방향을 사용한다. [ADR-0010](../Architecture/ADR/0010-english-landing-page-experience.md), [참조·적용 프롬프트](../UI/References/THREEUI_KAGE_LANDING_ADAPTATION.md).

제품 UI와 서버 생성 설명은 영어 전용이며 언어 전환기는 추가하지 않는다. 사용자 원문·과거 개인 기록·내부 문서·교정 fixture는 소급 번역하지 않는다. 기준표와 프롬프트의 영어 출력 지시는 번역 버전으로 구분하고 기존 rubricVersion·가중치·레벨·총점 조건·공개 경계를 유지한다. 번역이 실제 모델의 판단 타당성이나 영어 응답 준수를 검증한 것은 아니다.

이 결정은 ADR-0009의 페이지 구성을 확장하며 ADR-0006의 렌더러 수명·정적 대체 원칙을 유지한다. 상세 버전과 실제 검사 결과는 [Phase 6](Sessions/Phase-06-English-Landing.md)에서 관리한다. API/모델/예산·운영 Supabase·배포의 남은 조건을 해제하지 않는다.


## 13. 중립 색상과 근거 검토 중심 작업 화면 (2026-09-15)

[#20](https://github.com/SangJun-Pyo/MyAiScore/issues/20)에 따라 [ADR-0011](../Architecture/ADR/0011-consistent-assessment-design.md)을 채택한다. 중립 차콜과 행동/선택용 코럴을 사용하고, 기존 Logic Core 대신 자체 작성한 근거 검토 예시를 둔다. Three.js 의존성과 전용 테스트는 기능 퇴역에 맞춰 정리하고 일반 키보드·모션 감소·평가 흐름 검사는 유지한다.

프로필은 소유 평가 이력, Insights는 관찰과 연결 근거, 새 평가는 선택적 사례가 있는 입력에 집중한다. Kage의 Approach 이후 내용·영어 UI·근거 부족 상태 구분·평가와 공개 계약은 유지한다. Diagnostics Panel은 효과만 제공하여 채택하지 않았으며 코드를 복사하지 않았다. 공통 화면 계약은 [DESIGN_SYSTEM](../UI/DESIGN_SYSTEM.md), 검증 이력은 [Phase 6](Sessions/Phase-06-English-Landing.md)에서 관리한다.


## 14. 실제 저장소 기반 스크립트 walkthrough (2026-09-15)

디자인 작업을 보류하고 사용자 저장소의 실제 수집과 질문·판정·계산 흐름을 확인한다. 서비스 API/모델/예산 미정 상태이므로 전용 scripted provider를 사용하며 이를 실평가로 표현하지 않는다. 실제 GitHub 스냅샷과 작성된 해석을 분리하고 협업 사례·발췌·답변은 생성하지 않는다. 저장소만으로 관찰할 수 없는 다섯 축 레벨과 총점은 null/withheld다.

고정 예시 API와 3단계 페이지는 소유 저장·이력 밖에서 저장된 자료를 재생한다. 페이지 방문은 재수집·LLM 호출을 실행하지 않는다. 입력 출처 source는 사용자 제출이 없으면 github_repository, 있으면 github_with_user_submissions이며 mock/live와 별개다. [ADR-0012](../Architecture/ADR/0012-repository-walkthrough.md), [Phase 7](Sessions/Phase-07-Repository-Walkthrough.md).

## 15. 수집 바이트 집계 분리 (2026-09-15)

800 KiB는 채택한 디코딩 파일 내용만 제한한다. HTTP 응답 본문은 별도 지표로 기록하고 과거 혼합 값은 재해석하지 않는다. 누락 경로/사유를 새 walkthrough에 보존하며 같은 SHA의 재수집 결과와 원본을 구분한다. 표본 수집 완료도 개인 협업 근거를 대신하지 않는다. [ADR-0013](../Architecture/ADR/0013-separated-ingestion-byte-accounting.md), [Phase 7](Sessions/Phase-07-Repository-Walkthrough.md).
