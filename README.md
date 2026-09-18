# MyAiScore

공개 GitHub 저장소에 남은 신호로 AI 협업 스타일을 살펴보는 한국어 웹 데모입니다.

사용자는 로그인·회고 작성·CLI 없이 저장소 URL 하나를 입력합니다. MyAiScore는 고정 commit의 제한된 정적 파일 표본에서 AI 작업 맥락, 검증 기반, 결정 기록과 자동화 신호를 찾아 점수·스타일·근거 경로·다음 도전을 제공합니다. 저장소 코드를 실행하거나 서비스 LLM을 호출하지 않습니다.

이 결과는 저장소에 관찰되는 준비 신호의 재미있는 요약입니다. 개인의 실제 AI 활용 능력, 코드 품질, 테스트 성공, 기여자 신원, 생산성 또는 채용 적합성을 인증하지 않습니다.

## 로컬 실행

```bash
npm ci
npm run dev -- --port 3100
```

[http://127.0.0.1:3100](http://127.0.0.1:3100)에서 홈을 열고 `/evaluate`에 공개 저장소 URL을 입력합니다. 기본 분석에는 계정, Supabase와 모델 API 키가 필요하지 않습니다.

GitHub 비인증 REST API는 허용량이 작습니다. 반복적인 공개 데모에서는 public API 허용량을 높일 서버 비밀을 설정할 수 있습니다.

```text
GITHUB_TOKEN=<server-only token>
```

토큰은 브라우저에 전달되지 않으며 private 저장소 분석을 활성화하지 않습니다. 값은 저장소·채팅·로그에 넣지 마세요.

## Railway 배포

현재 앱은 Next.js standalone으로 실행됩니다.

```text
Build Command: npm run build
Start Command: npm start
Healthcheck: /api/health
```

필수/권장 환경변수:

```text
HOSTNAME=0.0.0.0
MYAISCORE_ENABLE_LIVE=false
MYAISCORE_ALLOW_FILE_STORE=true
NEXT_TELEMETRY_DISABLED=1
GITHUB_TOKEN=<optional server-only token>
```

Railway가 주입하는 `PORT`를 사용합니다. 현재 기본 리포트는 stateless이고 DB에 저장하지 않습니다. Profile의 저장 결과는 사용자가 선택한 현재 브라우저의 localStorage에만 남습니다.

## 검사

```bash
npm run typecheck
npm test
npm run check:docs
npm run build
npx playwright install chromium
npm run test:e2e
```

## 선택 기능: Claude Code 세션 리포트

설치된 checkout에서는 로컬 Claude Code 세션의 구조적 활동을 별도 리포트로 만들 수 있습니다. 이것은 공개 저장소 리포트와 다른 선택 기능입니다.

```bash
npm run session:report -- --example
npm run session:report -- --project "C:/path/to/project" --out session-report.json
```

원문·명령·파일 경로는 요약에 포함하지 않습니다. 패키지는 아직 비공개이며 `npx myaiscore`가 게시됐다고 안내하지 않습니다.

## 문서와 인계

공용 시작 경로는 [AGENTS](AGENTS.md) → [ROADMAP](docs/Development/ROADMAP.md) → [master](docs/00_MASTER_PLAN.md)입니다. 현재 결정은 [ADR-0015](docs/Architecture/ADR/0015-anonymous-korean-repository-reports.md), 계약은 [REPOSITORY_REPORT](docs/Assessment/REPOSITORY_REPORT.md), 실행 기록은 [Phase 9](docs/Development/Sessions/Phase-09-Anonymous-Repository-Reports.md)입니다. `CLAUDE.md`도 같은 AGENTS와 ROADMAP을 불러옵니다.
