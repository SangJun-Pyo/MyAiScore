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

const profileNames: Record<string, { ko: string; en: string }> = {
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
};

export function repositoryProfilePresentation(profile: RepositoryCollaborationProfile, locale: Locale) {
  const poles = locale === "ko" ? koPoles : enPoles;
  const dimensions = locale === "ko" ? koDimensions : enDimensions;
  const reasons = locale === "ko" ? koReasons : enReasons;
  const selected = profile.dimensions.map(item => item.selectedPole).filter((pole): pole is RepositoryCollaborationProfilePole => pole !== null);
  const confidenceCaveats = profile.reasons.length + profile.dimensions.filter(item => item.nearBoundary).length;
  const confidence = confidenceCaveats === 0 ? "high" : confidenceCaveats === 1 ? "medium" : "low";
  const confidenceLabel = locale === "ko"
    ? `유형 신뢰도 · ${confidence === "high" ? "높음" : confidence === "medium" ? "보통" : "낮음"}`
    : `Profile confidence · ${confidence}`;
  return {
    eyebrow: locale === "ko" ? "저장소에서 보이는 협업 유형" : "COLLABORATION PROFILE VISIBLE IN THIS REPOSITORY",
    title: profile.status === "assigned"
      ? profileNames[profile.code ?? ""]?.[locale] ?? selected.map(pole => poles[pole]).join(" · ")
      : locale === "ko" ? "유형 판단 보류" : "Profile withheld",
    description: profile.status === "assigned"
      ? locale === "ko"
        ? profile.reasons.length > 0
          ? "관찰된 신호로 가장 가까운 유형을 표시했어요. 근거가 제한적이어서 신뢰도는 낮을 수 있으며, 능력이나 성격 유형이 아닙니다."
          : "점수의 높낮이가 아니라 관찰된 신호가 어디에 놓였는지를 네 글자로 요약했어요. 능력이나 성격 유형이 아닙니다."
        : profile.reasons.length > 0
          ? "This is the closest profile from the observed signals. Limited evidence can lower confidence; it is not a personality or ability type."
          : "The four letters summarize where observed signals sit, not how high the score is. This is not a personality or ability type."
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
    guideTitle: locale === "ko" ? "네 가지 상대적 성향으로 유형을 만듭니다." : "Four relative dimensions form the profile.",
    guideIntro: locale === "ko"
      ? "각 차원은 저장소에서 관찰된 신호의 상대적 배치입니다. 점수 등급이나 사람의 성격을 뜻하지 않습니다."
      : "Each dimension describes the relative placement of observed repository signals. It is neither a score grade nor a personality assessment.",
    strength: (left: number, right: number) => locale === "ko"
      ? `왼쪽 ${Math.round(left * 100)}% · 오른쪽 ${Math.round(right * 100)}%`
      : `Left ${Math.round(left * 100)}% · right ${Math.round(right * 100)}%`,
  };
}
