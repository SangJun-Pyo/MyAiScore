export type RepositoryReportAxis = "context" | "verification" | "traceability" | "automation";
export type RepositoryReportEvidenceId =
  | "context-readme"
  | "context-guidance"
  | "context-docs"
  | "context-metadata"
  | "verification-tests"
  | "verification-config"
  | "traceability-changelog"
  | "traceability-decisions"
  | "traceability-templates"
  | "traceability-migrations"
  | "automation-ci"
  | "automation-dependencies"
  | "automation-delivery"
  | "automation-scripts";

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

export interface RepositoryReport {
  schemaVersion: "repository-report-v1";
  ruleVersion: "repository-signals-v1";
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

export const REPOSITORY_AXIS_ORDER: RepositoryReportAxis[] = ["context", "verification", "traceability", "automation"];

export const REPOSITORY_REPORT_COPY = {
  scoreExplanation: "선택된 공개 저장소 파일에서 확인한 협업 준비 신호를 더한 재미용 점수예요. 개인의 AI 활용 능력, 코드 품질, 실행 성공을 평가하지 않아요.",
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
    "verification-tests": { axis: "verification", title: "테스트 흔적", description: "선택된 표본에서 테스트로 분류되는 파일을 확인했어요. 테스트 통과 여부는 실행하지 않았어요." },
    "verification-config": { axis: "verification", title: "검사 설정", description: "선택된 표본에서 타입, 린트 또는 커버리지 검사 설정을 확인했어요." },
    "traceability-changelog": { axis: "traceability", title: "변경 기록", description: "선택된 표본에서 변경 이력을 정리하는 파일을 확인했어요." },
    "traceability-decisions": { axis: "traceability", title: "결정 기록", description: "선택된 표본에서 결정이나 ADR을 기록하는 파일을 확인했어요." },
    "traceability-templates": { axis: "traceability", title: "이슈·PR 틀", description: "선택된 표본에서 이슈나 Pull Request 기록을 돕는 템플릿을 확인했어요." },
    "traceability-migrations": { axis: "traceability", title: "변경 단계", description: "선택된 표본에서 데이터 구조 변경을 추적하는 마이그레이션 파일을 확인했어요." },
    "automation-ci": { axis: "automation", title: "자동 검사", description: "선택된 표본에서 GitHub Actions 워크플로를 확인했어요. 실행 성공 여부는 확인하지 않았어요." },
    "automation-dependencies": { axis: "automation", title: "의존성 관리", description: "선택된 표본에서 의존성 업데이트 자동화 설정을 확인했어요." },
    "automation-delivery": { axis: "automation", title: "배포 준비", description: "선택된 표본에서 컨테이너나 배포 설정 파일을 확인했어요." },
    "automation-scripts": { axis: "automation", title: "반복 작업 도구", description: "선택된 표본에서 반복 작업을 담는 스크립트나 작업 파일을 확인했어요." },
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

const FIXED_EVIDENCE_POINTS: Record<RepositoryReportEvidenceId, number> = {
  "context-readme": 7,
  "context-guidance": 7,
  "context-docs": 6,
  "context-metadata": 5,
  "verification-tests": 15,
  "verification-config": 4,
  "traceability-changelog": 7,
  "traceability-decisions": 7,
  "traceability-templates": 5,
  "traceability-migrations": 3,
  "automation-ci": 15,
  "automation-dependencies": 4,
  "automation-delivery": 3,
  "automation-scripts": 3,
};

export function repositoryEvidencePoints(id: RepositoryReportEvidenceId): number {
  return FIXED_EVIDENCE_POINTS[id];
}

export function deriveRepositoryReportPresentation(cards: Array<Pick<RepositoryReportEvidenceCard, "id" | "axis">>, coverage: "complete" | "partial") {
  const axes: Record<RepositoryReportAxis, number> = { context: 0, verification: 0, traceability: 0, automation: 0 };
  for (const card of cards) axes[card.axis] = Math.min(25, axes[card.axis] + repositoryEvidencePoints(card.id));
  const value = REPOSITORY_AXIS_ORDER.reduce((sum, axis) => sum + axes[axis], 0);
  const values = REPOSITORY_AXIS_ORDER.map(axis => axes[axis]);
  const style = value < 20
    ? REPOSITORY_REPORT_COPY.styles.firstSignals
    : Math.min(...values) >= 10 && Math.max(...values) - Math.min(...values) <= 6
      ? REPOSITORY_REPORT_COPY.styles.balanced
      : REPOSITORY_REPORT_COPY.styles[REPOSITORY_AXIS_ORDER.reduce((best, axis) => axes[axis] > axes[best] ? axis : best, REPOSITORY_AXIS_ORDER[0]!)];
  const gaps: string[] = REPOSITORY_AXIS_ORDER.filter(axis => axes[axis] < 10).map(axis => REPOSITORY_REPORT_COPY.gaps[axis]);
  if (coverage === "partial") gaps.push(REPOSITORY_REPORT_COPY.gaps.partial);
  const challengeAxis = REPOSITORY_AXIS_ORDER.reduce((lowest, axis) => axes[axis] < axes[lowest] ? axis : lowest, REPOSITORY_AXIS_ORDER[0]!);
  return { axes, value, style, gaps, nextChallenge: REPOSITORY_REPORT_COPY.challenges[challengeAxis] };
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

/** Strict public parser: no unlisted fields or unvalidated paths survive it. */
export function parseRepositoryReport(value: unknown): RepositoryReport {
  const repoParts = object(value) && typeof value.repo === "string" ? value.repo.split("/") : [];
  if (!object(value) || !exactKeys(value, ["schemaVersion", "ruleVersion", "repo", "commitSha", "coverage", "score", "style", "evidenceCards", "gaps", "nextChallenge"]) ||
      value.schemaVersion !== "repository-report-v1" || value.ruleVersion !== "repository-signals-v1" ||
      typeof value.repo !== "string" || !/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(value.repo) || repoParts.length !== 2 || repoParts.some(part => part === "." || part === ".." || part.length > 100) ||
      typeof value.commitSha !== "string" || !/^[a-f0-9]{40}$/i.test(value.commitSha)) throw new Error("Invalid repository report.");

  const coverage = value.coverage;
  if (!object(coverage) || !exactKeys(coverage, ["status", "basis", "selectedFiles", "readFiles", "candidateFiles", "treeTruncated", "selectionLimited", "note"]) ||
      !["complete", "partial"].includes(String(coverage.status)) || coverage.basis !== "selected_files" ||
      !integer(coverage.selectedFiles, 0, 40) || !integer(coverage.readFiles, 0, 40) || (coverage.readFiles as number) > (coverage.selectedFiles as number) ||
      !(coverage.candidateFiles === null || integer(coverage.candidateFiles, 0, 2_000)) ||
      typeof coverage.treeTruncated !== "boolean" || typeof coverage.selectionLimited !== "boolean" ||
      coverage.note !== REPOSITORY_REPORT_COPY.coverageNotes[coverage.status as "complete" | "partial"]) throw new Error("Invalid repository report coverage.");

  const score = value.score;
  if (!object(score) || !exactKeys(score, ["value", "label", "explanation", "axes"]) || !integer(score.value, 0, 100) ||
      score.label !== "저장소 기반 AI 협업 준비도" || score.explanation !== REPOSITORY_REPORT_COPY.scoreExplanation || !object(score.axes) ||
      !exactKeys(score.axes, REPOSITORY_AXIS_ORDER)) throw new Error("Invalid repository report score.");
  let total = 0;
  for (const axis of REPOSITORY_AXIS_ORDER) {
    const item = score.axes[axis];
    if (!object(item) || !exactKeys(item, ["label", "value"]) || item.label !== REPOSITORY_REPORT_COPY.axisLabels[axis] || !integer(item.value, 0, 25)) throw new Error("Invalid repository report axis.");
    total += item.value as number;
  }
  if (total !== score.value) throw new Error("Invalid repository report score total.");

  const style = value.style;
  const styles = Object.values(REPOSITORY_REPORT_COPY.styles);
  if (!object(style) || !exactKeys(style, ["id", "title", "description"]) || !styles.some(item => item.id === style.id && item.title === style.title && item.description === style.description)) throw new Error("Invalid repository report style.");

  if (!Array.isArray(value.evidenceCards) || value.evidenceCards.length > 14) throw new Error("Invalid repository report evidence.");
  const evidenceIds = new Set<string>();
  const parsedCards: RepositoryReportEvidenceCard[] = [];
  for (const card of value.evidenceCards) {
    if (!object(card) || !exactKeys(card, ["id", "axis", "title", "description", "paths"]) || typeof card.id !== "string" || !(card.id in REPOSITORY_REPORT_COPY.evidence) || evidenceIds.has(card.id)) throw new Error("Invalid repository report evidence.");
    const copy = REPOSITORY_REPORT_COPY.evidence[card.id as RepositoryReportEvidenceId];
    if (card.axis !== copy.axis || card.title !== copy.title || card.description !== copy.description || !Array.isArray(card.paths) || card.paths.length < 1 || card.paths.length > 5) throw new Error("Invalid repository report evidence.");
    if (card.paths.some(path => sanitizeRepositoryPath(path) !== path) || new Set(card.paths).size !== card.paths.length) throw new Error("Invalid repository report evidence paths.");
    parsedCards.push(card as unknown as RepositoryReportEvidenceCard);
    evidenceIds.add(card.id);
  }
  const derived = deriveRepositoryReportPresentation(parsedCards, coverage.status as "complete" | "partial");
  for (const axis of REPOSITORY_AXIS_ORDER) {
    const item = score.axes[axis] as Record<string, unknown>;
    if (item.value !== derived.axes[axis]) throw new Error("Repository report score does not match its evidence.");
  }
  if (score.value !== derived.value || style.id !== derived.style.id || style.title !== derived.style.title || style.description !== derived.style.description) throw new Error("Repository report presentation does not match its evidence.");

  const allowedGaps = new Set<string>(Object.values(REPOSITORY_REPORT_COPY.gaps));
  if (!Array.isArray(value.gaps) || value.gaps.length > 5 || value.gaps.some(gap => typeof gap !== "string" || !allowedGaps.has(gap)) || new Set(value.gaps).size !== value.gaps.length) throw new Error("Invalid repository report gaps.");
  const challenge = value.nextChallenge;
  const challenges = Object.values(REPOSITORY_REPORT_COPY.challenges);
  if (!object(challenge) || !exactKeys(challenge, ["title", "description"]) || !challenges.some(item => item.title === challenge.title && item.description === challenge.description)) throw new Error("Invalid repository report challenge.");
  if (JSON.stringify(value.gaps) !== JSON.stringify(derived.gaps) || challenge.title !== derived.nextChallenge.title || challenge.description !== derived.nextChallenge.description) throw new Error("Repository report guidance does not match its evidence.");

  return structuredClone(value) as unknown as RepositoryReport;
}
