# MyAiScore — 제 AI 활용 점수는요?

실제 프로젝트와 AI 협업 근거로 이번 프로젝트의 활용 방식을 진단하고, 가장 중요한 다음 개선 행동을 제안한다.

## 현재 단계

Phase 2 오프라인 구현 보고 후 Astra 검토에서 결함이 발견돼 수정/재검토 중이다. 실제 모델·DB·UI·배포는 아직 없다.

- [현재 작업과 상태](docs/Development/ROADMAP.md)
- [개발 세션 기록](docs/Development/Sessions/README.md)
- [열린 결함](docs/Development/BUGS.md)
- [제품·평가 정본](docs/00_MASTER_PLAN.md)

## 실제로 실행해 확인한 명령

```bash
npm install
npm run typecheck                 # tsc --noEmit, 에러 없음 확인됨
npm test                          # 최신 실행 결과는 해당 Phase 세션에 기록
npm run ingest -- --repo https://github.com/octocat/Hello-World   # 실제 공개 저장소 live smoke, 성공 확인됨 (Phase 1)
npx tsx scripts/evaluateOffline.ts --case fixtures/calibration/cases/case-02-simple-tool-strong-verification \
  --mock-response fixtures/mock-responses/case-02-generic-valid.json \
  --answers fixtures/mock-responses/case-02-fixed-answers.json   # mode=mock, 실제 LLM 미호출 (Phase 2)
```

`evaluate:offline`은 `npm run`으로도 실행되지만, npm이 stdout 앞에 배너 줄을 붙이므로 "stdout=JSON 1개" 계약을 그대로 확인하려면 위처럼 `npx tsx`로 직접 실행한다(둘 다 산출물은 같다). 이 저장소는 아직 웹 앱이나 배포된 서비스가 아니다. 위 명령은 로컬 CLI/테스트 실행만 가능하다는 뜻이며, 서비스 배포를 의미하지 않는다.

## 읽는 순서

AGENTS/CLAUDE → 마스터 → ROADMAP의 현재 Phase → 해당 Sessions 기록 → 관련 도메인/BUGS/DECISIONS. 실제 코드는 Git status와 함께 확인한다.

로컬 Git은 2026-09-14부터 추적한다. 최초 commit은 당시 진행 중인 변경을 포함한 기준점이며 과거 Phase별 commit을 의미하지 않는다. 세션은 경위·검증을, Git은 파일 변경을 보존한다. 사용자 지정 원격은 [SangJun-Pyo/MyAiScore](https://github.com/SangJun-Pyo/MyAiScore)다. 업로드와 진행 중 변경의 구분은 [인계 기록](docs/Development/Sessions/Session-2026-09-14-Documentation-And-Git.md)을 따른다.

## 이번 보정

- 5개 축 모두 판정 가능할 때만 총점 발급. 미확인은 null/보류.
- 개인 평가 캐시와 소유 권한 분리.
- 요청별 단계 실행 및 중단·재시도 계약.
- 축별 4단계 기준·반례.
- 새 근거와 실제 행동 변화를 분리한 비교.

## 원본 보관

- [v0.2 마스터 원문](_archive/v0.2/00_MASTER_PLAN.original.md)
- 이전 폴더·완료된 지시문·루트 안내는 _archive에 보관했다. 현재 요구사항이 아니다.
- 수정 전 v0.3 전체 문서 ZIP은 _archive/v0.3.1 안에 있다.

아직 npm 실행 명령·서비스 주소·테스트 통과를 제품 상태로 제시하지 않는다. 구현 후 확인된 명령과 결과만 갱신한다.
