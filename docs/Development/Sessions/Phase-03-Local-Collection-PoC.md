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

Astra 검토 결과는 이 문서에 날짜를 붙여 이어 쓴다.
