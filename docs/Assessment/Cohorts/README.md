# Repository reference cohort v1

이 디렉터리는 MyAiScore의 작은 공개 저장소 참조 코호트를 재현 가능하게 기록한다. GitHub 전체, 모든 개발자, 모든 언어를 대표하는 표본이 아니며 AI 활용 능력의 순위도 아니다.

## 선택 방법

2026-09-19 GitHub repository search에서 TypeScript·Python·Go·Rust·Java를 각각 10개 선택했다. 각 언어마다 별점 `100..499`, `500..1999`, `2000..9999`, `10000..49999`, `>=50000`의 다섯 구간을 두고 아래 공통 조건에서 별점 내림차순 첫 두 결과를 사용했다.

```text
language:{ecosystem} stars:{band} size:50..50000 fork:false archived:false pushed:>=2025-01-01
```

이는 언어와 인기 구간을 의도적으로 나눈 **층화 편의 표본**이다. 검색 시점, GitHub 분류와 인기 저장소에 편향된다. 임의로 마음에 드는 저장소를 골라 교체하지 않았으며 원본 50개는 [seed 목록](repository-cohort-v1-seeds.json)에 남긴다.

## 수집과 공개 범위

각 저장소를 당시 기본 branch에서 40자리 commit SHA로 고정하고 `repository-signals-v2.6`의 동일한 60파일 제한 규칙으로 분석했다. [manifest](repository-cohort-v1.json)는 repo slug, SHA, 생태계·별점 구간, 점수와 네 축, candidate 규모, complete/partial, provisional 이유만 보존한다. 파일 원문, 커밋 메시지 원문, 토큰과 GitHub raw 응답은 저장하지 않는다.

- 전체 50개: 언어별 10개
- 규모: small 18, medium 14, large 18
- coverage: complete 37, partial 13
- 점수 범위: 4~71
- manifest SHA-256: `d0919a165fba4b792970cb0636a7da1d96e5a64a5266e8abb6cf678a5a17039c`

`npm run cohort:build`는 서버 전용 `GITHUB_TOKEN`이 있을 때만 실행된다. 중간 manifest를 원자적으로 저장하고 성공한 고정 SHA 결과를 재사용한다. v2.7은 cohort 표현만 추가하고 v2.6 점수 계산을 그대로 쓰므로 재현 입력으로 허용한다. 점수 규칙이나 선택 조건이 바뀌면 기존 v1을 조용히 덮어쓰지 않고 새 cohort version을 만든다.

## 제품 비교 규칙

새 리포트는 candidate 수로 small `<100`, medium `100..499`, large `>=500` 또는 개수 미확정을 분류한다. 같은 규모와 같은 complete/partial 그룹이 5개 이상일 때만 비교한다. 동점 범위를 포함한 위치를 10% 단위 구간으로 표시하며 전체 코호트 50개, 실제 비교 그룹 수와 “GitHub 전체 순위가 아님”을 함께 노출한다. 5개 미만이면 비교를 표시하지 않는다.
