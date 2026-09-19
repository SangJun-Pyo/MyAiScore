import type { RepositoryReportAxis } from "../shared/repositoryReport";
import type { Locale } from "./locale";

const ko = {
  meta: { title: "MyAiScore — 공개 저장소의 AI 협업 신호", description: "로그인 없이 공개 GitHub 저장소의 맥락, 검증 체계, 기록·추적, 자동화 신호를 확인해 보세요." },
  language: { label: "언어 선택", ko: "한국어", en: "EN" },
  shell: {
    skip: "본문으로 건너뛰기", brandHome: "MyAiScore 홈", beta: "데모", navLabel: "주요 메뉴",
    home: "홈", profile: "내 리포트", insights: "해석 가이드", evaluate: "저장소 분석", github: "GitHub",
    footerLead: "공개 저장소에서 AI 협업을 뒷받침하는 신호를 분석합니다.", footerLimit: "개인의 AI 활용 능력을 인증하는 서비스가 아닙니다.",
  },
  report: {
    aria: "저장소 분석 리포트", demoTag: "가상 예시", demoDescription: "화면 구성을 보여드리기 위한 데이터입니다. 실제 저장소를 분석한 결과가 아닙니다.",
    styleEyebrow: "저장소에서 확인된 협업 특성", repository: "저장소", commit: "커밋",
    boundaryStrong: "이 결과는 저장소에 남아 있는 신호를 바탕으로 한 분석이며, 개인의 AI 활용 능력을 인증하지 않습니다.", boundaryMore: "실제 대화에서 이루어진 판단 과정이나 프로젝트의 전체 성과를 보여주는 지표도 아닙니다.",
    axesEyebrow: "네 가지 저장소 신호", axesHeading: "어떤 신호가 점수에 반영됐나요?", candidateUnknown: "후보 파일 수 미확인",
    candidate: (count: number) => `후보 파일 ${count}개`, selected: (count: number) => `분석 파일 ${count}개`, read: (count: number) => `${count}개 확인 완료`,
    complete: "수집 완료", partial: "일부 수집", staticOnly: "저장소에 남아 있는 정적 신호만 반영",
    evidenceFiles: (count: number) => `근거 파일 ${count}개`, noSignal: "분석한 파일에서는 이 축과 관련된 신호를 확인하지 못했습니다.",
    gapsEyebrow: "확인되지 않은 항목", gapsHeading: "확인되지 않은 부분도 분석 결과의 일부입니다.", noGaps: "이번 분석에서는 별도로 표시할 미확인 항목이 없습니다.",
    coverageDetails: "수집 범위 자세히 보기", treeTruncated: "GitHub에서 파일 트리의 일부만 제공했습니다.", selectionLimited: "후보 파일이 많아 정해진 분석 범위 안에서 일부를 선택했습니다.",
    nextChallenge: "다음 단계", saveIntro: "저장은 선택 사항입니다. 원문이나 GitHub 계정 정보 없이 이 요약만 현재 브라우저에 저장됩니다.",
    save: "이 브라우저에 저장", insightsLink: "점수 해석 보기 →", saved: "이 브라우저의 내 리포트에 저장했습니다.", saveError: "브라우저 저장 공간에 리포트를 저장하지 못했습니다.",
  },
  home: {
    kicker: "로그인 없이 바로 시작", title1: "공개 저장소에서", title2: "AI 협업을 뒷받침하는 신호를 찾습니다.", lead1: "GitHub 공개 저장소 주소 하나만 입력하면", lead2: "맥락·검증·기록·자동화와 관련된 신호를 확인할 수 있습니다.",
    primary: "내 저장소 분석하기 ↗", example: "예시 리포트 보기 ↘", availability: "회원가입 불필요 · 공개 저장소만 분석 · AI 모델 호출 없음",
    demoTag: "예시 화면", demoCaption: "실제 개인 평가가 아닌, 저장소에서 확인할 수 있는 신호를 보여주는 예시입니다.",
    chapters: [{ label: "분석 방법", text: "주소 하나로 바로 확인합니다." }, { label: "확인 범위", text: "저장소에 남은 신호만 분석합니다." }, { label: "리포트 예시", text: "점수와 근거를 함께 보여드립니다." }],
    flowLabel: "01 / 분석 방법", flowSide: "공개 GitHub 저장소", flowTitle1: "주소 하나면", flowTitle2: "바로 확인할 수 있어요.", flowIntro: "GitHub 로그인이나 CLI 설치 없이 공개 저장소 URL만 입력하면 됩니다.",
    steps: [{ title: "저장소 주소를 입력합니다.", text: "github.com/소유자/저장소 형식의 공개 GitHub 저장소 주소만 있으면 됩니다." }, { title: "네 가지 신호를 확인합니다.", text: "맥락, 검증 체계, 기록·추적, 자동화와 관련된 파일과 설정을 분석합니다." }, { title: "점수와 근거를 함께 확인합니다.", text: "점수만 보여주는 것이 아니라 평가에 반영된 파일과 확인되지 않은 항목까지 함께 보여드립니다." }],
    scopeLabel: "02 / 확인 범위", scopeSide: "분석의 범위와 한계", scopeTitle1: "저장소에 남은 신호만", scopeTitle2: "있는 그대로 분석합니다.", scopeLead1: "확인할 수 있는 것과", scopeLead2: "확인할 수 없는 것을 명확하게 구분합니다.", scopeBody1: "README, 작업 지침, 테스트, CI, 의사결정 기록처럼 저장소에 남아 있는 협업 기반을 확인합니다.", scopeBody2: "반면 실제 AI와의 대화에서 어떤 판단을 내렸는지, 어떤 제안을 받아들이거나 거절했는지는 저장소만으로 확인할 수 없습니다. 따라서 이 결과는 개인의 AI 활용 능력이나 전체 작업 성과를 인증하는 지표가 아닙니다.",
    demoLabel: "03 / 리포트 예시", demoSide: "가상 데이터", demoTitle1: "점수보다 먼저", demoTitle2: "근거를 확인해 보세요.", demoIntro: "아래 내용은 화면 구성을 설명하기 위한 가상 예시이며 실제 분석 결과로 저장되지 않습니다.",
    profileCardLabel: "내 리포트", profileCardTitle: "원하는 분석 결과만 저장할 수 있습니다.", profileCardText: "현재 브라우저에 최대 20개의 분석 결과를 보관합니다.", insightsCardLabel: "해석 가이드", insightsCardTitle: "네 가지 분석 축의 의미를 확인해 보세요.", insightsCardText: "점수가 의미하는 범위와 분석의 한계를 투명하게 설명합니다.",
    closingKicker: "공개 저장소로 시작하기", closingTitle1: "저장소 주소를 입력하고", closingTitle2: "협업 신호를 확인해 보세요.", closingCta: "저장소 분석하기 ↗", closingText: "회원가입 없이 공개 저장소에 남아 있는 신호만 분석합니다.",
  },
  evaluate: {
    title: "공개 저장소 분석", description: "GitHub 주소 하나로 저장소에 남은 AI 협업 신호를 확인합니다.", label: "공개 GitHub 저장소 URL", placeholder: "https://github.com/owner/repository", submit: "저장소 분석하기", submitting: "분석 중…", help: "공개 저장소만 분석할 수 있습니다. GitHub 로그인이나 별도 계정은 필요하지 않습니다.",
    progressTitle: "저장소의 협업 신호를 찾고 있습니다.", progressText: "파일 목록을 고르고 맥락·검증·기록·자동화 신호를 확인합니다.", complete: "분석이 완료되었습니다.", genericError: "서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    cliSummary: "Claude Code 세션 리포트 CLI가 필요하다면", cliText: "선택한 로컬 Claude Code 세션의 활동 구성은 기존 CLI에서 별도로 만들 수 있습니다. 브라우저가 로컬 대화 기록을 자동으로 읽지는 않습니다.", cliCaption: "이 기능은 공개 저장소 분석과 다른 리포트이며, 설치된 MyAiScore 체크아웃과 Node.js가 필요합니다.",
    errors: {
      invalid_url: "공개 GitHub 저장소 주소 형식을 확인해 주세요.", unsupported_host: "공개 GitHub 저장소 주소 형식을 확인해 주세요.", invalid_commit_ref: "공개 GitHub 저장소 주소 형식을 확인해 주세요.",
      repo_not_found_or_private: "공개 저장소를 찾을 수 없어요. 비공개 저장소는 분석하지 않아요.", github_api_rate_limited: "GitHub 요청 한도에 도달했어요. 잠시 뒤 다시 시도해 주세요.", repository_report_rate_limited: "요청이 잠시 많아요. 잠시 뒤 다시 시도해 주세요.", repository_report_busy: "다른 저장소를 읽고 있어요. 잠시 뒤 다시 시도해 주세요.", repository_collection_failed: "공개 저장소를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.", repository_report_failed: "저장소 리포트를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    },
  },
  profile: {
    title: "내 리포트", description: "직접 저장한 공개 저장소 분석 결과입니다.", newReport: "새 저장소 분석 →", privacy: "계정 없이 현재 브라우저에만 저장됩니다. 브라우저 데이터를 지우면 함께 삭제됩니다.", historyError: "저장된 리포트를 읽을 수 없습니다. 목록을 비우고 다시 시작해 주세요.", updateError: "브라우저 저장 공간을 업데이트하지 못했습니다.", emptyTitle: "저장한 리포트가 없습니다.", emptyText: "공개 저장소를 분석한 뒤 ‘이 브라우저에 저장’을 선택하면 여기에 표시됩니다.", emptyCta: "저장소 분석하기 →", historyAria: "저장된 저장소 리포트", files: (read: number, selected: number) => `${read}/${selected}개 파일`, view: "리포트 보기 →", remove: "삭제", clear: "저장된 리포트 모두 삭제", footnote: "같은 저장소와 커밋은 한 번만 저장되며 최근 결과를 최대 20개까지 보관합니다.", points: (value: number) => `${value}점`,
  },
  insights: {
    title: "해석 가이드", description: "저장소 리포트의 네 축과 한계를 설명합니다.", savedReport: "저장된 리포트", choose: "저장소 선택", emptyTitle: "선택한 리포트가 없습니다.", emptyText: "저장소 분석 결과에서 ‘점수 해석 보기’를 선택하거나 저장된 리포트를 골라 주세요.", emptyCta: "저장소 분석하기 →", guideEyebrow: "점수 읽는 법", guideTitle: "각 축은 최대 25점입니다.", range: "0–25점", guideText: "총점은 저장소에 확인 가능한 신호의 구성을 설명합니다. 점수가 높다고 작업 결과가 더 좋거나 개인의 AI 활용 능력이 더 뛰어나다는 뜻은 아닙니다.",
    matrixEyebrow: "점수 규칙", matrixTitle: "신호별 점수를 모두 공개합니다.", matrixIntro: "각 신호는 한 번만 더해지고, 축별 합계는 25점에서 멈춥니다.", matrixCaption: "네 축의 결정론적 저장소 신호 점수", matrixScrollLabel: "네 축의 신호별 배점표", axisHeader: "축", signalHeader: "저장소 신호", pointsHeader: "점수", axisTotal: "축 합계", points: (value: number) => `${value}점`,
    stylesEyebrow: "협업 스타일 규칙", stylesTitle: "스타일은 점수 분포로 정합니다.", stylesIntro: "총점 구간표가 아닙니다. 아래 순서에서 처음 맞는 규칙 하나를 사용합니다.", ruleStep: (value: string) => `판정 ${value}`, firstSignalsRule: (threshold: number) => `총점이 ${threshold}점 미만이면 이 스타일입니다.`, balancedRule: (minimum: number, spread: number) => `그 외에 네 축이 모두 ${minimum}점 이상이고 최고점과 최저점 차이가 ${spread}점 이하면 이 스타일입니다.`, dominantRule: (axis: string) => `앞 규칙에 해당하지 않을 때 ${axis} 축이 가장 높으면 이 스타일입니다.`, tiePriority: (axes: string) => `최고점 동점 우선순위: ${axes}.`, activeStyle: "현재 선택된 리포트", distributionNote: "현재 스타일도 총점 구간이 아니라 네 축의 분포에서 결정됐습니다.",
  },
  presentation: {
    scoreLabel: "저장소 기반 AI 협업 준비도", scoreExplanation: "선택된 공개 저장소 파일에서 확인된 AI 협업 준비 신호를 종합한 참고용 점수입니다. 개인의 AI 활용 능력이나 코드 품질, 실제 실행 결과를 평가하는 점수는 아닙니다.",
    axes: { context: { label: "맥락", question: "AI가 프로젝트의 목표와 작업 규칙을 이해할 수 있는 단서가 있는가?" }, verification: { label: "검증 체계", question: "결과를 검증할 수 있는 테스트와 점검 장치가 마련되어 있는가?" }, traceability: { label: "기록·추적", question: "무엇을 왜 결정하고 변경했는지 나중에 추적할 수 있는가?" }, automation: { label: "자동화", question: "반복적인 점검을 자동으로 실행할 수 있는 기반이 있는가?" } } satisfies Record<RepositoryReportAxis, { label: string; question: string }>,
  },
} as const;

type DeepWiden<T> = T extends (...args: infer A) => string ? (...args: A) => string : T extends string ? string : T extends readonly (infer U)[] ? readonly DeepWiden<U>[] : T extends object ? { [K in keyof T]: DeepWiden<T[K]> } : T;
export type Messages = DeepWiden<typeof ko>;

const en: Messages = {
  meta: { title: "MyAiScore — AI collaboration signals in public repositories", description: "Explore context, verification, traceability, and automation signals in a public GitHub repository without signing in." },
  language: { label: "Choose language", ko: "한국어", en: "EN" },
  shell: { skip: "Skip to content", brandHome: "MyAiScore home", beta: "DEMO", navLabel: "Main navigation", home: "Home", profile: "Reports", insights: "Guide", evaluate: "Analyze", github: "GitHub", footerLead: "Explore traces of AI collaboration in a public repository.", footerLimit: "Not a certification of personal AI ability." },
  report: {
    aria: "Repository analysis report", demoTag: "SYNTHETIC EXAMPLE", demoDescription: "Invented data that demonstrates the report layout. This is not a real repository result.", styleEyebrow: "Collaboration style visible in this repository", repository: "Repository", commit: "Commit",
    boundaryStrong: "This result describes signals left in a repository; it does not certify personal AI ability.", boundaryMore: "It cannot establish the decisions made in real conversations or the quality of the whole project.",
    axesEyebrow: "Four repository signals", axesHeading: "Which traces contributed to the score?", candidateUnknown: "Candidate count unavailable", candidate: count => `${count} candidates`, selected: count => `${count} selected`, read: count => `${count} read`, complete: "Collection complete", partial: "Partial collection", staticOnly: "Based only on static file signals",
    evidenceFiles: count => `${count} evidence ${count === 1 ? "file" : "files"}`, noSignal: "No signal for this axis was found in the selected sample.", gapsEyebrow: "What could not be established", gapsHeading: "Unknowns belong in the result.", noGaps: "No additional gap was identified by this rule.", coverageDetails: "Collection scope", treeTruncated: "GitHub returned only part of the repository tree.", selectionLimited: "The repository had more candidates than the bounded sample could read.", nextChallenge: "Next challenge", saveIntro: "Saving is optional. Only this summary is stored in this browser, without source content or GitHub account data.", save: "Save in this browser", insightsLink: "Read the score guide →", saved: "Saved to My reports in this browser.", saveError: "The report could not be saved in browser storage.",
  },
  home: {
    kicker: "Start without signing in", title1: "Find AI collaboration traces", title2: "in a public repository.", lead1: "Paste one public GitHub repository URL", lead2: "to inspect context, verification, records, and automation signals.", primary: "Analyze my repository ↗", example: "View an example report ↘", availability: "No account · Public repositories only · No AI model call", demoTag: "SYNTHETIC PREVIEW", demoCaption: "An example of repository signals, not a personal evaluation.",
    chapters: [{ label: "How it works", text: "Paste a URL. Inspect signals." }, { label: "What it sees", text: "Only traces left in files." }, { label: "The report", text: "Evidence and gaps together." }],
    flowLabel: "01 / HOW IT WORKS", flowSide: "PUBLIC GITHUB REPOSITORY", flowTitle1: "One URL is", flowTitle2: "enough to begin.", flowIntro: "Paste a public repository URL without GitHub login or CLI setup.", steps: [{ title: "Paste the URL.", text: "Use a public repository address in the form github.com/owner/repository." }, { title: "Find four kinds of signals.", text: "We inspect files and settings related to context, verification, traceability, and automation." }, { title: "Review evidence and gaps.", text: "The report shows file paths that contributed and what the repository could not establish." }],
    scopeLabel: "02 / SCOPE", scopeSide: "INTERPRETATION BOUNDARY", scopeTitle1: "Read the traces", scopeTitle2: "with honest limits.", scopeLead1: "Separate what is visible", scopeLead2: "from what remains unknown.", scopeBody1: "We look for collaboration foundations such as READMEs, working instructions, tests, CI, and decision records.", scopeBody2: "A repository cannot show every decision made in an AI conversation or prove who contributed. This result does not certify personal ability or project quality.",
    demoLabel: "03 / EXAMPLE REPORT", demoSide: "SYNTHETIC DATA", demoTitle1: "Start with the evidence,", demoTitle2: "then read the score.", demoIntro: "The report below uses invented data and is never added to your history.", profileCardLabel: "MY REPORTS", profileCardTitle: "Keep only the results you choose.", profileCardText: "Store up to 20 reports in this browser.", insightsCardLabel: "GUIDE", insightsCardTitle: "Understand the four axes.", insightsCardText: "See what the score can and cannot say.", closingKicker: "START WITH A PUBLIC REPOSITORY", closingTitle1: "Paste a URL and", closingTitle2: "meet its collaboration signals.", closingCta: "Analyze a repository ↗", closingText: "No account. Only signals from a public repository.",
  },
  evaluate: {
    title: "Analyze a public repository", description: "Use one GitHub URL to inspect the AI collaboration signals left in its files.", label: "Public GitHub repository URL", placeholder: "https://github.com/owner/repository", submit: "Analyze repository", submitting: "Analyzing…", help: "Only public repositories are supported. No GitHub login or MyAiScore account is required.", progressTitle: "Looking for collaboration signals.", progressText: "Selecting files and checking context, verification, records, and automation traces.", complete: "Analysis complete.", genericError: "The server response could not be validated. Please try again shortly.", cliSummary: "Need the Claude Code session report CLI?", cliText: "The existing CLI can separately summarize activity in a selected local Claude Code session. The browser cannot automatically read local conversation records.", cliCaption: "This is separate from repository analysis and requires Node.js plus an installed MyAiScore checkout.",
    errors: { invalid_url: "Check the public GitHub repository URL format.", unsupported_host: "Check the public GitHub repository URL format.", invalid_commit_ref: "Check the public GitHub repository URL format.", repo_not_found_or_private: "The public repository could not be found. Private repositories are not supported.", github_api_rate_limited: "The GitHub request limit was reached. Please try again later.", repository_report_rate_limited: "There are too many requests right now. Please try again shortly.", repository_report_busy: "Another repository is being read. Please try again shortly.", repository_collection_failed: "The public repository could not be read. Please try again shortly.", repository_report_failed: "The repository report could not be created. Please try again shortly." },
  },
  profile: { title: "My reports", description: "Public repository reports you chose to save.", newReport: "Analyze another repository →", privacy: "Reports are stored only in this browser, without an account. Clearing browser data removes them.", historyError: "Saved reports could not be read. Clear the list to start again.", updateError: "Browser storage could not be updated.", emptyTitle: "No saved reports yet.", emptyText: "Analyze a public repository, then choose Save in this browser to keep the result here.", emptyCta: "Analyze a repository →", historyAria: "Saved repository reports", files: (read, selected) => `${read}/${selected} files`, view: "View report →", remove: "Remove", clear: "Clear saved reports", footnote: "The same repository and commit are stored once. This browser keeps up to 20 recent reports.", points: value => `${value} points` },
  insights: {
    title: "Guide", description: "Understand the four repository-report axes and their limits.", savedReport: "Saved report", choose: "Choose a repository", emptyTitle: "No report selected.", emptyText: "Open the score guide from a result or choose one of your saved reports.", emptyCta: "Analyze a repository →", guideEyebrow: "HOW TO READ THE SCORE", guideTitle: "Each axis contributes up to 25 points.", range: "0–25 points", guideText: "The total describes the mix of signals visible in the repository. A higher score does not prove better work or stronger personal AI ability.",
    matrixEyebrow: "SCORING RULES", matrixTitle: "Every signal and point value is visible.", matrixIntro: "Each signal is counted once, and every axis stops at 25 points.", matrixCaption: "Deterministic repository-signal points across four axes", matrixScrollLabel: "Point table for signals across four axes", axisHeader: "Axis", signalHeader: "Repository signal", pointsHeader: "Points", axisTotal: "Axis total", points: value => `${value} points`,
    stylesEyebrow: "COLLABORATION STYLE RULES", stylesTitle: "Style comes from the score distribution.", stylesIntro: "This is not a set of total-score bands. The first matching rule below determines the style.", ruleStep: value => `Rule ${value}`, firstSignalsRule: threshold => `Use this style when the total is below ${threshold}.`, balancedRule: (minimum, spread) => `Otherwise, use this style when every axis is at least ${minimum} and the highest-to-lowest spread is ${spread} or less.`, dominantRule: axis => `If neither earlier rule matches, use this style when ${axis} is the highest axis.`, tiePriority: axes => `Highest-axis tie priority: ${axes}.`, activeStyle: "CURRENT SELECTED REPORT", distributionNote: "The current style also comes from the four-axis distribution, not a total-score band.",
  },
  presentation: { scoreLabel: "Repository AI collaboration readiness", scoreExplanation: "A playful sum of collaboration-readiness signals found in selected public repository files. It does not evaluate personal AI ability, code quality, or successful execution.", axes: { context: { label: "Context", question: "Are there clues that help AI understand the project's goals and rules?" }, verification: { label: "Verification basis", question: "Are there tests or checks intended to examine the result?" }, traceability: { label: "Traceability", question: "Can later readers follow decisions and changes?" }, automation: { label: "Automation", question: "Is there a foundation for running repeated checks automatically?" } } },
};

const messages: Record<Locale, Messages> = { ko, en };
export function messagesFor(locale: Locale): Messages { return messages[locale]; }
