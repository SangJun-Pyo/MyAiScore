# MyAiScore

공개 GitHub 저장소에 남은 정적 신호로 AI 협업 스타일을 살펴보는 웹 데모입니다. 한국어가 기본이며 헤더에서 English로 전환할 수 있습니다.

**Live demo:** [myaiscore-production.up.railway.app](https://myaiscore-production.up.railway.app/)

로그인이나 CLI 없이 공개 저장소 URL 하나를 입력하면, MyAiScore가 고정 commit의 제한된 파일 표본과 최근 조상 커밋 집계를 읽어 결정론적인 리포트를 만듭니다. 결과에는 내용 실질·규모 범위를 반영한 점수, 네 차원 협업 유형, 실제 근거 경로, 수집 범위, 구조·위생 진단과 우선순위가 정해진 개선 조언이 포함됩니다.

## 무엇을 보여주나요?

- **네 가지 축:** 맥락, 검증 기반, 추적 가능성, 자동화를 각각 0–25점으로 계산합니다.
- **네 글자 협업 유형:** 기록/실행, 직접확인/파이프라인, 설계선행/추적중심, 집중/균형의 네 상대 차원을 조합하고 재미있는 유형명으로 항상 표시합니다. 근거가 부족하면 신뢰도 주의 문구를 함께 표시합니다.
- **확인 가능한 근거:** 점수에 사용한 파일 경로와 발견하지 못한 신호를 함께 표시합니다.
- **실행 가능한 조언:** 신호 하나를 개선했을 때의 실제 점수 변화와 고정 작업량을 재계산해 최대 세 개를 추천합니다. 내부 계수는 화면에 노출하지 않습니다.
- **공개된 기준:** [해석 가이드](https://myaiscore-production.up.railway.app/insights)에서 v2.6의 축별 세부 신호와 최대점, 유형 차원을 확인할 수 있습니다. 실제 획득점은 파일 존재·내용 실질·scanned-tree breadth를 함께 사용하며, 유형은 점수 등급이 아니라 신호의 상대적 배치로 정해집니다.

고정 SHA 공개 저장소 코호트가 준비되기 전에는 순위나 백분위를 표시하지 않습니다.

서비스 LLM을 호출하지 않고 저장소의 install, build, test, hook 또는 코드를 실행하지 않습니다. 공개 파일 원문을 리포트에 넣거나 분석 결과를 서버 DB에 저장하지 않습니다.

이 결과는 저장소에서 관찰되는 협업 준비 신호를 재미있게 요약한 것입니다. 개인의 실제 AI 활용 능력, 코드 품질, 테스트 성공, 기여자 신원, 생산성 또는 채용 적합성을 인증하지 않습니다.

## 저장한 리포트

결과 화면에서 사용자가 직접 저장한 요약만 현재 브라우저의 localStorage에 최대 20개 보관합니다. 같은 저장소·commit·규칙 버전은 하나로 정리되며 개별 삭제와 전체 삭제를 지원합니다. 계정, 서버 DB, 기기 간 동기화는 없고 브라우저 데이터를 지우면 함께 사라집니다.

## 로컬 실행

Node.js 22 환경에서 실행합니다.

```bash
npm ci
npm run dev -- --port 3100
```

[http://127.0.0.1:3100](http://127.0.0.1:3100)을 열고 `/evaluate`에 공개 저장소 URL을 입력합니다. 기본 흐름에는 계정, Supabase 또는 모델 API 키가 필요하지 않습니다.

반복 시연이나 여러 사용자의 요청을 받을 때는 공개 GitHub API 허용량을 위한 서버 전용 토큰을 설정할 수 있습니다.

```text
GITHUB_TOKEN=<server-only token>
```

토큰은 브라우저에 전달되지 않으며 비공개 저장소 분석을 활성화하지 않습니다. 값을 저장소, 채팅 또는 로그에 넣지 마세요.

## Railway 배포

저장소의 `railway.toml`과 `Dockerfile`이 Next.js standalone 빌드, 시작 명령과 `/api/health` 검사를 정의합니다. Railway가 `PORT`를 주입하므로 기본 배포에 별도 DB나 파일 저장소가 필요하지 않습니다. 다중 방문 시연에는 서버 전용 `GITHUB_TOKEN` 설정을 권장합니다.

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

설치된 checkout에서는 로컬 Claude Code 세션의 구조적 활동을 별도 리포트로 만들 수 있습니다. 공개 저장소 리포트와 계약이 다른 선택 기능입니다.

```bash
npm run session:report -- --example
npm run session:report -- --project "C:/path/to/project" --out session-report.json
```

원문, 명령과 파일 경로는 요약에 포함하지 않습니다. 패키지는 아직 비공개이며 `npx myaiscore`가 게시됐다고 안내하지 않습니다.

## 설계와 신뢰 경계

- [공개 저장소 리포트 계약](docs/Assessment/REPOSITORY_REPORT.md)
- [ADR-0015: 로그인 없는 한국어 공개 저장소 리포트](docs/Architecture/ADR/0015-anonymous-korean-repository-reports.md)
- [ADR-0016: 한국어 기본·영어 전환](docs/Architecture/ADR/0016-persistent-korean-english-interface.md)
- [개인정보·보안 원칙](docs/Security/PRIVACY_SECURITY.md)

기여 에이전트는 [AGENTS](AGENTS.md) → [ROADMAP](docs/Development/ROADMAP.md) 순서로 현재 상태를 확인합니다.
