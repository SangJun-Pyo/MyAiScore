# 개발 세션 기록

현재 작업과 상태는 [ROADMAP](../ROADMAP.md), 열린 결함은 [BUGS](../BUGS.md), 변경 요약은 [CHANGELOG](../CHANGELOG.md)를 본다. 이 폴더는 실제로 무엇을 했고 무엇을 확인했는지 기록한다.

| 세션 | 기간 | 상태 |
|---|---|---|
| [Phase 0 — 기획](Phase-00-Planning.md) | 09-10 | 문서 계약 채택, 모델 타당성 미검증 |
| [Phase 1 — fixture·수집](Phase-01-Fixtures-And-Ingestion.md) | 09-10~14 | 구현/후속 검토 기록 확보 |
| [Phase 2 — 오프라인 평가](Phase-02-Offline-Evaluation.md) | 09-14 | 구현 보고 후 결함 발견, 수용 보류 |
| [Phase 2 Fixes](Phase-02-Fixes.md) | 09-14~ | MAS-002/004/005 코드 경계 보정·회귀 확인 |
| [Phase 3 — 로컬 협업 기록 수집 PoC](Phase-03-Local-Collection-PoC.md) | 기존 보고 날짜 보존 | synthetic 출력 경계 보정 완료, 실제 세션 호환성 미검증 |
| [Phase 4 — 웹 MVP 통합](Phase-04-Web-MVP.md) | 09-14 | 웹·API·provider 구현, 실제 모델 교정·계정 배포는 미실행 |
| [Phase 5 — 프로필·실제 평가 준비](Phase-05-Profile-And-Live-Pilot.md) | 09-14 | 화면·이력·수집 보정 검증, 실제 모델은 API/예산 미정 |
| [Phase 6 — 영어 Landing Page](Phase-06-English-Landing.md) | 09-15 | 전체 페이지 구성·영어 제품 UI 재설계 |
| [Phase 7 — 저장소 기능 시뮬레이션](Phase-07-Repository-Walkthrough.md) | 09-15 | 실제 공개 수집·용량 수정 검증, PR #24/#25 통합 |
| [Phase 8 — CLI 세션 리포트](Phase-08-CLI-Session-Reports.md) | 09-15 | CLI 기반 재미용 활동 리포트로 전환, 구현/검증 기록 |
| [Phase 9 — 공개 저장소 리포트](Phase-09-Anonymous-Repository-Reports.md) | 09-18~ | 로그인 없는 한국어 URL 분석 구현·검증 진행 |
| [문서·Git 정리](Session-2026-09-14-Documentation-And-Git.md) | 09-14 | 이력 복원 및 로컬 형상 관리 도입 |

## 기록 원칙

- 같은 Phase의 후속 수정/검토는 해당 세션에 날짜·작성자를 붙여 추가한다. 별도 검토나 후속 보고서를 Development 최상위에 만들지 않는다.
- 큰 독립 Phase만 새 `Phase-XX-Name.md`로 만든다. 작업을 시작할 때 [_TEMPLATE](_TEMPLATE.md)으로 세션을 열고 종료 때 채운다.
- 과거 세션은 사후 복원일과 근거를 표시한다. 과거 날짜의 Git 커밋·사람 검토·테스트 실행을 만들어내지 않는다.
- `Prompts/`는 완료된 지시문 보관소다. 현재 지시는 ROADMAP에서 찾는다. 오래된 지시문의 다음 작업 문장은 현재 명령이 아니다.
- 실제 구현 결과와 테스트 원문을 보존한 기록에 오류가 있으면 원문을 성공으로 고치지 않고 날짜가 있는 정정/검토를 붙인다.
