# Development Session — Phase 5: 프로필·항목별 분석과 실제 평가 준비

- 일자 / 담당: 2026-09-14 / Astra 및 UI·API·3D 서브에이전트
- 상태: accepted (화면·API·수집 보정 범위). 실제 모델 평가는 API/모델/예산 미정으로 대기.
- 시작 commit: `39c6c81a310122ca7e71a923b4550aa11e9e6a37`
- 이슈: [#13](https://github.com/SangJun-Pyo/MyAiScore/issues/13)

## 목표와 작업 범위

홈 / 프로필 / 항목별 분석 / 새 평가를 분리하고 반응형 hero와 5축 선택을 연결한다. 실제 평가는 사용자가 지정한 MyAiScore 공개 저장소를 대상으로 한다. 사용자의 서비스 제공사·모델·예산 응답은 **미정**이므로 실제 모델 요청은 실행하지 않는다.

## 결정과 근거

[ADR-0007](../../Architecture/ADR/0007-anonymous-assessment-workspace.md)을 구현 착수 시 기록했다. 프로필은 기존 소유 토큰으로 조회하는 탭 단위 이력이며 계정 인증·리더보드·개인 실력 등급을 추가하지 않는다. 합성 예시와 실제 결과를 구분한다.

## 실제 구현 / 검증 / 산출물

### 구현과 분담

- UI 서브에이전트: 홈의 평가 입력을 `/evaluate`로 옮기고 `/profile`, `/insights`, 메뉴, 반응형 스타일을 구현했다. 프로필은 현재 탭의 평가 이력과 최근 완료 진단을 보여준다. Insights는 선택한 평가의 상태·설명·근거와 정본의 축별 4단계 기준을 나란히 제공한다.
- API 서브에이전트: 인증된 소유자 이력 endpoint와 엄격한 summary DTO, 만료/상한/타 소유자/원문 제외 회귀를 추가했다.
- 3D 서브에이전트: 선택된 축의 노드·연결·링을 강조하고 정적 SVG 대체에도 동일 선택을 표시한다. 축 변경 때 씬을 재생성하지 않는다.
- Astra: 통합, 실제 공개 저장소 수집, 동일 SHA 선정 재현, 문서/ADR, 브라우저 검사와 발견된 UI 결함 수정을 담당했다.

### 실제 수집과 MAS-007

사용자가 지정한 `SangJun-Pyo/MyAiScore@39c6c81a310122ca7e71a923b4550aa11e9e6a37`를 `prepareAssessment`의 실제 GitHub transport로 읽었다. 2026-09-14T13:14:10Z, 43회 요청, 10,327ms, 388,706 bytes, 후보 258개 중 40개 읽기 완료. 키/모델 호출 없이 진행했고 토큰·비용을 임의 산정하지 않았다. [메타데이터](../../../artifacts/phase5-pilot/myaiscore-collection.json), [범위와 재개 조건](../../../artifacts/phase5-pilot/README.md).

최초 샘플은 fixtures 20개/tests 13개 등에 편중되어 제품 src가 0개였다. 독립 검토자가 같은 SHA의 Git tree로 재현했고 [MAS-007 / #14](https://github.com/SangJun-Pyo/MyAiScore/issues/14)로 기록했다. [ADR-0008](../../Architecture/ADR/0008-balanced-repository-sampling.md)을 추가하고 루트 설정/AI 지침 슬롯, 파일군 순환 선정, 예제·생성 자료 후순위를 적용했다. 사용자 명시 relevantPaths와 기존 제외·상한은 유지한다.

새 규칙의 같은 SHA 로컬 Git tree 재현은 **src 14개, tests 6개, CI 1개, AGENTS/CLAUDE 2개, fixtures/artifacts 0개**, 총 40개다. [선정 전후 기록](../../../artifacts/phase5-pilot/selection-replay.json). 첫 API 수집 뒤 비인증 잔여 한도는 17회였으므로 43회 전체 수집을 반복하지 않았다. 이 재현은 두 번째 실제 API 전송이 아니다. 최초 수집 원문을 저장하지 않았으므로 실제 모델 평가를 재개할 때 새 정책으로 재수집해야 한다.

collector `ingestion-0.2.0`, 정책 `representative-categories-v2`. 실제 tree에서 새 digest는 `72bfca24aa0e2eba15a01f0b6248c11c85dd0643fc6de70d287b3e54713dcc00`이다. `complete`는 선정한 샘플 수집 완료이며 전체 코드 분석을 뜻하지 않는다. `context_truncated=true`도 최초 기록에 유지했다. 파일 내용/사용자 세션 원문·임시 모델 문맥은 artifact에 저장하지 않았다.

### 독립 검토와 수정

- 평가 경계 담당자가 API commit `f52a16e`를 읽고 history 5개 테스트를 직접 실행했다. 저장 오류 내용 비노출, URL 토큰 인증 거부, 인증 실패 시 storage 미조회도 추가 검사했다. 필수 결함 없음.
- UI 담당자는 다른 작성자의 수집 commit `00ac192`를 검토하고 관련 23개 테스트 및 독립 755파일 표본으로 파일군 편중·비밀파일/링크 제외를 확인했다. 필수 결함 없음.
- 새 UI 검토에서 같은 자료 선택 버튼 재클릭 시 결과가 사라지는 결함, 같은 경로 query 변경 시 평가/축이 갱신되지 않는 문제를 발견했다. Astra가 동일 mode 조기 반환과 반응형 search params + Suspense를 적용하고 실제 브라우저 회귀로 확인했다. 명시된 미존재 ID를 다른 최신 평가로 대체하지 않는 검사도 추가했다.

### 실제 검증

- `npm run typecheck` 통과. 최종 `npm run build`의 TypeScript와 새 경로 생성도 통과.
- `npm test`: **234/234 통과**. 기준 224개에 history/수집 회귀 10개 추가. 실제 LLM 판정 정확도를 뜻하지 않는다.
- `npm run test:e2e`: **22/22 통과**(데스크톱·모바일). 홈, 입력부터 질문/결과까지 명시적 synthetic API 흐름, 소유 이력/보류, 빈 상태, 예시 전환, 잘못된 ID, 키보드 탭, query 이동·뒤로가기, 모션 감소, WebGL 실패를 확인했다.
- Chromium에서 실제 `data-renderer=webgl`, 1440px/390px 레이아웃 가로 넘침 없음 확인. [홈](../../../artifacts/phase5-workspace/home.png), [프로필 빈 상태](../../../artifacts/phase5-workspace/profile.png), [항목 분석 합성 예시](../../../artifacts/phase5-workspace/insights.png), [모바일](../../../artifacts/phase5-workspace/home-mobile.png) 화면을 캡처·열람했다. 실제 사용자의 점수를 넣은 스크린샷이 아니다.
- `node scripts/checkDocs.mjs`: 문서 링크 검사 통과. 최종 tracked 검사/원격 CI는 통합 PR과 Git 기록을 따른다.

### 구현 commit 근거

원 작업 commit: `9f742fe`(3D), `f52a16e`(이력 API), `e480d5d`(UI), `00ac192`(선정). 통합 브랜치는 `codex/profile-assessment-experience`이며 cherry-pick한 commit은 Git 이력에서 대응을 확인한다. 원 UI commit 메시지의 잘못된 #8 참조는 통합 시 #13으로 정정했다. 문서·통합 회귀 변경은 별도 commit으로 남긴다.

## 미검증·남은 작업·인계

실제 LLM 평가에는 서비스 API·정확한 모델·비용 상한과 질문에 대한 사용자 답변이 필요하다. 저장소 수집만으로 협업 행동이나 점수를 추정하지 않는다. 실제 모델 타당성/인젝션 교정과 운영 배포 조건은 [#4](https://github.com/SangJun-Pyo/MyAiScore/issues/4)에 유지한다.
