# Phase 9 — 로그인 없는 공개 저장소 리포트

Date: 2026-09-18. Base: main@3060526. Issue [#28](https://github.com/SangJun-Pyo/MyAiScore/issues/28). Decision: [ADR-0015](../../Architecture/ADR/0015-anonymous-korean-repository-reports.md).

## 2026-09-19 — 저장소 점수 v2.1 설계와 첫 기반 구현

v1 조작·표본 편향 검토와 사용자 합의를 [`SCORING_V2_PROPOSAL`](../../Assessment/SCORING_V2_PROPOSAL.md) 및 [ADR-0017](../../Architecture/ADR/0017-content-aware-repository-scoring.md)에 기록했다. presence 게이트, cap 이전 `scanned_tree` inventory, 점수 신호 읽기 예약, inventory breadth, 독립 적용성, 핵심·조건부·보너스, 다언어 `unmeasured`, provisional coverage와 유형 보류를 채택했다. 고정 SHA의 커밋 설명은 기록축 보너스 후보로 두고, 불필요 파일과 큰 파일은 검증 전 감점하지 않고 위생·구조 집중도 진단으로 시작한다.

첫 구현 슬라이스는 공용 `repositorySignals` matcher를 만들어 기존 v1 리포트와 v2 inventory가 같은 경로 정의를 사용하게 했다. `selectFiles()`는 cap 이전 후보에서 소스·테스트·문서·14개 신호 후보와 source byte, oversized source 후보, 임시·생성물·비밀 가능 경로 수를 집계한다. 기본 v1 선택은 유지하고, 명시적 v2 옵션에서만 14개 신호별 대표 파일을 일반 표본보다 먼저 예약한다.

GitHub client에는 고정 40자리 SHA만 받는 최근 조상 commit summary API를 추가했다. commit 메시지 분석기는 merge·자동화 커밋을 분리하고 일반성·고유성·범위·본문·참조 비율만 반환하며 원문을 리포트 계약에 보존하지 않는다. 아직 production API에서 추가 history 요청을 실행하거나 v1 점수에 반영하지 않는다.

후속 구현에서 production collector가 14개 신호 대표를 예약하고 고정 SHA 조상 커밋 최대 20개를 bounded 요청으로 집계하도록 연결했다. `repository-report-v2`는 redacted content substance와 scanned-tree breadth를 공개 `signalScores`로 내보내고 브라우저 strict parser가 품질·정수 점수·축 합계·진단 이유를 재검증한다. 빈 파일은 존재 바닥만 받고 다언어 테스트 detector가 지원하지 않는 형식은 `unmeasured`로 보류한다. 커밋 설명은 평가 가능한 3개 이상일 때 기록축 보너스가 되며 원문은 snapshot과 응답에 남지 않는다. UI는 신호별 획득/최대점과 substance, 잠정 상태, 위생·큰 소스 진단을 표시한다. 기존 v1 브라우저 기록은 계속 읽는다.

## 2026-09-19 — 근거 충분성 협업 유형 v2.2 (#43)

점수 높낮이와 유형을 분리하기 위해 `repository-signals-v2.2`와 `repository-collaboration-profile-v1`을 추가했다. 새 결과는 D/R(기록/실행), H/P(직접확인/파이프라인), S/T(설계선행/추적중심), F/E(집중/균형)의 네 상대 차원을 신호 점수에서 계산한다. 점수 가중치와 네 축 합계는 v2.1과 같다. DB 적용 대상이거나 실제 파일이 있을 때만 마이그레이션을 유형 분모에 넣고, API 가용성에 따라 유형이 바뀌지 않도록 커밋 집계는 유형 입력에서 제외해 기록 점수 보너스로만 유지한다.

partial collection, tree truncation, selection limit, 테스트 형식 미측정, 관찰 축 3개 미만, substance 0.25 이상 신호 4개 미만, 빈 차원 또는 둘 이상의 경계 차원이 있으면 네 글자 코드를 발급하지 않고 고정된 `withheld` 이유를 제공한다. 한 차원만 경계 근처면 경계 표시와 함께 결정론적인 방향을 사용한다. 사람의 성격·능력이나 인구 백분위로 표현하지 않는다.

strict parser는 v2.2 유형의 강도·선택·경계·보류 이유를 `signalScores`와 diagnostics에서 다시 계산한다. 임의 유형을 넣은 응답은 거부하며, 과거 `repository-report-v1`과 `repository-signals-v2.1` 저장 이력은 계속 읽는다. 결과·프로필 목록·해석 가이드는 한국어와 영어의 같은 의미 ID를 사용한다. 홈의 합성 예시도 v2.2 파생 함수를 거쳐 현재 계약을 보여준다.

결정은 [ADR-0018](../../Architecture/ADR/0018-evidence-aware-collaboration-profile.md)에 기록했다. 최종 로컬 검사는 `npm test` 306/306, `npm run typecheck`, `npm run check:docs` 66파일·398링크 문제 0, `npm run build`, 전체 Playwright desktop/mobile 34/34, `git diff --check` 통과다. 해석 가이드의 desktop/mobile 캡처를 직접 확인해 네 차원 카드의 overflow와 읽기 순서를 확인했다.

구현에 참여하지 않은 독립 검토는 처음에 DB 비적용 migration과 commit API 가용성이 timing 분모를 바꾸는 문제, 홈 hero의 legacy 제목, 경계별 직접 회귀 부족을 지적했다. migration을 적용 대상 또는 실제 존재일 때만 분모에 넣고 commit-practice를 유형 입력에서 제외했으며, hero를 v2.2 프로필 제목으로 바꾸고 sparse·다중 경계·단일 spread-6 경계·commit 가용성·DB 적용성 회귀를 추가했다. 수정 후 재검토는 **PASS, 남은 actionable issue 없음**으로 결론 냈다.

Issue [#43](https://github.com/SangJun-Pyo/MyAiScore/issues/43)은 PR [#44](https://github.com/SangJun-Pyo/MyAiScore/pull/44)로 main `ac246af`에 squash merge되었고 원격 `Verify`도 통과했다. Railway 배포 성공 뒤 production health가 `{"ok":true}`를 반환했다. 공개 `SangJun-Pyo/MyAiScore` smoke는 `repository-report-v2` / `repository-signals-v2.2`, 90점, complete diagnostics를 반환했다. 두 차원이 경계 근처라 `repository-collaboration-profile-v1`은 `multiple_near_boundaries`로 유형을 보류했으며, 이는 근거가 애매할 때 코드를 강제로 발급하지 않는 계약대로의 결과다.

## 2026-09-19 — 점수 신호 세분화 v2.3 (#47)

검증축의 테스트 21점과 자동화축의 CI 15점이 한 종류의 파일에 과도하게 집중된다는 사용자 피드백에 따라 각 축을 최대 여섯 신호로 분해했다. 검증은 실행 진입점·테스트 내용·트리 기반 분포·실패/경계 사례·정적 검사·커버리지로 나뉘고, 자동화는 CI 테스트와 CI 품질 검사를 분리한다. 맥락에는 인터페이스 계약·재현 환경, 기록·추적에는 CODEOWNERS 계열 변경 책임을 추가했다.

새 `repository-signals-v2.3`은 네 축 25점과 총 100점을 유지한다. 검증·자동화 단일 신호는 최대 5점이고, 여러 신호가 같은 파일을 근거로 삼을 때 빈 파일 존재점이 중복 상승하지 않도록 품질식을 `0.10 + 0.65·substance + 0.25·substance·breadth`로 조정했다. 빈 테스트 파일은 트리 비율만으로 테스트 분포 점수를 얻지 못한다. 결정은 [ADR-0019](../../Architecture/ADR/0019-granular-repository-score-signals.md)에 기록했다.

독립 검토는 배포 전용 workflow가 파일 존재 바닥으로 CI 테스트·품질·커버리지 점수를 받는 문제, 기본 npm placeholder가 검증 진입점으로 잡히는 문제, 동일 내용 테스트 복제로 substance와 breadth가 오르는 문제, DB 비적용 저장소의 기록축 최대가 22점에 머무는 문제를 지적했다. 실제 지원 명령·marker를 semantic presence gate로 두고, 테스트 내용 해시를 중복 제거하며, 기록축 원시 최대를 28점·축 상한을 25점으로 조정했다. 이어 v1 parser에 v2.3 신호를 끼워 넣을 수 있던 버전 격리 문제도 legacy allowlist와 회귀 검사로 막았다. 수정 후 독립 재검토는 **PASS, P1/P2 actionable finding 없음**으로 결론 냈다.

검증은 `npm test` 311/311, 집중 회귀 32/32, `npm run typecheck`, `npm run check:docs` 67파일·상대 링크 404개, `npm run build`, Playwright desktop/mobile 34/34, `git diff --check`를 통과했다.

## 2026-09-19 — 항상 표시하는 협업 유형 v2.4 (#49)

사용자 피드백에 따라 새 `repository-signals-v2.4` 결과는 희소·부분·경계 근거에서도 D/R·H/P·S/T·F/E 각 차원의 가장 가까운 pole을 결정론적으로 선택해 네 글자 코드를 항상 표시한다. 기존 보류 이유는 삭제하지 않고 고정 이유와 경계 차원 수의 합이 0개=높음, 1개=보통, 2개 이상=낮음인 유형 신뢰도와 주의 문구로 바꿨다. 점수와 축 배점은 v2.3에서 바뀌지 않는다.

strict parser는 v2.4의 항상 assigned 코드·차원·주의 이유를 다시 계산한다. v2.2·v2.3 저장 결과는 당시 `withheld` 계약으로 별도 재계산해 브라우저 이력을 보존한다. 결정은 [ADR-0020](../../Architecture/ADR/0020-always-assigned-repository-profile.md)에 기록했다.

독립 검토는 단일 50:50 경계 차원이 카드에는 `경계에 가까움`으로 표시되면서 전체 신뢰도는 높음이 되는 모순을 지적했다. 신뢰도 주의 요소에 경계 차원 수를 포함하고 직접 회귀를 추가했다. 수정 후 재검토는 **PASS, P1/P2 finding 없음**으로 결론 냈다. 검증은 `npm test` 312/312, 집중 회귀 24/24, `npm run typecheck`, `npm run check:docs` 68파일·상대 링크 407개, `npm run build`, Playwright desktop/mobile 34/34, `git diff --check`를 통과했다.

## 사용자 결정

사용자는 CLI 설치와 명령 실행이 첫 체험에 어렵다고 판단했다. 공개 GitHub 소스로 접근하는 흐름과 공모전용 한국어 화면을 제안했고, Astra의 로그인 없는 공개 URL 분석·선택적 세션 상세 분석 구성을 명시적으로 채택했다.

## 범위

- 공개 GitHub URL 하나로 즉시 실행되는 stateless 리포트 API
- 기존 수집 한도·URL 검증·private 거부·제출 코드 미실행 유지
- 관찰 가능한 저장소 신호만 사용하는 버전 고정 규칙과 실제 근거 경로
- 한국어 Home/새 분석/Profile/Insights와 브라우저 로컬 선택 저장
- 서버 비밀 `GITHUB_TOKEN` 선택 지원, 사용자 GitHub 로그인·DB·LLM 제외
- CLI 세션 리포트는 선택 기능으로 보존

## 역할과 검토

Root는 제품 계약·ADR·문서·통합·배포 검증을 맡는다. Core 서브에이전트는 공유 계약·규칙 엔진·stateless API와 단위/API 검사를, Web 서브에이전트는 한국어 기본 화면·브라우저 검사를 별도 worktree에서 구현한다. 원문 수집·점수·서버 토큰 경계는 통합 뒤 독립 서브에이전트가 검토한다.

## 구현

- 문서·제품 전환: `b8587f3`, `6ed6f09`, `676bd26`, `392de95`
- 공개 수집·고정 점수·stateless API: core 서브에이전트 `b5ce697`, 통합 `10427cd`
- 한국어 웹 경험·브라우저 검사: web 서브에이전트 `5508ad5`, 통합 `9519f63`
- 통합에서 웹의 임시 응답 타입을 제거하고 서버와 같은 `parseRepositoryReport()`로 교체했다. 모든 축이 25점에 도달하도록 고정 신호 점수를 완성하고 100점 회귀 검사를 추가했다.

API는 `POST /api/repository-report`에 정확히 `{ "repo_url": "https://github.com/owner/repo" }`만 받는다. storage/provider 초기화 전에 처리하며 DB·로그인·모델을 사용하지 않는다. 고정 `api.github.com`, manual redirect, 10초 abort, 응답 2MB 제한과 private/metadata fail-closed 검사를 적용한다. 시작 제한은 토큰 사용 시 5분당 5회, 비토큰이면 시간당 1회, 동시 2회다.

## 최종 통합 검증

- `npm run typecheck` 통과
- `npm test` 281/281 통과. 네 축 각각 25점·총점 100 도달과 잘못된 URL이 익명 요청 슬롯을 소모하지 않는 회귀 검사를 포함한다.
- `npm run check:docs` 62파일·상대 링크 399개, 문제 0건
- `npm run build` 통과
- `npm run test:e2e` desktop/mobile 24/24 통과

## 독립 검토와 배포

설계 사전 검토는 quota, transport, endpoint 초기화, private fail-closed, 검증 신호 표현을 필수 조건으로 제시했고 구현에 반영했다. 구현에 참여하지 않은 서브에이전트가 통합 `c500468`을 검토해, 잘못된 host URL도 admission을 먼저 소모해 비토큰 서버의 유일한 시간당 슬롯을 막는 P1 결함을 발견했다. `1103187`에서 URL 검증·정규화를 admission 앞으로 옮기고 invalid URL 뒤 정상 `.git` URL이 수집기로 한 번만 전달되는 검사를 추가했다.

독립 재검토는 정확한 `11031871d20ab8ae302c087d76d3a419607fa335`에서 **PASS, 출시 차단 사항 없음**으로 결론 내렸다. reviewer가 별도로 실행한 repository-report/API/session CLI 집중 검사 33개도 전부 통과했다. PR [#29](https://github.com/SangJun-Pyo/MyAiScore/pull/29)의 원격 Verify도 타입·281개 단위·문서·build·desktop/mobile 24개 검사를 모두 통과했고, main `07389c291ef12c79235abbbc9f3f9676984539e5`로 병합했다.

Railway `https://myaiscore-production.up.railway.app/`에서 health 200과 한국어 홈을 확인했다. 배포 API로 공개 `SangJun-Pyo/MyAiScore`를 한 번 실제 수집한 결과는 병합 commit `07389c2`, 321후보/40선정/40읽기, complete였다. `repository-signals-v1` 결과는 총 80점(맥락25·검증 기반25·기록9·자동화21), 근거 카드 10개, `맥락 지도 제작자`, 다음 도전 `결정 하나 연결하기`였다. 이는 저장소 정적 신호 smoke이며 개인 능력이나 실행 성공 검증이 아니다.

같은 요청을 즉시 반복했을 때 429 `repository_report_rate_limited`가 반환되어 현재 Railway에 `GITHUB_TOKEN`이 구성되지 않았음을 확인했다. 비토큰 상태의 보수적 제한은 시간당 분석 시작 1회다. 공모전 다중 방문 전에 서버 전용 토큰을 Railway Variables에 추가해야 하며, 값은 문서·채팅·로그에 남기지 않는다.

## 현재 한계

- 점수는 구조적 파일 존재 신호를 재미있게 요약하며 파일 내용의 품질, 실행 성공, 실제 AI 대화와 개인 기여를 판정하지 않는다.
- 시작 제한은 서버 프로세스 메모리 기준이라 여러 인스턴스 사이에 공유되지 않는다. short-TTL 결과 cache도 아직 없다.
- 공개 저장소만 지원한다. 비공개 저장소 GitHub App, 계정·기기 간 이력, hosted 공유 링크, leaderboard와 LLM 조언은 보류한다.
- v0.4 CLI의 `--web-url` fragment import는 한국어 공개 저장소 화면과 계약이 달라 v0.5에서 제거했다. 로컬 세션 분석 자체와 `--json`/`--out`은 유지한다.

## 한국어·영어 화면 전환

한국어 기본 흐름을 유지하면서 공통 헤더에 영어 전환을 추가했다. 선택은 `ko|en`만 허용하는 쿠키에 저장하고 서버 레이아웃이 첫 응답의 `<html lang>`과 메타데이터를 결정한다. 공개 네 경로의 고정 문구와 리포트 표현은 타입 고정 카탈로그와 style/evidence/axis 의미 ID로 번역한다. API와 localStorage에는 기존 `repository-report-v1` 정본을 그대로 저장한다. API 실패는 `error.code`에서 번역하므로 서버 내부 문구에 UI가 의존하지 않는다.

과거 `/assessments/[id]`, `/results/[id]`, `/walkthrough/myaiscore`는 영어 본문을 유지하고 `lang="en"` 범위를 명시했다. 공통 탐색과 footer는 선택한 언어로 통일했다. 결정 이유와 대안은 [ADR-0016](../../Architecture/ADR/0016-persistent-korean-english-interface.md)에 기록한다.

구현 후 `npm test` 285/285, `npm run typecheck`, `npm run check:docs` 63파일·상대 링크 409개, `npm run build`를 통과했다. Home·공개 네 경로·리포트 원본 보존·오류 코드 번역·과거 영어 화면을 포함한 Playwright 집중 검사는 desktop/mobile 26/26을 통과했다.

## 점수·협업 스타일 해석 가이드

`/insights`의 빈 상태가 축별 범위만 보여주던 한계를 보완했다. 이제 결과 선택 여부와 관계없이 네 축의 14개 근거 ID, 개별 점수, 축별 25점 합계를 표로 보여준다. 여섯 스타일은 총점 20 미만, 균형 조건, 최고 축 순서로 설명하고 최고 축 동점은 맥락→검증 기반→추적 가능성→자동화 순서라고 명시한다. 선택된 리포트가 있으면 현재 스타일 카드 하나를 강조한다.

UI용 규칙을 다시 작성하지 않도록 공유 모듈이 근거 순서, 스타일 순서, 임계값, 동점 우선순위와 분류 함수를 제공한다. 기존 파생 함수는 같은 분류 함수를 호출하므로 점수·스타일 동작은 유지된다. 한국어·영어 가이드는 같은 근거·스타일 ID에서 제목을 가져온다.

검증은 `npm test` 288/288, `npm run typecheck`, `npm run check:docs` 63파일·상대 링크 409개, `npm run build`, 전체 Playwright desktop/mobile 30/30을 통과했다. 단위 검사는 14개 점수와 축별 합계, 여섯 스타일 경계와 동점 우선순위, 선택 스타일 강조 데이터를 확인한다. 브라우저 검사는 빈 상태에서도 규칙을 표시하고, 저장된 리포트에서 현재 스타일을 하나만 강조하며, 한국어·영어와 모바일 레이아웃을 확인한다.

## 배포 후 로컬 403 수정 (#31)

사용자가 `http://127.0.0.1:3104`에서 저장소 분석을 실행했을 때 `Requests from other sites are not allowed.`가 재현됐다. 실행 중인 3104 서버가 과거 worktree를 가리킨 문제를 먼저 바로잡았지만, 최신 standalone에서도 Next.js가 내부 request URL을 `http://localhost:3104`로 정규화해 strict 문자열 비교가 127.0.0.1 Origin을 거부했다.

동일 protocol·effective port이고 양쪽 hostname이 `localhost`/`127.0.0.1`/IPv6 loopback인 경우만 같은 로컬 출처로 인정한다. 다른 port, 외부 hostname, 잘못된 Origin은 계속 403이다. 전용 API 회귀 검사와 실제 3104 standalone 요청으로 확인한다.

## 공개 README와 저장소 정리 (#39)

GitHub 첫 화면이 현재 제품보다 뒤처지고 과거 검증 캡처·실행 JSON 약 15MB가 소스 트리의 대부분을 차지해 정리했다. README는 실제 Railway 데모, 로그인 없는 URL 흐름, 결정론적 네 축·여섯 스타일, 근거·수집 범위·부족 신호, 브라우저 로컬 저장과 신뢰 경계를 설명한다. 한국어 기본·영어 전환과 서비스 LLM·저장소 코드 실행·서버 DB가 기본 흐름에 없다는 점도 명시한다.

`_archive/`와 `artifacts/`를 전체 ignore하고 기존에 예외로 추적하던 `_archive` 파일 두 개도 현재 Git 트리에서 제거했다. 완료된 Phase 1·2 지시문, 과거 `artifacts/`, 한 번만 사용한 `dumpCase02Snapshot.ts`와 참조되지 않는 `SessionExperience.tsx`는 로컬 `_archive/repository-cleanup-20260918/`로 이동했다. 이는 로컬 보존 위치이며 새 clone의 정본이 아니다. GitHub에서 다시 볼 수 있도록 역사 문서 링크는 정리 전 commit `f108be37d0df9a8e23a65794ccef0cc367256e0b`의 immutable URL로 바꿨다.

walkthrough 출처 해시 회귀 검사가 실제로 읽는 `buildMyAiScoreWalkthrough.v1.ts.txt`만 `fixtures/walkthroughs/`로 이동해 버전 관리와 검사를 유지한다. 현재 리포트 계약·교정 fixture·호환 API와 화면·ADR·Phase 세션은 삭제하지 않았다. 새 산출물은 필요할 때 로컬 `artifacts/`에 만들되 Git에 추가하지 않는다.

정리 전후 generator fixture의 Git blob 해시는 모두 `61523fcff9b652bfec0e99d144b1ce7d44cd251e`로 일치했다. `npm run check:docs`는 60개 Markdown·364개 로컬 링크 문제 0건, `npm run typecheck`, `npm test` 288/288, `npm run build`, `npm run test:e2e` desktop/mobile 30/30을 통과했다. 첫 build는 실행 중이던 로컬 3104 서버가 `.next/standalone`을 잠가 `EBUSY`로 중단됐고 해당 서버만 종료한 뒤 같은 명령이 통과했다. 정리 결과 현재 Git index는 301개 파일이며 로컬 archive에는 기존 무시 파일을 포함한 91개 파일 약 17.4MB가 남아 있다.

구현에 참여하지 않은 서브에이전트의 독립 검토는 **PASS, 차단 사항 없음**으로 판정했다. 삭제 71개 각각의 로컬 archive 사본, 역사 링크가 가리키는 27개 고유 Git object, 제거 코드의 활성 참조 부재와 `_archive` ignore를 확인했다. reviewer가 별도로 실행한 walkthrough/session 집중 검사 19/19와 tracked 문서 검사도 통과했다.

## 2026-09-19 한국어 제품 문구 정리

홈과 예시·실제 리포트, 해석 가이드, footer의 한국어를 더 자연스러운 제품 문구로 정리했다. `AI 협업의 흔적`은 제품이 실제로 확인하는 범위에 맞춰 `AI 협업을 뒷받침하는 신호`로 바꾸고, 한국어 화면의 네 축은 `맥락·검증 체계·기록·추적·자동화`로 표시한다. 근거 카드, 미확인 항목, 다음 단계와 한계 설명도 같은 문체로 맞췄다.

기존 API 응답과 localStorage 결과가 계속 검증되도록 `repository-report-v1`의 고정 한국어 계약은 변경하지 않았다. 화면에서는 기존과 같은 style/evidence/axis ID를 새 한국어 표현으로 변환하며, 영어 화면과 점수 계산 규칙도 그대로 유지한다.

검증은 `npm test` 288/288, `npm run typecheck`, `npm run check:docs` 62파일·상대 링크 372개, `npm run build`를 통과했다. 홈 문구와 가로 넘침, 변경된 리포트·가이드·언어 전환을 포함한 Playwright 집중 검사는 desktop/mobile 20/20을 통과했다.

## 2026-09-19 ThreeUI uplink loader progress

사용자 요청에 따라 저장소 분석 요청 후 서버 응답을 기다리는 동안 ThreeUI `UplinkLoader`를 표시한다. 등록 번들 `https://threeui.com/source-code/uplink-loader.json`을 가져와 세 필수 파일의 SHA-256을 확인하고, `src/shaders/uplink-loader/UplinkLoader.tsx`, `src/shaders/uplink-loader/uplink-loader.html`, `src/shaders/threeui.css`를 해시 일치 상태로 보존했다.

로컬 `@designcodeio/threeui` alias가 요청된 `<UplinkLoader />` 사용을 원본 component로 연결한다. `/evaluate`의 loading 상태는 원본 iframe을 포함한 별도 progress panel로 바뀌며, 실제 상태 문구는 한국어·영어 copy로 계속 표시한다. Uplink frame은 `aria-hidden` 장식 요소로 두고, 보안 스캔·실제 네트워크 uplink·분석 성공 인증처럼 표현하지 않는다.

브라우저 회귀 검사는 API 응답을 지연시켜 loading 상태를 관찰하고, loader iframe과 내부 `#stage`가 보이는지 확인한다. 디자인 시스템과 ThreeUI 적용 기록 문서에는 이 animation이 대기 상태 cue일 뿐이며 최종 repository report의 수집 범위·근거·한계 설명을 대체하지 않는다고 기록했다.

검증은 원본 세 파일 해시 재확인, `npm run typecheck`, `npm test` 288/288, `npm run check:docs` 62파일·상대 링크 366개, `npm run build`, `npx playwright test tests/browser/workspace.spec.ts` desktop/mobile 20/20, `git diff --check`를 통과했다. Production build 서버에서 데스크톱 1440px와 모바일 iPhone 12 로딩 캡처를 확인했고, 모바일 `scrollWidth > innerWidth`는 `false`, loader ready 상태는 `true`였다.

## 2026-09-19 Hero title effect and 100% loading handoff

사용자는 홈 제목 아래에 별도 ThreeUI wordmark가 뜨는 것이 아니라 `공개 저장소에서 AI 협업을 뒷받침하는 신호를 찾습니다.` 문구 자체에 효과가 적용되기를 원한다고 정정했다. 이에 따라 별도 `TextAnimationCollection` frame과 사용하지 않는 intro wordmark source를 제거하고, 실제 H1 텍스트에 크로매틱 조립 효과를 적용했다. H1은 screen reader가 읽는 실제 heading이며, `prefers-reduced-motion: reduce`에서는 정적으로 표시한다.

UplinkLoader는 원본 파일을 유지하되 앱 전환 타이밍을 조정했다. API 응답이 빨리 도착해도 loader 내부 타임라인이 100% 구간에 도달하고 잠깐 보인 뒤 완료 notice와 리포트로 넘어간다. 응답이 한 loop 뒤에 도착한 경우에도 현재 phase를 계산해 다음 100% 구간에 맞춰 handoff한다.

검증은 `npm run typecheck`, `npm test` 288/288, `npm run check:docs` 61파일·상대 링크 365개, `npm run build`, `npx playwright test tests/browser/workspace.spec.ts` desktop/mobile 20/20을 통과했다. H1 줄바꿈 조정 후 홈 집중 Playwright desktop/mobile 2/2와 `git diff --check`를 재확인했다. Production build 서버에서 데스크톱·모바일 캡처를 만들었고, 별도 intro frame은 0개, H1 효과 line은 2개, 가로 넘침은 `false`였다.

## 2026-09-19 GitHub repository footer link

사용자가 MyAiScore 공개 저장소 `https://github.com/SangJun-Pyo/MyAiScore` 접근 링크를 추가하고 싶다고 요청했다. 주요 CTA와 혼동되지 않도록 footer의 보조 링크로 배치하고, 한국어는 `GitHub 저장소 보기 ↗`, 영어는 `View GitHub repository ↗`로 표시한다.

검증은 `npm run typecheck`, `npm run check:docs`, `npm run build`, footer 링크를 포함한 Playwright 집중 검사 desktop/mobile 4/4를 통과했다.

## 2026-09-19 ThreeUI CRT background for Home hero

사용자가 ThreeUI `CrtBackground` terminal variant를 홈 섹션 배경으로 쓰는 방향을 제안했다. 원본 등록 번들 `https://threeui.com/source-code/crt.json`을 가져와 component, renderer, shader, variant screen painter, shared CSS의 SHA-256을 모두 확인하고 `src/shaders/crt/` 아래에 보존했다.

로컬 `@designcodeio/threeui` alias에 `CrtBackground` export를 추가하고, 요청된 props 그대로 Home hero의 첫 번째 decorative layer에 배치했다. 제품 화면에서는 wrapper opacity와 radial mask만 낮춰 제목·설명·CTA·예시 점수 카드가 계속 우선 보이게 했다. 이 CRT boot log는 분위기용 배경이며 실제 저장소 스캔 로그, 보안 연결 증명, AI 대화 기록, 점수 근거로 표현하지 않는다.

브라우저 회귀 검사는 Home에 `.repo-crt-background .crt-terminal canvas`가 보이는지 확인한다. 디자인 시스템과 별도 ThreeUI 적용 기록 문서에도 Home hero 전용 decorative background라는 범위를 기록했다.

검증은 CRT 원본 다섯 파일의 SHA-256 재확인, `npm run typecheck`, `npm run check:docs`, `npm test` 288/288, `npm run build`, `npx playwright test tests/browser/workspace.spec.ts` desktop/mobile 20/20, 최종 농도 조정 후 Home 집중 검사 desktop/mobile 2/2, `git diff --check`를 통과했다. Production build 서버 `http://127.0.0.1:3100/`에서 데스크톱 캡처를 확인했고 CRT canvas 1개, 가로 overflow 없음이었다.
