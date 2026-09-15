# MyAiScore

공개 GitHub 프로젝트와 AI 협업 근거를 읽고, 다섯 축의 진단과 다음 개선 행동을 제공합니다. 코드 품질이나 토큰 사용량으로 개인의 AI 실력을 인증하지 않습니다.

현재 랜딩은 ThreeUI Community Kage의 전체 페이지 구성을 참고해 소개·평가 흐름·5축·합성 결과·다음 행동을 장별로 안내합니다. 중립 차콜과 행동·선택용 코럴을 관련 작업 공간에도 적용하며, 자체 작성한 A–E 근거 검토 패널은 Illustrative preview로 표시합니다. 기존 Logic Core/WebGL은 퇴역하고 모션 감소 시 미리보기 등장 애니메이션도 생략합니다. [Kage 참조·적용 프롬프트](docs/UI/References/THREEUI_KAGE_LANDING_ADAPTATION.md), [현재 디자인 기준](docs/UI/DESIGN_SYSTEM.md) · [설계 결정](docs/Architecture/ADR/0011-consistent-assessment-design.md), [MIT 출처와 라이선스](public/third-party/threeui/NOTICE.md).

[현재 화면 캡처](artifacts/phase6-consistency/README.md) · [이전 #18 랜딩 기록](artifacts/phase6-english/README.md) · [구현·검증 기록](docs/Development/Sessions/Phase-06-English-Landing.md)

## 지금 실행하기

Node.js 22 이상이 필요합니다.

```bash
npm ci
npm run dev
```

브라우저에서 `http://127.0.0.1:3000`을 엽니다. 키 없이 영어 웹 화면과 **synthetic 결과 예시**를 볼 수 있습니다. 예시는 실제 평가가 아니며, 모델 미설정 시 실제 평가 버튼은 비활성입니다.

메뉴는 **Home / Profile / Insights / New assessment**로 나뉩니다. 프로필은 현재 탭의 평가 이력이며 로그인 계정이 아닙니다. 프로필은 핵심 이력과 빈 상태를 보여주며, Insights는 선택한 평가의 관찰·근거를 우선 보여주고 기준은 펼쳐 읽습니다. 새 평가는 단일 폼에서 선택적 사례를 입력합니다. 예시는 실제 이력에 저장되지 않습니다. 제품 UI와 서버 안내는 영어 전용이며 언어 전환기는 없습니다. 사용자 입력과 기존 평가 기록은 소급 번역하지 않습니다.

프로덕션 빌드는 `npm run build`로 만듭니다. 환경 변수 `MYAISCORE_ALLOW_FILE_STORE=true`를 명시한 단일 프로세스 미리보기는 `npm start`로 실행합니다. `.env.local`을 사용하는 프로덕션 미리보기는 `node --env-file=.env.local scripts/start.mjs`로 실행해야 합니다. 운영 저장소는 아래 Supabase 설정을 권장합니다. Next 개발 서버는 환경 파일을 읽지만 standalone 시작 도구와 일반 Node CLI에는 자동 적용되지 않습니다.

## 내 저장소 기능 시뮬레이션

디자인 추가 작업은 보류하고 [MyAiScore walkthrough](http://127.0.0.1:3000/walkthrough/myaiscore)에서 **실제 공개 저장소 스냅샷 → 스크립트 질문 3개 → 답변 없는 결과**를 확인합니다. 개발 서버 실행 후 열 수 있습니다. 페이지는 저장된 자료를 재생하므로 GitHub 재수집·모델 호출·소유 이력 생성을 하지 않습니다.

고정 SHA `5bd958b`에서 실제 수집한 285후보/40선정/34읽기와 partial 상태를 보여줍니다. 해석은 작성된 스크립트이며 실제 LLM 평가가 아닙니다. 협업 사례·발췌·답변을 꾸미지 않아 다섯 축 레벨과 총점은 null/withheld입니다. 기존 fully synthetic starter는 별도로 유지합니다. [수집·판정·제약 기록](docs/Development/Sessions/Phase-07-Repository-Walkthrough.md).

새 수집 기록을 생성하려면 `.data` 디렉터리를 먼저 만들고 **기존에 없는 출력 파일명**을 지정합니다.

```bash
node --import tsx scripts/buildMyAiScoreWalkthrough.ts --out .data/myaiscore-walkthrough-new.json
```

이 명령은 고정 저장소·SHA를 GitHub API로 다시 수집합니다. 오프라인 재생이나 바이트가 동일한 복제 명령이 아니며 기존 파일을 덮어쓰지 않습니다. 유료 모델 호출은 없습니다. 현재 바이트 예산 중복 집계 [#23](https://github.com/SangJun-Pyo/MyAiScore/issues/23)를 수정한 뒤 재수집하는 순서로 진행합니다. 기존 partial 결과를 정상 결과로 덮어쓰지 않습니다.

## 실제 평가 연결

[.env.example](.env.example)을 `.env.local`로 복사하고 **서버에서만** 다음을 설정합니다.

- `ANTHROPIC_API_KEY`: 서비스용 Anthropic API 키
- `ANTHROPIC_MODEL`: 해당 계정에서 사용할 정확한 모델 ID
- `MYAISCORE_ENABLE_LIVE=true`: 실제 요청 활성화

모델을 임의로 선택하거나 구독 플랜을 API 사용 권한으로 간주하지 않습니다. 실제 모델 호출은 비용이 발생할 수 있습니다. 기본 전역 상한은 UTC 날짜별 **모델 호출 시도 20회**, 소유자별 6회입니다. `MYAISCORE_DAILY_MODEL_CALL_LIMIT`는 호출 수 제한이며 달러 예산 보장이 아닙니다. 기본 평가는 질문/판정 두 호출이고 재시도도 상한에 포함됩니다.

흐름: GitHub URL·선택적 사례/마스킹한 발췌 → 자료 전송 동의 → 커밋 고정 수집 → 질문 3개 → 답변 또는 건너뛰기 → 축별 진단·점수 발급/보류 → 개선 작업서. 자료는 기본 비공개이며 공개 요약은 별도 동의로 만듭니다. 브라우저 탭의 접근 토큰을 잃으면 비공개 결과 복구 기능은 없습니다.

실제 모델용 HTTP adapter는 구현·모의 검증됐지만 **실제 유료 모델 호출, 판정 타당성 교정, 인젝션 방어 실험은 아직 미수행**입니다. 키를 넣었다는 사실만으로 서비스의 평가 정확성이 검증되지는 않습니다.

MyAiScore 공개 저장소의 실제 수집 1회와 파일 선정 보정은 [Phase 5 기록](docs/Development/Sessions/Phase-05-Profile-And-Live-Pilot.md)에 있습니다. 실제 점수를 발급한 실험은 아닙니다. 새 정책의 후속 수집과 스크립트 기능 확인은 Phase 7에 기록하며, 실제 모델 평가는 API/모델/예산 결정 후 진행합니다.

## 저장과 배포

- 개발: Git에서 제외한 `.data/`의 파일 저장. 같은 Node 프로세스 안에서만 쓰기 직렬화가 보장됩니다.
- 운영: [Supabase migration](supabase/migrations/202609140001_assessment_store.sql)을 적용하고 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 서버에 설정합니다. DB 실패 시 파일로 조용히 대체하지 않습니다.
- DB는 서버만 접근하는 RLS 테이블과 revision 기반 CAS를 사용합니다. 현재는 하나의 JSON 문서를 갱신하는 소규모 MVP 저장 방식이며 대규모 데이터·트래픽용 설계가 아닙니다.
- [Dockerfile](Dockerfile)과 [Railway 설정](railway.toml)을 제공합니다. 컨테이너는 `PORT`를 사용하고 `/api/health`가 liveness 경로입니다. 헬스 응답은 모델/DB 설정 검증을 의미하지 않습니다.
- 결과는 7일 뒤 접근이 만료됩니다. 완료 시 임시 분석 context를 제거하며, 만료 기록은 신규 생성 시 또는 `node --env-file=.env.local --import tsx scripts/pruneAssessments.ts`로 정리합니다. 이 CLI는 전체 소스와 `npm ci`가 있는 별도 운영 checkout에서 같은 Supabase 설정으로 실행합니다. 최소 Docker 런타임 이미지에는 이 스크립트와 tsx가 들어 있지 않습니다. 비활성 서비스의 물리 삭제 시점을 보장하려면 별도 checkout의 명령을 운영 스케줄러에 연결해야 합니다. 백업 보존은 DB 운영 설정에 따릅니다.

실제 Supabase 인스턴스·Docker 이미지 실행·Railway 배포는 아직 수행하지 않았습니다. 설정 파일 준비와 배포 완료는 구분합니다.

공식 참고: [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation), [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Railway 설정](https://docs.railway.com/config-as-code/reference).

## CLI와 검증

```bash
npm run typecheck
npm test
npm run check:docs
npm run build
npx playwright install chromium
npm run test:e2e
npm run evaluate -- --example
```

실제 평가는 대화형 터미널에서 환경 변수를 설정한 뒤 실행합니다. 전송 직전 `SEND` 입력을 요구하며 기존 출력 파일을 덮어쓰지 않습니다.

```bash
node --env-file=.env.local --import tsx scripts/evaluateRepository.ts --live --repo https://github.com/OWNER/REPO --out .data/result.json
```

출력 디렉터리는 실행 전에 만들어야 합니다(`mkdir .data`). 출력 파일은 기존 파일과 다른 이름을 사용하세요.

로컬 수집 PoC는 명시적으로 선택한 Claude Code 세션 파일만 읽습니다. 아직 자동 업로드나 npm 배포 기능은 없고, 웹에는 사용자가 검토한 발췌를 직접 붙여넣습니다. 마스킹은 알려진 패턴을 다루는 휴리스틱이므로 민감정보의 완전한 제거를 보장하지 않습니다. 실제 세션 호환성·사람 검토는 별도 검증 대상입니다.

```bash
npm run collect:local -- --project . --session fixtures/local-collection/basic-session.jsonl --json
```

## 작업 관리

상준님 환경의 공용 프로젝트는 `C:/Users/sangj/MyAiScore`이며 에이전트 인계 문서는 그 안의 `docs/`입니다. 별도 worktree는 작업을 분리하는 용도이고, 완료 후 코드와 문서를 함께 공용 checkout에 동기화합니다. 다른 환경에서는 이 저장소를 checkout한 루트의 AGENTS와 ROADMAP부터 읽습니다.

[GitHub 이슈](https://github.com/SangJun-Pyo/MyAiScore/issues)로 범위를 정하고 `codex/` 브랜치와 독립 worktree에서 구현·검토합니다. Astra가 통합을 담당하며 필요한 작업과 독립 검토는 서브에이전트에 맡깁니다.

- [현재 진행 상태](docs/Development/ROADMAP.md)
- [설계 결정 기록 ADR](docs/Architecture/ADR/README.md)
- [현재 기능 시뮬레이션](docs/Development/Sessions/Phase-07-Repository-Walkthrough.md), [영어 랜딩 작업](docs/Development/Sessions/Phase-06-English-Landing.md), [웹 MVP 기반](docs/Development/Sessions/Phase-04-Web-MVP.md)
- [개발 기록](docs/Development/Sessions/README.md), [결함](docs/Development/BUGS.md), [제품 정본](docs/00_MASTER_PLAN.md)
- 과거 문서와 프롬프트는 이력 자료이며 현재 실행 지시가 아닙니다.
