# MyAiScore — 제 AI 활용 점수는요?

> **내가 AI를 얼마나 잘 활용하는지, 실제로 만든 프로젝트로 증명한다.**

- 문서 버전: v0.2
- 상태: Planning / Pre-MVP
- 문서 원칙: Markdown Source of Truth
- 제품명(영문): **MyAiScore**
- 사용자 표시명(영문): **My AI Score**
- 제품명(한국어): **제 AI 활용 점수는요?**
- 핵심 질문: **“나는 AI를 얼마나 잘 활용하고 있을까?”**

---

## 1. 제품 한 줄 정의

**MyAiScore는 사용자가 실제로 만든 GitHub 프로젝트와 설계·AI 활용 증거를 분석해, 프로젝트 기술 수준과 엔지니어링 역량을 평가하고, 특히 AI를 얼마나 효과적으로 활용하는지 근거 기반으로 진단해 주는 AI Builder Assessment 서비스다.**

단순 설문형 AI 리터러시 테스트가 아니라, **실제 결과물(Evidence) + 프로젝트 맞춤 인터뷰(Defense) + 정형화된 Rubric**을 결합한다.

---

## 2. 해결하려는 문제

AI 코딩 도구와 에이전트가 빠르게 보급되면서 많은 사람이 ChatGPT, Claude, Codex, Cursor, MCP 등을 활용해 프로젝트를 만들고 있다. 하지만 다음 질문에 객관적으로 답하기 어렵다.

- 나는 AI를 어느 정도 수준으로 활용하고 있는가?
- 내가 만든 결과물은 기술적으로 어느 수준인가?
- 단순히 AI가 코드를 많이 작성한 것과, 사람이 AI를 잘 활용해 좋은 시스템을 만든 것은 어떻게 구분할 수 있는가?
- 다른 사람과 비교하기 전에, 다음 단계로 성장하려면 무엇이 부족한가?
- 채용·포트폴리오에서 “AI를 잘 활용한다”는 말을 어떻게 증명할 수 있는가?

기존의 자기평가형 설문은 사용자의 실제 수행능력을 충분히 반영하기 어렵고, 단순 GitHub 코드 평가는 **AI 활용 과정**을 알기 어렵다.

MyAiScore는 **실제 프로젝트를 먼저 보고, 확인이 필요한 부분만 사용자에게 묻는 방식**으로 이 문제를 해결한다.

---

## 3. 제품 핵심 가설

### 가설 A — 결과물은 가장 강한 1차 증거다

사람이 실제로 만든 프로젝트에는 다음 흔적이 남는다.

- 코드 구조
- 아키텍처
- 데이터 모델
- 테스트
- 보안 설계
- 문서화
- CI/CD
- AI 관련 설정
- CLAUDE.md / AGENTS.md
- MCP 설정
- Prompt / Skill / Workflow 문서
- Git history
- ADR / 설계 결정

이 증거는 일반 설문보다 훨씬 구체적인 평가 기반이 된다.

### 가설 B — Repo만으로 AI 활용 능력을 확정하면 안 된다

좋은 코드가 있다고 해서 사용자가 AI를 잘 활용했다고 단정할 수 없다.

따라서 다음 두 종류의 정보를 결합한다.

1. **Repository Evidence**
2. **Adaptive Interview / Builder Defense**

### 가설 C — 여러 프로젝트는 점수를 “올려주는” 것이 아니라 신뢰도를 높인다

Repo가 많다고 점수를 가산하지 않는다.

여러 프로젝트에서 같은 역량이 반복적으로 확인되면:

- 평가 Confidence 증가
- 기술 Breadth 확인
- 일관된 AI Workflow 확인
- 특정 프로젝트에 우연히 나타난 패턴과 실제 역량을 구분

할 수 있다.

---

## 4. 핵심 평가 결과

MyAiScore는 하나의 점수로 모든 것을 섞지 않는다.

### 4.1 My AI Score — 0~100

**제품의 대표 점수.**

“이 사람은 AI를 실제 프로젝트 수행에 얼마나 효과적으로 활용하는가?”를 평가한다.

> 중요: 좋은 코드 = 높은 AI 점수가 아니다.

### 4.2 Project Quality — 0~100

“제출된 프로젝트 자체가 얼마나 잘 만들어졌는가?”

평가 예시:

- Architecture
- Code Quality
- Testing
- Security
- Maintainability
- Documentation
- Production Readiness

### 4.3 Engineering Skill Profile

“이 사람이 어떤 기술을 어느 수준까지 실제로 사용할 수 있는가?”

예:

| Skill | Level | Confidence |
|---|---|---|
| Next.js | Advanced | High |
| TypeScript | Advanced | High |
| PostgreSQL | Intermediate+ | Medium |
| Testing | Intermediate | Medium |
| MCP / Agent Systems | Advanced | High |

### 4.4 Evidence Confidence — A/B/C/D

점수와 **별도로** 표시한다.

| Grade | 의미 |
|---|---|
| A — Verified | GitHub 직접 연결 + 충분한 Evidence + Interview 일치 |
| B — Strong | 직접 Evidence는 충분하지만 일부 영역이 간접 확인 |
| C — Provisional | Local AI report / 제한된 repository / 팀 기여도 불확실 |
| D — Limited | 자기진술 비중이 높고 직접 검증 가능한 Evidence가 부족 |

---

## 5. My AI Score Rubric v0.1

MVP에서는 AI 활용 능력을 6개 축으로 평가한다.

| Dimension | Weight | 질문 |
|---|---:|---|
| Problem Framing | 15% | AI에게 일을 시키기 전에 문제·제약·완료조건을 얼마나 잘 정의하는가? |
| Context Engineering | 20% | AI가 필요한 맥락을 지속적으로 이해하도록 구조화하는가? |
| Delegation & Decomposition | 15% | 복잡한 작업을 적절한 단위로 나누고 AI에 위임하는가? |
| Tool & Agent Orchestration | 20% | AI가 코드 외의 도구·MCP·Agent workflow를 적절히 사용하도록 설계하는가? |
| Verification & Evaluation | 20% | AI의 결과를 테스트·검증·반박하고 오류를 잡아내는가? |
| Iteration & Human Judgment | 10% | AI 결과를 그대로 수용하지 않고 판단·수정·반복하는가? |

### 평가 레벨

각 Dimension은 0~4의 Rubric Level로 LLM이 판정한다.

- 0: Evidence 없음
- 1: Basic
- 2: Functional
- 3: Advanced
- 4: Agentic / Systematic

**0은 “실력이 없음”과 동일하지 않다.**

Evidence가 부족하면 점수 감점보다 **Confidence 감소**를 우선한다.

---

## 6. Score 계산 원칙

### 6.1 LLM이 최종 숫자를 임의로 정하지 않는다

잘못된 예:

> “전체적으로 좋아 보여서 87점입니다.”

MVP 원칙:

1. LLM이 Criterion별 **Rubric Level + Evidence + Confidence**를 구조화해 반환
2. Application code가 고정된 Weight로 점수를 계산
3. Evidence Confidence는 별도로 산출
4. Rubric / Pipeline version을 Certificate에 저장

### 6.2 기본 계산

```text
Dimension Score
= rubric_level / 4 × 100

My AI Score
= Σ(Dimension Score × Fixed Weight)
```

단, Evidence가 부족한 Dimension은 자동으로 낮은 점수로 간주하지 않고:

- `not enough evidence`
- `interview required`
- `confidence reduced`

중 하나로 처리한다.

### 6.3 Multi-repo 원칙

Repo 개수는 가산점이 아니다.

- 1개 Repo: 평가 가능
- 2~3개 Repo: 동일 역량의 반복 확인 → Confidence 증가
- 서로 다른 Stack: Breadth를 Engineering Profile에 반영
- 최고 점수만 cherry-pick하지 않도록 모든 제출 Repo를 함께 분석

MVP에서는 최대 **3개 Repo**를 권장한다.

---

## 7. 입력 방식

## 7.1 Mode A — GitHub Direct Assessment

MVP의 기본 방식.

### 사용자 흐름

1. GitHub 연결
2. 평가할 Repository 1~3개 선택
3. 각 Repo의 Ownership 선택
   - Solo / Primary Builder
   - Team Project
4. Team Project이면 본인 기여 영역 입력
5. 분석 시작

### Ownership 입력 예

```text
Repository: company-commerce

Ownership: Team Project

제가 담당한 영역:
- 결제 API 설계 및 구현
- 주문 상태 모델링
- Stripe Webhook 처리

관련 경로(선택):
- src/api/payment/**
- src/services/order/**
```

---

## 7.2 Mode B — Local Evidence Assessment

Private/Local repository, 대용량 monorepo, 사내 규정 등으로 GitHub에 직접 연결할 수 없는 사용자를 위한 fallback.

사이트가 **Assessment Prompt**를 생성한다.

사용자는 로컬 저장소에 접근 가능한 Claude Code / Codex / Cursor Agent 등에 Prompt를 넣고 결과 JSON/Markdown을 MyAiScore에 가져온다.

중요 원칙:

> **Local AI는 최종 점수를 매기지 않는다. Evidence를 추출할 뿐이다.**

Local report에는 다음을 요구한다.

- Architecture evidence
- Code quality evidence
- Testing evidence
- Security evidence
- AI workflow evidence
- File path / module / function
- Confirmed / inferred / not verifiable 구분
- 실제 secret 값 출력 금지
- 코드 수정 금지
- destructive command 금지

Local Mode는 조작 가능성이 존재하므로 GitHub Direct보다 **Evidence Confidence가 낮게 시작**한다.

---

## 8. Team Project Attribution

팀 프로젝트에서 repository 전체 품질을 개인 역량으로 평가하면 안 된다.

따라서 다음 신호를 분리한다.

### 사용자 선언

- 담당 기능
- 담당 레이어
- 관련 경로
- 역할
- 작업 기간(선택)

### 시스템 Evidence

- Git author / commit history
- 해당 파일의 기여 흔적
- PR / commit message
- 코드 ownership pattern
- 사용자가 설명한 설계와 실제 코드의 일치

### Attribution Rule

Commit 수와 LOC는 실력 점수로 직접 사용하지 않는다.

대신:

> **“이 Evidence를 이 사용자 개인의 역량 증거로 어느 정도 신뢰할 수 있는가?”**

를 판단하는 **Attribution Confidence**에 사용한다.

---

## 9. Adaptive Interview

Repo 분석만으로 확인하기 어려운 부분을 3~5개의 프로젝트 맞춤 질문으로 확인한다.

### 일반 질문을 피한다

나쁜 예:

> AI를 어떻게 활용하셨나요?

좋은 예:

> `src/app/api`와 client-side Supabase 호출이 함께 존재합니다. 어떤 기준으로 server/client boundary를 나눴고, 이 결정 과정에서 AI를 어떻게 활용했나요?

또는:

> `.mcp.json`과 agent workflow 문서가 확인됩니다. MCP를 단순 코드 생성 외에 어떤 작업에 사용했고, AI가 잘못된 결과를 냈을 때 어떤 검증 루프를 사용했나요?

### Interview의 목적

- 설계 의도를 실제로 이해하고 있는지 확인
- AI가 만든 코드를 무비판적으로 수용했는지 확인
- AI workflow의 실제 사용 방식을 확인
- Team Project의 개인 기여도를 확인
- Repo에서 보이지 않는 Verification / Iteration process 보완

---

## 10. LLM vs Deterministic Algorithm

이 프로젝트의 신뢰도를 좌우하는 핵심 원칙이다.

### LLM에게 맡기는 영역

- Repository 구조의 의미 이해
- Architecture tradeoff 평가
- 복잡한 code flow 해석
- Product engineering judgment
- AI workflow 흔적 해석
- Evidence 후보 추출
- Adaptive question 생성
- Interview answer의 기술적 reasoning 평가
- Strength / Gap 요약
- Next Unlock 생성

### 코드/알고리즘으로 처리하는 영역

- Repo metadata
- file tree
- language 비율
- dependency
- framework/version
- test 존재 여부
- CI 존재 여부
- migration 존재 여부
- Git contributor/commit
- file/path ownership signal
- commit SHA
- line/path reference
- rubric weights
- score aggregation
- confidence calculation
- level threshold
- versioning
- certificate hash/metadata

### 금지 원칙

LLM이 근거 없이 다음을 직접 생성해서는 안 된다.

- 최종 0~100 점수
- “상위 5%” 같은 percentile
- 확인되지 않은 경력/기여도
- repository에서 확인할 수 없는 production metric

---

## 11. Analysis Pipeline

```text
User
  ↓
GitHub / Local Evidence
  ↓
Repo Snapshot Freeze (commit SHA)
  ↓
Static Signal Extractor
  ↓
Repository Reconnaissance
  ↓
Evidence Candidate Retrieval
  ↓
LLM Evidence Evaluator
  ↓
Missing / Ambiguous Evidence Detection
  ↓
Adaptive Interview
  ↓
Rubric Evaluator
  ↓
Deterministic Scoring Engine
  ↓
Confidence Engine
  ↓
Builder Profile
  ↓
Certificate / Share Link
```

---

## 12. GitHub Ingestion MVP

### 필요한 데이터

- repository metadata
- selected commit SHA
- file tree
- source files
- package/config files
- test files
- CI config
- migrations
- AI workflow files
- contributor/commit data

### 분석 제외 기본값

- `node_modules`
- `.next`
- `dist`
- `build`
- generated cache
- binaries
- large media
- vendor directories

### Large Repository 전략

전체 코드를 무조건 LLM context에 넣지 않는다.

1. Tree scan
2. 중요한 파일 후보 선정
3. Static metadata extraction
4. 영역별 evidence retrieval
5. 필요한 파일만 LLM 분석

---

## 13. Security & Privacy

Private repository를 다루므로 제품 신뢰성에서 가장 중요한 부분 중 하나다.

### MVP 원칙

- Read-only GitHub access
- 분석 시점의 commit SHA 고정
- secret 값 출력/저장 금지
- source code 영구 저장 최소화
- 분석용 snapshot은 임시 처리
- 결과에는 code 전체가 아닌 Evidence path + 설명 중심
- 사용자가 Assessment 삭제 가능
- 사용자 승인 없이 Repo 공개 금지

### Local Mode

- 코드 수정 금지
- destructive command 금지
- secret/redacted rule
- production side effect가 있는 명령 실행 금지
- build/test도 안전성 확인 후에만 수행

---

## 14. Result UI

## 14.1 Main Result

```text
┌──────────────────────────────────┐
│         제 AI 활용 점수는요?      │
│                                  │
│             86                   │
│                                  │
│       AGENTIC BUILDER            │
│          LEVEL 4                 │
│                                  │
│ Evidence Confidence: A           │
└──────────────────────────────────┘
```

## 14.2 AI Fluency

```text
Problem Framing          82
Context Engineering      91
Delegation               84
Tool & Agent Use         94
Verification             71
Human Judgment           88
```

## 14.3 Engineering Profile

```text
Next.js          Advanced
TypeScript       Advanced
PostgreSQL       Intermediate+
MCP              Advanced
Testing          Intermediate
```

## 14.4 Evidence

점수를 클릭하면:

- 왜 이 점수를 받았는지
- 어떤 파일/구조가 Evidence인지
- 무엇은 확인할 수 없었는지

를 보여준다.

## 14.5 Next Unlock

한 번에 가장 중요한 다음 성장영역 하나를 보여준다.

예:

> **Next Unlock: Evaluation & Reliability**
>
> AI에게 복잡한 작업을 위임하고 Tool을 연결하는 능력은 강하지만, AI 결과를 자동으로 검증하는 regression/eval loop의 Evidence가 상대적으로 부족합니다.

---

## 15. Certificate / Share

IQ Test 결과처럼 **공유하고 싶은 결과물**을 만든다.

### Certificate 예

```text
MY AI SCORE

86 / 100
AGENTIC BUILDER — LEVEL 4

Strongest Skill
Tool & Agent Orchestration

Next Unlock
Evaluation & Reliability

Evidence Confidence: A
3 Projects Assessed

Rubric v0.1
Assessment Pipeline v0.1
Issued: 2026-XX-XX
```

### Certificate Metadata

- user display name
- assessment ID
- score
- level
- evidence confidence
- assessed repositories
- commit SHA
- rubric version
- pipeline version
- issued_at

### MVP 공유

- Public result URL
- Private / Public toggle
- Share image

---

## 16. MVP Scope

### 반드시 포함

- GitHub login / connection
- Repo 1~3개 선택
- Solo / Team 선택
- Team contribution 입력
- GitHub repository 분석
- Static evidence extraction
- AI evidence evaluation
- 3~5 adaptive questions
- My AI Score
- Project Quality
- Engineering Skill Profile
- Evidence Confidence
- Evidence explanation
- Next Unlock
- Certificate
- Shareable result page

### 가능하면 포함

- Local Evidence Mode
- Local assessment prompt generator

### MVP 이후

- Leaderboard
- Percentile
- Public open-source profile
- 다른 Builder의 구조 참고
- Follow / Compare
- Team AI Fluency
- Company assessment
- Hiring profile
- Verified public badge
- Local CLI
- IDE/Coding Agent integration
- GitHub PR history 고급 분석
- Time-series: “6개월 동안 내 AI 활용 능력이 얼마나 성장했나?”

---

## 17. Leaderboard — Post MVP

Leaderboard 자체가 단순 점수 경쟁이 되면 안 된다.

향후에는 공개를 선택한 사람만 노출하고:

- Overall AI Score
- Tool/Agent Use
- Verification
- Context Engineering
- Open-source Project
- Builder Level

등을 탐색 가능하게 한다.

고득점 사용자의 공개 Repo는 다른 사용자가 **“이 사람은 어떤 구조로 AI를 활용했는지”** 배울 수 있게 연결한다.

주의:

> 초기 사용자 데이터가 충분하지 않은 상태에서는 “상위 1%” 같은 percentile을 제공하지 않는다.

---

## 18. 가장 큰 신뢰성 리스크

### Risk 1 — “AI가 그냥 AI를 평가하는 것 아닌가?”

대응:

- Rubric 고정
- LLM은 Evidence + Level만 구조화
- 최종 숫자는 deterministic engine
- 모든 점수에 Evidence 표시
- Rubric version 공개

### Risk 2 — AI-generated code를 많이 만들면 AI 점수가 높은가?

아니다.

AI Fluency는 생성량이 아니라:

- 문제 정의
- 맥락 제공
- 작업 분해
- Tool orchestration
- 검증
- 반복
- Human judgment

을 평가한다.

### Risk 3 — 좋은 프로젝트를 fork하면 높은 점수를 받는가?

대응:

- Attribution
- Git history
- Adaptive Interview
- Team/Solo declaration
- Confidence grade

### Risk 4 — Local AI report를 조작할 수 있다

대응:

- Local Mode = 낮은 초기 Confidence
- raw evidence/path 요구
- 향후 local verifier/CLI 도입

### Risk 5 — 언어/Framework 편향

대응:

- 공통 Engineering rubric과 stack-specific evidence 분리
- 특정 프레임워크 사용 자체를 점수화하지 않음

---

## 19. Calibration Plan

MVP를 만들기 전에 Rubric을 실제 프로젝트에 대입해 Calibration해야 한다.

### Phase 1 — Internal Gold Set

다양한 수준의 Repo 10~20개 준비:

- Tutorial / CRUD
- Junior portfolio
- Mid-level production-like project
- Strong full-stack project
- AI-heavy project
- Agentic project
- 테스트/보안이 강한 프로젝트
- AI 생성 흔적은 많지만 architecture가 불안정한 프로젝트

### Phase 2 — Human Rating

가능하면 2명 이상의 기술 평가자가 독립적으로:

- Project Quality
- Engineering Skill
- AI Fluency

를 평가한다.

### Phase 3 — Compare

AI 평가와 사람 평가 간 차이를 분석한다.

목적은 “완벽한 객관적 진실”을 만드는 것이 아니라:

> **같은 Evidence를 넣었을 때 일관되고 설명 가능한 평가를 제공하는 것**

이다.

---

## 20. Hackathon Demo Narrative

### 1. 질문

> **“저는 AI를 얼마나 잘 활용하고 있을까요?”**

### 2. 문제

AI를 쓰는 사람은 급증했지만, 실제 활용 수준을 증명하는 방법은 부족하다.

### 3. Input

실제 GitHub Repo 2개 연결.

```text
Project A — Solo
Project B — Team
```

### 4. AI Analysis

화면에서 실제로:

```text
✓ Architecture detected
✓ Testing strategy detected
✓ MCP workflow detected
✓ AI context files detected
✓ Contribution evidence checked
```

### 5. Adaptive Interview

Repo를 읽은 사람만 할 수 있는 질문 3개.

### 6. Result Reveal

```text
MY AI SCORE
86

AGENTIC BUILDER
LEVEL 4
```

### 7. Evidence

“왜 86점인지” 실제 file/path 기반으로 보여준다.

### 8. Next Unlock

“다음 단계는 Evaluation & Reliability입니다.”

### 9. Share

Certificate 생성.

---

## 21. 성공 기준

MVP의 성공은 단순히 LLM이 멋진 평가문을 만드는 것이 아니다.

### 제품 성공 기준

- 처음 보는 사용자가 30초 안에 서비스 목적을 이해
- Repo 연결 → 결과 확인까지 중도 이탈이 적음
- 결과를 보고 “왜 이 점수인지 이해된다”는 느낌 제공
- 사용자에게 실제로 유용한 Next Action 제공
- 결과를 공유하고 싶게 만듦

### 평가 신뢰성 기준

- 같은 Repo를 반복 평가했을 때 큰 점수 변동이 없음
- Evidence가 없는 영역은 함부로 추정하지 않음
- Team contribution을 repository 전체 역량으로 오인하지 않음
- 다른 수준의 sample repo를 어느 정도 구분
- LLM model 변경에도 Rubric 의미가 유지됨

---

## 22. 기술 아키텍처 초안

```text
Web Client
Next.js / React
      │
      ▼
Assessment API
      │
      ├── GitHub Integration
      ├── Repo Snapshot Service
      ├── Static Analyzer
      ├── Evidence Retriever
      ├── Interview Agent
      ├── Rubric Evaluator
      ├── Scoring Engine
      └── Certificate Generator
      │
      ▼
Database
      │
      ├── users
      ├── assessments
      ├── repositories
      ├── evidence
      ├── interview_questions
      ├── interview_answers
      ├── dimension_scores
      └── certificates
```

---

## 23. 초기 기술 스택

MVP 후보:

- Next.js
- React
- TypeScript
- Supabase/PostgreSQL
- GitHub App
- Claude or GPT 계열 LLM
- Vercel AI SDK 또는 직접 API wrapper
- Vercel / Cloudflare 중 배포 환경 확정
- Structured Output(JSON Schema)
- Background job / queue는 실제 분석 latency를 측정한 뒤 도입

중요:

> 기술 스택 개수를 늘리는 것이 목적이 아니다.  
> **Repository evidence를 신뢰성 있게 평가하는 파이프라인이 핵심 기술이다.**

---

## 24. 반드시 Freeze할 제품 원칙

1. **좋은 코드 = 높은 AI 활용 점수가 아니다.**
2. **Repo 개수 = 점수 가산점이 아니다.**
3. **Evidence 없음 = 실력 없음이 아니다.**
4. **LLM은 최종 숫자를 임의로 정하지 않는다.**
5. **모든 중요한 평가는 Evidence를 보여줄 수 있어야 한다.**
6. **Team repository 전체를 개인 역량으로 평가하지 않는다.**
7. **Private source code를 제품 성장 데이터로 임의 활용하지 않는다.**
8. **Percentile은 충분한 실제 사용자 표본이 생기기 전에는 제공하지 않는다.**
9. **Assessment 결과는 Rubric/Pipeline version과 함께 고정한다.**
10. **사용자가 결과에 동의하지 않을 때 근거를 확인할 수 있어야 한다.**

---

## 25. 다음 상세 설계 순서

다음 작업은 UI 개발이 아니라 아래 순서로 진행한다.

1. `SCORING_RUBRIC.md` 확정
2. `EVIDENCE_SCHEMA.md` 작성
3. `CONFIDENCE_MODEL.md` 작성
4. 실제 Repo 3~5개로 수동 Calibration
5. GitHub ingestion PoC
6. LLM structured evaluation PoC
7. Adaptive Interview PoC
8. 결과 UI
9. Certificate
10. Hackathon Demo scenario 고정

---

# Final Product Statement

> **MyAiScore는 “AI를 쓰고 있다”는 자기소개를 평가하지 않는다.  
> 실제로 무엇을 만들었고, 그 과정에서 AI를 어떻게 활용했는지를 증거로 평가한다.**

### 사용자에게 보여줄 한 문장

> **내 프로젝트를 보여주세요. 당신의 AI 활용 수준을 증명해드릴게요.**
