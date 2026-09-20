import type {
  RepositoryCollaborationProfile,
  RepositoryCollaborationProfileDimensionId,
  RepositoryCollaborationProfilePole,
  RepositoryCollaborationProfileReason,
} from "../shared/repositoryReport";
import type { Locale } from "./locale";

const koPoles: Record<RepositoryCollaborationProfilePole, string> = {
  D: "기록형",
  R: "실행형",
  H: "직접확인형",
  P: "파이프라인형",
  S: "설계선행형",
  T: "추적중심형",
  F: "집중형",
  E: "균형형",
};

const enPoles: Record<RepositoryCollaborationProfilePole, string> = {
  D: "Documenter",
  R: "Runner",
  H: "Hands-on",
  P: "Pipeline",
  S: "Spec-first",
  T: "Trace-after",
  F: "Focused",
  E: "Even",
};

/**
 * Neutral visual grouping by position within each SJTI dimension: gold marks
 * the left pole and violet marks the right pole. The colors do not imply a
 * shared human/automation meaning or a better/worse result. They deliberately
 * avoid the product accent and mint tokens, which already communicate action
 * and complete states elsewhere.
 */
export const REPOSITORY_PROFILE_POLE_TONE: Record<RepositoryCollaborationProfilePole, "gold" | "violet"> = {
  D: "gold",
  H: "gold",
  S: "gold",
  F: "gold",
  R: "violet",
  P: "violet",
  T: "violet",
  E: "violet",
};

const koDimensions: Record<RepositoryCollaborationProfileDimensionId, { title: string; description: string }> = {
  orientation: { title: "기록 ↔ 실행", description: "맥락·기록 신호와 검증·자동화 신호의 상대적 비중입니다." },
  workflow: { title: "직접 확인 ↔ 파이프라인", description: "테스트·로컬 도구와 CI·배포 자동화의 상대적 비중입니다." },
  timing: { title: "설계 선행 ↔ 사후 추적", description: "사전 지침·템플릿과 변경·결정·적용 가능한 마이그레이션 기록의 상대적 비중입니다." },
  shape: { title: "집중 ↔ 균형", description: "네 점수 축이 한 영역에 몰렸는지 고르게 분포하는지를 나타냅니다." },
};

const enDimensions: Record<RepositoryCollaborationProfileDimensionId, { title: string; description: string }> = {
  orientation: { title: "Documentation ↔ execution", description: "Relative weight of context and traceability versus verification and automation." },
  workflow: { title: "Hands-on ↔ pipeline", description: "Relative weight of tests and local tools versus CI and delivery automation." },
  timing: { title: "Spec-first ↔ trace-after", description: "Relative weight of upfront guidance and templates versus change, decision, and applicable migration records." },
  shape: { title: "Focused ↔ even", description: "Whether the four score axes concentrate in one area or remain relatively even." },
};

const koReasons: Record<RepositoryCollaborationProfileReason, string> = {
  incomplete_collection: "수집 범위가 유형 방향을 안정적으로 판단하기에 부족합니다.",
  insufficient_observed_axes: "관찰된 점수 축이 3개보다 적습니다.",
  insufficient_substantive_signals: "내용 실질이 확인된 신호가 4개보다 적습니다.",
  missing_dimension_evidence: "한 유형 차원의 양쪽 근거가 모두 비어 있습니다.",
  multiple_near_boundaries: "두 개 이상의 유형 차원이 경계선에 가깝습니다.",
};

const enReasons: Record<RepositoryCollaborationProfileReason, string> = {
  incomplete_collection: "The collection scope is too limited to support a stable profile direction.",
  insufficient_observed_axes: "Fewer than three score axes were observed.",
  insufficient_substantive_signals: "Fewer than four signals had measurable substance.",
  missing_dimension_evidence: "Both sides of at least one profile dimension lack evidence.",
  multiple_near_boundaries: "Two or more profile dimensions are close to their boundary.",
};

export const repositoryProfileNames = {
  DHSF: { ko: "설계 도면 수집가", en: "Blueprint Collector" },
  DHSE: { ko: "차분한 설계 기록가", en: "Steady Design Scribe" },
  DHTF: { ko: "흔적 추적 탐정", en: "Trace Detective" },
  DHTE: { ko: "맥락 연결 큐레이터", en: "Context Curator" },
  DPSF: { ko: "자동화 설계 감독", en: "Automation Architect" },
  DPSE: { ko: "균형 잡힌 시스템 설계자", en: "Balanced Systems Designer" },
  DPTF: { ko: "파이프라인 연대기 작가", en: "Pipeline Chronicler" },
  DPTE: { ko: "운영 지도 제작자", en: "Operations Cartographer" },
  RHSF: { ko: "실험실 프로토타이퍼", en: "Lab Prototyper" },
  RHSE: { ko: "균형 잡힌 빌더", en: "Balanced Builder" },
  RHTF: { ko: "버그 추적 사냥꾼", en: "Bug Trail Hunter" },
  RHTE: { ko: "검증 루프 항해사", en: "Verification Navigator" },
  RPSF: { ko: "자동화 개척자", en: "Automation Pioneer" },
  RPSE: { ko: "풀스택 오케스트레이터", en: "Full-stack Orchestrator" },
  RPTF: { ko: "배포 추적 레인저", en: "Release Trail Ranger" },
  RPTE: { ko: "자율 운영 조율사", en: "Autonomous Operations Conductor" },
} as const;

const profileNames: Record<string, { ko: string; en: string }> = repositoryProfileNames;

const profileDescriptions: Record<string, { ko: string; en: string }> = {
  DHSF: {
    ko: "설계 도면 수집가는 README, 지침, 템플릿처럼 작업 전에 참고할 수 있는 문서 단서를 중심으로 협업 기반을 쌓아가는 저장소 유형입니다.",
    en: "Blueprint Collector repositories build collaboration foundations around upfront documents such as READMEs, instructions, and templates.",
  },
  DHSE: {
    ko: "차분한 설계 기록가는 사전 맥락과 직접 확인 단서를 함께 남기며, 여러 축의 신호를 안정적으로 정리해 가는 저장소 유형입니다.",
    en: "Steady Design Scribe repositories combine upfront context with direct checks while keeping their signals relatively organized.",
  },
  DHTF: {
    ko: "흔적 추적 탐정은 직접 확인과 변경 기록을 중심으로 무엇이 바뀌었고 왜 바뀌었는지 따라갈 단서를 남기는 저장소 유형입니다.",
    en: "Trace Detective repositories emphasize direct checks and change records that help readers follow what changed and why.",
  },
  DHTE: {
    ko: "맥락 연결 큐레이터는 프로젝트 설명, 작업 지침, 결정 기록을 연결해 나중에 맥락을 다시 읽기 쉽게 만드는 저장소 유형입니다.",
    en: "Context Curator repositories connect project context, working instructions, and decision records so later readers can recover the story.",
  },
  DPSF: {
    ko: "자동화 설계 감독은 문서화된 작업 규칙과 파이프라인 단서를 중심으로 반복 작업을 설계된 흐름 안에 묶어두는 저장소 유형입니다.",
    en: "Automation Architect repositories pair documented working rules with pipeline clues to keep repeated work inside a designed flow.",
  },
  DPSE: {
    ko: "균형 잡힌 시스템 설계자는 맥락, 파이프라인, 설계 단서가 비교적 고르게 보이며 협업 구조를 시스템처럼 정리하는 저장소 유형입니다.",
    en: "Balanced Systems Designer repositories show a relatively even mix of context, pipeline, and design signals.",
  },
  DPTF: {
    ko: "파이프라인 연대기 작가는 자동화 흐름과 변경 기록을 함께 남겨 반복 실행과 추적 가능성을 연결하는 저장소 유형입니다.",
    en: "Pipeline Chronicler repositories connect automated flow with change history so repeated execution and traceability stay close.",
  },
  DPTE: {
    ko: "운영 지도 제작자는 파이프라인, 기록, 맥락 단서를 함께 배치해 운영 흐름을 다시 찾아가기 쉽게 만드는 저장소 유형입니다.",
    en: "Operations Cartographer repositories place pipeline, record, and context signals together so operational paths are easier to revisit.",
  },
  RHSF: {
    ko: "실험실 프로토타이퍼는 직접 확인과 실행 단서를 중심으로 빠르게 만들고 시험하며 필요한 맥락을 좁게 남기는 저장소 유형입니다.",
    en: "Lab Prototyper repositories center on direct checks and execution clues, favoring quick build-and-test loops.",
  },
  RHSE: {
    ko: "균형 잡힌 빌더는 직접 확인, 실행 단서, 네 축의 균형을 함께 갖추며 한쪽에 치우치지 않게 협업 기반을 다지는 저장소 유형입니다.",
    en: "Balanced Builder repositories combine direct checks, execution clues, and four-axis balance without leaning too hard on one signal family.",
  },
  RHTF: {
    ko: "버그 추적 사냥꾼은 테스트와 변경 흔적을 중심으로 문제를 재현하고 수정 경로를 따라가기 쉽게 만드는 저장소 유형입니다.",
    en: "Bug Trail Hunter repositories use tests and change traces to make defects easier to reproduce and follow through a fix path.",
  },
  RHTE: {
    ko: "검증 루프 항해사는 테스트와 직접 확인 신호를 중심으로 변경을 점검하고,\n기록·추적 단서를 함께 보며 신뢰를 쌓아가는 저장소 유형입니다.",
    en: "Verification Navigator repositories inspect changes through tests and direct-check signals,\nthen use traceability clues to build confidence over time.",
  },
  RPSF: {
    ko: "자동화 개척자는 실행과 파이프라인 단서를 빠르게 연결해 반복 검사를 자동화 쪽으로 밀어붙이는 저장소 유형입니다.",
    en: "Automation Pioneer repositories connect execution and pipeline clues early, pushing repeated checks toward automation.",
  },
  RPSE: {
    ko: "풀스택 오케스트레이터는 실행, 자동화, 균형 단서를 함께 갖추고 여러 작업 흐름을 하나의 운영 리듬으로 묶는 저장소 유형입니다.",
    en: "Full-stack Orchestrator repositories combine execution, automation, and balance signals into a coordinated operating rhythm.",
  },
  RPTF: {
    ko: "배포 추적 레인저는 자동화된 실행 흐름과 변경 흔적을 함께 남겨 배포와 수정 과정을 추적하기 쉽게 만드는 저장소 유형입니다.",
    en: "Release Trail Ranger repositories combine automated execution flow with change traces so releases and fixes are easier to track.",
  },
  RPTE: {
    ko: "자율 운영 조율사는 파이프라인, 기록, 균형 단서를 함께 갖추고 반복 운영을 스스로 점검할 수 있게 만드는 저장소 유형입니다.",
    en: "Autonomous Operations Conductor repositories combine pipeline, record, and balance signals so repeated operations can check themselves.",
  },
};

export function repositoryProfileNameCatalog(locale: Locale) {
  return Object.entries(repositoryProfileNames).map(([code, names]) => ({
    code,
    name: names[locale],
    description: profileDescriptions[code]?.[locale] ?? "",
  }));
}

export function repositoryProfilePresentation(profile: RepositoryCollaborationProfile, locale: Locale) {
  const poles = locale === "ko" ? koPoles : enPoles;
  const dimensions = locale === "ko" ? koDimensions : enDimensions;
  const reasons = locale === "ko" ? koReasons : enReasons;
  const selected = profile.dimensions.map(item => item.selectedPole).filter((pole): pole is RepositoryCollaborationProfilePole => pole !== null);
  const confidenceCaveats = profile.reasons.length + profile.dimensions.filter(item => item.nearBoundary).length;
  const confidence = confidenceCaveats === 0 ? "high" : confidenceCaveats === 1 ? "medium" : "low";
  const confidenceLabel = locale === "ko"
    ? `SJTI 신뢰도 · ${confidence === "high" ? "높음" : confidence === "medium" ? "보통" : "낮음"}`
    : `SJTI confidence · ${confidence}`;
  return {
    eyebrow: locale === "ko" ? "SJTI · Sang-Jun Type Indicator" : "SJTI · SANG-JUN TYPE INDICATOR",
    title: profile.status === "assigned"
      ? profileNames[profile.code ?? ""]?.[locale] ?? selected.map(pole => poles[pole]).join(" · ")
      : locale === "ko" ? "유형 판단 보류" : "Profile withheld",
    description: profile.status === "assigned"
      ? profileDescriptions[profile.code ?? ""]?.[locale] ?? (locale === "ko"
        ? "점수의 높낮이가 아니라 관찰된 신호가 어디에 놓였는지를 네 글자로 요약한 저장소 유형입니다."
        : "The four letters summarize where observed signals sit, not how high the score is.")
      : locale === "ko"
        ? "근거가 부족하거나 경계에 가까워 네 글자 유형을 억지로 붙이지 않았어요. 점수와 확인된 근거는 그대로 볼 수 있습니다."
        : "The evidence is too limited or too close to multiple boundaries for a responsible four-letter code. The score and observed evidence remain available.",
    code: profile.code,
    confidence,
    confidenceLabel,
    dimensions: profile.dimensions.map(item => ({
      ...item,
      ...dimensions[item.id],
      leftLabel: poles[item.leftPole],
      rightLabel: poles[item.rightPole],
      selectedLabel: item.selectedPole ? poles[item.selectedPole] : locale === "ko" ? "판단 보류" : "Withheld",
      boundaryLabel: item.nearBoundary ? locale === "ko" ? "경계에 가까움" : "Near boundary" : null,
    })),
    reasons: profile.reasons.map(reason => reasons[reason]),
    guideTitle: locale === "ko" ? "SJTI는 네 가지 상대적 성향으로 유형을 만듭니다." : "SJTI uses four relative dimensions.",
    guideIntro: locale === "ko"
      ? "SJTI(Sang-Jun Type Indicator)는 저장소에서 관찰된 신호의 상대적 배치를 네 글자로 요약합니다."
      : "SJTI (Sang-Jun Type Indicator) summarizes the relative placement of observed repository signals in four letters.",
    strength: (left: number, right: number) => locale === "ko"
      ? `왼쪽 ${Math.round(left * 100)}% · 오른쪽 ${Math.round(right * 100)}%`
      : `Left ${Math.round(left * 100)}% · right ${Math.round(right * 100)}%`,
  };
}
