# MyAiScore — master plan v0.5

> 저장소에 남은 신호로 만나는 나의 AI 협업 스타일.

Current execution: [ROADMAP](Development/ROADMAP.md). Decision: [ADR-0015](Architecture/ADR/0015-anonymous-korean-repository-reports.md). History: [Sessions](Development/Sessions/README.md).

## Product

MyAiScore는 로그인이나 회고 작성 없이 공개 GitHub 저장소 URL 하나를 분석해 재미있고 설명 가능한 리포트를 제공한다. 핵심 결과는 저장소 신호 점수, 협업 스타일, 네 축의 근거, 확인하지 못한 부분과 다음 도전이다. 공모전용 기본 UI는 한국어다.

점수는 저장소에 남은 AI 맥락·검증·결정 추적·자동화 신호를 요약한다. 실제 대화에서 누가 어떤 판단을 했는지, 코드가 정답인지, 개인의 일반 능력이나 생산성이 높은지를 인증하지 않는다. 결과는 채용 등급이나 백분위가 아니다.

## Primary flow

공개 GitHub URL 입력 → 서버의 제한된 read-only 수집 → 버전 고정 규칙 → 한국어 리포트 → 선택적 브라우저 로컬 저장 → 근거/규칙 상세 확인.

사용자 GitHub 로그인, 회원가입, Supabase, 서비스 LLM, 협업 사례, 질문 답변 또는 CLI가 필요하지 않다. 서버는 분석 결과를 DB에 보존하지 않는다. 비공개 저장소와 계정 동기화는 제출 뒤 범위다.

## Trust boundaries

- `github.com/{owner}/{repo}` 공개 저장소와 고정 commit만 허용한다. private 저장소, redirect, symlink/submodule, 비밀 파일과 용량·시간·요청 한도 밖의 입력을 거부하거나 제외한다.
- 제출 저장소의 install/build/test/hook/MCP를 실행하지 않는다. 정적 파일을 제한적으로 읽는다.
- 서버 `GITHUB_TOKEN`은 허용량을 높이는 비밀 설정이다. 사용자 인증이나 private 접근 기능으로 쓰지 않고 응답·로그·클라이언트에 내보내지 않는다.
- 점수와 한국어 설명은 서버가 수집한 구조 신호로 다시 계산한다. 임의의 클라이언트 점수나 저장소 문구를 결과 설명으로 신뢰하지 않는다.
- partial coverage와 제외 범위를 표시한다. 관찰되지 않은 항목을 실패나 낮은 개인 능력으로 표현하지 않는다.

## Secondary and historical paths

Claude Code 세션 CLI와 [SESSION_REPORT](Assessment/SESSION_REPORT.md)는 원문을 로컬에 둔 선택적 상세 분석으로 유지한다. 현재 기본 진입점은 아니다. 과거 다섯 축 평가, owner token, 공개 결과 DTO와 walkthrough는 기존 데이터·테스트 호환을 위해 유지하며 새 저장소 점수와 혼합하지 않는다.

## Delivery

Next.js/React/TypeScript와 기존 차콜·코럴 시각 체계를 유지한다. Railway의 현재 공개 배포를 사용하고 DB는 추가하지 않는다. 코드·문서·ADR·세션 기록을 같은 Git PR로 통합한 뒤 desktop/mobile과 실제 공개 URL을 검증한다.

Requirements: [PRD](Product/PRD.md). Scope: [MVP_SCOPE](Product/MVP_SCOPE.md). Flow: [USER_FLOW](UI/USER_FLOW.md). Report contract: [REPOSITORY_REPORT](Assessment/REPOSITORY_REPORT.md).
