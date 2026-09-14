# Roadmap — 현재 상태와 다음 작업

최종 확인: 2026-09-14. 현재 작업의 단일 안내다. 과거 프롬프트의 미완료 표시는 아래 최신 상태로 대체한다.

## 현재 상태

**웹 MVP 구현·통합 후 다크 UI/Three.js 재설계 진행. 실제 모델 교정과 계정 배포는 별도 준비 단계.**

- 실행: [README](../../README.md), 기록: [Phase 4](Sessions/Phase-04-Web-MVP.md).
- 현재 시각 작업: [#5 Linear 다크 UI·Three.js](https://github.com/SangJun-Pyo/MyAiScore/issues/5).
- GitHub 작업: [#1 평가 경계](https://github.com/SangJun-Pyo/MyAiScore/issues/1), [#2 서비스](https://github.com/SangJun-Pyo/MyAiScore/issues/2), [#3 웹](https://github.com/SangJun-Pyo/MyAiScore/issues/3), [#4 실제 실험·배포](https://github.com/SangJun-Pyo/MyAiScore/issues/4).
- Astra가 구현·통합을 맡고 서브에이전트가 독립 작업·핵심 검토를 수행한다. Claude 별도 세션 간 수동 전달은 기본 절차가 아니다.
- 원래 `claude/local-collection-poc@3fa263b`에서 독립 `codex/` worktree/브랜치로 이어갔다. 통합 브랜치 `codex/web-mvp`.
- 모델 API 키·정확한 모델·활성화 없이 합성 예시만 사용할 수 있다. 실제 평가 adapter가 있어도 검증된 평가 서비스로 간주하지 않는다.

## 단계별 상태

| 영역 | 구현/검증 상태 | 남은 조건 |
|---|---|---|
| 평가 계약·공식 | 코드/fixture 교정 초안 | 실제 모델·사람 검토로 타당성 확인 |
| GitHub 수집 | 실제 API 수집과 웹 서비스 연결 | 다양한 저장소 시간/비용 실측 |
| MAS-002/004/005 | 회귀 테스트와 경계 수정 완료 | 기존 회귀 유지 |
| 로컬 수집/MAS-006 | synthetic 범위 출력·진단 메시지 경계 수정 | 지정한 실제 세션 호환성 검증 |
| 모델 provider | Anthropic opt-in adapter + transport mock 검증 | 서비스 키·모델·예산 결정 후 실제 호출 |
| 질문/판정/점수/작업서 | 서비스·CLI·웹 통합, mock 흐름 테스트 | 실제 판단 정확성·인젝션 실험 |
| API/소유권/저장 | file + Supabase CAS adapter, 소유/공개/재시도/삭제 검사 | 실제 Supabase migration·RLS 실증 |
| 웹/공유/비교 | 반응형 화면 및 브라우저 테스트 | 실제 사용자 피드백 |
| CI/배포 준비 | GitHub Actions, Docker/Railway 설정 | CI 원격 결과·실제 계정 배포는 세션 후속에서 확인 |

## 다음 작업

1. 실제 서비스용 LLM 제공사/모델/예산 결정. 현재 Anthropic adapter는 구현 선택이며 모델 구매·선택 승인이 아니다.
2. 최소 실제 평가 1건과 대표 fixture의 판정·근거·인젝션 검증. 비용과 토큰을 실제 기록한다.
3. Supabase 운영 저장과 배포 환경 설정. 실제 migration/권한·만료 정리/운영 로그 검증 후 배포한다.
4. 로컬 세션은 사용자 지정 파일만 실제 호환성 실험한다. 자동 수집·업로드/CLI 배포는 아직 보류다.

확인하지 않은 점수를 mock으로 대신 발급하거나 fixture의 humanReviewed를 변경하지 않는다. 오래된 대회 일정은 이 작업에서 재검증하지 않았으며 제출 완료를 주장하지 않는다.
