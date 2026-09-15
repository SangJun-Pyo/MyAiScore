# Roadmap — 현재 상태와 다음 작업

최종 확인: 2026-09-15. 현재 작업의 단일 안내다. 과거 프롬프트의 미완료 표시는 아래 최신 상태로 대체한다.

다른 에이전트의 공용 시작 경로는 `C:/Users/sangj/MyAiScore/docs`다. 소스도 같은 프로젝트 루트의 main 기준으로 읽는다. worktree 작업 후 이 경로를 동기화하는 절차는 [AGENT_WORKFLOW](AGENT_WORKFLOW.md)에 있다.

## 현재 상태

**Phase 6 #20 구현·로컬 검증 완료: 중립 차콜 색상, 근거 검토 히어로, 핵심 작업 중심 프로필·분석·새 평가를 통합했다. 영어 UI·평가 계약을 유지하며 typecheck/build, 236개 단위·회귀와 30개 브라우저 검사를 통과했다. 실제 모델 판정은 API/모델/예산 미정으로 대기한다.**

- 실행: [README](../../README.md), 최신 기록: [Phase 6](Sessions/Phase-06-English-Landing.md), 이전 구현: [Phase 5](Sessions/Phase-05-Profile-And-Live-Pilot.md), 웹 MVP 기반: [Phase 4](Sessions/Phase-04-Web-MVP.md).
- 설계 결정: [ADR](../Architecture/ADR/README.md). Phase 4의 독립 ADR 누락은 [#7](https://github.com/SangJun-Pyo/MyAiScore/issues/7)에서 사후 기록·작업 규칙 보완으로 처리한다.
- 현재 디자인 작업: [#20 일관된 평가 작업 화면](https://github.com/SangJun-Pyo/MyAiScore/issues/20), [ADR-0011](../Architecture/ADR/0011-consistent-assessment-design.md), [디자인 시스템](../UI/DESIGN_SYSTEM.md). #18 전체 랜딩·영어 UI는 이전 완료 기준이며 Approach 이후 구성은 유지한다. 기존 Logic Core 적용·검사는 역사 기록이다.
- GitHub 작업: [#1 평가 경계](https://github.com/SangJun-Pyo/MyAiScore/issues/1), [#2 서비스](https://github.com/SangJun-Pyo/MyAiScore/issues/2), [#3 웹](https://github.com/SangJun-Pyo/MyAiScore/issues/3), [#4 실제 실험·배포](https://github.com/SangJun-Pyo/MyAiScore/issues/4).
- Astra가 구현·통합을 맡고 서브에이전트가 독립 작업·핵심 검토를 수행한다. Claude 별도 세션 간 수동 전달은 기본 절차가 아니다.
- 현재 통합 단위: [PR #21와 정확한 head의 CI](https://github.com/SangJun-Pyo/MyAiScore/pull/21), 작업 브랜치 `codex/consistent-assessment-design`. 원격 CI·merge의 최종 상태는 PR에 남는다. 통합 시 공용 main의 코드·문서를 함께 동기화하고 HEAD/clean을 확인한다.
- UI·서버 안내·기준 설명·합성 예시는 영어를 사용한다. 언어 전환기는 없으며 사용자가 제출한 원문과 기존 개인 기록은 소급 번역하지 않는다. 내부 문서·교정 fixture의 한국어 이력은 보존한다.
- 모델 API 키·정확한 모델·활성화 없이 합성 예시만 사용할 수 있다. 실제 평가 adapter가 있어도 검증된 평가 서비스로 간주하지 않는다.

## 단계별 상태

| 영역 | 구현/검증 상태 | 남은 조건 |
|---|---|---|
| 평가 계약·공식 | 코드/fixture 교정 초안 | 실제 모델·사람 검토로 타당성 확인 |
| GitHub 수집 | MyAiScore 실제 40파일 수집, 편중 발견·MAS-007 보정·동일 SHA 선정 재현 | 새 정책으로 실제 평가 재개 시 재수집, 다양한 저장소 교정 |
| MAS-002/004/005 | 회귀 테스트와 경계 수정 완료 | 기존 회귀 유지 |
| 로컬 수집/MAS-006 | synthetic 범위 출력·진단 메시지 경계 수정 | 지정한 실제 세션 호환성 검증 |
| 모델 provider | Anthropic opt-in adapter + transport mock 검증 | 서비스 키·모델·예산 결정 후 실제 호출 |
| 질문/판정/점수/작업서 | 서비스·CLI·웹 통합, mock 흐름 테스트 | 실제 판단 정확성·인젝션 실험 |
| API/소유권/저장 | file + Supabase CAS adapter, 소유/공개/재시도/삭제 검사 | 실제 Supabase migration·RLS 실증 |
| 웹/공유/비교 | #20 화면 통합·WebGL 제거, 독립 검토·30개 브라우저 검사 통과 | 실제 사용자 사용성 검증 |
| CI/배포 준비 | GitHub Actions, Docker/Railway 설정, [통합 PR #6](https://github.com/SangJun-Pyo/MyAiScore/pull/6) | 원격 CI 결과는 PR Checks, 실제 계정 배포는 #4에서 확인 |

## 다음 작업

1. 실제 서비스용 LLM 제공사/모델/예산 결정. 현재 Anthropic adapter는 구현 선택이며 모델 구매·선택 승인이 아니다.
2. 지정된 MyAiScore 저장소를 새 선정 정책으로 재수집하고 실제 질문·답변·판정 1건 실행. 대표 fixture의 판정·근거·인젝션 검증과 비용·토큰 실측을 별도로 기록한다. [최초 수집/남은 조건](../../artifacts/phase5-pilot/README.md).
3. Supabase 운영 저장과 배포 환경 설정. 실제 migration/권한·만료 정리/운영 로그 검증 후 배포한다.
4. 로컬 세션은 사용자 지정 파일만 실제 호환성 실험한다. 자동 수집·업로드/CLI 배포는 아직 보류다.

확인하지 않은 점수를 mock으로 대신 발급하거나 fixture의 humanReviewed를 변경하지 않는다. 오래된 대회 일정은 이 작업에서 재검증하지 않았으며 제출 완료를 주장하지 않는다.
