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

## 통합 전 검증

- `npm run typecheck` 통과
- `npm test` 279/279 통과. 이후 네 축 25점·총점 100 도달 회귀 1건을 추가했다.
- `npm run build` 통과
- `npm run test:e2e` desktop/mobile 24/24 통과

## 독립 검토와 배포

설계 사전 검토는 quota, transport, endpoint 초기화, private fail-closed, 검증 신호 표현을 필수 조건으로 제시했고 구현에 반영했다. 최종 통합 commit의 독립 코드 검토, PR CI, Railway 배포와 실제 MyAiScore 공개 저장소 1건 smoke 결과는 이어서 기록한다.

## 현재 한계

- 점수는 구조적 파일 존재 신호를 재미있게 요약하며 파일 내용의 품질, 실행 성공, 실제 AI 대화와 개인 기여를 판정하지 않는다.
- 시작 제한은 서버 프로세스 메모리 기준이라 여러 인스턴스 사이에 공유되지 않는다. short-TTL 결과 cache도 아직 없다.
- 공개 저장소만 지원한다. 비공개 저장소 GitHub App, 계정·기기 간 이력, hosted 공유 링크, leaderboard와 LLM 조언은 보류한다.
