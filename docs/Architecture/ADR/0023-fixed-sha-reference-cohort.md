# ADR-0023 — 고정 SHA 공개 저장소 참조 코호트 v1

- 상태: Accepted
- 기록일: 2026-09-19
- 결정 주체와 근거: 실제 출처가 있는 비교 기준으로 다음 단계를 진행하라는 사용자 요청, [Issue #57](https://github.com/SangJun-Pyo/MyAiScore/issues/57)
- 기록 성격: 수집·구현과 함께 기록
- 대체 관계: [ADR-0022](0022-deterministic-roi-recommendations.md)의 코호트 표시 보류 조건을 충족해 v2.7에서 제한적으로 활성화한다.

## 배경

v2.6은 검증되지 않은 작은 표본을 백분위처럼 보이지 않도록 `cohort: null`로 고정했다. 비교를 활성화하려면 저장소 선택 방식, 고정 SHA, 점수 규칙, coverage와 분포가 inspectable해야 한다. 규모와 수집 상태가 크게 다른 저장소를 한 순위로 섞으면 표본 선택 편향에 더해 측정 범위 차이까지 순위로 오해하게 된다.

## 결정

`repository-cohort-v1`은 TypeScript·Python·Go·Rust·Java 각 10개, 다섯 별점 구간별 2개씩 총 50개인 층화 편의 표본이다. 검색식과 원래 seed 목록을 공개하고, 각 저장소를 기본 branch의 고정 SHA에서 `repository-signals-v2.6`으로 수집한다. manifest에는 원문 없이 repo, SHA, 층, 점수·축, 후보 규모, coverage와 provisional 이유만 저장하며 내용 digest를 함께 검증한다.

새 분석은 `repository-signals-v2.7`을 발급한다. 점수 계산 자체는 v2.6과 동일하며 비교 표현만 추가한다. candidate 파일 수 기준 small `<100`, medium `100..499`, large `>=500`; candidate 수가 selection limit 때문에 미확정이면 large로 둔다. 같은 규모와 같은 coverage 상태인 참조 그룹이 5개 이상일 때만 현재 점수의 동점 포함 위치와 10% 단위 상위 구간을 계산한다. 전체 50개와 실제 비교 그룹 수, GitHub 전체 순위가 아니라는 문구를 함께 표시한다. strict parser는 점수와 coverage에서 비교 객체를 다시 계산한다.

## 대안과 결과

- **50개 전체 단일 순위:** 규모·coverage 차이를 무시하므로 채택하지 않았다.
- **별점이나 언어까지 모두 같은 셀에서 비교:** 현재 50개로는 셀당 2개라 의미가 없어 채택하지 않았다.
- **partial 결과 전부 제외:** 실제 대형 저장소의 bounded collection 특성을 숨기므로 같은 coverage끼리만 비교한다.
- **정밀 백분위:** 작은 그룹에 거짓 정밀도를 주므로 10% 구간만 사용한다.

이 코호트는 타당성 인증이나 공평성의 증명이 아니다. 검색 시점, 언어, GitHub 별점과 공개 저장소에 편향된 참고 기준이며 새 코호트는 별도 version과 ADR로 교체한다.
