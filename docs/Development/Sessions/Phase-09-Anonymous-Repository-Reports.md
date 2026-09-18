# Phase 9 — 로그인 없는 공개 저장소 리포트

Date: 2026-09-18. Base: main@3060526. Issue [#28](https://github.com/SangJun-Pyo/MyAiScore/issues/28). Decision: [ADR-0015](../../Architecture/ADR/0015-anonymous-korean-repository-reports.md).

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
