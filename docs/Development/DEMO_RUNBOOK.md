# Demo runbook

이 문서는 공모전 시연 직전에 MyAiScore의 공개 저장소 흐름을 빠르게 확인하기 위한 체크리스트다. 점수의 우열을 홍보하는 목록이 아니라 언어·규모·coverage·점수 범위가 서로 다른 경로를 확인하는 운영 자료다.

## 대표 저장소

대표 목록의 정본은 [`repository-scenarios.json`](../../fixtures/demo/repository-scenarios.json)이다. 모두 [고정 SHA 참조 코호트](../Assessment/Cohorts/README.md)에 실제 수집 성공 이력이 있다.

| 목적 | 저장소 | 생태계 | 규모 | 고정 SHA 결과 |
|---|---|---|---|---|
| 작은 저장소·낮은 점수 | `aydinnyunus/exifLooter` | Go | small | 7점·complete |
| 중간 규모 TypeScript | `ecomfe/tempad-dev` | TypeScript | medium | 61점·complete |
| 큰 저장소·높은 점수 | `GitGuardian/ggshield` | Python | large | 71점·complete |
| 부분 coverage 설명 | `iluwatar/java-design-patterns` | Java | large | 39점·partial |
| 중간 규모 Rust | `sebadob/hiqlite` | Rust | medium | 43점·complete |

표의 숫자는 2026-09-19에 고정한 SHA와 `repository-signals-v2.6`의 결과다. 운영 입력은 저장소 기본 branch의 현재 commit을 분석하므로 시연 시 점수가 달라질 수 있다. 정확한 점수를 약속하지 말고 결과의 근거 경로, coverage, 네 축, 유형과 다음 작업이 함께 표시되는지를 확인한다.

## 시연 전 점검

1. `/api/health`가 `{"ok":true}`를 반환하는지 확인한다.
2. 위 목록에서 complete 저장소 하나와 partial 저장소 하나를 분석한다.
3. 로더가 완료된 뒤 점수·네 축·유형·근거·조언이 나타나는지 확인한다.
4. 결과 카드를 PNG로 저장하고, 지원 기기에서는 시스템 공유 창을 확인한다.
5. 리포트를 브라우저에 저장해 `/profile`과 `/insights`에서 다시 여는지 확인한다.
6. 존재하지 않는 공개 URL로 점수 없는 오류 화면을 확인한다.

## 접근성·화면 점검

- 키보드 첫 `Tab`에서 본문 건너뛰기 링크가 보이고 동작한다.
- 320px 화면에서 홈과 해석 가이드에 가로 넘침이 없다.
- 동작 감소 설정에서는 제목 조립 애니메이션이 정지한다.
- 공개 네 화면에 심각한 WCAG A/AA 자동 검사 위반이 없다.
- 한국어·영어 전환 후 `<html lang>`과 화면 문구가 함께 바뀐다.

자동 검사는 `npm run test:e2e`의 `demoReadiness.spec.ts`가 담당한다. 자동 접근성 검사는 보조 수단이며 실제 스크린 리더 사용성을 전부 보장하지 않는다.

## 2026-09-19 실측 기록

Railway 운영 API에서 다음 두 경로를 다시 실행했다. 응답에는 저장소 원문을 기록하지 않고 결과 요약만 확인했다.

| 저장소 | 현재 commit | 결과 |
|---|---|---|
| `ecomfe/tempad-dev` | `29f1789fe7ec` | v2.7·61점·complete·조언 3개 |
| `iluwatar/java-design-patterns` | `4cabb204f240` | v2.7·39점·partial·조언 3개 |

로컬 production build를 headless Chromium과 동작 감소 설정으로 한 번 측정했다. 숫자는 네트워크·기기에 따른 보장값이나 성능 점수가 아니라, 이번 변경에서 비정상적으로 큰 자산이나 막힌 렌더링이 없는지 보는 기준점이다.

| 화면 | DOMContentLoaded | load | 리소스 | 전송량 | 가로 넘침 |
|---|---:|---:|---:|---:|---|
| 홈 desktop | 80ms | 385ms | 20개 | 214KiB | 없음 |
| 분석 desktop | 23ms | 45ms | 18개 | 198KiB | 없음 |
| 해석 가이드 desktop | 33ms | 56ms | 18개 | 198KiB | 없음 |
| 홈 390px | 44ms | 347ms | 20개 | 214KiB | 없음 |
