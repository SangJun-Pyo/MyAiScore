# Development Session — Phase 3: 로컬 협업 기록 수집 PoC

- 일자 / 담당 / 검토자: 2026-09-20 / Claude Code(구현) / Astra AI(설계·판단, 검토 대기)
- 상태: **구현·오프라인 검증 완료 / Astra 코드 검토 대기**
- 시작 commit: `c7b3a2e`(브랜치 `codex/document-governance` HEAD 기준). 이 세션의 변경은 별도 브랜치 `claude/local-collection-poc`에 남긴다.

## 목표와 작업 범위

`MVP_SCOPE.md`가 보류한 **Local Evidence Mode**를 정식 MVP 편입이 아니라 **제한된 로컬 수집 PoC 1건**으로 좁혀 재검토한다(사용자·Astra 합의, [DECISIONS](../DECISIONS.md) §7). 제품 가설:

> "사용자가 선택한 AI 협업 기록을 코드 변경과 연결하면, GitHub 저장소만 분석할 때보다 구체적인 개선 피드백을 만들 수 있는가?"

사용자 제공 기록의 진위는 인증하지 않는다. AI 생성 코드 탐지·개인 역량 인증·조작 방지 보장은 범위 밖이다. 전체 MVP를 CLI 제품으로 전환하지 않으며, 기존 기획 문서를 다시 쓰지 않는다.

이번 범위:
1. Claude Code 협업 세션 1개를 읽는 로컬 수집기(프로젝트 경로·세션 파일 경로 명시적 입력, 자동 탐색 없음, npm 미배포)
2. 요청/제안/도구 호출·결과/사용자 발화 구분 추출 — 로그 사실과 수집기 추론을 구분
3. 프로젝트 코드와의 연결(경로 기반, 인과관계 아님)
4. 기존 Evidence 계약에 연결(adapter, 계약 확장 없음)
5. 로컬 미리보기(포함/제외/마스킹/연결/미확인)

MAS-002/004/005([BUGS](../BUGS.md))는 이 PoC와 무관하게 **미해결 상태를 그대로 유지**한다. 이 PoC는 `assembleEvaluationInput`/provider/judgement/scoring 파이프라인을 전혀 호출하지 않으므로(Evidence 생성까지만 검증) 그 결함들과 코드 경로가 겹치지 않는다 — 유일한 공유 코드는 `src/server/evaluation/fixtureRoot.ts`의 `resolveWithinRoot`(경로 이탈 차단, R3에서 이미 검증된 순수 함수)와 `src/server/ingestion/redact.ts`의 `redactSecrets`(비밀 마스킹, Phase 1부터 검증된 순수 함수)뿐이며 둘 다 MAS-002/004/005와 무관하다.

## 실제 구현 / 수정한 파일

### 실제 세션 파일 구조 확인 (구현 전 선행 조사)

임의로 형식을 가정하지 않고, 이 프로젝트 자체의 실제 Claude Code 세션 파일(`~/.claude/projects/C--Users-sangj-MyAiScore/*.jsonl`, 786줄짜리 실제 세션 1개)을 구조만 검사해(레코드 `type`·`message.content` 블록 종류·`file-history-delta` 필드) 실제 스키마를 확인했다. 원문 내용은 채팅에 요청하지 않았고, 이 세션 자체를 만든 것은 이번 대화의 이전 작업(Phase 1/2)이라 신규 개인정보 노출이 아니다. 확인한 실제 구조:

- `type: "user"` / `"assistant"`: `message.content`는 문자열이거나 `{type:"text"}` / `{type:"thinking"}` / `{type:"tool_use", id, name, input}` / `{type:"tool_result", tool_use_id, content, is_error}` 블록 배열
- `type: "file-history-delta"`: `{trackingPath, timestamp, backup:{backupTime, realParentDir}}` — 세션 중 추적된 파일 경로의 실제 신호
- 그 외(`system`, `file-history-snapshot`, `attachment`, `mode`, `permission-mode`, `atis-latch`, `last-prompt`, `ai-title`)는 이번 PoC가 쓰지 않는 세션/UI 메타데이터로 확인, 파싱 대상에서 제외

지원 범위는 **위에서 실제로 관찰한 구조에 한정**했다(문서 추정 아님). `backup.backupFileName`처럼 별도 백업 저장소를 가리키는 필드는 그 저장 위치를 확정할 수 없어 이번 범위에서 읽지 않았다(작은 구현 선택, 근거: 확인되지 않은 위치를 추정해 접근하지 않음).

### 신규 파일

| 파일 | 역할 |
|---|---|
| `src/server/localCollection/sessionRecordTypes.ts` | 위에서 확인한 실제 JSONL 레코드 타입(문서가 아닌 관찰 기반) |
| `src/server/localCollection/parseSessionFile.ts` | JSONL 파싱. 줄 단위 손상은 건너뛰고 보고(`malformedLines`), 인식 가능한 타입이 하나도 없으면 `SessionParseError(unsupported_format)`, 200MB 크기 상한 |
| `src/server/localCollection/extractCollaborationEvents.ts` | 레코드 → `user_message`/`assistant_text`/`tool_call`/`file_touch` 구조적 이벤트. `tool_use`와 `tool_result`를 `tool_use_id`로 매칭하고, 없으면 `no_result_found`(성공으로 추정하지 않음). "검증 명령처럼 보임"은 `inferred.looksLikeVerificationCommand`로 별도 표시해 로그 사실과 분리 |
| `src/server/localCollection/connectToRepoEvidence.ts` | 세션이 건드린 파일 경로를 프로젝트에 연결. `resolveWithinRoot`(기존 R3 코드 재사용)로 프로젝트 루트 밖 경로를 차단. "GitHub 수집 evidence 후보와 경로 일치" / "지금 작업 트리에 존재" / "지금 존재하지 않음" / "루트 밖"을 별도 상태로 구분(인과관계 주장 없음) |
| `src/server/localCollection/toEvidence.ts` | 이벤트 → 기존 `Evidence` 계약(계약 확장 없음). `sourceType:"user_provided_excerpt"`, `collectionMethod:"user_submission"` 고정 — GitHub 확인 근거(`repo_static`/`repo_history`)와 표기상 구분. 원문(마스킹·2,000자 절단, `redactSecrets` 재사용)은 `Evidence`가 아니라 별도 `analysisContext` 맵에만 저장(R3와 동일 패턴) |
| `src/server/localCollection/collectLocalSession.ts` | 위 전부를 묶는 오케스트레이션. 프로젝트 경로·세션 파일 경로만 입력받고 그 외 탐색 없음 |
| `scripts/collectLocalSession.ts` | 개발용 CLI(`npm run collect:local -- --project <dir> --session <file> [--json]`). npm 배포 안 함 |
| `fixtures/local-collection/*.jsonl` (7개) | synthetic 세션 샘플(정상, 손상, 미지원 형식, 도구 결과 없음, 비밀값 포함, 인젝션 문구 포함, 프로젝트 밖 경로) — 실제 대화 원문 아님 |

### 수정한 계약

없음. `src/shared/contracts/evaluation.ts`의 `Evidence` 타입은 그대로 재사용했다 — `sourceType: "user_provided_excerpt"`, `path`/`locator`의 null 허용, `verificationNote` 자유 텍스트 필드가 이미 이번 요구를 전부 표현할 수 있었다. 계약 확장이 필요 없었던 이유를 이 문서에 남긴다(변경 없음도 결정이므로).

## 결정과 근거

- 로컬 기록은 항상 `user_provided_excerpt`로만 표기하고 `repo_static`/`repo_history`를 쓰지 않는다 — GitHub에서 직접 확인한 근거와 절대 혼동하지 않는다는 지시를 타입 수준에서 강제.
- 파일 경로 연결은 "경로가 같다"는 사실과 "그 경로가 지금 존재한다"는 사실을 별도 상태로 분리하고, 어느 쪽도 "이 세션이 이 코드를 만들었다"고 말하지 않는다.
- 도구 호출 결과가 없으면(`no_result_found`) 성공도 실패도 아닌 제3의 명시적 상태로 남긴다. "검증 명령처럼 보이는 패턴"은 항상 `inferred`로 표시해 로그에 없는 결론(테스트 통과)을 만들어내지 않는다.
- 원문은 영구 `Evidence`가 아니라 일시적 `analysisContext`에만 둔다(Phase 2 R3와 동일 원칙 재사용) — 별도 설계를 새로 만들지 않고 이미 검증된 패턴을 재사용한 근거.
- git commit 상관관계(예: 특정 커밋이 이 세션과 관련 있다는 추정)는 이번 범위에서 구현하지 않았다 — 정확도가 낮은 휴리스틱을 추가하기보다 "파일 경로 일치"라는 더 단순하고 확실한 신호만 먼저 검증하는 편을 택했다(작은 구현 선택).

## 실제 검증 명령·결과·산출물

모두 이번 세션에서 실제로 실행했다(mock/live 구분: 전부 offline, 실제 LLM 호출 없음).

```
npm run typecheck   # 통과, 0 에러
npm test             # 166 pass, 0 fail (기존 142 + 신규 24)
```

CLI 실행(실제로 실행함, synthetic 프로젝트/세션 대상):

```
npx tsx scripts/collectLocalSession.ts --project <synthetic temp dir> --session fixtures/local-collection/basic-session.jsonl
npx tsx scripts/collectLocalSession.ts --project <synthetic temp dir> --session fixtures/local-collection/corrupted-session.jsonl
npx tsx scripts/collectLocalSession.ts --project <synthetic temp dir> --session fixtures/local-collection/unsupported-format.jsonl
npx tsx scripts/collectLocalSession.ts --project <synthetic temp dir> --session fixtures/local-collection/basic-session.jsonl --json
```

결과: 정상 세션은 근거 7개 생성(사용자 발화 2, AI 응답 2, 도구 호출 2, 파일 변경 추적 1) + 파일 경로 1개 연결(`path_exists_in_working_tree_now`). 손상된 세션은 손상 줄 2개를 보고하고 나머지 정상 줄은 그대로 파싱(exit 0). 미지원 형식은 명시적 오류로 종료(exit 1). `--json` 출력은 `JSON.parse`로 파싱 가능한 단일 JSON 문서임을 확인. 산출물: `artifacts/local-collection-poc/*.txt`, `*.json`.

## 발견한 결함과 해결 상태

이번 세션에서 새로 발견한 결함 없음. 기존 MAS-002/004/005는 위 "목표와 작업 범위" 절에서 설명한 대로 이번 PoC와 코드 경로가 겹치지 않아 그대로 둔다.

## 미검증·남은 작업·인계

- **실제 Claude Code 세션 파일과의 호환성은 미검증이다.** 사용자가 명시적으로 선택한 실제 세션 파일이 이번 프롬프트에 지정되지 않았으므로, 구조 조사(위 절)만 실제 파일로 하고 파서 자체의 입출력 검증은 synthetic 샘플로만 했다. 실제 세션 파일의 `content` 블록 종류·중첩·인코딩이 관찰 범위를 벗어날 가능성이 있다(예: 이미지 첨부, 서브에이전트 sidechain 메시지 — `isSidechain` 필드가 관찰됐으나 이번 구현은 이를 별도 처리하지 않고 동일하게 추출한다).
- git commit 상관관계, 여러 세션 통합, 실제 CriterionResult/질문 생성 파이프라인 연결(Task 2a/3)은 하지 않았다 — 이번 범위는 Evidence 생성까지다.
- 사람 검토 없음. `humanReviewed` 개념이 적용될 fixture 계약은 이번 산출물에 없다(synthetic 세션 파일에는 `provenance.json`류 메타데이터를 별도로 만들지 않았다 — 필요하면 후속 세션에서 결정).
- MAS-002/004/005는 여전히 열려 있으며 이번 세션에서 다루지 않았다.

## 독립 검토자가 확인할 파일과 재현 방법

- 신규 소스: `src/server/localCollection/*.ts` (6개), `scripts/collectLocalSession.ts`
- 신규 테스트: `tests/localCollection/*.test.ts` (5개 파일, 24개 테스트)
- 신규 fixture: `fixtures/local-collection/*.jsonl` (7개, synthetic)
- 재현: `npm run typecheck && npm test`(166 pass 확인), 이어서 임의 임시 디렉터리를 프로젝트로 지정해 `npx tsx scripts/collectLocalSession.ts --project <dir> --session fixtures/local-collection/basic-session.jsonl` 실행
- 브랜치: `claude/local-collection-poc` (base: `codex/document-governance`의 `c7b3a2e`)

## 변경·검토·커밋 기록

- `1a11fa14f04ad6ec5316352b8c93ac238539a103` — `feat: local collaboration session collection PoC` (브랜치 `claude/local-collection-poc`, base `codex/document-governance`@`c7b3a2e`). 이번 절에 기록한 신규 파일·테스트·문서 동기화 전부 포함.
- `5978210` — `docs: record commit hash in Phase 3 session log`. 위 commit hash를 이 문서에 기록만 함.

**독립 검토 대상은 `claude/local-collection-poc`의 `5978210`으로 고정한다.** 검토 대기 중에는 이 브랜치의 기존 구현 파일을 추가로 수정·리팩터링하지 않는다. 아래 두 절(2026-09-20 후속)은 검토 문서를 되돌리거나 검토 대상 commit의 내용을 바꾸지 않는, 별도의 문서 전용 추가 기록이다.

---

## 2026-09-20 (후속) — "실제 Claude Code 세션 구조 조사"의 정확한 범위

완료 보고에 "실제 세션 파일 구조를 확인했다"고 적은 부분을, 이번 대화에서 실제로 실행한 명령과 그 출력만 근거로 다시 명확히 남긴다. 확인할 수 없는 부분은 추측하지 않고 **미확인**으로 표시했다. 이 절을 쓰기 위해 추가로 대화 기록을 탐색하지 않았다 — 이번 세션 자체의 실행 기록만 사용했다.

### 조사한 범위와 파일 선택 방식

- `~/.claude/projects/C--Users-sangj-MyAiScore/` 디렉터리를 `ls`로 나열해 그 안에 있던 파일 2개를 확인했다: `40443ef2-461f-4776-a0f8-0df7075b3ed2.jsonl`(786줄, 완료된 과거 세션으로 추정 — 크기가 고정돼 있었음)과 `d46ec752-2e72-48b9-81c4-8cd34eac316e.jsonl`(당시 계속 커지고 있던 파일 — 이 대화 자신의 진행 중 세션으로 추정, `scratchpad` 경로에 같은 ID가 등장했음).
- 구조 조사에는 **`40443ef2-...jsonl` 한 개만** 사용했다. 선택 기준은 명시적인 규칙(예: "가장 오래된 것", "가장 완전한 것")을 미리 세운 것이 아니라, 나열된 두 파일 중 진행 중이 아닌 쪽을 고른 것이다 — 이 선택 기준 자체가 이번 PoC가 사용자에게 요구하는 "명시적 지정"과 다르다는 점을 분명히 남긴다. 실제 배포/사용 시나리오에서는 이런 임의 선택이 아니라 사용자가 직접 파일을 지정해야 한다.
- 조사 방법: Node.js로 그 파일을 줄 단위로 읽어 (a) 전체 줄 수, (b) `type` 필드별 개수, (c) 최초 등장하는 레코드의 최상위 키 이름, (d) `message.content` 배열 안 블록의 `type` 종류별 개수, (e) `tool_use`/`tool_result` 블록의 **키 이름과 타입**(값 자체는 최대한 배제), (f) `file-history-delta`/`file-history-snapshot` 레코드의 필드 이름과 그중 1개 샘플의 전체 내용을 출력했다.

### 원문을 복사하거나 저장했는지

- **사용자/AI 메시지의 실제 텍스트 내용(`text`/`thinking` 블록의 문자열 값, `tool_use.input.command` 같은 실행 명령 문자열, `tool_result.content` 문자열)은 한 번도 출력하지 않았다.** 문자열 값이 필요한 곳에서는 `typeof`/길이(숫자)/키 이름만 출력하도록 스크립트를 작성했다(예: 사용자 메시지는 "content length: 281"처럼 길이만 출력).
- **예외적으로 실제 값을 그대로 출력한 것은 두 곳이다**: (1) `file-history-delta` 샘플 1개를 `console.log(fhd)`로 통째로 출력해, 그 안의 `trackingPath`(예: `"00_MASTER_PLAN.md"`)와 `backup.realParentDir`(예: `"C:\\Users\\sangj\\MyAiScore"`), `backup.backupFileName`(내부 백업 식별자 문자열 `"7a05149ea733a65d@v1"`)이 그대로 출력됐다. (2) 세션이 추적한 파일 경로 목록(distinct `trackingPath`, 최대 20개)을 그대로 출력했다 — 전부 이 저장소 자신의 문서 파일 상대경로였다(`docs/00_MASTER_PLAN.md`, `README.md`, `CLAUDE.md` 등, 전부 이미 이 Git 저장소에 공개돼 있는 파일명).
- 이 출력들은 **이번 대화의 도구 호출 결과로만 나타났고**, 별도 파일로 저장하지 않았다. 조사에 사용한 3개의 임시 Node 스크립트는 OS 임시 디렉터리(스크래치패드, 이 저장소 밖)에 작성했다가 조사 직후 삭제했다 — Git 이력에 남지 않는다.
- 결론: 대화·제안·의사결정 같은 **협업 내용 원문은 노출되지 않았다.** 노출된 것은 (a) 파일 경로/디렉터리 경로 같은 구조적 메타데이터와 (b) 내부 백업 식별자 문자열 1개이며, 전부 이미 이 저장소에 공개된 파일명이거나 사용자 자신의 로컬 경로다. 다만 이 출력이 **이번 대화 자체의 기록(트랜스크립트)에는 남아 있다** — 이 점은 사실대로 밝힌다.

### Git에 포함된 자료가 모두 synthetic인지

- `fixtures/local-collection/*.jsonl` 7개는 위 조사에서 확인한 **스키마(필드 이름과 구조)만** 참고해 이번 세션이 새로 작성한 예시 문장(예: "validateOrderTotal 함수에 음수 총액 검증이 빠진 것 같아요")으로 채운 것이다. 실제 세션에서 관찰한 실제 문자열 값을 복사해 넣은 곳은 없다 — 위 절에서 밝혔듯 실제 문자열 값 자체를 애초에 확보하지 않았기 때문이다.
- `artifacts/local-collection-poc/*.txt`, `*.json`은 이 synthetic fixture와 이번 세션이 임시로 만든 synthetic 프로젝트(코드 한 줄짜리 `validateOrderTotal.ts`)를 대상으로 CLI를 실행한 출력이다. 실제 세션 내용은 들어 있지 않다.
- 위 두 가지를 근거로 **"Git에 포함된 로컬 수집 관련 자료는 모두 synthetic이다"**라고 확인한다. 이 확인은 이번 세션이 실제로 작성/실행한 명령 기록에 근거하며, 별도로 파일 diff를 다시 열어 대조하지는 않았다 — 필요하면 독립 검토자가 `git show 1a11fa1 -- fixtures/local-collection/ artifacts/local-collection-poc/`로 직접 재확인할 수 있다(미확인 항목으로 남김: 이 재확인 자체는 아직 수행하지 않았다).

## 2026-09-20 (후속) — 실제 세션 1건 실험 계획 (아직 실행하지 않음)

독립 검토 대기 중 작성. **아래는 계획 문서일 뿐이며, 이번 절 작성을 위해 실제 세션을 찾아 읽거나 실험을 실행하지 않았다.** 외부 전송·실제 LLM 호출·배포도 하지 않았다. 실행은 검토 완료 후, 사용자가 실제로 프로젝트와 세션 파일을 지정했을 때만 한다.

### 1. 사용자가 프로젝트와 세션 파일을 명시적으로 지정하는 방법

- 프로젝트 경로: 분석 대상 프로젝트의 루트 디렉터리 절대경로(예: `C:/Users/<user>/MyProject`).
- 세션 파일 경로: Claude Code 세션은 `~/.claude/projects/<프로젝트 경로를 인코딩한 이름>/<세션 UUID>.jsonl`에 저장된다(이번 조사로 확인한 실제 경로 패턴). 사용자는 이 폴더에서 자신이 지정하려는 세션의 파일 하나를 **직접 골라 전체 경로를 알려준다** — 수집기가 이 폴더를 자동으로 뒤지지 않는다.
- 여러 세션이 있을 경우 어떤 것을 고를지는 사용자의 판단이다(예: 특정 기능을 작업한 날짜). 이번 PoC는 "가장 최근" 같은 자동 추정 규칙을 두지 않는다 — 위 절에서 밝혔듯 조사 단계의 임의 선택은 실제 사용 절차의 모범이 아니었다.

### 2. 원본을 수정하지 않고 로컬에서 수집·미리보기를 실행하는 명령

```
npx tsx scripts/collectLocalSession.ts --project <프로젝트 절대경로> --session <세션 .jsonl 절대경로>
```

- 이 명령은 두 경로 모두 **읽기 전용**으로만 연다(`readFileSync`/`existsSync`/`statSync`만 사용, 쓰기 API 호출 없음 — `src/server/localCollection/*.ts`에 파일 쓰기 함수가 없음을 코드로 확인 가능).
- 원본 세션 파일이나 프로젝트 파일에 어떤 변경도 가하지 않는다. 실행 결과는 터미널 화면에만 출력된다(사람이 읽는 텍스트가 기본, `--json`을 붙이면 구조화된 JSON).
- 실행 전에 `git status`로 프로젝트가 clean한지 확인하고, 실행 후 다시 `git status`로 아무 파일도 바뀌지 않았음을 대조하는 절차를 권장한다(이 PoC가 그렇게 동작해야 한다는 코드상의 보장과, 실제로 그런지 사람이 관찰로 재확인하는 것은 다른 문제이므로).

### 3. 민감정보와 제외 항목을 확인하는 절차

미리보기 출력의 아래 섹션을 **실행 직후, 다른 작업 전에** 반드시 사람이 읽는다:

1. `-- 비밀 패턴이 마스킹된 근거 --`: 여기 나열된 근거 ID의 원문(analysisContext)을 열어, 마스킹이 실제로 비밀을 지웠는지(과소 마스킹) 또는 비밀이 아닌 것을 지나치게 지웠는지(과다 마스킹, 오탐) 확인한다.
2. `-- 제외된 항목 --`: 빈 텍스트로 제외된 항목 중 실제로 의미 있는 내용(예: 공백만 있는 것처럼 보이지만 실제로는 첨부 파일 참조였던 경우)이 있는지 확인한다.
3. `-- 파일 경로 연결 --`: `outside_project_root`로 표시된 경로가 실제로 이 프로젝트와 무관한지, 혹시 프로젝트 루트 자체를 잘못 지정해서 생긴 오탐인지 확인한다.
4. 위 세 가지를 확인하기 전까지는 이 출력을 어떤 평가 파이프라인에도 연결하지 않는다(이번 PoC는 애초에 연결하지 않지만, 향후에도 이 순서를 지킨다).

### 4. GitHub 코드만 볼 때보다 추가로 확인할 수 있는 협업 행동 (실제 세션으로 검증 전, 기대값)

이번 구현이 구조적으로 추출 가능하다고 확인한 것은 아래와 같다(synthetic 데이터로 확인, 실제 세션으로는 미확인):

- 하나의 요청에 대해 AI가 **어떤 순서로** 무엇을 제안했는지(텍스트) 와 **어떤 도구를 실제로 호출했는지**의 시간 순서.
- 도구 호출이 **실제로 결과를 남겼는지**(`tool_reported_ok`/`tool_reported_error`/`no_result_found`) — GitHub 최종 코드만 보면 알 수 없는, "시도했지만 결과가 확인 안 됨" 상태.
- 어떤 명령이 검증처럼 보이는 패턴(`npm test` 등)과 일치했는지(추정 표시 — 실제 통과 여부 아님).
- 세션이 어떤 파일 경로를 반복적으로 건드렸는지(`file-history-delta`) — 최종 diff만으로는 안 보이는, 과정 중 시도 흔적.

실제 세션 1건으로 이 항목들이 실제로 유용한 신호인지(예: 노이즈가 너무 많은지, 위 항목들이 실제로 GitHub-only 분석보다 더 구체적인 개선 피드백으로 이어지는지)는 **아직 검증되지 않았다** — 이것이 실험의 목적이다.

### 5. 누락·오연결·과장된 해석을 사람이 확인할 체크 항목

실제 세션으로 실행한 뒤, 사람이 출력을 보며 아래를 하나씩 확인한다:

- [ ] **세션 소속 확인**: 이 세션이 정말 지정한 프로젝트에서 진행됐는가(레코드의 `cwd` 필드가 실제 프로젝트 경로와 일치하는지 — 세션이 여러 프로젝트를 넘나들었을 경우 무관한 항목이 섞이지 않았는지).
- [ ] **파일 경로 연결의 실질성**: `path_referenced_in_repo_evidence`/`path_exists_in_working_tree_now`로 표시된 경로가 실제로 그 협업 행동과 관련 있는 파일이 맞는지(우연한 동명이인 경로가 아닌지).
- [ ] **"검증처럼 보임" 표시의 오독 방지**: `looksLikeVerificationCommand`나 `tool_reported_ok` 문구를 보고 "테스트가 실제로 통과했다"고 과장해서 읽지 않았는지 — verificationNote 원문이 그렇게 말하지 않는지 대조.
- [ ] **누락 확인**: 실제로 있었던 중요한 도구 호출/파일 변경이 출력에서 빠지지 않았는지(지원 범위 밖 콘텐츠 블록 종류가 있었는지 — 위 "미검증·남은 작업" 절의 이미지 첨부·sidechain 메시지 등).
- [ ] **마스킹 과소/과다**: 비밀 패턴 마스킹이 실제 비밀을 놓쳤거나(과소), 비밀이 아닌 일반 텍스트를 지나치게 가렸는지(과다).
- [ ] **인용의 정직성**: Evidence의 `verificationNote`가 실제로 확인된 것과 확인되지 않은 것을 정확히 구분해서 말하는지, 확인 안 된 것을 확인된 것처럼 표현하지 않는지.
- [ ] **손상/미지원 처리**: 세션 파일에 이번 구현이 다루지 않는 레코드/블록 종류가 있었다면, 그것이 조용히 무시됐는지 아니면 `malformedLines`나 명시적 오류로 드러났는지.

이 체크리스트를 실제로 적용한 결과는 실험을 실행한 뒤 이 문서에 날짜를 붙여 이어 쓴다.
