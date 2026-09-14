# MyAiScore 실제 공개 저장소 수집 기록

사용자 지정 대상: `https://github.com/SangJun-Pyo/MyAiScore`.
고정 commit: `39c6c81a310122ca7e71a923b4550aa11e9e6a37`.

## 실제 수행한 범위

2026-09-14 Astra가 서비스의 `prepareAssessment`를 실제 GitHub transport로 실행했다. [수집 메타데이터](myaiscore-collection.json)에 실제 시각·파일 해시·범위·요청 수를 보존했다. 43회 HTTP 요청, 약 10.3초, 후보 258개 중 계획한 40개 읽기 완료다. 로컬 사용자 세션을 읽거나 제출 코드를 실행하지 않았다. 발췌 원문과 임시 모델 문맥은 저장하지 않았다.

이 artifact의 assessment_id는 이 실험의 식별자이며 웹 서버에 저장된 사용자 평가 레코드가 아니다. 프로필 이력에 임의로 추가하지 않았다.

## 실제 실행에서 발견한 제한

이 최초 샘플에는 fixture 20개와 루트 tests 13개 등이 들어갔지만 제품 `src/`는 0개였다. README/package와 테스트가 선정을 독식한 MAS-007이며 [#14](https://github.com/SangJun-Pyo/MyAiScore/issues/14)에서 보정한다. 최초 데이터를 새 정책의 성공 결과로 덮어쓰지 않는다. `complete`는 계획된 40개 샘플을 읽었다는 뜻이며 전체 저장소 분석이나 평가 입력의 대표성을 뜻하지 않는다.

`context_truncated=true`는 모델에 전달할 예정인 내용도 서비스 길이 제한으로 일부 생략됐음을 뜻한다. 본 실험에서는 실제로 모델에 전달하지 않았다.

## 다음 실행

새 선정 정책은 같은 commit의 Git tree를 이용한 로컬 재현으로 별도 검증한다. 이것을 두 번째 GitHub API 수집으로 표현하지 않는다. 첫 수집 뒤 비인증 GitHub API 잔여 한도는 17회여서 43회 전체 수집을 반복하지 않았다. 실제 평가를 재개할 때는 새 정책으로 다시 수집해야 한다.

제공사·모델·예산이 미정이므로 질문/판정/점수 단계는 미실행이다. model_calls=0, model_id=null, score=null을 유지한다. 질문에 대한 사람 답변도 생성하지 않았다. 이후 모델과 예산을 정하고 서비스 키를 서버에 설정한 다음 실제 질문·답변·판정을 진행한다. 이 결과는 AI 활용 역량의 평가 결과가 아니다.

수집 재현은 저장소 루트에서 다음 명령으로 가능하다. 현재 checkout의 수집 정책이 적용되므로 최초 0.1.0 결과와 선택 파일은 달라질 수 있다. 출력에는 마스킹된 공개 파일 내용이 포함되므로 전체 출력을 평가 결과로 공개하거나 프로필에 삽입하지 않는다.

```bash
npm run ingest -- --repo https://github.com/SangJun-Pyo/MyAiScore --ref 39c6c81a310122ca7e71a923b4550aa11e9e6a37
```
