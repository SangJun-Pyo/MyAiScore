# ADR-0024 — 서버 재검증 기반 공개 리포지토리 리더보드

- 상태: Accepted
- 기록일: 2026-09-21
- 결정 주체와 근거: 회원가입 없이 공개 리더보드를 추가해 달라는 사용자 요청
- 기록 성격: 구현과 함께 기록
- 대체 관계: 없음. `/api/repository-report`(ADR-0015 등)의 익명 분석 파이프라인을 재사용하는 새 영구 저장 계층을 추가한다.

## 배경

지금까지 `/evaluate`는 로그인 없이 공개 GitHub 저장소를 분석하고, 결과를 서버에 남기지 않은 채 브라우저 `localStorage`에만 저장했다. 이번 요청은 "회원가입 없이" 저장소 점수를 비교할 수 있는 공개 리더보드를 원했고, 이는 두 가지 새로운 성격의 결정을 요구한다.

1. **영구 저장소 추가.** 리더보드는 여러 사용자가 공유해서 보는 화면이므로 브라우저 저장으로는 성립하지 않는다. 프로젝트에는 이미 레거시 평가 기능이 쓰는 Supabase 기반 `myaiscore_state` 스토어(단일 JSONB, PostgREST/fetch 접근)가 있지만, 이는 별도 제품(Anthropic API 기반 평가)의 소유 데이터이므로 리더보드 테이블을 얹으면 두 기능의 저장 책임이 섞인다. Railway에 별도 Postgres 플러그인을 추가하고 `pg`(node-postgres)로 접근하는 편이 두 기능의 저장 계층을 분리해서 유지한다.
2. **익명 공개 데이터의 위조 방지.** 인증이 없으므로 클라이언트가 임의의 `{repo, score}`를 보낼 수 있다. 이미 있는 `generateRepositoryReport`/`repositoryReportAdmission`/`normalizeAndValidateRepoUrl` 파이프라인이 URL 검증, GitHub 요청 예산, 동시성 제한을 갖추고 있으므로 이를 재사용해 서버가 직접 재수집·재계산한 값만 저장하면, 클라이언트가 보내는 값은 "어떤 저장소를 리더보드에 올릴지"라는 의사만 전달하고 점수 자체는 절대 신뢰하지 않을 수 있다.

## 결정

- **저장:** Railway Postgres(`DATABASE_URL`)에 `leaderboard_entries` 단일 테이블(`migrations/railway/202609210001_leaderboard.sql`)을 만든다. 기본키는 `(owner, repo)`이며, GitHub의 저장소 대소문자 비구분 특성에 맞춰 저장 키는 소문자로 정규화한다. 같은 저장소를 다시 제출하면 최신 재검증 결과로 덮어쓴다 — "한 번 딴 최고점을 영구 보존"이 아니라 "지금 저장소에 남아 있는 신호"라는 제품 전제와 일치시키기 위해서다. `src/server/leaderboard/store.ts`가 `pg.Pool`을 감싸 `leaderboardConfigured`/`upsertLeaderboardEntry`/`listLeaderboard`/`recentlySubmitted`를 제공하며, `DATABASE_URL`이 없으면 즉시 `leaderboard_not_configured`로 실패해 배포 환경에 DB가 없어도 나머지 기능은 그대로 동작한다.
- **API:** `src/server/web/api.ts`에 `leaderboard` 리소스를 추가한다. `GET /api/leaderboard`는 점수 내림차순으로 목록을 반환한다. `POST /api/leaderboard`는 `repo_url` 문자열 하나만 받고, 서버가 `normalizeAndValidateRepoUrl` → `repositoryReportAdmission` → `generateRepositoryReport`를 그대로 실행한 뒤 그 결과만 `upsertLeaderboardEntry`로 저장한다. 클라이언트가 보낸 점수·프로필 값은 요청 본문에 존재하지 않으므로 애초에 신뢰할 방법이 없다. 같은 저장소의 60초 재제출은 `recentlySubmitted`로 막아, 이미 존재하는 admission 한도와 별개로 리더보드 갱신 남용을 줄인다.
- **공개는 항상 선택.** `/evaluate` 결과 화면에 "리더보드에 공개" 버튼을 별도로 추가했다(`RepositoryExperience.tsx`). 분석 자체는 지금처럼 아무것도 공개하지 않고, 이 버튼을 눌러야만 서버가 재검증 후 리더보드에 올린다. 새 `/leaderboard` 페이지(`src/app/leaderboard/page.tsx`)는 목록만 읽어서 보여주는 읽기 전용 화면이다.

## 대안

- **클라이언트가 보낸 점수를 그대로 저장:** 구현은 가장 단순하지만 인증이 없는 한 임의 조작을 막을 방법이 없다. 기각.
- **기존 Supabase `myaiscore_state`에 리더보드 행 추가:** 레거시 평가 기능과 저장 스키마·마이그레이션 이력이 섞인다. 두 기능은 이미 서로 다른 제품이므로 분리를 유지한다.
- **분석 시 자동 공개(선택 없이 전체 공개):** 사용자가 분석해 본 모든 저장소가 원치 않게 공개될 수 있다. 사용자가 명시적으로 답한 대로 옵트인만 채택.
- **저장소당 최고 점수 영구 보존:** 리포지토리가 실제로 퇴보해도 리더보드에는 과거의 좋은 점수가 남아 "지금의 신호"라는 제품 전제와 어긋난다. 재제출 시 항상 최신 상태로 덮어쓰는 쪽을 채택.

## 결과와 재검토 조건

- 얻는 점: 별도 회원가입 없이 공개 저장소 신호를 비교할 수 있는 화면이 생기고, 저장되는 점수는 항상 서버가 직접 재계산한 값이라 클라이언트 위조로부터 안전하다.
- 비용/제약: Railway에 Postgres 플러그인과 `DATABASE_URL` 설정이 추가로 필요하다(운영자가 직접 프로비저닝하고 마이그레이션 SQL을 1회 실행해야 한다 — 이 저장소 코드는 자동으로 실행하지 않는다). 리더보드 제출은 일반 리포트 생성과 동일한 GitHub 요청 예산을 공유하므로, 트래픽이 늘면 `repositoryReportAdmission`의 기존 한도(토큰 있을 때 5회/5분, 없을 때 1회/시간)에 그대로 걸린다 — 별도 완화는 하지 않았다.
- 재검토 조건: 리더보드 트래픽이 일반 분석 요청과 GitHub 예산을 다투기 시작하면 리더보드 전용 admission 풀을 분리하는 걸 검토한다. 악용(대량의 낮은 가치 저장소 스팸)이 관측되면 최소 점수 기준이나 저장소 나이 조건을 추가하는 걸 검토한다.

## 근거와 검증 상태

구현: `src/server/leaderboard/store.ts`(신규), `migrations/railway/202609210001_leaderboard.sql`(신규), `src/server/web/api.ts`의 `leaderboard` 리소스 라우트, `src/components/RepositoryExperience.tsx`의 옵트인 버튼과 `RepositoryLeaderboardExperience`, `src/app/leaderboard/page.tsx`(신규), `.env.example`의 `DATABASE_URL` 문서화, `package.json`의 `pg`/`@types/pg` 추가.

정리 브랜치에서는 최신 main 위에 기능 커밋만 다시 적용하고, `pg` 의존성과 `package-lock.json`을 함께 갱신했다. `npm run typecheck`, `npm test`, `npm run check:docs`, `npm run build`, `git diff --check`로 코드와 문서를 검증한다. 실제 Railway Postgres 인스턴스 생성, `DATABASE_URL` 설정, `leaderboard_entries` 마이그레이션 실행은 저장소 소유자의 운영 환경에서 별도로 수행해야 한다.
