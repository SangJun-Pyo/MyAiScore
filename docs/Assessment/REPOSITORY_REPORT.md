# Repository report contract — v1

Current product contract under [ADR-0015](../Architecture/ADR/0015-anonymous-korean-repository-reports.md). 구현 타입과 세부 점수표는 core 통합 뒤 이 문서에 확정한다.

## 의미와 경계

RepositoryReport는 공개 GitHub 저장소의 고정 commit에서 제한적으로 읽은 정적 신호를 요약한다. 개인의 실제 AI 대화, 의도, 기여분, 코드 정답, 생산성 또는 일반 능력을 인증하지 않는다. 사용자가 저장한 브라우저 사본은 인증된 증명서가 아니다.

필수 공개 정보는 schema/rule version, 공개 repo slug, commit SHA, coverage, 네 축 점수와 총점, 고정 한국어 스타일, 실제 수집 경로 기반 근거 카드, gap과 다음 도전이다. 서버 토큰, raw API 응답, 파일 원문, 감지된 비밀, 사용자 식별자와 임의 저장소 문장을 포함하지 않는다.

## 축

| 축 | 관찰 대상 | 관찰하지 않는 것 |
|---|---|---|
| AI 맥락 | AGENTS/CLAUDE/도구 지침과 명시적 작업 맥락 | 지침을 실제로 따랐는지 |
| 검증 습관 | 테스트 경로, CI와 검증 스크립트 | 테스트가 실제 통과했는지 |
| 결정 추적 | ADR, 계획, 변경·세션 기록 | 기록의 사실성 또는 작성자 |
| 자동화 기반 | 재현 가능한 scripts/config/workflow 신호 | 실행 성공·운영 품질 |

각 축은 0~25이고 총점은 합계 0~100이다. 세부 신호는 cap을 사용해 파일 수만 늘려 점수를 무한히 높이지 않는다. 점수는 rule version으로 고정하고 같은 snapshot에서 결정론적으로 재계산한다. 부분 coverage는 점수 자체를 개인 실패로 재해석하지 않고 별도 상태로 표시한다.

## 근거와 안전

근거 path는 수집된 file/evidence 목록에 실제로 존재해야 한다. 설명·스타일·도전은 고정 템플릿에서 생성하며 파일 원문을 그대로 삽입하지 않는다. 경로는 상대 경로, 길이·문자·개수 제한을 검증한다. 관찰되지 않은 축은 gap으로 설명하고 없는 성공을 추론하지 않는다.
