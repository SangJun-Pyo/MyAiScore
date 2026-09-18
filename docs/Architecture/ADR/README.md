# Architecture Decision Records

중요한 설계의 배경·선택·대안·결과를 결정별로 보존한다. 현재 계약은 도메인 정본, 실행 이력은 [Sessions](../../Development/Sessions/README.md), 과거 결정 요약은 [DECISIONS](../../Development/DECISIONS.md)에서 관리한다.

## 결정 목록

| ID | 결정 | 상태 |
|---|---|---|
| [0001](0001-opt-in-live-evaluation.md) | 실제 모델 평가의 명시적 활성화와 합성 예시 분리 | Accepted |
| [0002](0002-request-bound-stages.md) | 요청 단위 단계 실행과 늦은 완료 차단 | Accepted |
| [0003](0003-owner-and-public-boundaries.md) | 소유 토큰과 공개 결과의 별도 데이터 경계 | Accepted |
| [0004](0004-mvp-persistence.md) | 개발 파일 저장과 소규모 Supabase CAS 저장 | Accepted |
| [0005](0005-conservative-comparison.md) | 비교 조건 확인과 행동 향상 추론 금지 | Accepted |
| [0006](0006-decorative-threejs.md) | 지연 로딩하는 Three.js 장식과 정적 대체 | Superseded by 0011 |
| [0007](0007-anonymous-assessment-workspace.md) | 익명 소유자의 평가 이력과 항목별 작업 공간 | Accepted |
| [0008](0008-balanced-repository-sampling.md) | 실제 수집에서 확인한 파일 선정 편향 보완 | Accepted |
| [0009](0009-threeui-community-logic-core.md) | 무료 ThreeUI Logic Core 소스를 히어로에 포팅 | Superseded by 0011 |
| [0010](0010-english-landing-page-experience.md) | 전체 Landing Page 재구성과 영어 전용 제품 화면 | Partially superseded by 0011 (palette/hero) |
| [0011](0011-consistent-assessment-design.md) | 중립 색상·근거 검토 히어로·핵심 작업 중심 화면 | Accepted |
| [0012](0012-repository-walkthrough.md) | 실제 저장소 수집과 스크립트 판정을 분리한 저장형 walkthrough | Accepted |
| [0013](0013-separated-ingestion-byte-accounting.md) | HTTP 응답 바이트와 수집 파일 내용 예산 분리 | Accepted |
| [0014](0014-cli-first-session-reports.md) | CLI 기반 재미용 세션 리포트로 기본 제품 흐름 전환 | Accepted as optional detail; primary flow superseded by 0015 |
| [0015](0015-anonymous-korean-repository-reports.md) | 로그인 없는 한국어 공개 저장소 리포트를 기본 흐름으로 채택 | Accepted; supersedes 0010 language and 0014 primary onboarding |

0001~0006은 2026-09-14 사용자의 ADR 누락 지적 후 작성한 **사후 기록**이다. 기준은 [PR #6](https://github.com/SangJun-Pyo/MyAiScore/pull/6), merge `db0edd7`, [Phase 4](../../Development/Sessions/Phase-04-Web-MVP.md)다. 작성자는 Astra이며 구현 시점에 ADR이 있었다고 소급하지 않는다. 대안은 당시 요약과 현재 코드를 바탕으로 정리했고, 대안별 실험을 수행했다는 뜻이 아니다.

`Accepted`는 현재 구현에서 채택했다는 뜻이다. 사용자에게 개별 기술 선택을 승인받았다거나 실제 모델·운영 환경에서 검증을 마쳤다는 뜻이 아니다. 각 ADR의 미검증 범위를 함께 읽는다.

## 작성과 변경 규칙

- 데이터/평가 계약, 신뢰·보안 경계, 저장·실행 구조, 주요 의존성 선택처럼 되돌림 비용이나 후속 작업에 영향이 큰 결정에 작성한다. 단순 문구/CSS 수치/기존 계약을 복원하는 버그 수정은 세션 기록으로 충분하다.
- 새 결정은 가능하면 구현 전에 `Proposed`로 기록하고 담당자의 채택 판단과 함께 `Accepted`로 바꾼다. 승인된 작업을 ADR 때문에 다시 사용자에게 승인받도록 만들지 않는다.
- [템플릿](_TEMPLATE.md)을 복사해 다음 번호를 쓴다. ID를 재사용하지 않는다. 관련 정본과 세션, 이슈/PR 또는 실제 commit을 연결한다.
- 결정을 바꾸면 새 ADR을 만들고 기존 기록의 상태를 `Superseded`로 바꾸며 양쪽에 대체 관계를 적는다. 사용하지 않기로 한 제안은 `Rejected`로 보존한다.
- 오탈자·링크·검증 상태는 근거와 날짜를 남겨 보정할 수 있다. 과거 선택 이유를 새 선택의 이유로 덮어쓰지 않는다.
- ADR의 상세 이유를 DECISIONS에 복제하지 않는다. 그곳에는 요약과 ADR 링크만 둔다.

과거 Phase 0~3 결정 전체를 이번에 ADR로 전환한 것은 아니다. 기존 DECISIONS와 세션 이력은 보존한다.
