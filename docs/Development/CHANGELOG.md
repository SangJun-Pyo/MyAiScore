# Changelog

## 2026-09-19 — 협업 유형·축별 신호 카드 다크모드 리디자인

- 해석 가이드 페이지에서 "협업 유형" 4개 차원 카드에 좌우 스펙트럼 바(막대+마커)를 추가하고, 유형 코드(4글자)와 신뢰도 라벨을 패널 상단 배지로 끌어올렸다. 데이터는 기존 `repositoryProfilePresentation`이 이미 계산하던 leftStrength/rightStrength/code/confidenceLabel을 그대로 사용한다.
- "축별 저장소 신호" 카드에 축별 도넛형 진행률 링과 아이콘을 추가하고, 신호별 근거 카드(`repo-evidence-card`)를 제목·설명·근거 파일·점수 배지가 분리된 그리드 레이아웃으로 재구성했다. 기존에 `.repo-evidence-card`는 전용 CSS가 전혀 없어 브라우저 기본 스타일로만 렌더링되고 있었다.
- 복사한 텍스트, `<details>/<summary>` 파일 목록 상호작용, 데이터 구조는 전혀 바꾸지 않았다 — CSS 클래스 재구성과 신규 시각 요소(링, 스펙트럼 바, 코드 배지) 추가만 있다.

## 2026-09-19 — 고정 SHA 참조 코호트 v2.7

- TypeScript·Python·Go·Rust·Java 각 10개, 다섯 별점 구간별 2개씩 총 50개 공개 저장소를 고정 SHA에서 v2.6 규칙으로 수집했다. seed, 선택식, 점수·축·coverage manifest와 SHA-256 digest를 공개하며 원문은 저장하지 않는다.
- 새 v2.7 결과는 같은 규모와 같은 complete/partial 상태의 참조 그룹이 5개 이상일 때만 10% 단위 위치 구간을 표시한다. 전체 50개와 실제 비교 수, GitHub 전체 순위가 아니라는 한계를 함께 보여준다.
- strict parser가 점수와 coverage로 cohort 객체를 재계산해 위조된 순위·표본 수·digest를 거부한다. [ADR-0023](../Architecture/ADR/0023-fixed-sha-reference-cohort.md).

## 2026-09-19 — ROI 우선순위 개선 조언 v2.6

- 측정 가능한 미충족 신호를 하나씩 최대점으로 개선했을 때의 전체 점수 gain을 실제로 재계산하고, 고정 작업량 대비 효과 순으로 최대 세 개를 고른다.
- 화면에는 내부 gain·effort 계수를 숨기고 `가볍게`·`보통 작업`·`큰 작업`, 고정 행동 문구와 검증된 근거 경로만 표시한다. strict parser는 순서·난이도·경로를 다시 계산해 위조 응답을 거부한다.
- 고정 SHA 공개 저장소 50개 이상의 투명한 manifest가 준비되기 전에는 cohort를 `null`로 유지하고 순위·백분위를 표시하지 않는다. [ADR-0022](../Architecture/ADR/0022-deterministic-roi-recommendations.md).

## 2026-09-19 — 재미있는 16유형과 60파일 표본 v2.5

- D/R·H/P·S/T·F/E 코드는 설명용으로 유지하되 결과 제목은 `균형 잡힌 빌더`, `검증 루프 항해사`, `운영 지도 제작자`처럼 16개의 고유한 한국어·영어 유형명으로 표시한다.
- 기본 결과와 내 리포트 목록에서 후보·선택·읽기 파일 개수를 숨기고 complete/partial 및 정적 분석 범위만 보여준다. API의 coverage 계약은 검증을 위해 유지한다.
- 선택 상한을 40개에서 60개로 늘리고 HTTP 요청 68회·60초로 조정했다. 현재 저장소 고정 tree 재생에서 소스 12→20, 테스트 6→10, 문서 11→15로 늘었다. [ADR-0021](../Architecture/ADR/0021-wider-private-collection-sample.md).

## 2026-09-19 — ThreeUI Logic Core in Home example card

- 홈 히어로의 “예시 화면” 카드 안에 ThreeUI `StructureFlowCollection` Logic Core variant를 `aria-hidden` 배경 레이어로 추가했다. 샘플 점수 카드 자체가 덜 밋밋하게 보이도록 통합했으며 실제 저장소 그래프·스캔·점수 근거로 표현하지 않는다.
- 등록 번들의 `NeuformIsolatedEffects.tsx`, `platform-core.html`, shared CSS를 SHA-256 일치 상태로 보존하고, 로컬 `@designcodeio/threeui` alias가 요청된 `<StructureFlowCollection variant="logic-core" />` 사용을 Logic Core iframe 런타임으로 연결한다.

## 2026-09-19 — 항상 표시하는 저장소 협업 유형 v2.4

- 새 분석은 D/R·H/P·S/T·F/E 네 차원에서 항상 한쪽을 선택해 유형 코드를 표시한다. 같은 강도나 근거가 없는 차원은 고정 tie priority를 사용한다.
- 기존 보류 이유는 버리지 않고 유형 신뢰도 높음·보통·낮음의 주의 맥락으로 보여준다. 점수에는 영향을 주지 않는다.
- strict parser는 v2.4 코드를 신호에서 재계산하고 v2.2·v2.3 저장 결과의 기존 보류 계약도 계속 읽는다. [ADR-0020](../Architecture/ADR/0020-always-assigned-repository-profile.md).

## 2026-09-19 — 세분화된 저장소 점수 v2.3

- 검증축의 21점 테스트 묶음과 자동화축의 15점 CI 묶음을 최대 5점의 독립 신호로 나눴다. 실행 진입점·테스트 내용·분포·실패/경계 사례·정적 검사·커버리지와 CI 테스트·CI 품질 검사를 각각 설명한다.
- 맥락에는 인터페이스 계약과 재현 환경, 기록·추적에는 변경 책임 신호를 추가했다. 네 축 25점·총 100점 상한은 유지한다.
- 여러 의미 신호가 같은 파일을 읽을 수 있어 빈 파일 존재 바닥을 10%로 낮췄다. v1/v2.1/v2.2 저장 결과는 rule version별 기존 계약으로 계속 읽는다. [ADR-0019](../Architecture/ADR/0019-granular-repository-score-signals.md).

## 2026-09-19 — 근거 충분성에 따른 협업 유형 v2.2

- 새 분석은 점수를 바꾸지 않고 `repository-signals-v2.2`의 D/R·H/P·S/T·F/E 네 차원 협업 유형을 추가한다. 각 차원은 신호 묶음의 상대적 배치와 축 spread를 사용하며 사람의 성격·능력 등급으로 표현하지 않는다.
- partial/tree·selection 제한/미지원 테스트 형식, 관찰 축 3개 미만, substance 신호 4개 미만, 빈 차원 또는 여러 경계 차원에서는 네 글자를 강제하지 않고 `유형 판단 보류`와 고정 이유를 표시한다.
- strict parser가 유형·강도·경계·보류 이유를 점수 신호에서 다시 계산한다. 기존 `repository-report-v1`과 `repository-signals-v2.1` 저장 이력은 그대로 읽는다. 결정은 [ADR-0018](../Architecture/ADR/0018-evidence-aware-collaboration-profile.md), 실행 이력은 [Phase 9](Sessions/Phase-09-Anonymous-Repository-Reports.md)에 기록한다.

## 2026-09-19 — 헤더 GitHub 링크

- 푸터에만 있던 GitHub 저장소 링크를 헤더 nav로 옮겼다. Home/내 리포트/해석 가이드/저장소 분석 뒤에 다섯 번째 항목으로 붙는 일반 텍스트 링크이며, 새 탭으로 연다. 스타 개수 등 GitHub API 호출은 추가하지 않았다 — 로그인 없는 stateless 도구라는 원칙과 맞지 않는다.
- 레거시 CLI 세션 리포트 화면(`/assessments/[id]`, `/results/[id]`)의 별도 Shell 구현에도 같은 항목을 추가해 두 화면 간 헤더 구성을 맞췄다.
- 푸터의 GitHub 링크와 죽은 `footer-source` CSS 규칙을 제거했다. 모바일 헤더 nav는 항목이 다섯 개로 늘어난 만큼 줄바꿈을 허용한다.

## 2026-09-19 — ThreeUI CRT background for Home hero

- 홈 히어로 섹션 뒤에만 ThreeUI `CrtBackground` terminal variant를 낮은 opacity와 radial mask로 배치했다. 실제 H1·CTA·예시 리포트 카드가 주 콘텐츠로 유지되며, CRT는 `aria-hidden` 장식 요소다.
- 등록 번들의 component, renderer, shader, variant renderer, shared CSS 파일을 SHA-256 일치 상태로 가져오고 로컬 `@designcodeio/threeui` alias에 `CrtBackground` export를 추가했다.

## 2026-09-19 — GitHub repository footer link

- footer에 `GitHub 저장소 보기 ↗` 링크를 추가해 MyAiScore 공개 소스 저장소로 이동할 수 있게 했다. 영어 화면에서는 `View GitHub repository ↗`로 표시한다.

## 2026-09-19 — Hero title effect and 100% loading handoff

- 홈 히어로의 별도 ThreeUI wordmark frame을 제거하고, 실제 H1 문구 `공개 저장소에서 AI 협업을 뒷받침하는 신호를 찾습니다.` 자체에 크로매틱 조립 효과를 적용했다. 텍스트는 실제 heading으로 유지하고 reduced motion에서는 정적으로 표시한다.
- 저장소 분석 API 응답을 받은 뒤에도 UplinkLoader가 100% 구간에 도달할 때까지 loading 상태를 유지한 다음 완료 리포트로 전환한다.
- 사용하지 않게 된 `TextAnimationCollection` alias와 intro wordmark 원본 파일을 제거했다.

## 2026-09-19 — ThreeUI uplink loader for analysis progress

- 저장소 분석 요청 후 대기 상태에 ThreeUI `UplinkLoader`를 추가했다. 실제 진행 문구는 화면 텍스트로 유지하고, loader iframe은 장식 요소로 숨겨 보안 스캔·인증처럼 오해되지 않게 했다.
- 지정된 등록 번들의 TSX·canonical HTML·CSS를 해시 일치 상태로 가져오고, 로컬 `@designcodeio/threeui` alias가 요청된 `<UplinkLoader />` 사용을 원본 렌더러로 연결한다.
- 브라우저 검사는 지연된 API 응답 중 loader iframe과 내부 stage가 보이는지 확인한다.

## 2026-09-19 — 한국어 제품 문구 다듬기

- 홈, 예시 리포트, 결과 카드, 해석 가이드와 footer의 한국어를 자연스러운 제품 문구로 정리했다. 주요 축 이름은 `검증 체계`, `기록·추적`으로 통일하고 핵심 설명은 `AI 협업을 뒷받침하는 신호`에 맞췄다.
- API와 브라우저 저장 이력의 `repository-report-v1` 정본은 변경하지 않고, 안정된 style/evidence/axis ID를 한국어 화면 문구로 변환해 기존 저장 결과와의 호환성을 유지한다.

## 2026-09-19 — 저장소 점수 v2.1 기반 구현 시작

- `repository-signals-v1`은 유지하면서 cap 이전 후보 경로를 집계하는 `scanned_tree` inventory와 공용 14개 신호 matcher를 추가했다. 소스·테스트·문서·신호 후보 수, source byte와 큰 소스 후보, 임시·생성물·비밀 가능 경로를 후속 v2 분석용으로 보존한다.
- 명시적 v2 선택 모드에서는 14개 점수 신호별 대표 파일을 일반 40개 표본보다 먼저 예약한다. 기본 v1 선택 정책과 공개 점수에는 아직 적용하지 않는다.
- 고정 SHA의 최근 조상 commit summary를 읽는 bounded API와 원문을 내보내지 않는 설명 습관 집계 분석기를 추가했다. 선택된 소스의 400/800줄 후보와 scanned-tree 상위 파일 byte 집중도도 조언용 진단으로 계산한다. 커밋·위생·큰 파일 진단은 아직 감점하지 않는다.
- 설계와 호환 경계는 [ADR-0017](../Architecture/ADR/0017-content-aware-repository-scoring.md), [v2.1 제안](../Assessment/SCORING_V2_PROPOSAL.md), [Phase 9](Sessions/Phase-09-Anonymous-Repository-Reports.md)에 기록했다.

## 2026-09-19 — 내용 기반 저장소 점수 v2.1 연결

- 새 분석은 `repository-report-v2` / `repository-signals-v2.1`로 발급한다. 14개 신호의 실제 redacted content를 네 요소 이하로 측정하고 `presence × (0.15 + 0.60·substance + 0.25·substance·breadth)`를 적용한다. 과거 v1 브라우저 기록은 계속 검증한다.
- JavaScript/TypeScript·Python·Go·Rust·Java/Kotlin 테스트 선언과 assertion을 지원하고, 미지원 테스트 형식은 `unmeasured`와 잠정 결과로 표시한다. 빈 신호 파일 14개 회귀 fixture는 고득점을 만들 수 없다.
- manifest 의존성으로 DB 적용성을 판정하고, 고정 SHA 최근 조상 커밋의 원문 미보존 집계를 기록축 최대 5점 보너스로 연결했다. 위생과 400/800줄·큰 소스 집중도는 화면 진단으로 제공하되 감점하지 않는다.

## 2026-09-19 — 해석 가이드 한국어 문구 정리

- `/insights`의 화면 문구를 리포트 본문과 같은 해요체로 통일했다. 같은 화면에서 가이드는 합니다체, 리포트 카드는 해요체로 갈라져 있던 문제를 없앴다.
- "신호별 점수를 모두 공개합니다", "축별 합계는 25점에서 멈춥니다", "총점은 저장소에 확인 가능한 신호의 구성을 설명합니다" 같은 번역체 문장을 다시 썼다. 스타일 규칙 3A~3D에 반복되던 "앞 규칙에 해당하지 않을 때"는 목록이 이미 순서를 나타내므로 제거했다.
- 표 캡션의 "결정론적"을 본문 설명으로 옮겼다. "같은 저장소의 같은 커밋이면 언제 다시 돌려도 같은 점수가 나와요"로 같은 성질을 전달한다.
- 화면의 traceability 축 이름을 `추적 가능성`에서 `기록`으로 바꿔 `REPOSITORY_REPORT_COPY.axisLabels`, `기록 수집가` 스타일, 빈칸 안내와 용어를 맞췄다. 축 질문은 문어체 의문형 대신 평서 의문형으로 바꿨다.
- 변경 범위는 `src/i18n/messages.ts`의 의미 ID 카탈로그다. `repository-report-v1` 계약 문자열과 브라우저 저장 이력은 바꾸지 않았다([ADR-0016](../Architecture/ADR/0016-persistent-korean-english-interface.md)). 점수 계산과 스타일 판정 규칙도 그대로다.


## 2026-09-18 — 공개 README와 저장소 정리 (#39)

- README를 실제 배포 주소, 로그인 없는 공개 저장소 분석, 네 축·여섯 스타일, 브라우저 저장 범위, 신뢰 경계와 Railway 설정 기준으로 다시 작성했다. `.env.example`은 기본 흐름의 선택적 `GITHUB_TOKEN`과 레거시 평가 설정을 구분한다.
- 약 15MB의 과거 캡처·실행 산출물, 완료된 Claude 지시문과 사용되지 않는 Phase 1 스냅샷 스크립트·세션 화면 컴포넌트를 로컬 `_archive/`로 옮기고 현재 Git 트리에서 제거했다. `_archive/`와 `artifacts/`는 전체 ignore하며 기존 Git 이력은 보존한다.
- walkthrough 회귀 검사가 읽는 생성기 원문 하나는 `fixtures/walkthroughs/`로 이동했다. 역사 문서의 산출물 링크는 정리 전 고정 commit `f108be3`으로 연결해 새 clone에서도 확인할 수 있게 했다.

## 2026-09-18 — 점수·협업 스타일 해석 가이드

- `/insights`에 맥락·검증 기반·추적 가능성·자동화의 14개 고정 신호와 개별 점수, 축별 25점 합계를 항상 표시한다.
- 여섯 협업 스타일의 판정 순서와 최고 축 동점 우선순위를 한국어·영어로 공개한다. 선택된 리포트의 스타일을 강조하며 스타일이 총점 구간이 아닌 네 축 분포에서 결정된다고 설명한다.
- 화면은 리포트 생성과 같은 근거 ID·점수·임계값·축 우선순위를 읽는다. 점수 계산 결과나 `repository-report-v1` 계약은 변경하지 않았다.

## 2026-09-18 — 한국어 기본·영어 전환

- 공통 헤더에 한국어·영어 전환을 추가하고 검증된 쿠키로 선택을 보존한다. 서버 첫 응답부터 HTML 언어와 메타데이터를 맞춰 새로고침 때 언어가 바뀌지 않는다.
- Home/저장소 분석/내 리포트/해석 가이드와 저장소 리포트 전체를 의미 ID로 번역한다. `repository-report-v1` API와 브라우저 이력은 정본 한국어 계약을 그대로 유지하며 API 실패는 안정된 오류 코드로 현지화한다.
- 과거 영어 평가·공유·walkthrough는 본문 언어를 명시하고 공통 탐색만 선택 언어와 맞춘다. 결정은 [ADR-0016](../Architecture/ADR/0016-persistent-korean-english-interface.md), 실행 기록은 [Phase 9](Sessions/Phase-09-Anonymous-Repository-Reports.md)에 있다.

## 2026-09-18 — 로컬 standalone 출처 판정 수정 (#31)

- Next.js standalone이 요청 URL을 `localhost`로 정규화해, `127.0.0.1`로 연 브라우저의 POST를 외부 출처로 오인하던 403을 수정했다. 동일 scheme·port의 loopback 별칭만 허용하며 다른 host·port의 차단은 유지한다.

## 2026-09-18 — 로그인 없는 한국어 공개 저장소 리포트 (#28)

- 기본 진입점을 CLI에서 공개 GitHub 저장소 URL 하나로 바꿨다. 회원가입·GitHub 로그인·질문·LLM 호출 없이 고정 commit의 제한된 정적 표본에서 맥락·검증 기반·기록·자동화 신호를 계산한다.
- `repository-report-v1` 응답은 14개 고정 신호와 실제 수집 경로만 포함한다. 서버와 브라우저가 같은 strict parser로 점수·스타일·gap·다음 도전을 다시 계산하며 개인 AI 실력·코드 품질·테스트 성공으로 표현하지 않는다.
- 한국어 Home/저장소 분석/내 리포트/해석 가이드를 제공한다. 결과 저장은 선택 사항이며 요약만 현재 브라우저 localStorage에 최대 20개 보관한다. Claude Code 세션 CLI는 선택 기능으로 유지한다.
- 공개 GitHub transport를 고정 origin·redirect 거부·10초 abort·2MB 응답 제한으로 분리했다. private 여부와 metadata를 fail-closed로 확인하고, 서버 토큰 유무별 시작 제한을 적용한다. 상세는 [Phase 9](Sessions/Phase-09-Anonymous-Repository-Reports.md), 결정은 [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md)에서 관리한다.

## 2026-09-15 — CLI 세션 리포트로 기본 제품 전환 (#26)

- 협업 사례·발췌·질문 입력을 기본 화면에서 제거했다. Claude Code 기록을 프로젝트 범위 안에서 읽고 활동 점수·유형·특징 3개·다음 도전을 로컬에서 생성한다. API 키나 GitHub 수집이 필요하지 않다.
- 원문·명령·경로를 내보내지 않는 숫자 요약 계약과 엄격한 웹 import, 선택적 로컬 이력 저장을 구현했다. 예시는 개인 기록과 분리한다. 기존 평가 API와 walkthrough는 과거 흐름으로 보존한다.
- 263개 단위·회귀, typecheck/build, 24개 데스크톱·모바일 검사 통과. 독립 검토에서 필수 결함 없음. 실제 개인 로그 호환성·재미는 다음 검증 대상이다. [Phase 8](Sessions/Phase-08-CLI-Session-Reports.md), [ADR-0014](../Architecture/ADR/0014-cli-first-session-reports.md).

## 2026-09-15 — 수집 용량 계산 수정과 같은 SHA 재검사 (#23)

- 응답 본문과 채택 파일 내용 집계를 분리해 MAS-011 조기 partial을 수정했다. 디코딩 후 파일 크기·내용 한도를 지키고 선정 후 미수집 경로별 사유를 남긴다. 새 contentBytes는 과거 스냅샷과 호환되는 선택 필드다.
- 같은 MyAiScore 커밋을 실제 재수집해 34/40 partial → 40/40 complete를 확인했다. 43요청, 12,603ms, 응답 692,198/내용 188,778바이트. 원본은 보존하고 화면에 새 표본 범위·비교·제외 사유를 표시한다. 개인 협업 근거가 없어 총점은 계속 보류한다.
- 248단위·회귀, typecheck/build, 32브라우저 검사 통과. 독립 검토에서 40개 Git 원문 해시와 312경로의 읽음/제외 분류를 확인했다. [Phase 7 후속](Sessions/Phase-07-Repository-Walkthrough.md), [ADR-0013](../Architecture/ADR/0013-separated-ingestion-byte-accounting.md).

## 2026-09-15 — MyAiScore 저장소 기능 시뮬레이션

- 디자인 추가 작업을 보류하고 고정 SHA `5bd958b`의 실제 GitHub 수집을 바탕으로 저장형 3단계 walkthrough와 읽기 전용 예시 API를 구성한다. 285후보/40선정/34읽기, 38요청, partial·context truncation을 그대로 표시한다. HTTP 응답과 디코딩 파일을 같은 예산에 중복 집계하는 MAS-011/#23을 확인했다. 기존 fetched_bytes=819270은 혼합 집계이며 순수 다운로드량이 아니다. 개별 6파일 누락 사유는 보존되지 않아 미확인이다.
- 질문·판정은 전용 스크립트 응답을 실제 검증기·점수 엔진에 통과시킨 결과다. 사례·발췌·답변을 꾸미지 않고 다섯 축 insufficient_evidence/level=null, 총점 withheld를 유지한다. 실제 모델 호출은 없다.
- 사용자 제출 없는 서비스 결과는 source=github_repository로 구분한다. 예시 재생은 소유 토큰·이력·저장소·LLM 호출을 만들지 않는다. 기존 synthetic starter를 보존한다.
- 실행 수집값과 재현 명령은 [Phase 7](Sessions/Phase-07-Repository-Walkthrough.md), 결정은 [ADR-0012](../Architecture/ADR/0012-repository-walkthrough.md)에 기록한다. 239개 단위·typecheck/build·32개 브라우저 검사와 독립 출처 검사를 통과했다. 단계 이동 포커스 수정 후 관련 브라우저 2건을 재검증하고 6개 화면 캡처를 보존했다. 최종 원격 검사는 통합 PR Checks에서 확인한다. [#22](https://github.com/SangJun-Pyo/MyAiScore/issues/22).

## 2026-09-15 — 일관된 평가 작업 화면 (#20)

- 화면 전반을 중립 차콜·밝은 중립 글자·행동/선택용 코럴로 통일한다. 겹친 테마를 정리하고 공통 규칙을 [DESIGN_SYSTEM](../UI/DESIGN_SYSTEM.md)에 기록했다.
- 히어로를 자체 작성한 A–E 근거 검토 예시로 대체하며 HeroScene/WebGL/Three.js 의존성을 제거한다. Approach 이후의 랜딩 본문은 유지한다.
- 프로필은 평가 이력, Insights는 관찰·근거·부족한 근거, 새 평가는 선택적 사례가 있는 단일 폼에 집중한다. 공통 기준은 펼쳐 읽으며 가상 계정·빈 통계·중복 소개를 줄인다.
- ThreeUI Diagnostics Panel은 Canvas2D 효과 3종임을 확인한 참고 대상이며 코드를 복사하지 않았다. Kage 고정 원본·MIT 출처는 보존하고 Logic Core 기록은 과거 적용으로 구분한다.
- 이번 변경에서 typecheck/build, 236개 단위·회귀, 30개 데스크톱·모바일 브라우저 검사를 실제 통과했다. 키보드·모션 감소·예시 분리·모든 선택 입력과 동의를 검증하고 독립 검토 및 화면 캡처 확인을 완료했다. [Phase 6 후속](Sessions/Phase-06-English-Landing.md), [ADR-0011](../Architecture/ADR/0011-consistent-assessment-design.md), [#20](https://github.com/SangJun-Pyo/MyAiScore/issues/20).

## 2026-09-15 — 영어 전용 전체 랜딩

- 사용자 정정에 따라 ThreeUI Landing Pages의 Kage를 전체 페이지 구성 참고로 채택했다. 넓은 첫 화면·번호별 섹션·근거 중심 소개·3단계 흐름·5축·합성 결과·마지막 시작 안내로 확장하고 관련 작업 공간의 시각 방향을 맞췄다.
- 제품 내비게이션·입력·결과·공유·오류·기준 설명과 서버 생성 문구를 영어로 통일했다. 제출 원문·과거 기록·교정 fixture는 보존하고, 번역된 프롬프트/기준표/실행 설정의 버전을 구분했다. 점수 공식과 런타임 합성 예시 71점은 유지한다.
- Kage 원본의 사원 페이지 복제 지시는 참고 자료로 구분하고 MyAiScore용 React/CSS로 적용했다. 출처·고정 revision·MIT 고지와 적용 프롬프트를 보존한다.
- 236개 단위·회귀, 30개 브라우저 검사와 typecheck/build 통과. 근거 부족·미관찰 표시 혼동(MAS-010)을 독립 검토로 찾아 수정했다. 상세 결과는 [Phase 6](Sessions/Phase-06-English-Landing.md)에 기록한다. 실제 모델 호출·평가 타당성·운영 DB·배포 검증은 별도 대기다. [ADR-0010](../Architecture/ADR/0010-english-landing-page-experience.md), [#18](https://github.com/SangJun-Pyo/MyAiScore/issues/18).

## 2026-09-15 — ThreeUI Community Logic Core

- 무료 Community 공개 프롬프트·MIT 소스를 확인하고 등각 플랫폼·중앙 코어·12개 큐브를 포팅했다. 5개 큐브에 기존 축 선택을 연결하고 보라·시안 테마와 정적 대체를 유지했다.
- 원문 참조/적용 프롬프트, 고정 revision·해시와 배포물의 라이선스 고지를 보존했다. 독립 검토에서 발견한 배포 고지 누락과 브라우저에서 발견한 SVG 부동소수점 hydration 차이를 수정했다.
- typecheck/build, 234개 단위·회귀, 최종 26개 브라우저 검사 통과. 원격 검사에서 발견한 MAS-009 모션 감소 전환 누락도 재현·수정했다. [Phase 5 후속](Sessions/Phase-05-Profile-And-Live-Pilot.md), [ADR-0009](../Architecture/ADR/0009-threeui-community-logic-core.md), [#16](https://github.com/SangJun-Pyo/MyAiScore/issues/16).

## 2026-09-14 — 프로필·항목별 분석과 실제 저장소 수집

- 홈/프로필/항목별 분석/새 평가 경로를 나누고 5축 선택형 3D hero, 탭 단위 소유 이력, 평가별 근거와 기준 탭을 구현했다. 계정·리더보드는 추가하지 않았다.
- 소유 이력의 인증·만료·필드 제한을 구현하고 예시/빈 상태를 구분했다. 재클릭/URL 상태 결함을 수정했다.
- MyAiScore 실제 GitHub 수집에서 표본 편중 MAS-007을 발견해 선정 규칙을 보정했다. 최초 수집과 동일 SHA 로컬 재현을 분리 보존한다. 실제 모델 호출·점수 발급은 미실행이다.
- typecheck/build, 234개 단위·회귀, 22개 브라우저 검사 통과. [Phase 5](Sessions/Phase-05-Profile-And-Live-Pilot.md), [ADR-0007](../Architecture/ADR/0007-anonymous-assessment-workspace.md), [ADR-0008](../Architecture/ADR/0008-balanced-repository-sampling.md), [#13](https://github.com/SangJun-Pyo/MyAiScore/issues/13), [#14](https://github.com/SangJun-Pyo/MyAiScore/issues/14).

## 2026-09-14 — 에이전트 공통 지침 통합

- AGENTS를 공통 작업 규칙 정본으로 명시하고 기존 CLAUDE의 구현 원칙을 옮겼다. CLAUDE는 AGENTS/ROADMAP import 진입점으로 간소화했다.
- 현재 작업은 ROADMAP에서 읽고, 기존 세션 재읽기와 checkout 기준을 명시했다. 전역 도구 설정이나 실행 중인 Claude 세션은 변경하지 않았다.
- 관련 [#11](https://github.com/SangJun-Pyo/MyAiScore/issues/11), [Phase 4](Sessions/Phase-04-Web-MVP.md).

## 2026-09-14 — 공용 프로젝트 인계 경로 복원

- worktree/원격만 최신이고 원래 checkout은 과거 브랜치에 남아 있던 누락을 확인했다. `C:/Users/sangj/MyAiScore/docs`를 공용 문서 진입점으로 명시하고 코드와 함께 Git으로 동기화하는 종료 절차를 추가했다.
- 원래 폴더의 Claude 재검토 commit `f4f7012`를 merge로 보존하고, 과거 상태와 최신 상태의 충돌은 최신 ROADMAP/BUGS를 유지하며 원문 검토를 세션에 남기는 방식으로 해결했다.
- 관련 [#9](https://github.com/SangJun-Pyo/MyAiScore/issues/9), [Phase 4](Sessions/Phase-04-Web-MVP.md). 앱 소스 변경 없음.

## 2026-09-14 — Phase 4 ADR 사후 기록

- DECISIONS/세션 요약에만 남겼던 주요 설계 6개를 Architecture/ADR에 배경·결정·대안·결과·미검증 범위와 함께 기록했다.
- 사후 기록임을 표시하고 기존 요약에서 상세 ADR로 연결했다. AGENTS/CLAUDE/작업 완료 규칙에 주요 설계 변경의 ADR 작성과 대체 관계를 추가했다.
- 문서만 변경했다. 관련 [#7](https://github.com/SangJun-Pyo/MyAiScore/issues/7), [Phase 4](Sessions/Phase-04-Web-MVP.md).

## 2026-09-14 — Astra·서브에이전트 웹 MVP 통합

- GitHub 이슈 #1~4와 독립 codex worktree를 만들고 Astra가 구현·통합을 맡는 운영으로 변경.
- MAS-002/004/005 보정, MAS-006 JSON 파싱 오류/metadata 잔여 노출 경로 추가 수정.
- 실제 GitHub 수집·서버 모델 adapter·질문/판정/계산·개선 작업서·보수적 비교, 웹 UI 및 인증 API 통합.
- File/Supabase CAS 저장, 공개 요약 분리·철회·삭제·재시도·예산 제한, CI/Docker/Railway 설정.
- #5 후속 디자인: 전체 다크 팔레트, 보라·시안 강조, hover/focus, 실제 Three.js 장면과 정적 대체. 데스크톱·모바일 캡처 확인.
- typecheck, 224개 테스트, production build, 데스크톱/모바일 브라우저 12건 통과. 실제 모델/DB/배포는 미수행.
- 상세: [Phase 4](Sessions/Phase-04-Web-MVP.md). 과거 보고 날짜는 원문을 보존하며 현재 상태는 ROADMAP을 따른다.

## 2026-09-20 — MAS-006 독립 재검토: PASS, 종료

- 구현자와 분리된 독립 검토 서브에이전트가 MAS-006 수정(`187cf52`)을 재검토했다. worktree 격리는 이번 환경에서 사용할 수 없어 메인 작업 트리를 읽기 전용으로 사용(검토 전후 `git status` clean·동일 확인).
- 단순 `grep`이 아니라 `LocalCollectionPublicView`의 허용 필드 목록과 실제 `--json`/artifact 출력의 최상위·중첩 키 구조를 대조해 확인. `secrets-session.jsonl`/`unsupported-format.jsonl`/`corrupted-session.jsonl` 실행 모두에서 synthetic 비밀·원문 미노출을 확인. `npm run typecheck` 통과, `npm test` 170 pass 재확인. `git diff 0e7259e..187cf52`로 MAS-002/004/005·평가 파이프라인과 무관함을 파일 범위로 확인.
- **판정 PASS.** MAS-006을 이번 재현 경로(`--json`의 `events`/`analysisContext` 노출)에 한해 종료(closed) 처리했다 — 다른 개인정보 마스킹 패턴의 완전성까지 보증하는 것은 아니다(BUGS.md에 명시).
- 상세: [Phase 3 — MAS-006 독립 재검토](Sessions/Phase-03-Local-Collection-PoC.md#2026-09-20-후속--mas-006-독립-재검토-pass).

## 2026-09-20 — MAS-006 수정 (로컬 수집 PoC CLI 원문 노출)

- 독립 검토(`0e7259e`)가 발견한 P1 결함 MAS-006(`scripts/collectLocalSession.ts --json`이 마스킹 전 세션 원문을 그대로 출력)을 수정했다. `secrets-session.jsonl`로 먼저 재현(회귀 테스트 3/4 실패 확인) 후 수정.
- `collectLocalSession.ts`에 `LocalCollectionPublicView`/`buildLocalCollectionPublicView()`를 추가해 사람이 읽는 미리보기와 `--json` 출력이 항상 같은 안전한 필드 집합만 사용하도록 통일했다(`events`/`analysisContext`는 CLI 출력에서 완전히 제외).
- 기존 커밋된 `artifacts/local-collection-poc/basic-session.json`(마스킹 전 `events` 포함)을 수정된 CLI로 재생성했다 — 실제 세션 기록은 사용하지 않음(synthetic만).
- 신규 회귀 테스트 `tests/localCollection/cliJsonOutput.test.ts`(4개, CLI를 실제 자식 프로세스로 실행)로 재검증. `npm run typecheck` 통과, `npm test` 170 pass(기존 166 + 신규 4).
- MAS-006을 "수정 완료 / 독립 재검토 대기"로 표시. MAS-002/004/005는 이번과 무관하게 그대로 둠. 상세: [Phase 3 — MAS-006 수정](Sessions/Phase-03-Local-Collection-PoC.md#2026-09-20-후속--mas-006-수정).

## 2026-09-14 — Phase 3 로컬 수집 PoC 독립 검토

- 구현자와 별도로 `claude/local-collection-poc`의 `5978210`(base `c7b3a2e`)을 별도 worktree에서 검토했다. `npm run typecheck`/`npm test`(166 pass) 재실행 확인, synthetic fixture 7종 전부로 CLI를 직접 재현 실행했다.
- 수집·연결·Evidence 변환 계층은 결함 없음. `scripts/collectLocalSession.ts --json` 출력이 마스킹·절단 전 세션 원문을 그대로 노출하는 결함 1건(MAS-006, P1)을 발견해 등록 — 다음 실제 세션 실험 전 수정 필요.
- 기존 평가 입력 adapter에는 연결돼 있지 않음(Evidence 생성까지만)을 코드로 재확인. 점수 조건/`humanReviewed`/MAS-002·004·005는 변경되지 않았음을 diff로 확인.
- 상세: [Phase 3 독립 검토](Sessions/Phase-03-Local-Collection-PoC.md#2026-09-14--독립-검토-구현자와-별도-claude-code).

## 2026-09-20 — Phase 3 로컬 협업 기록 수집 PoC

- 사용자·Astra 합의로 `MVP_SCOPE.md`의 Local Evidence Mode 보류를 이 PoC 1건에 한정해 재검토([DECISIONS](DECISIONS.md#7-정식-mvp-편입-전의-제한된-로컬-수집-실험-2026-09-20)). Claude Code 세션 JSONL(실제 프로젝트 파일로 구조 확인) 1개를 읽어 요청/제안/도구 호출·결과를 구조적으로 추출하고, 기존 Evidence 계약(`sourceType:"user_provided_excerpt"`)에 계약 확장 없이 연결하는 로컬 수집기·CLI·synthetic fixture 7종·테스트 24개를 구현했다.
- `npm run typecheck` 통과, `npm test` 166 pass(기존 142 + 신규 24). CLI를 정상/손상/미지원 형식 세 경로로 실제 실행해 exit code(0/0/1)를 확인.
- MAS-002/004/005는 이 작업과 무관하게 미해결로 유지. 상세: [Phase 3](Sessions/Phase-03-Local-Collection-PoC.md).

## 2026-09-14 — Phase 2 Fixes 구현 보고와 실행 확인

- 후속 Astra 재검토: typecheck·142 pass 확인. MAS-001/003은 오프라인 범위 해결 확인, MAS-002/004 잔여 경로와 MAS-005 입력 hash 문제를 재현해 수정 지시를 갱신했다. [검토 기록](Sessions/Phase-02-Fixes.md#astra-rereview-20260914).

- Claude의 R1~R4 수정 보고를 해당 Phase 세션에 편입했다. Astra가 typecheck와 142개 테스트 통과를 재확인했다.
- 상세 코드 검토는 대기 상태이며 BUGS를 review_required로 갱신했다. 수정 코드는 문서 정리와 별도 checkpoint로 보존한다.
- 상세: [Phase 2 Fixes](Sessions/Phase-02-Fixes.md#fix-report).


## 2026-09-14 — 문서 운영·Git 정리

- RobloxLab의 Phase 세션/Changelog/Roadmap/Bugs 구조를 참고해 기존 보고·검토 6개를 Phase 세션 3개로 통합하고 과거 지시문을 Prompts에 이동.
- 현재 상태는 ROADMAP으로 통일, 열린 결함 MAS-001~004를 BUGS에 등록, 세션 기록·변경 요약·본인 변경만 Git commit하는 규칙 반영.
- 초기 Git 기준점을 생성했다. 과거 작업별 commit 이력은 존재하지 않으며 복원하지 않았다. 이후 사용자 요청으로 GitHub main에 기준점과 정리 commit을 업로드했다. 배포는 하지 않았다.
- 상세: [문서·Git 정리 세션](Sessions/Session-2026-09-14-Documentation-And-Git.md).

## 2026-09-14 — Phase 2 오프라인 구현과 검토 (사후 요약)

- Claude가 fixture 연결·질문/판정 검증기·계산/Confidence·mock CLI를 구현했다. 당시 108개 테스트 통과를 보고했고 Astra도 확인했다.
- Astra 추가 검사에서 MAS-001~004를 발견해 최종 수용을 보류했다. 실제 모델 검증은 미수행.
- 상세: [Phase 2](Sessions/Phase-02-Offline-Evaluation.md). 후속: [Phase 2 Fixes](Sessions/Phase-02-Fixes.md).

## 2026-09-14 — Phase 1 후속 검토 (사후 요약)

- smoke:live 명령 수정, API 표기/fixture 기대/인젝션 실험/인간 검토 표기 점검. Claude 제안 일부를 Astra가 보정했다.
- 상세: [Phase 1](Sessions/Phase-01-Fixtures-And-Ingestion.md).


## Phase 1 — 2026-09-10 Task 0·1 구현·검증

CLAUDE_PHASE1_PROMPT.md 지시에 따라 실제 코드·fixture·테스트를 구현하고 검증했다(문서 작성이 아니라 실행 결과). 전체 내역과 측정값은 [PHASE1_REPORT](Sessions/Phase-01-Fixtures-And-Ingestion.md#implementation-report).

- Task 0: `fixtures/calibration/`에 CALIBRATION_PLAN.md의 8개 필수 사례(사례 8은 3개 하위 변형 포함, 총 10개 fixture)를 synthetic 저장소·협업 사례·`expected.json`·`provenance.json`으로 구현.
- Task 1: `src/server/ingestion/`에 URL 검증, GitHub REST API 어댑터(재시도·budget 포함), 파일 선정(제외/우선순위), 비밀 패턴 마스킹, `IngestionSnapshot` 생성까지 읽기 전용 수집 파이프라인 구현. `scripts/ingest.ts` CLI 제공.
- 검증: node:test 기반 오프라인 테스트 53개 전부 통과(URL 검증, 파일 선정, budget, 수집 파이프라인 엣지 케이스, fixture 구조 검증, Task 0↔Task 1 통합). `tsc --noEmit` 통과.
- Live smoke: `octocat/Hello-World`(공개, 소형)를 실제 GitHub API로 수집해 `complete` 상태와 full commit SHA를 확인. 존재하지 않는 저장소에 대한 404 실패 경로도 실제 네트워크로 확인.
- 계약 변경: `EVIDENCE_SCHEMA.md`의 `IngestionSnapshot`/`Evidence` 정의를 그대로 구현했고, scoring/MVP 원칙은 변경하지 않음. 구현 중 발견한 사소한 표현 차이(필드명 camelCase 매핑 등)는 PHASE1_REPORT.md에 기록.
- 수행하지 않음: LLM 평가(Task 2), 결정적 점수 엔진(Task 3), 개선 작업서 생성기(Task 4), API/DB(Task 5), 웹 UI(Task 6), 반복 실행 실험, 외부 사용자 실험, 사람에 의한 fixture 검토.

## v0.3.1 — 2026-09-10 Astra 문서 검토·보정

- 다섯 축 모두 판정 가능할 때만 총점 발급. 미확인=null, 부분 총점 폐기.
- 축별 4단계 행동 기준·반례와 점수 예시 재작성.
- 공개 코드 수집 캐시와 개인 평가·소유 권한 분리.
- 단계별 await 실행과 timeout·attempt·재시도·정본 상태 전이.
- 근거 변화와 행동 변화의 독립 필드, 모델/프롬프트/설정까지 비교 버전 반영.
- 데이터·API·UI·교정·작업 문서의 필드와 상태 일치 보정.
- Task 0·1용 CLAUDE_PHASE1_PROMPT 작성.
- 이전 풀린 폴더·루트 안내·완료된 프롬프트를 _archive로 이동. 영구 삭제는 자동 승인 검토의 정책 차단으로 수행하지 않음.
- 수정 전 루트 Markdown과 docs 전체를 _archive/v0.3.1의 ZIP으로 보존.

문서 검사 기록: [document-validation.json](https://github.com/SangJun-Pyo/MyAiScore/blob/f108be37d0df9a8e23a65794ccef0cc367256e0b/_archive/v0.3.1/document-validation.json). 실제 검사 결과와 한계는 [ASTRA_REVIEW_BRIEF](Sessions/Phase-00-Planning.md#planning-review)에 기록한다.

이번 작업에서 앱/fixture/수집 코드 구현, 패키지 설치, GitHub 데이터 수집, 모델 API 호출, DB 연결, 배포, 외부 사용자 실험은 수행하지 않았다. 공식 기술 문서를 참고한 설계와 실제 런타임 검증을 구분한다.

## v0.3 — 2026-09-10 최초 문서 재작성 (과거 기록)

단일 프로젝트·과정 근거·맞춤 질문·개선 작업서 중심으로 기획을 재작성했다. 당시 완료 보고에는 교차검사 완료라고 되어 있었으나 Astra 검토에서 계약 모순이 확인돼 위 v0.3.1에서 수정했다. 당시 원문과 보고서는 수정 전 ZIP에 보존했다.

## v0.2 — 과거 참고

[이전 마스터](https://github.com/SangJun-Pyo/MyAiScore/blob/f108be37d0df9a8e23a65794ccef0cc367256e0b/_archive/v0.2/00_MASTER_PLAN.original.md)를 보존한다. 현재 요구사항의 정본은 아니다.
