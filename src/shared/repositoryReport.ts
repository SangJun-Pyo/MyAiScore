import { deriveRepositoryCohortComparison, type RepositoryCohortComparison } from "./repositoryCohort";

export type RepositoryReportAxis = "context" | "verification" | "traceability" | "automation";
export type RepositoryReportEvidenceId =
  | "context-readme"
  | "context-guidance"
  | "context-docs"
  | "context-metadata"
  | "context-contracts"
  | "context-reproducibility"
  | "verification-tests"
  | "verification-config"
  | "verification-entrypoint"
  | "verification-test-substance"
  | "verification-test-breadth"
  | "verification-edge-cases"
  | "verification-static-analysis"
  | "verification-coverage"
  | "traceability-changelog"
  | "traceability-decisions"
  | "traceability-templates"
  | "traceability-migrations"
  | "traceability-ownership"
  | "automation-ci"
  | "automation-ci-tests"
  | "automation-ci-quality"
  | "automation-dependencies"
  | "automation-delivery"
  | "automation-scripts"
  | "automation-environment";

export type RepositoryReportScoreSignalId = RepositoryReportEvidenceId | "traceability-commit-practice";
export type RepositoryReportSignalRole = "core" | "conditional" | "bonus";
export type RepositoryReportSignalStatus = "measured" | "unmeasured";

export interface RepositoryReportSignalAssessment {
  id: RepositoryReportScoreSignalId;
  axis: RepositoryReportAxis;
  role: RepositoryReportSignalRole;
  status: RepositoryReportSignalStatus;
  presence: 0 | 1;
  substance: number | null;
  breadth: number;
  quality: number;
  points: number;
  maxPoints: number;
}

export type RepositoryRecommendationEffort = "quick" | "medium" | "large";

export interface RepositoryRecommendation {
  signalId: RepositoryReportScoreSignalId;
  axis: RepositoryReportAxis;
  effort: RepositoryRecommendationEffort;
  evidencePath: string | null;
}

export interface RepositoryReportRequest {
  repo_url: string;
}

export interface RepositoryReportCoverage {
  status: "complete" | "partial";
  basis: "selected_files";
  selectedFiles: number;
  readFiles: number;
  candidateFiles: number | null;
  treeTruncated: boolean;
  selectionLimited: boolean;
  note: string;
}

export interface RepositoryReportEvidenceCard {
  id: RepositoryReportEvidenceId;
  axis: RepositoryReportAxis;
  title: string;
  description: string;
  paths: string[];
}

interface RepositoryReportBase {
  repo: string;
  commitSha: string;
  coverage: RepositoryReportCoverage;
  score: {
    value: number;
    label: "저장소 기반 AI 협업 준비도";
    explanation: string;
    axes: Record<RepositoryReportAxis, { label: string; value: number }>;
  };
  style: { id: string; title: string; description: string };
  evidenceCards: RepositoryReportEvidenceCard[];
  gaps: string[];
  nextChallenge: { title: string; description: string };
}

export interface RepositoryReportV1 extends RepositoryReportBase {
  schemaVersion: "repository-report-v1";
  ruleVersion: "repository-signals-v1";
}

export type RepositoryReportDiagnosticReason =
  | "partial_collection"
  | "tree_truncated"
  | "selection_limited"
  | "unmeasured_test_language"
  | "commit_history_unavailable";

export interface RepositoryReportV2Diagnostics {
  provisional: boolean;
  reasons: RepositoryReportDiagnosticReason[];
  profile: { databaseLikely: boolean };
  hygiene: {
    highConfidenceArtifacts: number;
    generatedArtifactCandidates: number;
    secretLikePaths: number;
  };
  structure: {
    oversizedSourceCandidates: number;
    sourceFilesOver400Lines: number;
    sourceFilesOver800Lines: number;
    topFiveSourceByteShare: number | null;
    largestSelectedSourceFiles: Array<{ path: string; lineCount: number }>;
  };
  commit: {
    sampledCommits: number;
    evaluatedCommits: number;
    excludedMergeOrAutomated: number;
    nonGenericSubjectRatio: number | null;
    distinctSubjectRatio: number | null;
    scopedSubjectRatio: number | null;
    rationaleBodyRatio: number | null;
    referenceRatio: number | null;
  } | null;
}

export type RepositoryCollaborationProfileDimensionId = "orientation" | "workflow" | "timing" | "shape";
export type RepositoryCollaborationProfilePole = "D" | "R" | "H" | "P" | "S" | "T" | "F" | "E";
export type RepositoryCollaborationProfileReason =
  | "incomplete_collection"
  | "insufficient_observed_axes"
  | "insufficient_substantive_signals"
  | "missing_dimension_evidence"
  | "multiple_near_boundaries";

export interface RepositoryCollaborationProfileDimension {
  id: RepositoryCollaborationProfileDimensionId;
  leftPole: RepositoryCollaborationProfilePole;
  rightPole: RepositoryCollaborationProfilePole;
  leftStrength: number;
  rightStrength: number;
  selectedPole: RepositoryCollaborationProfilePole | null;
  nearBoundary: boolean;
}

export interface RepositoryCollaborationProfile {
  version: "repository-collaboration-profile-v1";
  status: "assigned" | "withheld";
  code: string | null;
  dimensions: RepositoryCollaborationProfileDimension[];
  reasons: RepositoryCollaborationProfileReason[];
}

interface RepositoryReportV2Base extends RepositoryReportBase {
  schemaVersion: "repository-report-v2";
  signalScores: RepositoryReportSignalAssessment[];
  diagnostics: RepositoryReportV2Diagnostics;
}

export interface RepositoryReportV2_1 extends RepositoryReportV2Base {
  ruleVersion: "repository-signals-v2.1";
}

export interface RepositoryReportV2_2 extends RepositoryReportV2Base {
  ruleVersion: "repository-signals-v2.2";
  collaborationProfile: RepositoryCollaborationProfile;
}

export interface RepositoryReportV2_3 extends RepositoryReportV2Base {
  ruleVersion: "repository-signals-v2.3";
  collaborationProfile: RepositoryCollaborationProfile;
}

export interface RepositoryReportV2_4 extends RepositoryReportV2Base {
  ruleVersion: "repository-signals-v2.4";
  collaborationProfile: RepositoryCollaborationProfile;
}

export interface RepositoryReportV2_5 extends RepositoryReportV2Base {
  ruleVersion: "repository-signals-v2.5";
  collaborationProfile: RepositoryCollaborationProfile;
}

export interface RepositoryReportV2_6 extends RepositoryReportV2Base {
  ruleVersion: "repository-signals-v2.6";
  collaborationProfile: RepositoryCollaborationProfile;
  recommendations: RepositoryRecommendation[];
  /** Reserved until a versioned fixed-SHA public cohort is checked in. */
  cohort: null;
}

export interface RepositoryReportV2_7 extends RepositoryReportV2Base {
  ruleVersion: "repository-signals-v2.7";
  collaborationProfile: RepositoryCollaborationProfile;
  recommendations: RepositoryRecommendation[];
  cohort: RepositoryCohortComparison | null;
}

export type RepositoryReportV2 = RepositoryReportV2_1 | RepositoryReportV2_2 | RepositoryReportV2_3 | RepositoryReportV2_4 | RepositoryReportV2_5 | RepositoryReportV2_6 | RepositoryReportV2_7;

export type RepositoryReport = RepositoryReportV1 | RepositoryReportV2;

export const REPOSITORY_AXIS_ORDER: RepositoryReportAxis[] = ["context", "verification", "traceability", "automation"];
export const REPOSITORY_LEGACY_EVIDENCE_ORDER: RepositoryReportEvidenceId[] = [
  "context-readme",
  "context-guidance",
  "context-docs",
  "context-metadata",
  "verification-tests",
  "verification-config",
  "traceability-changelog",
  "traceability-decisions",
  "traceability-templates",
  "traceability-migrations",
  "automation-ci",
  "automation-dependencies",
  "automation-delivery",
  "automation-scripts",
];

export const REPOSITORY_V23_EVIDENCE_ORDER = [
  "context-readme",
  "context-guidance",
  "context-docs",
  "context-metadata",
  "context-contracts",
  "context-reproducibility",
  "verification-entrypoint",
  "verification-test-substance",
  "verification-test-breadth",
  "verification-edge-cases",
  "verification-static-analysis",
  "verification-coverage",
  "traceability-changelog",
  "traceability-decisions",
  "traceability-templates",
  "traceability-migrations",
  "traceability-ownership",
  "automation-ci-tests",
  "automation-ci-quality",
  "automation-dependencies",
  "automation-delivery",
  "automation-scripts",
  "automation-environment",
] as const satisfies readonly RepositoryReportEvidenceId[];

export const REPOSITORY_EVIDENCE_ORDER: RepositoryReportEvidenceId[] = [
  ...REPOSITORY_LEGACY_EVIDENCE_ORDER,
  ...REPOSITORY_V23_EVIDENCE_ORDER.filter(id => !REPOSITORY_LEGACY_EVIDENCE_ORDER.includes(id)),
];

export const REPOSITORY_LEGACY_SCORE_SIGNAL_ORDER: RepositoryReportScoreSignalId[] = [
  ...REPOSITORY_LEGACY_EVIDENCE_ORDER,
  "traceability-commit-practice",
];

export const REPOSITORY_SCORE_SIGNAL_ORDER = [
  ...REPOSITORY_V23_EVIDENCE_ORDER,
  "traceability-commit-practice",
] as const satisfies readonly RepositoryReportScoreSignalId[];

export const REPOSITORY_COLLABORATION_PROFILE_DIMENSION_ORDER: RepositoryCollaborationProfileDimensionId[] = [
  "orientation",
  "workflow",
  "timing",
  "shape",
];

export const REPOSITORY_COLLABORATION_PROFILE_POLES = {
  orientation: ["D", "R"],
  workflow: ["H", "P"],
  timing: ["S", "T"],
  shape: ["F", "E"],
} as const satisfies Record<RepositoryCollaborationProfileDimensionId, readonly [RepositoryCollaborationProfilePole, RepositoryCollaborationProfilePole]>;

export const REPOSITORY_COLLABORATION_PROFILE_THRESHOLDS = {
  minimumObservedAxes: 3,
  minimumSubstantiveSignals: 4,
  substantiveFloor: 0.25,
  nearBoundaryDifference: 0.12,
  focusedSpread: 6,
} as const;

export const REPOSITORY_REPORT_COPY = {
  scoreExplanation: "선택된 공개 저장소 파일에서 확인한 협업 준비 신호를 더한 재미용 점수예요. 개인의 AI 활용 능력, 코드 품질, 실행 성공을 평가하지 않아요.",
  scoreExplanationV2: "공개 저장소의 파일 존재뿐 아니라 제한적으로 읽은 내용의 실질과 저장소 규모 대비 범위를 함께 계산한 점수예요. 개인의 AI 활용 능력, 코드 정답이나 실행 성공을 평가하지 않아요.",
  axisLabels: {
    context: "맥락",
    verification: "검증 기반",
    traceability: "기록",
    automation: "자동화",
  },
  coverageNotes: {
    complete: "계획된 공개 파일 표본을 제한 안에서 읽었어요. 저장소 전체나 실행 결과를 확인했다는 뜻은 아니에요.",
    partial: "공개 파일 표본의 일부만 읽었어요. 보이는 신호만 점수에 반영했으며, 없는 신호로 단정하지 않아요.",
  },
  styles: {
    firstSignals: { id: "first-signals", title: "첫 신호 탐험가", description: "작은 단서부터 발견한 저장소예요. 다음 한 가지 습관을 파일로 남기면 점수가 또렷해져요." },
    balanced: { id: "balanced-builder", title: "균형 잡힌 빌더", description: "맥락, 검증, 기록, 자동화 신호가 비교적 고르게 보여요." },
    context: { id: "context-cartographer", title: "맥락 지도 제작자", description: "README와 작업 지침처럼 함께 일하기 위한 맥락 신호가 돋보여요." },
    verification: { id: "verification-radar", title: "검증 레이더", description: "테스트와 검사 설정처럼 결과를 확인하려는 구조가 눈에 띄어요." },
    traceability: { id: "trace-collector", title: "기록 수집가", description: "변경과 결정을 다시 따라갈 수 있는 기록 신호가 돋보여요." },
    automation: { id: "automation-tamer", title: "자동화 조련사", description: "반복 검사를 자동으로 돌리기 위한 저장소 구조가 눈에 띄어요." },
  },
  evidence: {
    "context-readme": { axis: "context", title: "시작 안내", description: "선택된 표본에서 프로젝트 시작점을 설명하는 README를 확인했어요." },
    "context-guidance": { axis: "context", title: "협업 지침", description: "선택된 표본에서 사람과 AI가 참고할 수 있는 작업 지침 파일을 확인했어요." },
    "context-docs": { axis: "context", title: "문서 공간", description: "선택된 표본에서 별도 문서 경로를 확인했어요." },
    "context-metadata": { axis: "context", title: "프로젝트 설정", description: "선택된 표본에서 프로젝트 구조를 설명하는 루트 설정 파일을 확인했어요." },
    "context-contracts": { axis: "context", title: "인터페이스 계약", description: "선택된 표본에서 API·데이터 구조의 계약 파일을 확인했어요." },
    "context-reproducibility": { axis: "context", title: "환경 재현 단서", description: "선택된 표본에서 런타임이나 개발 환경을 고정하는 파일을 확인했어요." },
    "verification-tests": { axis: "verification", title: "테스트 흔적", description: "선택된 표본에서 테스트로 분류되는 파일을 확인했어요. 테스트 통과 여부는 실행하지 않았어요." },
    "verification-config": { axis: "verification", title: "검사 설정", description: "선택된 표본에서 타입, 린트 또는 커버리지 검사 설정을 확인했어요." },
    "verification-entrypoint": { axis: "verification", title: "검사 실행 경로", description: "선택된 표본에서 테스트나 검사를 실행하는 명령 진입점을 확인했어요." },
    "verification-test-substance": { axis: "verification", title: "테스트 내용", description: "선택된 표본의 고유 테스트 선언과 검증문을 제한적으로 확인했어요." },
    "verification-test-breadth": { axis: "verification", title: "테스트 분포", description: "탐색한 트리에서 소스 규모 대비 테스트 파일의 분포를 확인했어요." },
    "verification-edge-cases": { axis: "verification", title: "실패·경계 사례", description: "선택된 테스트에서 오류, 예외, 잘못된 입력이나 경계 사례 단서를 확인했어요." },
    "verification-static-analysis": { axis: "verification", title: "정적 검사", description: "선택된 설정에서 타입·린트 검사의 강도와 실행 단서를 확인했어요." },
    "verification-coverage": { axis: "verification", title: "커버리지 게이트", description: "선택된 설정에서 커버리지 측정이나 최소 기준 단서를 확인했어요." },
    "traceability-changelog": { axis: "traceability", title: "변경 기록", description: "선택된 표본에서 변경 이력을 정리하는 파일을 확인했어요." },
    "traceability-decisions": { axis: "traceability", title: "결정 기록", description: "선택된 표본에서 결정이나 ADR을 기록하는 파일을 확인했어요." },
    "traceability-templates": { axis: "traceability", title: "이슈·PR 틀", description: "선택된 표본에서 이슈나 Pull Request 기록을 돕는 템플릿을 확인했어요." },
    "traceability-migrations": { axis: "traceability", title: "변경 단계", description: "선택된 표본에서 데이터 구조 변경을 추적하는 마이그레이션 파일을 확인했어요." },
    "traceability-ownership": { axis: "traceability", title: "변경 책임 경로", description: "선택된 표본에서 코드 영역별 검토 책임을 정하는 파일을 확인했어요." },
    "automation-ci": { axis: "automation", title: "자동 검사", description: "선택된 표본에서 GitHub Actions 워크플로를 확인했어요. 실행 성공 여부는 확인하지 않았어요." },
    "automation-ci-tests": { axis: "automation", title: "테스트 자동 실행", description: "선택된 워크플로에서 테스트 실행 단서를 확인했어요. 실제 성공 여부는 확인하지 않았어요." },
    "automation-ci-quality": { axis: "automation", title: "품질 검사 자동 실행", description: "선택된 워크플로에서 타입·린트·빌드 검사 단서를 확인했어요." },
    "automation-dependencies": { axis: "automation", title: "의존성 관리", description: "선택된 표본에서 의존성 업데이트 자동화 설정을 확인했어요." },
    "automation-delivery": { axis: "automation", title: "배포 준비", description: "선택된 표본에서 컨테이너나 배포 설정 파일을 확인했어요." },
    "automation-scripts": { axis: "automation", title: "반복 작업 도구", description: "선택된 표본에서 반복 작업을 담는 스크립트나 작업 파일을 확인했어요." },
    "automation-environment": { axis: "automation", title: "환경 자동 구성", description: "선택된 표본에서 개발 환경이나 도구 버전을 자동으로 맞추는 설정을 확인했어요." },
  },
  gaps: {
    context: "선택된 표본에서 README나 협업 지침 같은 맥락 신호를 충분히 확인하지 못했어요.",
    verification: "선택된 표본에서 테스트와 검사 설정 신호를 충분히 확인하지 못했어요.",
    traceability: "선택된 표본에서 변경·결정 기록 신호를 충분히 확인하지 못했어요.",
    automation: "선택된 표본에서 CI나 반복 작업 자동화 신호를 충분히 확인하지 못했어요.",
    partial: "수집 범위가 일부에 그쳐, 표본 밖의 신호는 판단할 수 없어요.",
  },
  challenges: {
    context: { title: "맥락 한 장 남기기", description: "README나 작업 지침에 목표, 제약, 완료 기준을 짧게 적어 다음 협업의 출발점을 만들어 보세요." },
    verification: { title: "깨지는 예시 하나 만들기", description: "중요한 동작을 깨뜨릴 수 있는 입력 하나를 테스트로 남기고 실제 결과를 확인해 보세요." },
    traceability: { title: "결정 하나 연결하기", description: "이번 주의 선택 하나를 이유, 대안, 관련 파일과 함께 짧은 결정 기록으로 남겨 보세요." },
    automation: { title: "검사 하나 자동으로 돌리기", description: "반복해서 확인하는 명령 하나를 CI에 연결하고, 실패했을 때 무엇을 볼지 적어 보세요." },
  },
} as const;

export type RepositoryReportStyleId = (typeof REPOSITORY_REPORT_COPY.styles)[keyof typeof REPOSITORY_REPORT_COPY.styles]["id"];

export const REPOSITORY_STYLE_ORDER: RepositoryReportStyleId[] = [
  "first-signals",
  "balanced-builder",
  "context-cartographer",
  "verification-radar",
  "trace-collector",
  "automation-tamer",
];

export const REPOSITORY_STYLE_THRESHOLDS = {
  firstSignalsTotalExclusive: 20,
  balancedAxisMinimum: 10,
  balancedSpreadMaximum: 6,
} as const;

/** Dominant-axis ties follow the same stable order used throughout the report contract. */
export const REPOSITORY_STYLE_TIE_PRIORITY = REPOSITORY_AXIS_ORDER;

const FIXED_EVIDENCE_POINTS: Record<RepositoryReportEvidenceId, number> = {
  "context-readme": 7,
  "context-guidance": 7,
  "context-docs": 6,
  "context-metadata": 5,
  "context-contracts": 4,
  "context-reproducibility": 4,
  "verification-tests": 21,
  "verification-config": 4,
  "verification-entrypoint": 4,
  "verification-test-substance": 5,
  "verification-test-breadth": 4,
  "verification-edge-cases": 4,
  "verification-static-analysis": 4,
  "verification-coverage": 4,
  "traceability-changelog": 8,
  "traceability-decisions": 9,
  "traceability-templates": 5,
  "traceability-migrations": 3,
  "traceability-ownership": 3,
  "automation-ci": 15,
  "automation-ci-tests": 5,
  "automation-ci-quality": 5,
  "automation-dependencies": 4,
  "automation-delivery": 3,
  "automation-scripts": 3,
  "automation-environment": 3,
};

export const REPOSITORY_COMMIT_PRACTICE_MAX_POINTS = 5;
export const REPOSITORY_V23_COMMIT_PRACTICE_MAX_POINTS = 4;

const REPOSITORY_RECOMMENDATION_EFFORT: Record<RepositoryReportScoreSignalId, { value: number; label: RepositoryRecommendationEffort }> = {
  "context-readme": { value: 1, label: "quick" },
  "context-guidance": { value: 2, label: "medium" },
  "context-docs": { value: 2, label: "medium" },
  "context-metadata": { value: 1, label: "quick" },
  "context-contracts": { value: 3, label: "large" },
  "context-reproducibility": { value: 2, label: "medium" },
  "verification-tests": { value: 3, label: "large" },
  "verification-config": { value: 2, label: "medium" },
  "verification-entrypoint": { value: 1, label: "quick" },
  "verification-test-substance": { value: 3, label: "large" },
  "verification-test-breadth": { value: 3, label: "large" },
  "verification-edge-cases": { value: 2, label: "medium" },
  "verification-static-analysis": { value: 2, label: "medium" },
  "verification-coverage": { value: 3, label: "large" },
  "traceability-changelog": { value: 1, label: "quick" },
  "traceability-decisions": { value: 2, label: "medium" },
  "traceability-templates": { value: 1, label: "quick" },
  "traceability-migrations": { value: 3, label: "large" },
  "traceability-ownership": { value: 2, label: "medium" },
  "traceability-commit-practice": { value: 1, label: "quick" },
  "automation-ci": { value: 3, label: "large" },
  "automation-ci-tests": { value: 2, label: "medium" },
  "automation-ci-quality": { value: 2, label: "medium" },
  "automation-dependencies": { value: 1, label: "quick" },
  "automation-delivery": { value: 3, label: "large" },
  "automation-scripts": { value: 2, label: "medium" },
  "automation-environment": { value: 2, label: "medium" },
};

const V23_EVIDENCE_POINTS: Record<(typeof REPOSITORY_V23_EVIDENCE_ORDER)[number], number> = {
  "context-readme": 5,
  "context-guidance": 5,
  "context-docs": 4,
  "context-metadata": 3,
  "context-contracts": 4,
  "context-reproducibility": 4,
  "verification-entrypoint": 4,
  "verification-test-substance": 5,
  "verification-test-breadth": 4,
  "verification-edge-cases": 4,
  "verification-static-analysis": 4,
  "verification-coverage": 4,
  "traceability-changelog": 6,
  "traceability-decisions": 7,
  "traceability-templates": 4,
  "traceability-migrations": 3,
  "traceability-ownership": 4,
  "automation-ci-tests": 5,
  "automation-ci-quality": 5,
  "automation-dependencies": 4,
  "automation-delivery": 4,
  "automation-scripts": 4,
  "automation-environment": 3,
};

export function repositoryEvidencePoints(id: RepositoryReportEvidenceId): number {
  return FIXED_EVIDENCE_POINTS[id];
}

export function repositoryV23EvidencePoints(id: (typeof REPOSITORY_V23_EVIDENCE_ORDER)[number]): number {
  return V23_EVIDENCE_POINTS[id];
}

export function repositoryStyleCopy(id: RepositoryReportStyleId) {
  const style = Object.values(REPOSITORY_REPORT_COPY.styles).find(item => item.id === id);
  if (!style) throw new Error("Unknown repository report style.");
  return style;
}

export function classifyRepositoryReportStyle(axes: Record<RepositoryReportAxis, number>): RepositoryReportStyleId {
  const total = REPOSITORY_AXIS_ORDER.reduce((sum, axis) => sum + axes[axis], 0);
  if (total < REPOSITORY_STYLE_THRESHOLDS.firstSignalsTotalExclusive) return "first-signals";
  const values = REPOSITORY_AXIS_ORDER.map(axis => axes[axis]);
  if (Math.min(...values) >= REPOSITORY_STYLE_THRESHOLDS.balancedAxisMinimum &&
      Math.max(...values) - Math.min(...values) <= REPOSITORY_STYLE_THRESHOLDS.balancedSpreadMaximum) return "balanced-builder";
  const dominantAxis = REPOSITORY_STYLE_TIE_PRIORITY.reduce((best, axis) => axes[axis] > axes[best] ? axis : best, REPOSITORY_STYLE_TIE_PRIORITY[0]!);
  return REPOSITORY_REPORT_COPY.styles[dominantAxis].id;
}

export function deriveRepositoryReportPresentation(cards: Array<Pick<RepositoryReportEvidenceCard, "id" | "axis">>, coverage: "complete" | "partial") {
  const axes: Record<RepositoryReportAxis, number> = { context: 0, verification: 0, traceability: 0, automation: 0 };
  for (const card of cards) axes[card.axis] = Math.min(25, axes[card.axis] + repositoryEvidencePoints(card.id));
  const value = REPOSITORY_AXIS_ORDER.reduce((sum, axis) => sum + axes[axis], 0);
  const style = repositoryStyleCopy(classifyRepositoryReportStyle(axes));
  const gaps: string[] = REPOSITORY_AXIS_ORDER.filter(axis => axes[axis] < 10).map(axis => REPOSITORY_REPORT_COPY.gaps[axis]);
  if (coverage === "partial") gaps.push(REPOSITORY_REPORT_COPY.gaps.partial);
  const challengeAxis = REPOSITORY_AXIS_ORDER.reduce((lowest, axis) => axes[axis] < axes[lowest] ? axis : lowest, REPOSITORY_AXIS_ORDER[0]!);
  return { axes, value, style, gaps, nextChallenge: REPOSITORY_REPORT_COPY.challenges[challengeAxis] };
}

export function deriveRepositoryReportV2Presentation(
  assessments: Array<Pick<RepositoryReportSignalAssessment, "id" | "axis" | "points">>,
  coverage: "complete" | "partial",
) {
  const axes: Record<RepositoryReportAxis, number> = { context: 0, verification: 0, traceability: 0, automation: 0 };
  for (const item of assessments) axes[item.axis] = Math.min(25, axes[item.axis] + item.points);
  const value = REPOSITORY_AXIS_ORDER.reduce((sum, axis) => sum + axes[axis], 0);
  const style = repositoryStyleCopy(classifyRepositoryReportStyle(axes));
  const gaps: string[] = REPOSITORY_AXIS_ORDER.filter(axis => axes[axis] < 10).map(axis => REPOSITORY_REPORT_COPY.gaps[axis]);
  if (coverage === "partial") gaps.push(REPOSITORY_REPORT_COPY.gaps.partial);
  const challengeAxis = REPOSITORY_AXIS_ORDER.reduce((lowest, axis) => axes[axis] < axes[lowest] ? axis : lowest, REPOSITORY_AXIS_ORDER[0]!);
  return { axes, value, style, gaps, nextChallenge: REPOSITORY_REPORT_COPY.challenges[challengeAxis] };
}

/**
 * Rank concrete improvements by simulated score gain per fixed effort unit.
 * The ranking coefficients stay internal; the public result exposes only the
 * stable action identity, effort band, and an already-validated evidence path.
 */
export function deriveRepositoryRecommendations(
  assessments: RepositoryReportSignalAssessment[],
  cards: Array<Pick<RepositoryReportEvidenceCard, "id" | "paths">>,
): RepositoryRecommendation[] {
  const current = deriveRepositoryReportV2Presentation(assessments, "complete").value;
  const cardById = new Map(cards.map(card => [card.id, card]));
  return assessments
    .map((assessment, index) => {
      if (assessment.status !== "measured" || assessment.points >= assessment.maxPoints) return null;
      if (assessment.id === "traceability-migrations" && assessment.role !== "conditional") return null;
      const simulated = assessments.map(item => item.id === assessment.id ? { ...item, points: item.maxPoints } : item);
      const gain = deriveRepositoryReportV2Presentation(simulated, "complete").value - current;
      if (gain <= 0) return null;
      const effort = REPOSITORY_RECOMMENDATION_EFFORT[assessment.id];
      const path = cardById.get(assessment.id as RepositoryReportEvidenceId)?.paths[0] ?? null;
      return {
        recommendation: { signalId: assessment.id, axis: assessment.axis, effort: effort.label, evidencePath: path } satisfies RepositoryRecommendation,
        roi: gain / effort.value,
        gain,
        index,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => right.roi - left.roi || right.gain - left.gain || left.index - right.index)
    .slice(0, 3)
    .map(item => item.recommendation);
}

const PROFILE_LOCAL_SIGNAL_IDS: RepositoryReportScoreSignalId[] = ["verification-entrypoint", "verification-test-substance", "verification-static-analysis", "automation-scripts"];
const PROFILE_PIPELINE_SIGNAL_IDS: RepositoryReportScoreSignalId[] = ["automation-ci-tests", "automation-ci-quality", "automation-dependencies", "automation-delivery"];
const LEGACY_PROFILE_LOCAL_SIGNAL_IDS: RepositoryReportScoreSignalId[] = ["verification-tests", "verification-config", "automation-scripts"];
const LEGACY_PROFILE_PIPELINE_SIGNAL_IDS: RepositoryReportScoreSignalId[] = ["automation-ci", "automation-dependencies", "automation-delivery"];
const PROFILE_SPEC_SIGNAL_IDS: RepositoryReportScoreSignalId[] = ["context-readme", "context-guidance", "traceability-templates"];
const PROFILE_TRACE_SIGNAL_IDS: RepositoryReportScoreSignalId[] = ["traceability-changelog", "traceability-decisions", "traceability-migrations", "traceability-ownership"];
const LEGACY_PROFILE_TRACE_SIGNAL_IDS: RepositoryReportScoreSignalId[] = ["traceability-changelog", "traceability-decisions", "traceability-migrations"];

function roundedRatio(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1_000) / 1_000;
}

function profileSignalStrength(assessments: RepositoryReportSignalAssessment[], ids: RepositoryReportScoreSignalId[]): number {
  const selected = assessments.filter(item => ids.includes(item.id) && item.status === "measured" &&
    (item.id !== "traceability-migrations" || item.role === "conditional" || item.presence === 1));
  const maximum = selected.reduce((sum, item) => sum + item.maxPoints, 0);
  return maximum === 0 ? 0 : roundedRatio(selected.reduce((sum, item) => sum + item.points, 0) / maximum);
}

function profileDimension(
  id: RepositoryCollaborationProfileDimensionId,
  leftStrength: number,
  rightStrength: number,
  alwaysSelect = false,
): RepositoryCollaborationProfileDimension {
  const [leftPole, rightPole] = REPOSITORY_COLLABORATION_PROFILE_POLES[id];
  const left = roundedRatio(leftStrength);
  const right = roundedRatio(rightStrength);
  const selectedPole = !alwaysSelect && left === 0 && right === 0 ? null : left >= right ? leftPole : rightPole;
  return {
    id,
    leftPole,
    rightPole,
    leftStrength: left,
    rightStrength: right,
    selectedPole,
    nearBoundary: selectedPole !== null && Math.abs(left - right) <= REPOSITORY_COLLABORATION_PROFILE_THRESHOLDS.nearBoundaryDifference,
  };
}

/**
 * Summarize relative repository-signal placement without changing the score.
 * v2.4 always assigns a deterministic code and retains caveat reasons as confidence context.
 * Earlier rule versions keep the historical withheld behavior for stored-report compatibility.
 */
export function deriveRepositoryCollaborationProfile(
  assessments: RepositoryReportSignalAssessment[],
  axes: Record<RepositoryReportAxis, number>,
  diagnostics: Pick<RepositoryReportV2Diagnostics, "reasons">,
  signalVersion: "v22" | "v23" | "v24" = "v24",
): RepositoryCollaborationProfile {
  const alwaysAssign = signalVersion === "v24";
  const axisSpread = Math.max(...REPOSITORY_AXIS_ORDER.map(axis => axes[axis])) - Math.min(...REPOSITORY_AXIS_ORDER.map(axis => axes[axis]));
  const focusStrength = roundedRatio(axisSpread / (REPOSITORY_COLLABORATION_PROFILE_THRESHOLDS.focusedSpread * 2));
  const dimensions = [
    profileDimension("orientation", (axes.context + axes.traceability) / 50, (axes.verification + axes.automation) / 50, alwaysAssign),
    profileDimension("workflow", profileSignalStrength(assessments, signalVersion === "v22" ? LEGACY_PROFILE_LOCAL_SIGNAL_IDS : PROFILE_LOCAL_SIGNAL_IDS), profileSignalStrength(assessments, signalVersion === "v22" ? LEGACY_PROFILE_PIPELINE_SIGNAL_IDS : PROFILE_PIPELINE_SIGNAL_IDS), alwaysAssign),
    profileDimension("timing", profileSignalStrength(assessments, PROFILE_SPEC_SIGNAL_IDS), profileSignalStrength(assessments, signalVersion === "v22" ? LEGACY_PROFILE_TRACE_SIGNAL_IDS : PROFILE_TRACE_SIGNAL_IDS), alwaysAssign),
    profileDimension("shape", focusStrength, 1 - focusStrength, alwaysAssign),
  ];
  const observedAxes = REPOSITORY_AXIS_ORDER.filter(axis => axes[axis] > 0).length;
  const substantiveSignals = assessments.filter(item => item.presence === 1 && item.status === "measured" && (item.substance ?? 0) >= REPOSITORY_COLLABORATION_PROFILE_THRESHOLDS.substantiveFloor).length;
  const blockingCoverage = diagnostics.reasons.some(reason => ["partial_collection", "tree_truncated", "selection_limited", "unmeasured_test_language"].includes(reason));
  const reasons: RepositoryCollaborationProfileReason[] = [
    ...(blockingCoverage ? ["incomplete_collection" as const] : []),
    ...(observedAxes < REPOSITORY_COLLABORATION_PROFILE_THRESHOLDS.minimumObservedAxes ? ["insufficient_observed_axes" as const] : []),
    ...(substantiveSignals < REPOSITORY_COLLABORATION_PROFILE_THRESHOLDS.minimumSubstantiveSignals ? ["insufficient_substantive_signals" as const] : []),
    ...(dimensions.some(item => item.leftStrength === 0 && item.rightStrength === 0) ? ["missing_dimension_evidence" as const] : []),
    ...(dimensions.filter(item => item.nearBoundary).length >= 2 ? ["multiple_near_boundaries" as const] : []),
  ];
  const status = alwaysAssign || reasons.length === 0 ? "assigned" : "withheld";
  return {
    version: "repository-collaboration-profile-v1",
    status,
    code: status === "assigned" ? dimensions.map(item => item.selectedPole).join("") : null,
    dimensions,
    reasons,
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function integer(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
}

function ratio(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Only validated paths may cross the public report boundary. */
export function sanitizeRepositoryPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 300 || value.startsWith("/") || value.includes("\\")) return null;
  // Git paths can contain spaces, but controls and traversal segments are not safe display values.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  const segments = value.split("/");
  if (segments.some(segment => !segment || segment !== segment.trim() || segment === "." || segment === ".." || segment.length > 120)) return null;
  if (segments.some(segment => !/^[\p{L}\p{N} ._@+(),\[\]{}#=~-]+$/u.test(segment))) return null;
  return value;
}

export function parseRepositoryReportRequest(value: unknown): RepositoryReportRequest {
  if (!object(value) || !exactKeys(value, ["repo_url"]) || typeof value.repo_url !== "string") throw new Error("Invalid repository report request.");
  const repoUrl = value.repo_url.trim();
  if (!repoUrl || repoUrl.length > 2048) throw new Error("Invalid repository report request.");
  return { repo_url: repoUrl };
}

function validateIdentityAndCoverage(value: Record<string, unknown>, maxSelectedFiles = 40): { coverage: Record<string, unknown>; status: "complete" | "partial" } {
  const repoParts = object(value) && typeof value.repo === "string" ? value.repo.split("/") : [];
  if (typeof value.repo !== "string" || !/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(value.repo) || repoParts.length !== 2 || repoParts.some(part => part === "." || part === ".." || part.length > 100) ||
      typeof value.commitSha !== "string" || !/^[a-f0-9]{40}$/i.test(value.commitSha)) throw new Error("Invalid repository report.");
  const coverage = value.coverage;
  if (!object(coverage) || !exactKeys(coverage, ["status", "basis", "selectedFiles", "readFiles", "candidateFiles", "treeTruncated", "selectionLimited", "note"]) ||
      !["complete", "partial"].includes(String(coverage.status)) || coverage.basis !== "selected_files" ||
      !integer(coverage.selectedFiles, 0, maxSelectedFiles) || !integer(coverage.readFiles, 0, maxSelectedFiles) || (coverage.readFiles as number) > (coverage.selectedFiles as number) ||
      !(coverage.candidateFiles === null || integer(coverage.candidateFiles, 0, 2_000)) ||
      typeof coverage.treeTruncated !== "boolean" || typeof coverage.selectionLimited !== "boolean" ||
      coverage.note !== REPOSITORY_REPORT_COPY.coverageNotes[coverage.status as "complete" | "partial"]) throw new Error("Invalid repository report coverage.");
  return { coverage, status: coverage.status as "complete" | "partial" };
}

function validateScore(value: Record<string, unknown>, explanation: string) {
  const score = value.score;
  if (!object(score) || !exactKeys(score, ["value", "label", "explanation", "axes"]) || !integer(score.value, 0, 100) ||
      score.label !== "저장소 기반 AI 협업 준비도" || score.explanation !== explanation || !object(score.axes) ||
      !exactKeys(score.axes, REPOSITORY_AXIS_ORDER)) throw new Error("Invalid repository report score.");
  let total = 0;
  for (const axis of REPOSITORY_AXIS_ORDER) {
    const item = score.axes[axis];
    if (!object(item) || !exactKeys(item, ["label", "value"]) || item.label !== REPOSITORY_REPORT_COPY.axisLabels[axis] || !integer(item.value, 0, 25)) throw new Error("Invalid repository report axis.");
    total += item.value as number;
  }
  if (total !== score.value) throw new Error("Invalid repository report score total.");
  return score;
}

function validateStyle(value: Record<string, unknown>) {
  const style = value.style;
  const styles = Object.values(REPOSITORY_REPORT_COPY.styles);
  if (!object(style) || !exactKeys(style, ["id", "title", "description"]) || !styles.some(item => item.id === style.id && item.title === style.title && item.description === style.description)) throw new Error("Invalid repository report style.");
  return style;
}

function validateEvidenceCards(value: Record<string, unknown>, allowedOrder: readonly RepositoryReportEvidenceId[]): RepositoryReportEvidenceCard[] {
  if (!Array.isArray(value.evidenceCards) || value.evidenceCards.length > allowedOrder.length) throw new Error("Invalid repository report evidence.");
  const allowedIds = new Set<RepositoryReportEvidenceId>(allowedOrder);
  const evidenceIds = new Set<string>();
  const parsedCards: RepositoryReportEvidenceCard[] = [];
  for (const card of value.evidenceCards) {
    if (!object(card) || !exactKeys(card, ["id", "axis", "title", "description", "paths"]) || typeof card.id !== "string" || !allowedIds.has(card.id as RepositoryReportEvidenceId) || evidenceIds.has(card.id)) throw new Error("Invalid repository report evidence.");
    const copy = REPOSITORY_REPORT_COPY.evidence[card.id as RepositoryReportEvidenceId];
    if (card.axis !== copy.axis || card.title !== copy.title || card.description !== copy.description || !Array.isArray(card.paths) || card.paths.length < 1 || card.paths.length > 5) throw new Error("Invalid repository report evidence.");
    if (card.paths.some(path => sanitizeRepositoryPath(path) !== path) || new Set(card.paths).size !== card.paths.length) throw new Error("Invalid repository report evidence paths.");
    parsedCards.push(card as unknown as RepositoryReportEvidenceCard);
    evidenceIds.add(card.id);
  }
  return parsedCards;
}

function validateGuidance(value: Record<string, unknown>, derived: ReturnType<typeof deriveRepositoryReportPresentation>) {
  const allowedGaps = new Set<string>(Object.values(REPOSITORY_REPORT_COPY.gaps));
  if (!Array.isArray(value.gaps) || value.gaps.length > 5 || value.gaps.some(gap => typeof gap !== "string" || !allowedGaps.has(gap)) || new Set(value.gaps).size !== value.gaps.length) throw new Error("Invalid repository report gaps.");
  const challenge = value.nextChallenge;
  const challenges = Object.values(REPOSITORY_REPORT_COPY.challenges);
  if (!object(challenge) || !exactKeys(challenge, ["title", "description"]) || !challenges.some(item => item.title === challenge.title && item.description === challenge.description)) throw new Error("Invalid repository report challenge.");
  if (JSON.stringify(value.gaps) !== JSON.stringify(derived.gaps) || challenge.title !== derived.nextChallenge.title || challenge.description !== derived.nextChallenge.description) throw new Error("Repository report guidance does not match its evidence.");
}

function validateDerivedPresentation(
  score: Record<string, unknown>,
  style: Record<string, unknown>,
  derived: ReturnType<typeof deriveRepositoryReportPresentation>,
) {
  const axes = score.axes as Record<string, unknown>;
  for (const axis of REPOSITORY_AXIS_ORDER) {
    const item = axes[axis] as Record<string, unknown>;
    if (item.value !== derived.axes[axis]) throw new Error("Repository report score does not match its evidence.");
  }
  if (score.value !== derived.value || style.id !== derived.style.id || style.title !== derived.style.title || style.description !== derived.style.description) throw new Error("Repository report presentation does not match its evidence.");
}

function expectedAxis(id: RepositoryReportScoreSignalId): RepositoryReportAxis {
  if (id === "traceability-commit-practice") return "traceability";
  return REPOSITORY_REPORT_COPY.evidence[id].axis;
}

function validateSignalScores(value: Record<string, unknown>, databaseLikely: boolean, ruleVersion: "repository-signals-v2.1" | "repository-signals-v2.2" | "repository-signals-v2.3" | "repository-signals-v2.4" | "repository-signals-v2.5" | "repository-signals-v2.6" | "repository-signals-v2.7"): RepositoryReportSignalAssessment[] {
  const modern = ["repository-signals-v2.3", "repository-signals-v2.4", "repository-signals-v2.5", "repository-signals-v2.6", "repository-signals-v2.7"].includes(ruleVersion);
  const signalOrder = modern ? REPOSITORY_SCORE_SIGNAL_ORDER : REPOSITORY_LEGACY_SCORE_SIGNAL_ORDER;
  if (!Array.isArray(value.signalScores) || value.signalScores.length !== signalOrder.length) throw new Error("Invalid repository report signal scores.");
  const assessments: RepositoryReportSignalAssessment[] = [];
  for (let index = 0; index < value.signalScores.length; index += 1) {
    const item = value.signalScores[index];
    const expectedId = signalOrder[index];
    if (!object(item) || !exactKeys(item, ["id", "axis", "role", "status", "presence", "substance", "breadth", "quality", "points", "maxPoints"]) || item.id !== expectedId ||
        item.axis !== expectedAxis(expectedId!) || !["core", "conditional", "bonus"].includes(String(item.role)) || !["measured", "unmeasured"].includes(String(item.status)) ||
        ![0, 1].includes(Number(item.presence)) || !(item.substance === null || ratio(item.substance)) || !ratio(item.breadth) || !ratio(item.quality) ||
        !integer(item.points, 0, 25) || !integer(item.maxPoints, 1, 25)) throw new Error("Invalid repository report signal score.");
    const id = expectedId!;
    const maxPoints = id === "traceability-commit-practice"
      ? modern ? REPOSITORY_V23_COMMIT_PRACTICE_MAX_POINTS : REPOSITORY_COMMIT_PRACTICE_MAX_POINTS
      : modern ? repositoryV23EvidencePoints(id as (typeof REPOSITORY_V23_EVIDENCE_ORDER)[number]) : repositoryEvidencePoints(id);
    const expectedRole: RepositoryReportSignalRole = (modern
      ? ["context-readme", "context-metadata", "context-reproducibility", "verification-entrypoint", "verification-test-substance", "verification-test-breadth", "verification-edge-cases", "verification-static-analysis", "verification-coverage"]
      : ["context-readme", "context-metadata", "verification-tests", "verification-config"]).includes(id)
      ? "core" : id === "traceability-migrations" && databaseLikely ? "conditional" : "bonus";
    if (item.maxPoints !== maxPoints || item.role !== expectedRole || (item.status === "measured") !== (item.substance !== null) ||
        (item.presence === 0 && (item.quality !== 0 || item.points !== 0)) || item.points !== Math.round(maxPoints * Number(item.quality))) throw new Error("Invalid repository report signal derivation.");
    if (id !== "traceability-commit-practice" && item.presence === 0 && (item.status !== "measured" || item.substance !== 0)) throw new Error("Invalid absent repository signal.");
    if (id !== "traceability-commit-practice" && item.presence === 1) {
      const expectedQuality = modern
        ? item.substance === null ? 0.1 : Math.round((0.1 + 0.65 * Number(item.substance) + 0.25 * Number(item.substance) * Number(item.breadth)) * 1_000) / 1_000
        : item.substance === null ? 0.15 : Math.round((0.15 + 0.60 * Number(item.substance) + 0.25 * Number(item.substance) * Number(item.breadth)) * 1_000) / 1_000;
      if (item.quality !== expectedQuality) throw new Error("Invalid repository report signal quality.");
    } else if (id === "traceability-commit-practice") {
      const expectedQuality = item.substance === null ? 0 : Math.round((0.15 + 0.85 * Number(item.substance)) * 1_000) / 1_000;
      if (item.quality !== expectedQuality || (item.presence === 1) !== (item.substance !== null)) throw new Error("Invalid repository report commit signal quality.");
    }
    assessments.push(item as unknown as RepositoryReportSignalAssessment);
  }
  return assessments;
}

function validateRecommendations(value: unknown, assessments: RepositoryReportSignalAssessment[], cards: RepositoryReportEvidenceCard[]): RepositoryRecommendation[] {
  if (!Array.isArray(value) || value.length > 3) throw new Error("Invalid repository recommendations.");
  const parsed: RepositoryRecommendation[] = [];
  for (const item of value) {
    if (!object(item) || !exactKeys(item, ["signalId", "axis", "effort", "evidencePath"]) ||
        !(REPOSITORY_SCORE_SIGNAL_ORDER as readonly string[]).includes(String(item.signalId)) ||
        !REPOSITORY_AXIS_ORDER.includes(item.axis as RepositoryReportAxis) ||
        !["quick", "medium", "large"].includes(String(item.effort)) ||
        !(item.evidencePath === null || sanitizeRepositoryPath(item.evidencePath) === item.evidencePath)) {
      throw new Error("Invalid repository recommendation.");
    }
    parsed.push(item as unknown as RepositoryRecommendation);
  }
  const expected = deriveRepositoryRecommendations(assessments, cards);
  if (JSON.stringify(parsed) !== JSON.stringify(expected)) throw new Error("Repository recommendations do not match their evidence.");
  return parsed;
}

function validateDiagnostics(value: unknown, maxSelectedFiles = 40): RepositoryReportV2Diagnostics {
  if (!object(value) || !exactKeys(value, ["provisional", "reasons", "profile", "hygiene", "structure", "commit"]) || typeof value.provisional !== "boolean" || !Array.isArray(value.reasons)) throw new Error("Invalid repository report diagnostics.");
  const allowedReasons: RepositoryReportDiagnosticReason[] = ["partial_collection", "tree_truncated", "selection_limited", "unmeasured_test_language", "commit_history_unavailable"];
  if (value.reasons.length > allowedReasons.length || value.reasons.some(reason => !allowedReasons.includes(reason as RepositoryReportDiagnosticReason)) || new Set(value.reasons).size !== value.reasons.length || value.provisional !== (value.reasons.length > 0)) throw new Error("Invalid repository report diagnostic reasons.");
  if (!object(value.profile) || !exactKeys(value.profile, ["databaseLikely"]) || typeof value.profile.databaseLikely !== "boolean") throw new Error("Invalid repository report profile.");
  if (!object(value.hygiene) || !exactKeys(value.hygiene, ["highConfidenceArtifacts", "generatedArtifactCandidates", "secretLikePaths"]) ||
      !integer(value.hygiene.highConfidenceArtifacts, 0, 2_000) || !integer(value.hygiene.generatedArtifactCandidates, 0, 2_000) || !integer(value.hygiene.secretLikePaths, 0, 2_000)) throw new Error("Invalid repository report hygiene.");
  const structure = value.structure;
  if (!object(structure) || !exactKeys(structure, ["oversizedSourceCandidates", "sourceFilesOver400Lines", "sourceFilesOver800Lines", "topFiveSourceByteShare", "largestSelectedSourceFiles"]) ||
      !integer(structure.oversizedSourceCandidates, 0, 2_000) || !integer(structure.sourceFilesOver400Lines, 0, maxSelectedFiles) || !integer(structure.sourceFilesOver800Lines, 0, maxSelectedFiles) ||
      !(structure.topFiveSourceByteShare === null || ratio(structure.topFiveSourceByteShare)) || !Array.isArray(structure.largestSelectedSourceFiles) || structure.largestSelectedSourceFiles.length > 5) throw new Error("Invalid repository report structure.");
  for (const file of structure.largestSelectedSourceFiles) {
    if (!object(file) || !exactKeys(file, ["path", "lineCount"]) || sanitizeRepositoryPath(file.path) !== file.path || !integer(file.lineCount, 0, 1_000_000)) throw new Error("Invalid repository report structure path.");
  }
  if (value.commit !== null) {
    const commit = value.commit;
    if (!object(commit) || !exactKeys(commit, ["sampledCommits", "evaluatedCommits", "excludedMergeOrAutomated", "nonGenericSubjectRatio", "distinctSubjectRatio", "scopedSubjectRatio", "rationaleBodyRatio", "referenceRatio"]) ||
        !integer(commit.sampledCommits, 0, 20) || !integer(commit.evaluatedCommits, 0, 20) || !integer(commit.excludedMergeOrAutomated, 0, 20) || commit.evaluatedCommits + commit.excludedMergeOrAutomated !== commit.sampledCommits ||
        [commit.nonGenericSubjectRatio, commit.distinctSubjectRatio, commit.scopedSubjectRatio, commit.rationaleBodyRatio, commit.referenceRatio].some(item => !(item === null || ratio(item)))) throw new Error("Invalid repository report commit diagnostics.");
  }
  return value as unknown as RepositoryReportV2Diagnostics;
}

function validateCollaborationProfile(value: unknown, alwaysAssigned = false): RepositoryCollaborationProfile {
  if (!object(value) || !exactKeys(value, ["version", "status", "code", "dimensions", "reasons"]) ||
      value.version !== "repository-collaboration-profile-v1" || !["assigned", "withheld"].includes(String(value.status)) ||
      !(value.code === null || typeof value.code === "string") || !Array.isArray(value.dimensions) ||
      value.dimensions.length !== REPOSITORY_COLLABORATION_PROFILE_DIMENSION_ORDER.length || !Array.isArray(value.reasons)) {
    throw new Error("Invalid repository collaboration profile.");
  }
  const allowedReasons: RepositoryCollaborationProfileReason[] = [
    "incomplete_collection",
    "insufficient_observed_axes",
    "insufficient_substantive_signals",
    "missing_dimension_evidence",
    "multiple_near_boundaries",
  ];
  if (value.reasons.length > allowedReasons.length || value.reasons.some(reason => !allowedReasons.includes(reason as RepositoryCollaborationProfileReason)) || new Set(value.reasons).size !== value.reasons.length) {
    throw new Error("Invalid repository collaboration profile reasons.");
  }
  for (let index = 0; index < value.dimensions.length; index += 1) {
    const dimension = value.dimensions[index];
    const id = REPOSITORY_COLLABORATION_PROFILE_DIMENSION_ORDER[index]!;
    const [leftPole, rightPole] = REPOSITORY_COLLABORATION_PROFILE_POLES[id];
    if (!object(dimension) || !exactKeys(dimension, ["id", "leftPole", "rightPole", "leftStrength", "rightStrength", "selectedPole", "nearBoundary"]) ||
        dimension.id !== id || dimension.leftPole !== leftPole || dimension.rightPole !== rightPole || !ratio(dimension.leftStrength) || !ratio(dimension.rightStrength) ||
        !(dimension.selectedPole === null || dimension.selectedPole === leftPole || dimension.selectedPole === rightPole) || typeof dimension.nearBoundary !== "boolean") {
      throw new Error("Invalid repository collaboration profile dimension.");
    }
  }
  if ((!alwaysAssigned && (value.status === "assigned") !== (value.reasons.length === 0)) ||
      (alwaysAssigned && (value.status !== "assigned" || value.dimensions.some(dimension => !object(dimension) || dimension.selectedPole === null))) ||
      (value.status === "assigned" ? typeof value.code !== "string" || !/^[DR][HP][ST][FE]$/.test(value.code) : value.code !== null)) {
    throw new Error("Invalid repository collaboration profile status.");
  }
  return value as unknown as RepositoryCollaborationProfile;
}

/** Strict public parser: no unlisted fields or unvalidated paths survive it. */
export function parseRepositoryReport(value: unknown): RepositoryReport {
  if (!object(value)) throw new Error("Invalid repository report.");
  const isV2 = value.schemaVersion === "repository-report-v2";
  const isV22 = isV2 && value.ruleVersion === "repository-signals-v2.2";
  const isV23 = isV2 && value.ruleVersion === "repository-signals-v2.3";
  const isV24 = isV2 && value.ruleVersion === "repository-signals-v2.4";
  const isV25 = isV2 && value.ruleVersion === "repository-signals-v2.5";
  const isV26 = isV2 && value.ruleVersion === "repository-signals-v2.6";
  const isV27 = isV2 && value.ruleVersion === "repository-signals-v2.7";
  const isModern = isV23 || isV24 || isV25 || isV26 || isV27;
  const alwaysAssigned = isV24 || isV25 || isV26 || isV27;
  const keys = isV2
    ? ["schemaVersion", "ruleVersion", "repo", "commitSha", "coverage", "score", "style", "evidenceCards", "gaps", "nextChallenge", "signalScores", "diagnostics", ...(isV22 || isModern ? ["collaborationProfile"] : []), ...(isV26 || isV27 ? ["recommendations", "cohort"] : [])]
    : ["schemaVersion", "ruleVersion", "repo", "commitSha", "coverage", "score", "style", "evidenceCards", "gaps", "nextChallenge"];
  if (!exactKeys(value, keys) || (isV2 ? !["repository-signals-v2.1", "repository-signals-v2.2", "repository-signals-v2.3", "repository-signals-v2.4", "repository-signals-v2.5", "repository-signals-v2.6", "repository-signals-v2.7"].includes(String(value.ruleVersion)) : value.schemaVersion !== "repository-report-v1" || value.ruleVersion !== "repository-signals-v1")) throw new Error("Invalid repository report.");
  const { coverage, status } = validateIdentityAndCoverage(value, isV25 || isV26 || isV27 ? 60 : 40);
  const score = validateScore(value, isV2 ? REPOSITORY_REPORT_COPY.scoreExplanationV2 : REPOSITORY_REPORT_COPY.scoreExplanation);
  const style = validateStyle(value);
  const cards = validateEvidenceCards(value, isModern ? REPOSITORY_V23_EVIDENCE_ORDER : REPOSITORY_LEGACY_EVIDENCE_ORDER);
  if (!isV2) {
    const derived = deriveRepositoryReportPresentation(cards, status);
    validateDerivedPresentation(score, style, derived);
    validateGuidance(value, derived);
    return structuredClone(value) as unknown as RepositoryReportV1;
  }

  const diagnostics = validateDiagnostics(value.diagnostics, isV25 || isV26 || isV27 ? 60 : 40);
  const ruleVersion = value.ruleVersion as "repository-signals-v2.1" | "repository-signals-v2.2" | "repository-signals-v2.3" | "repository-signals-v2.4" | "repository-signals-v2.5" | "repository-signals-v2.6" | "repository-signals-v2.7";
  const assessments = validateSignalScores(value, diagnostics.profile.databaseLikely, ruleVersion);
  const reasonSet = new Set(diagnostics.reasons);
  const testAssessment = assessments.find(item => item.id === (isModern ? "verification-test-substance" : "verification-tests"))!;
  if (reasonSet.has("partial_collection") !== (status === "partial") ||
      reasonSet.has("tree_truncated") !== Boolean(coverage.treeTruncated) ||
      reasonSet.has("selection_limited") !== Boolean(coverage.selectionLimited) ||
      reasonSet.has("unmeasured_test_language") !== (testAssessment.status === "unmeasured") ||
      reasonSet.has("commit_history_unavailable") !== (diagnostics.commit === null)) throw new Error("Repository report diagnostic reasons do not match evidence.");
  const filePresence = new Set(assessments.filter(item => item.id !== "traceability-commit-practice" && item.presence === 1).map(item => item.id));
  if (cards.length !== filePresence.size || cards.some(card => !filePresence.has(card.id))) throw new Error("Repository report evidence does not match signal presence.");
  const derived = deriveRepositoryReportV2Presentation(assessments, status);
  validateDerivedPresentation(score, style, derived);
  validateGuidance(value, derived);

  if (isV22 || isModern) {
    const profile = validateCollaborationProfile(value.collaborationProfile, alwaysAssigned);
    const expectedProfile = deriveRepositoryCollaborationProfile(assessments, derived.axes, diagnostics, isV22 ? "v22" : isV23 ? "v23" : "v24");
    if (JSON.stringify(profile) !== JSON.stringify(expectedProfile)) throw new Error("Repository collaboration profile does not match its evidence.");
  }

  if (isV26 || isV27) {
    validateRecommendations(value.recommendations, assessments, cards);
    if (isV26) {
      if (value.cohort !== null) throw new Error("Repository cohort is unavailable until a fixed reference manifest is released.");
    } else {
      const expectedCohort = deriveRepositoryCohortComparison(derived.value, coverage as unknown as RepositoryReportCoverage);
      if (JSON.stringify(value.cohort) !== JSON.stringify(expectedCohort)) throw new Error("Repository cohort comparison does not match its score and coverage.");
    }
  }

  return structuredClone(value) as unknown as RepositoryReportV2;
}
