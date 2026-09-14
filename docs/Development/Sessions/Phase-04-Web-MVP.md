# Phase 4 — Astra·서브에이전트 웹 MVP 통합

## 2026-09-14 — 목표와 운영 전환

사용자가 Claude 세션에 프롬프트를 전달하는 대신 Astra가 구현·통합을 맡고 서브에이전트와 GitHub 이슈/브랜치로 진행하도록 지시했다. 기준은 `claude/local-collection-poc@3fa263b`. 원래 작업 폴더는 보존하고 독립 worktree를 만들었다.

| 작업 | GitHub 이슈 | 담당 브랜치 |
|---|---|---|
| 평가 실패·참조·입력 hash | [#1](https://github.com/SangJun-Pyo/MyAiScore/issues/1) | codex/evaluation-boundaries |
| 수집·질문·판정·작업서·모델 adapter | [#2](https://github.com/SangJun-Pyo/MyAiScore/issues/2) | codex/assessment-service |
| 한국어 웹·결과·비교 | [#3](https://github.com/SangJun-Pyo/MyAiScore/issues/3) | codex/web-experience |
| 통합·저장·CI·배포 준비·남은 실험 | [#4](https://github.com/SangJun-Pyo/MyAiScore/issues/4) | codex/web-mvp |
| Linear 다크 UI·Three.js 히어로 | [#5](https://github.com/SangJun-Pyo/MyAiScore/issues/5) | codex/web-experience + codex/evaluation-boundaries → codex/web-mvp |

Astra root가 API/저장·인증·예산·통합 테스트·문서를 담당했다. 각 서브에이전트는 담당 경로만 commit했고, root가 해당 commit을 통합했다. 핵심 경계는 별도 에이전트가 읽고 실패 사례를 재현했다. AI 검토이며 사람 fixture 검토가 아니다.

## 실제 구현

- Next.js 16.3.5 / React 19.3.0. 한국어 반응형 랜딩, 합성 예시, 동의와 입력, 질문 3개, 발급/보류, 근거 상세, 개선 작업서 복사, 공개 요약·철회·삭제, 재평가·비교.
- 실제 GitHub 수집을 서비스에 연결했다. 사용자 사례·발췌·답변은 해당 평가의 Evidence로 변환하며 `user_submission`과 한계를 유지한다. 로컬 수집 JSON 자동 업로드는 구현하지 않았다.
- Anthropic Messages adapter: 고정 endpoint, 서버 키/명시적 모델/활성화 필요, timeout·입출력 크기 제한, 정상 종료 JSON만 검증, 실제 wire hash·모델 ID·토큰 기록. 키 없을 때 mock으로 대체하지 않는다.
- 모델의 다섯 축 판단을 기존 validator와 scorer로 검증한다. 개선 작업서는 우선순위가 높은 미관찰/낮은 축을 선택하는 결정적 템플릿이다. 추가 모델 호출 없이 행동과 완료 체크를 제공한다.
- API는 동기 단계 실행, owner token 해시, private/public DTO 분리, Idempotency-Key, attempt/revision/deadline, 삭제 뒤 늦은 작업 무효화, 전역/소유자별 호출 상한을 구현했다.
- 로컬 FileStore와 Supabase REST CAS store, RLS SQL migration, standalone 시작 도구, Docker/Railway 설정, GitHub Actions CI를 추가했다. Supabase는 단일 JSON 문서 기반 소규모 구현이며 영속 인스턴스 실측은 하지 않았다.
- 비교는 동일 저장소·버전·모델·근거 출처·수집 범위 및 양쪽 점수 발급을 확인한다. 조건이 다르면 숫자 차이는 null이다. 행동 개선은 항상 `not_established`로 남긴다.

## 결함 수정과 독립 검토

- MAS-002/004/005: provider 동기/비동기 예외, 고아 답변/grounding, 실제 payload hash를 수정했다. core 원본 `0f77f9f`, 통합 `9076f5c`.
- MAS-006: 기존 events 제거만으로는 부족했다. JSON.parse 오류 메시지가 원문을 인용하는 경로를 synthetic 입력으로 독립 재현하고 고정 진단 문구로 변경했다. unknown record type 집계와 tool/path/timestamp metadata도 제한·마스킹했다. 통합 `c1209c9`, `38b297a`. 모든 개인정보 마스킹의 완전성을 인증한 것은 아니다.
- root API 초안에서 분석 중 DELETE가 막히는 문제, 인증 후 create의 idempotency 누락을 보정하고 회귀 테스트를 추가했다.
- 서비스의 provider 오류 코드가 재시도 가능성을 잃는 문제를 수정했다. 질문과 판정 사이 모델 변경도 거부한다.
- 실행 도구 독립 검토에서 `.env.local` 시작법, 최소 Docker 이미지에 없는 정리 CLI의 실행 위치를 문서에 보정했다. 평가 CLI는 출력 파일 존재·부모 경로·쓰기 권한을 유료 작업 전에 검사하도록 수정했다. 마지막 배타적 파일 생성도 유지한다.
- 소유 인증, 공개 요약, 실행 attempt fencing, Supabase CAS의 코드 경계를 별도 에이전트가 확인했다. 실제 서비스키·배포 계정은 사용하지 않았다.

## 실제 실행한 검증

- `npm run typecheck`: 통과.
- `npm test`: 통합 224 pass / 0 fail. 실제 모델 전역 예산 초과 시 호출 전에 차단되는 회귀까지 포함한다.
- `npm run build`: Next production build 통과.
- Playwright Chromium 데스크톱·모바일: 합성 예시, 접근 토큰 없음, 공유 결과 없음, synthetic API fixture를 사용한 입력→질문→결과 흐름 총 12건 통과. 브라우저의 전체 흐름은 합성 응답임을 명시하고, 서버 파이프라인은 별도 테스트로 검증했다. 초기 환경 실패는 해당 Playwright 버전의 브라우저 설치 후 해결했고, Next route announcer와 겹친 테스트 selector를 main 영역으로 한정했다.
- 실제 공개 `SangJun-Pyo/MyAiScore@c7b3a2e2c0bb1f78fb7602d251d42a60ba32d65d` 읽기 전용 수집: complete, 읽은 파일 40, Evidence 40, 모델 호출 0. 저장소 코드는 실행하지 않았다.
- 서비스/Anthropic transport 검증은 주입한 synthetic 응답으로 수행했다. 실제 외부 모델의 판정이나 비용 실측이 아니다.

## 다크 디자인과 3D 후속

사용자 후속 디자인 요청에 따라 Linear/Tokscale 계열의 다크 UI와 Three.js 장면을 추가했다. UI와 3D 컴포넌트는 별도 담당으로 나누었다. 3D는 자체 제작한 근거 연결망 장식이며 실제 분석 진행 표시가 아니다. 정적 SVG 대체, 모션 감소 설정, 화면 밖/탭 비활성 정지와 자원 정리를 포함한다. React 19.3과 R3F 9.7 peer 불일치 때문에 Three.js 0.186을 직접 지연 로딩한다. 기능/API 흐름은 유지한다.

통합 commit: Three.js `cd32573`, 다크 UI `6170bbf`. production build 통과 후 Chromium에서 실제 `data-renderer=webgl`을 확인했다. 기존 8개 브라우저 흐름에 모바일/데스크톱 모션 감소 및 WebGL 미지원 검사 4건을 더해 총 12건 통과했다. 최종 [데스크톱](../../../artifacts/web-mvp/desktop.png), [모바일](../../../artifacts/web-mvp/mobile.png), [합성 결과](../../../artifacts/web-mvp/example.png) 캡처를 직접 확인했다. 실제 모델 호출 없이 수행했다.

## 미실행과 다음 조건

1. 실제 API 제공사/모델/예산은 사용자 결정 전이다. Anthropic 연결 코드를 먼저 마련했지만 특정 모델 선택이나 유료 호출은 하지 않았다.
2. 실제 모델 정확도·재현성·프롬프트 인젝션 방어·fixture 사람 검토는 미수행. 점수 가중치/레벨 타당성은 교정 중이다.
3. 실제 Supabase migration/RLS/다중 인스턴스 실행, Docker 이미지 실행, Railway 배포는 미수행. 배포 설정 준비를 배포 완료라고 표시하지 않는다.
4. 실제 개인 세션을 추가 탐색·수집하지 않았다. 명시적으로 선택한 세션의 실제 호환성 실험은 별도다.
5. 결과 7일 접근 만료와 물리 삭제는 다르다. 신규 생성 시 만료분을 정리하며, 비활성 기간에도 정리하려면 prune CLI를 운영 스케줄러에 연결한다. 현재 상시 스케줄러는 없다.

## 인계

### 2026-09-14 — AGENTS/CLAUDE 공통 지침 연결

사용자가 어느 파일이 최신이며 두 도구가 최신 지침을 읽도록 적용됐는지 물었다. 확인 당시 두 파일의 마지막 변경은 모두 `6c9d563`이었으나 공통 규칙을 중복 보관했다. AGENTS를 공통 정본으로 명시하고 CLAUDE의 고유 구현 원칙을 보존·이동했다. CLAUDE는 공식 import 문법으로 같은 checkout의 AGENTS와 ROADMAP을 불러오게 바꿨다. Codex에는 AGENTS에서 ROADMAP을 작업 전에 디스크로 읽도록 명시했다.

공식 Codex/Claude 문서의 로딩 동작을 확인하고 실제 import 대상 경로와 Markdown 링크를 검사한다. 전역 설정, 앱의 프로젝트 연결, 이미 실행 중인 Claude 세션의 import 상태를 직접 변경하거나 로딩 실증했다고 주장하지 않는다. 기존 세션은 다시 읽거나 공용 폴더에서 새로 시작한다. 관련 [#11](https://github.com/SangJun-Pyo/MyAiScore/issues/11).

### 2026-09-14 — 공용 프로젝트 경로 동기화 누락 보완

사용자가 다른 에이전트와 공유하던 `C:/Users/sangj/MyAiScore/docs`가 갱신되지 않은 점을 지적했다. Astra는 worktree와 GitHub main만 갱신하고 공용 checkout 인계를 누락했다. 공용 경로는 clean이지만 `claude/local-collection-poc@f4f7012`였고, 원격 main은 `2b7d153`이었다.

로컬에만 남은 Claude의 문서 재검토 commit `f4f7012`를 통합 브랜치의 merge 부모로 보존한다. 원문 검토/CHANGELOG를 보존하면서 최신 BUGS/ROADMAP을 과거 상태로 되돌리지 않았다. 특히 당시 제한된 PASS와 이후 Astra의 파서/metadata 추가 수정은 구분했다. AGENTS/CLAUDE/워크플로에 공용 경로와 통합 후 동기화 절차를 명시했다. 문서만 복사하지 않고 코드·문서를 같은 main으로 갱신하며, 완료 여부는 공용 경로의 실제 HEAD/clean 상태로 확인한다. 관련 [#9](https://github.com/SangJun-Pyo/MyAiScore/issues/9).

### 2026-09-14 — ADR 누락 보완

사용자가 ADR 누락을 지적했다. 확인 결과 독립 ADR은 없었고 DECISIONS 8·9절과 이 세션에 요약만 있었다. Astra가 [ADR-0001~0006](../../Architecture/ADR/README.md)을 실제 merge `db0edd7`과 코드에 근거해 사후 작성했다. 과거 시점에 ADR을 작성했거나 모든 기술 선택에 사용자 개별 승인을 받았다고 표현하지 않는다. 현재 구현의 Accepted와 실제 모델/운영 검증은 구분했다.

모델 활성화, 단계 실행, 소유/공개 경계, 저장, 비교, Three.js 선택의 배경·대안·결과를 분리했다. DECISIONS에는 연결 요약을 두고 AGENTS/CLAUDE/AGENT_WORKFLOW의 완료 조건을 보완했다. 과거 Phase 0~3 전체 ADR 전환이나 앱 변경은 하지 않았다. 문서 링크·배치 검사와 Git diff 검사를 수행하며 관련 이슈는 [#7](https://github.com/SangJun-Pyo/MyAiScore/issues/7)이다.

통합 변경은 [PR #6](https://github.com/SangJun-Pyo/MyAiScore/pull/6)으로 올렸다. 로컬 검증은 위와 같으며 원격 Linux CI의 최신 결과는 PR의 Checks에서 확인한다. 배포와 실제 모델 교정은 [#4](https://github.com/SangJun-Pyo/MyAiScore/issues/4)에 남긴다.

`4606939`의 [Linux CI](https://github.com/SangJun-Pyo/MyAiScore/actions/runs/34843577726)가 전체 통과했다. 이후 390px 화면에서 장식 글로우가 2px 가로 overflow를 만드는 점을 보정했고, 최종 빌드·브라우저 12건을 다시 통과했다. 직접 계측도 `innerWidth=390`, `scrollWidth=390`이며 모바일 캡처를 갱신했다. 최종 후속 commit의 원격 결과는 PR Checks를 따른다.

현재 소스와 실행 방법은 [README](../../../README.md), wire 형태는 [API 계약](../../Architecture/API_DATA_CONTRACTS.md), 상태는 [ROADMAP](../ROADMAP.md), 남은 출시 조건은 GitHub #4에서 관리한다. 과거 Claude 프롬프트를 재실행하지 않는다. 이번 세션의 최종 commit은 `git log --follow -- docs/Development/Sessions/Phase-04-Web-MVP.md`로 확인한다.
