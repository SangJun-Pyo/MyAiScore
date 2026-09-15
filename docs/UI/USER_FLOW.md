# User Flow v0.6

## 시각 방향과 언어 (2026-09-15)

현재 제품 UI는 영어 전용이다. 내비게이션·입력·질문 생성 지시·결과 안내·공유·오류·기준표 설명·합성 예시를 영어로 제공하며 언어 전환기나 한국어 fallback을 두지 않는다. 사용자 제출 원문·기존 개인 평가 기록·원문 인용은 소급 번역하지 않는다. 내부 기획·실행 이력과 교정 fixture의 한국어는 보존한다.

전체 랜딩은 ThreeUI Landing Pages의 무료 Community **Kage**를 참고한다. 넓은 첫 화면, 큰 타이포그래피, 번호별 장 안내, 여백이 있는 본문과 마지막 시작 안내를 MyAiScore의 근거 중심 제품 흐름으로 재구성한다. 어두운 배경·밝은 글자·따뜻한 코럴 강조를 홈뿐 아니라 프로필·분석·평가·결과에도 적용한다. Kage의 사원 정체성·이미지·음악이나 원본 HTML iframe은 사용하지 않는다. [참조·적용 프롬프트](References/THREEUI_KAGE_LANDING_ADAPTATION.md), [ADR-0010](../Architecture/ADR/0010-english-landing-page-experience.md).

현재 #20 디자인은 [DESIGN_SYSTEM](DESIGN_SYSTEM.md)과 [ADR-0011](../Architecture/ADR/0011-consistent-assessment-design.md)을 따른다. 중립 차콜 `#111213`, 표면 `#18191b`/`#202123`, 글자 `#efeeeb`/`#a4a5a4`, 행동·선택용 코럴 `#e58c75`를 공통으로 사용한다. 이전 녹색 기운·보라·시안·glow 중심의 화면은 현재 기준이 아니다.

히어로는 자체 작성한 **EvidencePreview**로 교체한다. A–E 탭 중 D가 기본이며 Project evidence → Your decision → Review를 보여준다. “Illustrative preview”와 실제 프로젝트를 분석하지 않았다는 설명을 표시한다. 점수·진행률·실행 기록을 꾸며 넣지 않는다. 키보드 좌우/Home/End를 지원하고 모션 감소 시 등장 애니메이션을 생략한다.

Logic Core·HeroScene·WebGL·Three.js 의존성은 퇴역하며 이전 적용과 검증은 [과거 참조](References/THREEUI_LOGIC_CORE_ADAPTATION.md)에 보존한다. ThreeUI Diagnostics Panel의 Canvas2D 효과 3종도 검토했지만 제품 근거 검토와 달라 코드를 복사하지 않았다. Approach 이후 랜딩 내용·영어 UI·평가·공개·동의 흐름과 공식은 유지한다.

정본 허브: [마스터 플랜](../00_MASTER_PLAN.md). 상태·API: [API_DATA_CONTRACTS](../Architecture/API_DATA_CONTRACTS.md). 결과 필드: [EVIDENCE_SCHEMA](../Assessment/EVIDENCE_SCHEMA.md).

## 1. 흐름

예시 체험 → URL 입력 → 사례 입력/건너뛰기 → 수집 → 맞춤 질문 생성 → 답변/건너뛰기 → 진단·점수 발급 또는 보류 → 개선 작업서 → 사용자의 개선 → 새 평가 비교.

### 현재 화면 구성 (Phase 6)

- `/`: “Build with AI. Know your part.” 첫 화면과 명시적인 5축 근거 검토 예시, Approach → Process → Five lenses → 합성 결과 → 한계 FAQ → 시작 안내로 이어지는 전체 랜딩. 장 링크는 해당 섹션으로 이동하고 축별 링크는 `/insights?axis=A` 등으로 연결한다. 소개의 수치 1/5/1은 저장소·평가 축·개선 작업서의 제품 범위이며 사용 실적이 아니다.
- `/evaluate`: URL·동의를 중심으로 한 단일 입력 폼. 선택적 협업 사례와 발췌를 펼쳐 입력하며 지원되는 필드는 유지한다. 실제 모델 미설정 상태에서 실행이 불가능하다는 기존 안내를 유지한다.
- `/profile`: 이 탭의 소유 토큰으로 찾은 핵심 평가 이력 목록. 가상 계정 소개·빈 통계·중복 마케팅을 표시하지 않는다. 빈 상태/오류/진행 중/완료/보류를 구분한다. 만료되지 않은 최신 50개까지이며 더 있음 여부를 표시한다. GitHub 계정 인증이나 영구 계정 프로필이 아니다.
- `/insights`: 평가 선택과 A~E 탭. 선택된 프로젝트의 관찰 상태·레벨·근거·설명·부족한 근거를 우선 표시하고 공통 기준은 필요할 때 펼쳐 읽는다. 기록이 없어도 기준을 볼 수 있고 synthetic 예시는 명시적 전환으로만 보여준다.
- 기존 `/assessments/:id`, `/results/:share_id`의 처리·결과·공유 흐름은 유지한다. 홈의 `?view=example` 예시 링크도 지원한다.

프로필/분석의 실기록은 인증된 서버 데이터이며 예시 결과로 채우지 않는다. sessionStorage를 잃으면 접근을 복구할 수 없고 평가 접근은 생성 후 7일에 만료한다. 축 선택은 키보드로 조작할 수 있어야 한다. 설계 근거: [ADR-0007](../Architecture/ADR/0007-anonymous-assessment-workspace.md).

## 2. 입력과 처리

### 2.1 랜딩

로그인 없이 전체 소개와 명시적인 합성 예시를 제공한다. 예시에는 “SYNTHETIC EXAMPLE”과 실제 사용자의 결과나 모델 평가가 아니라는 설명을 표시하고 executed_at=null을 유지한다. 현재 런타임 예시는 가상의 예약 폼에 대한 5개 근거와 71점([3,3,2,3,3])이다. 실제 실행 자료는 출처와 실제 실행 시각을 표시한다. 고정된 가짜 실행 날짜를 넣지 않는다.

### 2.2 URL·사례

URL 제출로 draft를 만들고 소유 토큰을 저장한다. 사례는 문제·제약·완료조건·AI 제안·사람의 판단·검증 결과를 간단히 받는다. 선택적 발췌는 사용자가 직접 고른다.

영어 안내는 사례와 답변이 선택임을 설명하고, 없는 협업 행동을 추정하지 않으며 근거가 부족하면 해당 축과 총점을 보류한다는 사실을 명시한다.

사례 제출/건너뛰기 후 ingest → questions 요청을 차례로 호출한다. 사례를 수정하면 파생 수집·질문이 다시 필요하다는 점을 알린다.

### 2.3 진행 상태

| lifecycle status | 화면 |
|---|---|
| draft | 입력/분석 시작. 수집 완료된 draft면 질문 생성으로 계속 |
| ingesting | 선정된 저장소 파일을 읽는 중 |
| generating_questions | 근거에 맞춘 질문을 만드는 중 |
| awaiting_answers | 질문 3개와 답변/건너뛰기 |
| scoring | 근거를 대조해 진단과 개선 행동을 정리하는 중 |
| done | 발급 또는 보류 결과 |
| failed | 사유와 가능한 재시도 |

각 처리 요청은 단계 완료를 기다린다. 보조 GET 폴링은 조회만 한다. 새로고침하면 토큰과 ID로 상태를 복원하지만, 중단 작업이 자동 완료됐다고 표시하지 않는다. needs_retry=true이면 “The process was interrupted.”와 해당 단계 재시도 안내를 노출한다.

### 2.4 질문

각 질문은 grounding_evidence_ids에 연결된 실제 파일/자료 설명을 보여준다. 답변은 선택이며 AI 도움을 금지하지 않는다. 빈 답변을 제출 근거로 간주하지 않는다. 답변 저장 뒤 finalize를 명시적으로 호출한다.

## 3. 결과

상단: 대표 진단, My AI Score 또는 점수 보류, 근거 범위·출처·과정 자료·미확인 사항. 축별 자세한 레벨과 파일 근거는 펼쳐 볼 수 있게 한다. 성능·개인 능력 인증을 암시하지 않는다.

### 3.1 발급 예시 (synthetic)

~~~text
SYNTHETIC EXAMPLE
My AI Score 71 / 100
5/5 dimensions observed
An experimental review limited to this project and the submitted evidence.

A Level 3 (75) · B Level 3 (75) · C Level 2 (50)
D Level 3 (75) · E Level 3 (75)

Next action: Record your tool choice and alternatives
[View evidence] [Copy improvement task]
~~~

현재 척도는 1~4단계이므로 발급 범위는 25~100이다. 점수 해설에서 이 규칙을 확인할 수 있게 한다.

### 3.2 일부 항목 미확인 (synthetic)

~~~text
My AI Score: Score withheld
4/5 dimensions observed. Evidence for C is missing.

A Level 2 · B Level 3 · C Not observed · D Level 3 · E Level 2

Supported observations and next actions remain available.
To assess C: connect the chosen approach to the task constraints.
[View evidence] [Copy improvement task]
~~~

4/5 결과를 55점 등으로 발급하지 않는다. 미확인 값을 0점으로 그리거나 레이더 차트의 최저점에 배치하지 않는다.

### 3.3 부분 수집·과정 자료 없음

partial 수집이면 선정/읽은 파일 수와 누락 이유를 보여주고 총점을 보류한다. complete 수집도 전체 코드 검증을 의미하지 않는다.

과정 자료가 없으면 코드에서 관찰한 사실과 미확인 과정을 구분한다. “테스트 파일 존재”를 “AI 결과 검증 성공”이라고 바꾸지 않는다.

### 3.4 다음 행동과 공유

개선 작업서는 확인된 문제 또는 먼저 확인할 가정을 다룬다. 근거를 더 제출하면 무조건 점수가 오른다고 약속하지 않는다.

공개는 완료 결과의 요약 미리보기 후 사용자가 선택한다. 사례·답변·발췌 원문과 관리 토큰은 공유하지 않는다. 공유 URL의 방문자에게 서버에서 공개 DTO만 제공한다.

## 4. 전후 비교

EVIDENCE_SCHEMA의 Comparison을 따른다. 두 평가의 버전·범위와 총점 발급 여부가 맞지 않으면 점수 상승률을 표시하지 않는다.

~~~text
D: Not observed → Level 3
Added evidence: historical verification records
Behavior change: not established by this submission alone.
~~~

위 예시는 evidence_change=added, behavior_change=not_established다. 실제 전후 검증 행동/결과가 근거로 연결될 때만 그 범위에서 개선 또는 악화를 설명한다. 레벨이 같아도 행동 변화는 따로 설명할 수 있다.

## 5. 실패·권한 화면

invalid_url/unsupported_host는 입력 수정, repo_not_found_or_private는 공개 저장소 안내, rate_limited는 재시도 가능 시각, stage_timeout은 해당 단계 재시도, output_validation_failed는 판정 생성 실패로 안내한다.

partial 수집은 결과의 경고이며 무조건 전체 실패 화면으로 보내지 않는다. 비공개 결과의 owner 토큰이 없으면 자료를 보여주지 않고, 다른 owner나 철회된 공유 결과는 찾을 수 없음으로 표시한다.

## 6. 문구 원칙

- 대표 문구: “Build with AI. Know your part.”
- 범위: “An experimental review limited to this project and the submitted evidence.”
- 보류: “Score withheld” / “Unobserved dimensions are not counted as zero.”
- 개선: “One next move” / “Copy improvement task”
- 과거 근거 추가: “Adding historical records is different from performing new actions.”
- 축 이름: A “Problem framing”, B “Context & delegation”, C “Tool choice”, D “Verification”, E “Judgment & iteration”.
