# Repository report contract — v2.7

Current product contract under [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md), [ADR-0017](../Architecture/ADR/0017-content-aware-repository-scoring.md), [ADR-0019](../Architecture/ADR/0019-granular-repository-score-signals.md), [ADR-0020](../Architecture/ADR/0020-always-assigned-repository-profile.md), [ADR-0021](../Architecture/ADR/0021-wider-private-collection-sample.md), [ADR-0022](../Architecture/ADR/0022-deterministic-roi-recommendations.md), and [ADR-0023](../Architecture/ADR/0023-fixed-sha-reference-cohort.md). 구현 정본은 `src/shared/repositoryReport.ts`이며 새 결과는 `repository-report-v2` / `repository-signals-v2.7`로 발급한다. strict parser는 브라우저에 저장된 v1과 v2.1~v2.6 기록을 계속 읽는다.

## 의미와 경계

RepositoryReport는 공개 GitHub 저장소의 고정 commit에서 제한적으로 읽은 정적 신호를 요약한다. 개인의 실제 AI 대화, 의도, 기여분, 코드 정답, 생산성 또는 일반 능력을 인증하지 않는다. 사용자가 저장한 브라우저 사본은 인증된 증명서가 아니다.

필수 공개 정보는 schema/rule version, 공개 repo slug, commit SHA, coverage, 네 축 점수와 총점, 네 차원 협업 유형, 실제 수집 경로 기반 근거 카드, gap과 최대 세 개의 개선 조언이다. 서버 토큰, raw API 응답, 파일 원문, 감지된 비밀, 사용자 식별자와 임의 저장소 문장을 포함하지 않는다.

## 축

| 축 | 관찰 대상 | 관찰하지 않는 것 |
|---|---|---|
| AI 맥락 | AGENTS/CLAUDE/도구 지침과 명시적 작업 맥락 | 지침을 실제로 따랐는지 |
| 검증 기반 | 테스트 경로, CI와 검증 스크립트 | 반복 습관인지, 테스트가 실제 통과했는지 |
| 결정 추적 | ADR, 계획, 변경·세션 기록 | 기록의 사실성 또는 작성자 |
| 자동화 기반 | 재현 가능한 scripts/config/workflow 신호 | 실행 성공·운영 품질 |

각 축은 0~25이고 총점은 합계 0~100이다. 같은 종류의 파일 수가 늘어도 신호 하나는 한 번만 더해지며, 각 근거 카드는 경로를 최대 5개만 표시한다. 신호 점수는 다음 식으로 계산하고 정수로 반올림한다.

```text
quality = presence × (0.10 + 0.65 × substance + 0.25 × substance × breadth)
points  = round(maxPoints × quality)
```

`presence`는 실제 읽은 신호 파일, `substance`는 네 개 이하의 제한된 내용 요소 평균, `breadth`는 60개 선택 표본이 아닌 cap 이전 `scanned_tree` 규모 비율이다. v2.3+ 빈 파일은 최대 배점의 10% 존재 바닥만 받는다. 단, 실행 진입점·커버리지·CI 테스트·CI 품질 검사는 관련 파일만으로 presence를 인정하지 않고 실제 지원 명령이나 marker가 있어야 한다. 같은 내용 해시의 테스트는 한 번만 세며, 지원하지 않는 테스트 언어는 실패 0점으로 단정하지 않고 `unmeasured`로 공개한다.

| 축 | 신호별 최대점 | 축 최대 |
|---|---|---:|
| 맥락 | README 5, 지침 5, 문서 4, 설정 3, 인터페이스 계약 4, 재현 환경 4 | 25 |
| 검증 기반 | 실행 진입점 4, 테스트 내용 5, 분포 4, 실패·경계 4, 정적 검사 4, 커버리지 4 | 25 |
| 기록 | 변경 6, 결정 7, 템플릿 4, 마이그레이션 3, 변경 책임 4, 커밋 설명 4 | 25 |
| 자동화 | CI 테스트 5, CI 품질 검사 5, 의존성 4, 배포 4, 작업 도구 4, 환경 구성 3 | 25 |

고정 SHA의 최근 조상 커밋 최대 20개에서 자동·merge·revert를 제외하고 제목의 구체성·고유성·범위, 본문의 이유, issue/PR/ADR/RFC 참조 비율을 집계한다. 평가 가능한 커밋이 3개 이상이면 v2.3 기록축에 최대 4점을 주되 축 상한은 25점이다. 원문 커밋 메시지는 snapshot이나 공개 응답에 넣지 않는다.

v2.4 협업 유형은 점수 높낮이와 분리해 D/R(기록/실행), H/P(직접확인/파이프라인), S/T(설계선행/추적중심), F/E(집중/균형)의 네 상대 차원을 항상 표시한다. 수집이 불완전하거나 관찰 축·실질 신호·차원 근거가 부족하거나 차원이 경계에 가까워도 가장 가까운 코드를 발급하되, 기존 이유와 경계 차원 수를 신뢰도 주의 문구에 반영한다. 주의 요소 0개는 높음, 1개는 보통, 2개 이상은 낮음이다. 과거 v2.2·v2.3 결과는 당시 보류 계약을 유지한다.

웹 해석 가이드는 별도 점수표를 유지하지 않는다. v2.3의 축별 여섯 신호와 최대점을 공유 코드에서 직접 읽는다. 실제 리포트 카드는 획득점·최대점·내용 실질을 함께 표시한다. 한국어·영어 제목은 같은 의미 ID에서 가져온다. 과거 v1/v2.1/v2.2 저장 이력은 당시 계약으로 검증한다.

점수·legacy style·gap·다음 도전·협업 유형은 v2 `signalScores`와 diagnostics에서 결정론적으로 재계산한다. v2.6 개선 조언은 각 측정 가능한 미충족 신호를 최대점으로 바꾼 뒤 축 상한을 포함한 총점을 다시 계산한다. 실제 gain이 있는 후보만 고정 effort 대비 gain 순으로 최대 세 개 고르며, UI에는 내부 계수 대신 난이도 구간과 고정 행동 문구만 보인다. 근거 경로는 해당 신호의 검증된 카드에서만 가져온다. 브라우저도 서버와 같은 strict parser를 사용하므로 품질·점수·진단·유형·조언을 임의로 바꾼 응답이나 저장 이력은 거부한다. 부분 coverage, tree/selection 제한, 지원하지 않는 테스트 형식, 커밋 이력 미측정은 `provisional` 이유로 공개한다.

v2.7은 [repository-cohort-v1](Cohorts/README.md)의 고정 SHA 공개 저장소 50개를 제한적 참고 기준으로 사용한다. candidate 규모를 small `<100`, medium `100..499`, large `>=500` 또는 개수 미확정으로 나누고 같은 coverage 상태인 그룹이 5개 이상일 때만 비교한다. 동점을 포함한 위치를 10% 단위 구간으로 표시하며 전체 표본 수, 실제 비교 그룹 수와 GitHub 전체 순위가 아니라는 한계를 함께 노출한다. parser는 score와 coverage에서 비교 객체를 재계산한다. 조건을 충족하지 않으면 `cohort`는 `null`이다.

## 근거와 안전

근거 path는 수집된 file/evidence 목록에 실제로 존재해야 한다. 설명·스타일·도전은 고정 템플릿에서 생성하며 파일 원문을 그대로 삽입하지 않는다. 경로는 상대 경로, 길이·문자·개수 제한을 검증한다. 관찰되지 않은 축은 gap으로 설명하고 없는 성공을 추론하지 않는다.

수집은 공개 저장소 metadata에서 `private === false`를 확인하고, 기본 branch·40자리 commit SHA·tree 구조를 검증한 뒤에만 blob을 읽는다. 23개 파일 신호별 대표를 60개 예산 안에 예약하고 같은 고정 SHA의 조상 커밋만 집계한다. 파일당 60KB, decoded content 800KB, HTTP 68회, 60초 상한이며 실제 코드를 실행하지 않는다. 현재 서버 제한은 토큰이 있으면 5분당 분석 시작 5회, 없으면 서버 프로세스당 시간당 1회, 동시 2회다. 이 제한은 단일 프로세스 메모리 기준이며 여러 Railway 인스턴스에 공유되는 분산 제한은 아니다.

coverage 개수는 응답 검증과 재현 진단을 위해 보존하지만 기본 결과와 내 리포트 화면에는 표시하지 않는다. 화면은 complete/partial 상태와 실제 근거 경로를 중심으로 보여준다.

`.DS_Store`·swap·temp 같은 고신뢰 임시 파일, 생성물 후보, 비밀정보 가능 경로와 400/800줄 초과 선택 소스·큰 소스 후보는 진단에 표시하되 v2.3 점수에서 일괄 감점하지 않는다. 필요한 배포 산출물이나 응집된 모듈을 잘못 벌점화하고 의미 없는 파일 분할을 유도하지 않기 위해서다.
