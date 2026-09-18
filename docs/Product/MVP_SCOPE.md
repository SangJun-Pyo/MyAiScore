# MVP scope — 공개 저장소 리포트 v0.5

Current decision: [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md). Requirements: [PRD](PRD.md).

## Included

- 공개 GitHub 저장소 URL 1개, default branch의 고정 commit.
- bounded 정적 수집과 private/redirect/symlink/submodule/비밀 파일 차단.
- 네 축 0~25점, 총점 0~100, 스타일·근거·coverage·gap·다음 도전.
- 한국어 Home/분석/Profile/Insights, desktop/mobile.
- 선택적인 브라우저 로컬 이력과 삭제; 서버 DB 없음.
- 선택적 서버 `GITHUB_TOKEN`; 사용자 로그인과 무관.
- 기존 Claude CLI/session report와 과거 평가 API의 호환 보존.
- unit/API/browser 검사, 독립 경계 검토, Railway smoke.

## Excluded from primary flow

- 회원가입, GitHub OAuth/GitHub App 설치, private 저장소.
- Supabase, 서버 이력, 공개 결과 영구 URL, 리더보드.
- 서비스 LLM, 추가 질문, 협업 사례/발췌 입력.
- 저장소 코드·테스트·hook/MCP 실행.
- 개인 AI 능력, 코드 품질, 생산성, 기여자 신원, 백분위 인증.

## Deferred

브라우저에서 Claude 세션 JSONL 직접 읽기, private 저장소용 GitHub App, 다른 Git 제공자, 계정 동기화, 공유 카드 이미지, 실제 사용자 연구와 점수 교정.

## Release conditions

잘못된/private URL과 GitHub 제한을 안전하게 처리한다. 토큰과 저장소 원문이 응답에 새지 않는다. partial을 complete로 표현하지 않는다. 결과 근거 경로가 실제 수집 목록에 속한다. MyAiScore 자체 검사만 실행하며 제출 저장소 코드는 실행하지 않는다. 실제 공개 배포에서 로그인 없는 MyAiScore URL 분석을 확인한다.
