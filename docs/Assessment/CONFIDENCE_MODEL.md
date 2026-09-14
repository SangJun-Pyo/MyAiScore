# Confidence Model v0.3.1

정본 허브: [마스터 플랜](../00_MASTER_PLAN.md). 필드: [EVIDENCE_SCHEMA](EVIDENCE_SCHEMA.md). 발급: [SCORING_RUBRIC](SCORING_RUBRIC.md).

## 1. 의미

GitHub 직접 수집은 해당 시점의 코드 출처를 확인한다. 본인 작성, AI 사용 과정, 개인의 일반 역량을 인증하지 않는다. A–D Verified 등급과 모델 자기보고 확률을 사용자 신뢰 지표로 사용하지 않는다.

## 2. ConfidenceSummary 결정 규칙

| 필드 | 결정 방법 | 표시 |
|---|---|---|
| evidence_scope | snapshot.coverage의 read_files, candidate_files, selection_limited | “후보 30개 중 10개 확인” 또는 전체 미확인. 임의의 ‘넓음’ 확률 등급 금지 |
| source_verification | ingestion_status complete/partial/failed | “선정 파일 수집 완료 / 일부만 수집 / 수집 실패” |
| process_evidence | 아래 자료 제출 조건 | “연결된 과정 자료 있음 / 자기진술만 있음 / 과정 자료 없음” |
| remaining_uncertainty | 미판정 축, 충돌, 샘플 범위, 사용자 제공 기록의 한계 | 문장 배열 |

linked_records는 사례/답변이 실재하는 관련 과정 발췌·변경 기록에 연결됐다는 뜻이다. 링크 개수나 코드와 연결됐다는 사실만으로 과정의 진위를 인증하지 않는다. statements_only는 설명만 있고 확인할 연결 기록이 부족한 경우, none은 과정 자료가 없는 경우다. 이 분류가 자동으로 레벨을 정하지 않는다.

정량 배지는 수집된 범위만 설명한다. complete여도 저장소 전체 검사·런타임 검증·일반 역량 확인이라고 표시하지 않는다.

## 3. 미확인·충돌

not_observed는 필요한 자료 자체가 없음, insufficient_evidence는 자료는 있지만 판정에 부족하거나 충돌함이다. 둘 다 level=null, dimension_score=null이다. 다섯 축 중 하나라도 이 상태면 총점은 withheld다.

코드는 코드의 존재와 구조를 보여줄 뿐, 과거의 판단 의도를 단독으로 입증하지 않는다. 판정에 영향을 주는 충돌은 supporting/contrary 양쪽 근거를 유지하고 blocking_conflict=true로 표시한다. 독립적인 자료로 충돌이 해소되기 전 임의 평균 레벨을 매기지 않는다.

“검증 기록 없음”과 “검증을 생략한 행동이 확인됨”을 분리한다. 후자의 낮은 수행 판정에도 관련 과정 근거가 필요하다.

## 4. 버전과 전후 비교

rubric_version, pipeline_version, evaluator_model_id, evaluator_prompt_version, inference_config_version을 고정한다. 하나라도 다르면 직접 점수 비교는 제한된다.

근거 내용 변화(evidence_change)와 실제 행동 변화(behavior_change)를 독립적으로 기록한다. 제출 시각과 행동 발생 시각을 구분한다. 오래된 로그를 새로 제출해 레벨이 바뀌면 “과거 근거가 추가로 확인됨”이라고 표현하고 행동 개선은 not_established로 둔다.

새 테스트 파일이 있다는 사실만으로 실행 성공·개선이 확인됐다고 말하지 않는다. 전후 행동·결과에 연결된 근거가 있을 때만 제한된 범위에서 개선/악화/변경을 설명한다. 비교 필드와 열거형은 EVIDENCE_SCHEMA 8절을 따른다.

## 5. 결정적 검증

full SHA 형식/실제 조회, file/path/line range, content hash, 같은 평가 소속 참조, A~E 중복/누락, 상태와 null 조합, 입력 버전, 소유 권한을 코드로 확인한다. 구조 검증 통과와 LLM 의미 판단의 타당성은 별개다. 유효하지 않은 근거는 판정에서 제외하거나 계약 오류로 처리한다.
