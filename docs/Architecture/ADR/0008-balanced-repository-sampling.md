# ADR-0008 — 평가 입력의 파일군별 균형 선정

- 상태: Accepted
- 기록일: 2026-09-14
- 결정 주체와 근거: Astra, 실제 MyAiScore 수집 및 독립 재현, [MAS-007 / #14](https://github.com/SangJun-Pyo/MyAiScore/issues/14)
- 기록 성격: 사전 기록 (선정 정책 수정 착수 시)
- 대체 관계: 없음. 기존 수집 계약의 단순 우선순위 선착순을 보완한다.

## 배경

MyAiScore `39c6c81`의 실제 GitHub API 수집은 후보 258개 중 40개를 읽었지만 제품 `src/`는 0개였다. 하위 fixture의 README/package도 루트 설정과 같은 우선순위를 받고 테스트가 나머지를 채웠다. 이는 전송 실패가 아니라 평가 입력의 대표성 결함이다. 독립 검토자가 같은 commit의 Git tree로 재현했다.

## 결정

기존 제외 경로·용량·시간·40파일 제한은 유지한다. 사용자 명시 relevantPaths는 우선한다. 그다음 루트 package/Next/tsconfig/README 최대 6개, AI 설정 최대 4개를 확보한다. 나머지는 제품 소스·테스트/CI·문서·기타 파일군을 source/source/testCI/docs/other 순서의 가중 순환으로 채운다. 빈 파일군은 건너뛰고 각 파일군의 순서는 결정적으로 고정한다. fixtures/__fixtures__/examples/_archive/artifacts의 예제·생성 자료는 일반 자료 소진 뒤 채우며, 명시 relevantPaths에 포함되면 우선 선정할 수 있다. 작은 저장소는 한도 내 모든 후보를 읽는다.

협업 지침 파일의 존재가 AI 활용 레벨의 가산점이라는 의미는 아니다. 코드와 문서도 사용자의 실제 판단이나 실행 성공을 증명하지 않는다. 선정 후 모델 문맥 길이 제한도 별도 적용된다.

collector 버전과 selection policy 버전을 올리고 selection digest에 정책을 포함한다. 기존 `complete`는 계획된 샘플 수집 완료, `selectionLimited`는 2,000 tree 제한이라는 의미를 유지한다. 일부 후보만 선정했다면 샘플 수/후보 수 경고를 남겨 전체 분석으로 오해하지 않게 한다.

## 대안

상한을 크게 늘리는 것은 시간/비용을 늘리고 편향을 반드시 해결하지 않는다. fixture를 모두 제외하면 실제 테스트 프로젝트의 중요한 자료도 잃으므로 후순위로만 둔다. 샘플을 읽은 모든 중형 저장소를 partial로 바꾸는 것은 점수 발급 정책까지 바꾸므로 이번 수정에 섞지 않는다.

## 결과와 재검토 조건

단일 파일군이 입력을 독식하는 문제를 줄인다. 균형 표본도 전체 저장소나 핵심 구현의 완전한 대표성을 보장하지 않는다. 모노레포와 다양한 언어의 실제 표본, 사용자 지정 경로 UX는 후속 교정 대상이다. 기준별 고정 슬롯/순환 비중도 경험적 선택이며 실제 모델 성능 향상을 확인한 수치가 아니다.

## 근거와 검증 상태

[Phase 5](../../Development/Sessions/Phase-05-Profile-And-Live-Pilot.md), [GITHUB_INGESTION](../GITHUB_INGESTION.md). 최초 실제 수집 기록은 보존한다. 새 정책의 동일 SHA Git tree 재현과 합성 경계 테스트는 별도로 기록하고, 이를 두 번째 실제 GitHub 전송이나 실제 모델 평가로 표현하지 않는다.
