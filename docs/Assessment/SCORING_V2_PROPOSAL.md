# 저장소 점수 v2.1 설계 제안

> 상태: `proposal` / 미구현  
> 대상 규칙: `repository-signals-v1` → `repository-signals-v2`  
> 기준 문서: [`AI_SCORE_EVALUATION_BASIS.md`](AI_SCORE_EVALUATION_BASIS.md)  
> 구현 전 조건: 평가 계약 ADR 작성, v1 기록 호환 정책 확정

## 1. 목표와 비목표

v2.1은 공개 GitHub 저장소의 고정 commit에서 관찰할 수 있는 구조와 정적 내용을 바탕으로 **저장소 기반 AI 협업 준비도**를 설명한다.

> AI에게 작업을 맡겼을 때 오류를 발견하고, 필요한 맥락과 결정을 다음 작업까지 보존할 구조가 저장소에 얼마나 준비되어 있는가?

개인의 일반적인 AI 활용 능력, 코드 작성자나 사람·AI의 기여 비율, 테스트·빌드·배포 성공, 코드 정답, 생산성, 채용 적합성을 평가하지 않는다. 저장소만으로 실제 AI 사용 여부를 확정할 수 없으므로 제품 라벨과 설명은 이 경계를 약화하지 않는다.

## 2. v1에서 확인한 구조적 문제

| 케이스 | 총점 | 맥락 | 검증 | 기록 | 자동화 |
|---|---:|---:|---:|---:|---:|
| MyAiScore 실제 저장소 | 91 | 25 | 25 | 20 | 21 |
| 같은 저장소에서 점수 신호가 표본 밖으로 빠진 경우 | 0 | 0 | 0 | 0 | 0 |
| 내용이 전부 빈 신호 파일 14개 | 100 | 25 | 25 | 25 | 25 |
| 테스트가 탄탄하고 문서가 적은 Python 라이브러리 | 52 | 12 | 25 | 0 | 15 |
| 테스트 파일 하나가 있는 1인 프런트엔드 프로젝트 | 37 | 12 | 25 | 0 | 0 |

- **L1 — 경로만 평가:** 빈 파일 14개로 100점이 가능하다. 이미 수집한 `IngestedFile.redactedContent`를 제한적으로 분석해야 한다.
- **L2 — 낮은 해상도:** 테스트 파일 하나와 충분한 테스트 모음이 같은 점수를 받는다.
- **L3 — 적용성 부재:** DB가 없는 라이브러리의 마이그레이션처럼 해당 없는 항목이 사실상 감점으로 작동한다.
- **L4 — 표본 운:** 일부 루트 설정과 AI 지침 외의 점수 신호는 일반 40개 표본 슬롯을 두고 경쟁한다.

## 3. 위협 모델

결정론적 정적 규칙은 의도적으로 게임할 수 있다. v2.1은 게임 불가능성을 주장하지 않는다.

> 파일명만 만드는 저비용 조작을 막고, 점수를 올리기 위해 실제 협업 준비물을 만드는 편이 더 싸게 느껴지도록 한다.

주요 방어 대상은 빈 파일, 짧은 보일러플레이트, 같은 assertion 반복, 사용하지 않는 설정 중복, 글자 수만 늘리는 내용 패딩이다. 점수를 목표로 실제 문서·테스트·자동화를 충분히 작성하는 행위는 결과적으로 협업 준비도를 높이므로 조작으로 감점하지 않는다.

## 4. 두 단계 관찰 모델

1. **scanned-tree inventory:** 제외 필터를 통과한 후보 경로 전체에서 구조·개수·적용 가능성을 집계한다.
2. **selected content evidence:** 신호별로 예약해 실제 읽은 파일에서 내용의 실질을 측정한다.

### 4.1 scanned-tree inventory

`selectFiles()`가 이미 반환하는 40개 cap 이전 `candidates`를 수집 시점에 집계한다. 추가 GitHub 요청이나 두 번째 트리 순회는 필요하지 않다.

```ts
interface RepositoryInventory {
  basis: "scanned_tree";
  scannedEntries: number;
  treeTruncated: boolean;
  selectionLimited: boolean;
  sourceFiles: number;
  testFiles: number;
  documentationFiles: number;
  signalCandidateCounts: Record<RepositoryReportEvidenceId, number>;
}
```

`scanned_tree`는 저장소 전체를 뜻하지 않는다. 최대 2,000개 엔트리, GitHub tree truncation, binary·lock·secret 가능 경로·대용량 파일 제외가 적용된다. `selectionLimited`이면 경로 정렬 앞부분 편향도 가능하므로 inventory coverage를 함께 보존한다.

### 4.2 점수 신호 파일 예약

일반 대표 표본 전에 다음 순서로 읽기 예산을 예약한다.

1. 명시적 관련 경로
2. 루트 manifest와 README
3. AI·협업 지침
4. 14개 점수 신호별 대표 파일
5. 소스·테스트·문서·기타 대표 표본
6. fixture, example, archive, artifact

동일 파일이 여러 신호에 해당하면 한 번만 읽는다. 초기값은 신호당 1개로 하고, 문서·테스트처럼 집합 실질이 중요한 신호만 2개를 허용한다. 대표 파일은 경로 깊이, tree의 파일 크기 metadata, 경로 문자열 순서로 결정론적으로 고른다. 저장소 코드는 실행하지 않는다.

## 5. 신호 품질 공식

```text
quality(s) = presence × (0.15 + 0.60 × substance + 0.25 × substance × breadth)
raw(s)     = weight(s) × quality(s)
```

- `presence`: 실제 읽은 유효 신호 파일이 하나 이상이면 1, 아니면 0
- `substance`: 선택된 내용에서 관찰한 실질, 0~1
- `breadth`: scanned-tree inventory에서 계산한 규모 대비 범위, 0~1

| 상태 | 품질값 |
|---|---:|
| 파일 없음 | 0 |
| 빈 파일 | 0.15 |
| substance 0.5, breadth 1.0 | 0.575 |
| substance 1.0, breadth 1.0 | 1.0 |

`presence`는 곱셈 게이트다. `breadth`는 `substance`가 없으면 점수를 만들지 않는다. 계수는 초기 제품 가설이며 공격 fixture와 코호트 결과 없이 타당성이 검증됐다고 표현하지 않는다.

## 6. substance 측정

### 6.1 공통 원칙

- 한 가지 길이·개수·키워드가 substance의 25%를 넘게 결정하지 않는다.
- 반복된 동일 패턴에는 로그 또는 상한을 적용한다.
- 파일 수나 도구 수 자체를 복잡성 보상으로 사용하지 않는다.
- 지원하지 않는 언어·형식은 0점이 아니라 `unmeasured`로 둔다.
- 저장소 원문을 사용자-facing 카피에 삽입하지 않는다.
- 제한된 redacted text만 읽고 코드·설정·hook을 실행하지 않는다.

### 6.2 초기 기준

| 신호 | substance 구성 요소 |
|---|---|
| `context-readme` | 비공백 내용, 목적, 설치·실행, 사용 예, 테스트·검증 방법, 내부 경로 링크 |
| `context-guidance` | 작업 범위, 금지·제약, 검증 명령, 완료 조건, 코드 또는 명령 예시 |
| `context-docs` | 실질 문서 수, 비어 있지 않은 비율, 평균 내용 상한, 문서 간 내부 연결 |
| `context-metadata` | manifest 파싱 성공, 빌드·검사·테스트 명령, 엔트리포인트 또는 패키지 metadata |
| `verification-tests` | 언어별 테스트 케이스, assertion, 테스트 파일 분산, 반복 제거 후 유효 패턴 수 |
| `verification-config` | 설정 구조 유효성, manifest script 또는 CI와의 연결 |
| `traceability-changelog` | 서로 다른 버전·날짜 엔트리, 변경 항목 구조, 보일러플레이트 여부 |
| `traceability-decisions` | 문제·상태·결정·대안·결과 구조, 서로 다른 결정 기록 수 |
| `traceability-templates` | 질문·체크리스트·재현 단계·검증 항목의 서로 다른 종류 |
| `traceability-migrations` | 비어 있지 않은 migration, 서로 다른 변경 단계, 반복 파일 상한 |
| `automation-ci` | test·lint·build 작업 종류, `run`과 `uses`, manifest 명령 연결 |
| `automation-dependencies` | 설정 파싱 성공과 schedule·target 구성 |
| `automation-delivery` | 설정 구조 유효성, build/start/health 중 관찰된 단계 |
| `automation-scripts` | 반복 가능한 검사·빌드·배포 작업 종류, 비어 있지 않은 비율 |

### 6.3 다언어 테스트 탐지

초기 지원 후보:

- JavaScript/TypeScript: test block, `expect`, assertion
- Python: pytest/unittest test, `assert`, `self.assert*`
- Go: test function, `t.Error*`, `t.Fatal*`, 지원 assertion library
- Rust: test attribute, `assert!`, `assert_eq!`, `assert_ne!`
- Java/Kotlin: JUnit test annotation과 assertion

지원 언어나 parser가 아니면 `substanceStatus: "unmeasured"`로 표시하고 해당 substance 구성 요소를 분모에서 제외한다. 미지원 상태를 낮은 수행으로 해석하지 않는다.

## 7. breadth

선택된 40개 표본이 아니라 scanned-tree inventory에서 계산한다.

```text
testRatio = inventory.testFiles / max(inventory.sourceFiles, 1)
testBreadth = clamp(testRatio / 0.25, 0, 1)

docsTarget = max(inventory.sourceFiles × 0.10, 1)
docsBreadth = clamp(inventory.documentationFiles / docsTarget, 0, 1)
```

25%와 10% 기준은 초기 가설이며 언어·규모별 분포를 확인한 뒤 조정한다. CI는 워크플로 개수보다 검증 작업 종류를 우선하고 동일 명령 반복을 중복 계산하지 않는다. 규모 비례가 의미 없는 신호는 `breadth=1`을 쓰되 공식에서 substance와 결합하므로 빈 파일에 독립 점수를 만들지 않는다.

## 8. 핵심·조건부·보너스

N/A 항목을 제거한 뒤 축 전체를 재정규화하지 않는다.

```text
axisScore  = min(25, coreScore + bonusScore)
totalScore = context + verification + traceability + automation
```

### 8.1 핵심

- `context-readme`
- `context-metadata`
- `verification-tests`
- `verification-config`

AI 지침은 중요한 신호지만 실제 AI 사용을 인증하지 않으므로 초기 v2.1에서는 맥락축 보너스로 둔다. 파일럿 결과에 따라 핵심 편입을 별도로 결정한다.

### 8.2 조건부

적용성은 평가 대상 산출물 자체가 아니라 독립된 manifest 의존성과 프로젝트 구조에서 판정한다. 실제 운영 사실처럼 표현하지 않는다.

```text
databaseLikely
runtimeServiceLikely
libraryLikely
collaborationLikely
```

예시 의존성 신호:

- JavaScript/TypeScript DB: `pg`, `mysql2`, `prisma`, `typeorm`, `sequelize`
- Python DB: `sqlalchemy`, `django`, `psycopg`, `pymongo`
- Go DB: `gorm`, 지원 SQL driver
- runtime service: `express`, `fastify`, `next`, `django`, `flask`, `fastapi` 등

단일 의존성만으로 프로필을 확정하지 않는다. manifest field, 엔트리포인트, 소스 경로를 함께 사용하고 판정 근거와 버전을 저장한다.

초기 조건부 신호는 `databaseLikely`일 때의 `traceability-migrations` 하나로 제한한다. 배포, PR 템플릿, CHANGELOG, ADR, Dependabot은 실제 코호트 근거 없이 조건부 필수로 만들지 않는다.

### 8.3 보너스

있으면 핵심 부족분을 보완하지만 축 25점을 넘기지 않는다.

- `context-guidance`, `context-docs`
- `traceability-changelog`, `traceability-decisions`, `traceability-templates`
- 적용 대상이 아닌 경우의 `traceability-migrations`
- `automation-ci`, `automation-dependencies`, `automation-delivery`, `automation-scripts`

보너스가 핵심을 압도하지 않도록 축별 상한을 둔다. 구체 가중치는 fixture와 파일럿 코호트로 정한다.

### 8.4 커밋 설명 습관

고정 SHA의 최근 조상 커밋 최대 20개를 읽어 `traceability-commit-practice` 기록축 보너스 후보로 사용한다. HEAD history나 contributors API는 사용하지 않는다.

원문을 리포트에 저장하지 않고 다음 집계만 남긴다.

- 지나치게 일반적이지 않은 제목 비율
- 서로 다른 제목 비율
- 범위가 드러나는 제목 비율
- 설명 본문이 있는 비율
- issue·PR·ADR·RFC 참조 비율

merge, revert, Dependabot, Renovate 등 자동·통합 커밋은 일반 작업 커밋과 분리한다. Conventional Commits, 영어, 긴 제목을 필수로 만들지 않으며 squash workflow를 큰 감점으로 사용하지 않는다.

### 8.5 저장소 위생 guardrail

`scanned_tree`에서 다음을 별도 진단한다.

- 고신뢰 임시·OS 파일: `.DS_Store`, `Thumbs.db`, swap·temp·orig
- 생성물 후보: `node_modules`, `.next`, `dist`, `build`, `coverage`, `vendor`
- 비밀 가능 경로: 실제 `.env`, private key 계열

초기 v2.1에서는 점수를 일괄 감점하지 않는다. 비밀 가능 경로는 내용 없이 보안 경고로, 생성물 후보는 배포·패키지 목적일 수 있다는 조건부 안내로 표시한다. 파일럿 검증 후 고신뢰 임시 파일만 작은 상한의 guardrail 감점을 재검토한다.

### 8.6 구조 집중도

raw LOC 하나로 감점하지 않는다. inventory의 source byte 분포와 선택된 소스의 line count를 조합해 다음을 진단한다.

- 소스 크기 중앙값·P90
- oversized source 후보 수
- 상위 5개 파일의 source byte 집중도
- 선택된 내용에서 400줄·800줄을 넘는 소스 후보

generated, migration, fixture, snapshot, vendored, minified, declaration·schema 생성물은 제외한다. 초기에는 점수가 아니라 경로 기반 리팩터링 조언에 사용하며, 의미 없는 파일 분할을 유도하지 않는다.

## 9. coverage와 결과 상태

| 상태 | 점수 | 유형 | 코호트 위치 |
|---|---|---|---|
| tree·selection complete | 발급 | 근거 충분 시 발급 | 코호트 준비 시 발급 |
| `treeTruncated` 또는 `selectionLimited` | `provisional` 표시 후 발급 가능 | 기본 보류 | 기본 보류 |
| 신호 파일 fetch 일부 실패 | 관찰 범위 점수 + `provisional` | 기본 보류 | 보류 |
| 분석 가능한 파일 없음 | 0 또는 보류를 제품 카피와 함께 결정 | 보류 | 보류 |

`complete`는 저장소 전체 실행 검증을 뜻하지 않는다. 화면에서 scanned-tree와 selected-content 범위를 구분한다.

## 10. 유형 체계

유형은 점수 다음에 구현하지만 후순위 장식으로 취급하지 않는다. 해커톤 공유성과 제품 인상을 위한 핵심 결과다.

### 10.1 원칙과 후보 비트

- 유형은 점수 높낮이와 분리한다.
- 네 비트가 정의상 같은 질문을 반복하지 않게 한다.
- 입력의 기계적 완전 분리보다 씨드 데이터의 상관과 결합 분포를 본다.
- 임계값을 0.5로 고정하지 않는다.
- 근거가 부족하면 억지로 16유형을 부여하지 않는다.

| 비트 | 질문 | 후보 양쪽 |
|---|---|---|
| 1 | 설명·기록과 실행·검증 중 어디에 더 집중되는가 | Documenter / Runner |
| 2 | 로컬 직접 확인과 원격 파이프라인 중 어디에 더 놓이는가 | Hands-on / Pipeline |
| 3 | 사전 제약과 사후 추적 중 어디에 더 놓이는가 | Spec-first / Trace-after |
| 4 | 네 축이 한 영역에 집중되는가, 고르게 분포하는가 | Focused / Even |

기존 `지침·ADR vs 스크립트·마이그레이션` 비트는 첫 비트와 입력·의미가 강하게 겹칠 수 있으므로 그대로 확정하지 않는다.

### 10.2 유형 보류

다음 중 하나면 유형을 `withheld`로 둔다.

- 관찰 가능한 축이 3개 미만
- 유형 계산에 필요한 핵심 신호가 4개 미만
- `treeTruncated` 또는 `selectionLimited`가 방향을 바꿀 가능성이 큼
- 필요한 비율의 양쪽 값이 모두 0
- 둘 이상의 비트가 임계값 주변 dead band에 있음

완료 조건은 실제 조합 10~12개 이상, 단일 유형 30% 미만, 지나치게 높은 비트 간 상관 없음, 설명 가능한 보류율, 성격·능력을 과장하지 않는 카피다.

## 11. 파일럿 코호트와 등급

초기에는 50~100개의 투명한 참조 코호트로 시작할 수 있다. GitHub 전체 백분위나 공평성의 증명으로 표현하지 않는다.

```text
v2.1 참조 코호트 80개 중 18위
v2.1 참조 코호트 80개 기준 상위 20~30%
```

80개에서 `상위 22%`처럼 표본보다 정밀한 표현은 사용하지 않는다. cohort version, rule version, 표본 수, 수집일, 포함·제외 조건, 규모 밴드, 언어·생태계 분포, coverage를 함께 저장한다.

등급 후보는 씨앗·새싹·나무·숲·생태계다. 경계는 코호트 생성 후 확정한다.

## 12. 조언

LLM 자유생성 대신 고정 템플릿과 검증된 경로를 사용한다.

```text
gain(action) = simulatedScoreAfterAction - currentScore
roi(action)  = gain(action) / effort(action)
```

단순 `weight × (1-quality)`가 아니라 행동 성공을 가정해 전체 점수를 재계산한다. 상위 후보를 `가볍게`, `보통`, `큰 작업` 등 난이도로 최대 3개 제시한다.

저장소 전체의 부재를 단정하지 않는다.

```text
잘못된 표현: src/foo.ts에 대응 테스트가 없어요.
허용 표현: 선택된 표본에서 src/foo.ts와 직접 연결되는 이름의 테스트를 확인하지 못했어요.
```

## 13. 검증 계획

### 출시 전 자동 회귀

- 빈 신호 파일 14개
- 문서 내용 패딩
- 같은 assertion 반복
- 사용되지 않는 검사 설정 중복
- 미지원 언어와 `unmeasured`
- 같은 commit의 반복 결정론
- Git tree 입력 순서 변화
- 40개 선택 경계
- 점수 신호가 일반 표본 밖에 있는 대형 저장소
- `treeTruncated`, `selectionLimited`, fetch 일부 실패
- 조건부 적용 경계
- 서버·브라우저 parser의 동일 재계산

빈 파일 총점 상한은 초기 공식상 15점 부근을 기대하되 핵심·보너스 가중치 확정 후 정확한 회귀값을 고정한다.

### 개발자 sanity check

- 계산 점수를 가린 저장소 20개를 직접 순위화한다.
- 계산 순위와 Spearman 상관을 확인한다.
- 0.6은 잠정 경고선이며 타당성 인증 기준이 아니다.
- 큰 불일치는 가중치보다 신호 구성·coverage·언어 지원을 먼저 조사한다.

다중 평가자 축별 판단, 일부 쌍대 비교, 평가자 간 차이, 코호트 확대는 후속 교정으로 둔다.

## 14. 결정론과 외부 metadata

- contributors HEAD API는 사용하지 않는다.
- default branch의 변하는 metadata를 점수에 사용하지 않는다.
- commit count가 필요하면 고정 SHA의 조상 history에 결박한다.
- 현재 수집기는 clone이나 `git rev-list`를 실행하지 않으므로 REST `sha=<fixed commit>` 또는 GraphQL 고정 object history가 필요하다.
- 추가 API 비용이 있는 history 신호는 v2.1 MVP 필수 조건이 아니다.

커밋 신선도 배지는 제거한다. 점수에 영향을 주지 않으면서 요청 예산을 쓰고, 최근 일괄 정비를 조작으로 오해할 수 있으며, 내용 표본을 줄이면 표본 편향이 악화된다.

## 15. 버전·호환·보안

- v1 리포트를 v2 규칙으로 소급 재계산하지 않는다.
- `repository-report-v1` 저장 이력은 기존 strict parser로 계속 읽는다.
- v2는 새 schema 또는 명시적 union contract를 사용한다.
- `ruleVersion`, inventory, profile, detector, cohort version을 분리한다.
- 서버와 브라우저가 같은 순수 계산 코드를 사용한다.
- 점수·유형·등급·조언을 근거에서 재계산해 forged 응답을 거부한다.
- 저장소 원문·명령·secret 가능 문자열을 결과 카피에 삽입하지 않는다.
- 기존 `sanitizeRepositoryPath` 경계를 유지한다.
- parser는 제한된 문자열만 읽고 사용자 코드를 import하거나 실행하지 않는다.

```text
schemaVersion    = repository-report-v2
ruleVersion      = repository-signals-v2.1
inventoryVersion = repository-inventory-v1
profileVersion   = repository-profile-v1
detectorVersion  = repository-substance-v1
cohortVersion    = null | repository-cohort-v1
```

## 16. 구현 순서

| 단계 | 작업 | 완료 조건 |
|---:|---|---|
| 0 | ADR과 v2 계약 | 평가 의미, 호환, 보안, 버전 경계 기록 |
| 1 | `repositoryInventory` | candidates 전체 집계와 coverage 회귀 |
| 2 | 공용 신호 후보 탐지 | inventory와 파일 예약이 같은 matcher 사용 |
| 3 | 점수 신호 읽기 예약 | 대형 저장소에서도 대표 파일이 안정적으로 선택됨 |
| 4 | 품질 공식·substance detector | 빈 파일, 패딩, 반복, 다언어 fixture 통과 |
| 5 | inventory 기반 breadth | 선택 표본 구성과 무관한 비율 계산 |
| 6 | 핵심·조건부·보너스 | 순환 적용성 제거, 축 상한 25 유지 |
| 7 | v2 strict parser와 UI | 재계산, coverage·N/A·unmeasured 노출 |
| 8 | 유형 | 보류, dead band, 초기 임계값과 카피 |
| 9 | sanity check·파일럿 코호트 | 블라인드 20개와 투명한 50~100개 코호트 |
| 10 | ROI 조언 | 실제 재계산 gain, 고정 카피, 안전한 경로 삽입 |

## 17. v1에서 유지할 것

- 고정 카피와 strict parser의 재계산 검증
- `sanitizeRepositoryPath`
- 비밀 파일 제외와 수집 내용 마스킹
- 저장소 코드 미실행 원칙
- coverage와 점수의 분리
- 개인 능력 평가로 표현하지 않는 문구
- 공개 저장소와 고정 commit 경계

## 18. 구현 착수 체크리스트

- [ ] 평가 계약 변경 ADR 작성
- [ ] v2 schema와 v1 호환 정책 확정
- [ ] inventory와 matcher의 단일 정본 위치 확정
- [ ] 신호별 읽기 슬롯 상한 확정
- [ ] 지원 언어·형식 목록 확정
- [ ] 핵심·보너스 초기 가중치 fixture 작성
- [ ] provisional/withheld UI 계약 확정
- [ ] 유형 후보 비트와 보류 fixture 작성
- [ ] 공격 회귀 fixture 추가
- [ ] Phase 9·ROADMAP·CHANGELOG 동기화
