# GitHub Ingestion v0.3.1

정본 허브: [마스터 플랜](../00_MASTER_PLAN.md). 출력: [EVIDENCE_SCHEMA](../Assessment/EVIDENCE_SCHEMA.md)의 IngestionSnapshot. 실행: [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md). 보안: [PRIVACY_SECURITY](../Security/PRIVACY_SECURITY.md).

## 1. 입력

repo_url은 https://github.com/{owner}/{repo}만 허용한다. 선택적으로 말미 / 또는 .git을 정규화한다. 사용자 정보, 비표준 포트, query, fragment, 추가 경로, 다른 scheme/host는 거부한다. commit_ref는 별도 선택 문자열로 받고 URL/명령으로 실행하지 않는다.

서버는 검증한 owner/repo/ref로 api.github.com 요청을 직접 구성한다. 사용자 입력의 주소, README 링크, submodule, LFS URL, 임의 리다이렉트를 따라가지 않는다. 공개 여부를 메타데이터에서 명시적으로 확인하며 GitHub 인증 토큰이 있어도 Private 저장소는 거부한다.

## 2. 불변 스냅샷

기본 브랜치 또는 입력 ref를 조회해 full commit SHA를 먼저 고정한다. 이후 tree/blob 조회는 해당 commit과 tree entry의 blob SHA만 사용한다. 다시 움직일 수 있는 브랜치 이름으로 파일을 읽지 않는다.

저장소 메타데이터·커밋·tree·blob은 GitHub 공식 REST API 계약을 구현 시 확인한다. full SHA는 40자리 16진수로 보관하고 화면에서만 줄여 표시한다.

## 3. 파일 선정과 지원 스택

1. 트리를 읽고 항목 수·truncated 여부·제외 규칙을 적용한다.
2. package.json과 .ts/.tsx 및 관련 설정으로 nextjs_typescript / other / unknown을 정적으로 구분한다. 우선 지원 밖이면 제한을 안내하며 PoC는 읽을 수 있는 정적 신호를 반환한다.
3. 명시된 관련 경로를 우선하고, 루트 package/config/README 최대 6개와 AI 설정 최대 4개를 확보한다. 남은 슬롯은 소스/소스/테스트·CI/문서/기타 순환으로 채워 특정 파일군의 독식을 막는다. 각 파일군은 경로로 정렬한다. fixtures/__fixtures__/examples/_archive/artifacts 자료는 일반 자료 소진 뒤 채우되 관련 경로로 명시되면 우선한다. 후보가 40개 이하면 모두 선정할 수 있다. [ADR-0008](ADR/0008-balanced-repository-sampling.md).
4. 서버에서 구성한 blob URL로만 선정 파일을 읽고 타입·크기·인코딩·비밀 패턴을 검사한다.
5. 정적 신호와 검증 가능한 줄 구간을 기록한다. AI 설정의 존재는 가산점이 아니다.

제외: node_modules, .next, dist, build, .git, vendor, 생성 캐시, 바이너리, lock 파일 원문, .env/비밀키 파일. lock 파일 존재는 신호로만 기록한다. Git mode 120000 symlink, 160000 submodule은 읽어 따라가지 않는다. LFS pointer를 외부 다운로드로 해석하지 않는다.

## 4. 제한값 정본 (proposed, PoC 후 조정)

| 항목 | 기본값 | 처리 |
|---|---:|---|
| 최대 검사 tree 항목 | 2,000 | 초과/truncated면 제한된 목록만 사용하고 partial |
| 계획된 선정 파일 | 40 | 우선순위에 따른 샘플. 제외·미선정 내역/범위를 기록 |
| 파일당 원문 한도 | 60 KiB | 초과하면 읽지 않고 이유 기록 |
| 누적 내용 한도 | 800 KiB | 초과 전에 중단, 남은 선정 파일이 있으면 partial |
| HTTP 요청 예산 | 48회 | 재시도 포함, 소진 시 partial 또는 failed |
| 전체 수집 시간 | 45초 | 시스템 단계 예산과 같은 값. 중단·사유 기록 |
| HTTP 일시 오류 재시도 | 최대 1회/요청 | 전체 요청·시간 예산을 넘기지 않음 |

800 KiB를 특정 토큰 수와 동일시하지 않는다. LLM 컨텍스트 제한은 후속 evaluator가 실제 토크나이저/모델 제한에 맞춰 별도 적용한다. GitHub의 실제 rate limit 응답을 존중하고 불필요한 반복 요청으로 우회하지 않는다.

## 5. 정적 신호와 근거

- 관찰 파일의 언어·확장자 비율, package 의존성, test/CI/migration/AI 설정 존재.
- 샘플 기반 비율을 저장소 전체의 정확한 비율로 표현하지 않는다.
- 코드의 존재·문자열·줄 수는 결정적으로 확인할 수 있다. 런타임 동작·테스트 성공·AI 사용 과정은 자동 확인됐다고 말하지 않는다.
- Evidence 후보는 path + full SHA + 실제 line range + 내용 해시를 포함한다. symbol은 선택 정보이고 PoC에서는 정교한 AST 분석을 필수로 하지 않는다.
- 구조적 위치 검증과 의미상 주장이 참인지는 별개다. 잘못된 locator는 후보에서 제외하고 경고한다.
- source_type은 repo_static/repo_history 등 실제 수집 방법에 맞춘다. 협업 사례는 입력으로 고려하지만 공통 수집 캐시에 포함하지 않는다.

## 6. 완료·부분·실패

| ingestion_status | 의미 | 평가 처리 |
|---|---|---|
| not_started | 수집 전 | 점수/질문 아직 없음 |
| complete | 트리 범위가 파악됐고 계획된 샘플 파일을 예산 내 읽음 | 충분한 과정 근거가 있으면 채점 가능 |
| partial | truncated/일부 실패/예산 소진으로 계획된 수집이 불완전 | 항목 진단 가능, 종합점수는 withheld |
| failed | 공개 접근 불가/잘못된 입력/유용한 수집 불가 | 평가 상태 failed, 결과를 조작해 생성하지 않음 |

complete는 전체 코드 검증이 아니다. 처음부터 계획한 40개 샘플의 수집 완료와 예상치 못한 누락을 구분한다. 전체 후보 수를 모르면 null로 두고 완전한 백분율을 표시하지 않는다. 반환 자료에는 선정·읽은·생략한 개수와 skipped reasons를 남긴다.

일부 후보만 선정하면 샘플 수/후보 수를 warnings에도 명시한다. `coverage.selectionLimited`는 내부 2,000 tree 항목 제한을 뜻하며 40파일 샘플링 자체의 표시가 아니다. 수집기/선정 정책 버전을 selection digest에 포함해 규칙 변경을 구분한다. 균형 선정도 핵심 구현의 완전한 대표성을 보장하지 않는다.

## 7. 수집 PoC 검증

GitHub 요청 adapter를 분리해 truncated tree, 크기 초과, 403/429, ref 변경, 잘못된 URL, path escape, binary/symlink, 읽기 실패를 네트워크 없는 fixture로 재현한다. 외부 대형 저장소를 무제한 읽어 제한을 시험하지 않는다.

실제 공개 소형 저장소 1개를 읽는 smoke test를 별도로 실행해 repo/full SHA/실제 시각/요청 수/바이트/시간을 기록한다. API 접근이 막히면 offline 성공과 live 미완료를 구분한다. 평가 대상 저장소를 clone하거나 그 안에서 install/build/test를 실행하지 않는다.
