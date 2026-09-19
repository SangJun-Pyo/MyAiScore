# ADR-0017 — 내용·인벤토리 기반 저장소 점수 v2

- 상태: Accepted; v2.1 content scoring implemented, profile follow-up extended by [ADR-0018](0018-evidence-aware-collaboration-profile.md)
- 기록일: 2026-09-19
- 결정 주체와 근거: 사용자와 Astra의 v1 조작·표본 편향 검토, [`SCORING_V2_PROPOSAL`](../../Assessment/SCORING_V2_PROPOSAL.md)
- 기록 성격: 구현 전 사전 기록
- 대체 관계: [ADR-0015](0015-anonymous-korean-repository-reports.md)의 공개 URL 흐름과 신뢰 경계를 유지하며 `repository-signals-v1` 점수 규칙만 향후 대체

## 배경

현재 규칙은 선택된 파일의 경로 존재만 본다. 빈 신호 파일로 100점이 가능하고, 테스트 하나와 충분한 테스트 모음이 같은 점수를 받으며, 점수 신호 파일이 40개 표본 밖으로 밀리면 같은 저장소도 다른 결과를 낼 수 있다. DB·배포처럼 프로젝트에 해당하지 않는 항목도 구분하지 않는다.

수집기는 이미 redacted file content와 cap 이전 후보 경로를 보유한다. 이 자료를 저장소 코드 실행이나 서비스 LLM 없이 결정론적으로 활용할 수 있다.

## 결정

v2는 `scanned_tree` inventory와 실제로 읽은 selected content evidence를 분리한다. cap 이전 후보에서 소스·테스트·문서·14개 신호·위생·구조 집중도를 집계하고, 점수 신호별 대표 파일을 읽기 예산에 예약한다.

신호 품질은 presence를 곱셈 게이트로 사용한다.

```text
quality = presence × (0.15 + 0.60 × substance + 0.25 × substance × breadth)
```

breadth는 selected sample이 아닌 inventory에서 계산한다. 적용성은 산출물 자체가 아닌 manifest 의존성과 프로젝트 구조에서 판정하며, N/A 분모 재정규화 대신 핵심·조건부·보너스와 축 상한을 사용한다. 미지원 언어는 0이 아닌 `unmeasured`, 불완전 coverage는 `provisional`, 유형 근거 부족은 `withheld`로 표현한다.

고정 SHA에 결박한 최근 조상 커밋 메시지는 원문을 공개하지 않는 집계 신호로 분석해 기록축 보너스 후보로 사용한다. 명백한 임시 파일·생성물·비밀 가능 경로와 큰 소스 집중도는 먼저 경고·조언 진단으로 제공하며 검증 전 일괄 감점하지 않는다.

v1 리포트는 소급 변환하지 않는다. v2는 별도 schema/rule/detector/inventory/profile/cohort 버전을 갖고 서버와 브라우저가 같은 순수 함수로 파생 결과를 재계산한다.

## 대안

- **v1 가중치만 조정:** 빈 파일과 표본 누락을 해결하지 못해 제외했다.
- **LLM으로 내용 평가:** 비용·반복성·인젝션·설명 가능성 경계를 키워 기본 흐름에서는 제외했다.
- **불필요 파일과 큰 파일 즉시 감점:** 필요한 배포 산출물·fixture·응집된 모듈을 잘못 벌점화하고 의미 없는 삭제·분할을 유도할 수 있어 진단부터 시작한다.
- **HEAD 기반 contributors/history:** 같은 commit의 결과가 시간이 지나며 달라질 수 있어 제외했다.

## 결과와 재검토 조건

경로 존재보다 조작 비용이 높고 표본 정책과 규모 비율을 분리할 수 있다. 반면 detector와 프로필 규칙이 늘고 언어별 지원·코호트 교정이 필요하다.

빈 파일·패딩·반복 assertion·설정 중복 fixture, 같은 SHA 결정론, partial coverage, 다언어 `unmeasured`, 유형 분포를 검증한다. 파일럿에서 신호가 직관적 순위와 지속적으로 충돌하거나 특정 생태계에 편향되면 계수가 아니라 신호 구성과 지원 범위를 먼저 재검토한다.

## 근거와 검증 상태

`repository-report-v2` / `repository-signals-v2.1`은 공용 경로 matcher, cap 이전 inventory, 14개 신호 예약, 내용 실질 detector, inventory breadth, manifest 기반 DB 적용성, 고정 SHA commit 보너스와 위생·구조 진단을 구현한다. 서버는 v2를 새로 발급하고 strict parser는 과거 v1 브라우저 기록도 계속 검증한다. 빈 신호 파일 14개 공격은 100점에서 약 15점 이하로 제한되며 JavaScript/TypeScript·Python·Go·Rust·Java/Kotlin 테스트 detector와 미지원 언어 `unmeasured` 회귀 검사를 둔다.

구현·검증 이력은 [Phase 9](../../Development/Sessions/Phase-09-Anonymous-Repository-Reports.md)에 기록한다. 네 차원 유형과 보류 계약은 [ADR-0018](0018-evidence-aware-collaboration-profile.md)에서 후속 구현했다. 참조 코호트·백분위는 detector 분포 자료가 없어 별도 후속으로 남긴다.
