import { REPOSITORY_AXIS_ORDER, REPOSITORY_REPORT_COPY, type RepositoryReport, type RepositoryReportAxis, type RepositoryReportEvidenceId, type RepositoryReportStyleId } from "../shared/repositoryReport";
import type { Messages } from "./messages";

const koreanStyles: Record<RepositoryReportStyleId, { title: string; description: string }> = {
  "first-signals": { title: "첫 신호 탐험가", description: "협업을 위한 초기 단서가 확인됩니다. 작업 방식을 파일로 하나씩 남기면 협업 기반을 더 분명하게 만들 수 있습니다." },
  "balanced-builder": { title: "균형 잡힌 빌더", description: "맥락, 검증 체계, 기록·추적, 자동화와 관련된 신호가 비교적 고르게 확인됩니다." },
  "context-cartographer": { title: "맥락 지도 제작자", description: "README와 작업 지침처럼 함께 일하는 데 필요한 맥락 정보가 잘 갖춰져 있습니다." },
  "verification-radar": { title: "AI 협업 신호 레이더", description: "테스트와 검사 설정 등 결과를 검증하기 위한 구조가 비교적 잘 갖춰져 있습니다." },
  "trace-collector": { title: "기록 수집가", description: "변경 사항과 의사결정을 나중에 추적할 수 있는 기록이 잘 갖춰져 있습니다." },
  "automation-tamer": { title: "자동화 조련사", description: "반복적인 점검을 자동으로 실행하기 위한 구조가 잘 갖춰져 있습니다." },
};

const englishStyles: Record<RepositoryReportStyleId, { title: string; description: string }> = {
  "first-signals": { title: "First-signal explorer", description: "This repository has a few early clues. Recording one more working practice would make its collaboration foundation clearer." },
  "balanced-builder": { title: "Balanced builder", description: "Context, verification, traceability, and automation signals appear in a relatively even mix." },
  "context-cartographer": { title: "Context cartographer", description: "Context signals such as READMEs and working instructions stand out." },
  "verification-radar": { title: "Verification radar", description: "Tests and check configurations intended to examine results stand out." },
  "trace-collector": { title: "Trace collector", description: "Records that help later readers follow changes and decisions stand out." },
  "automation-tamer": { title: "Automation tamer", description: "The repository has visible foundations for running repeated checks automatically." },
};

const koreanEvidence: Record<RepositoryReportEvidenceId, { title: string; description: string }> = {
  "context-readme": { title: "프로젝트 안내", description: "분석한 파일에서 프로젝트의 목적과 시작 방법을 설명하는 README를 확인했습니다." },
  "context-guidance": { title: "협업 지침", description: "분석한 파일에서 사람과 AI가 작업할 때 참고할 수 있는 지침 파일을 확인했습니다." },
  "context-docs": { title: "프로젝트 문서", description: "분석한 파일에서 프로젝트 정보를 정리한 별도 문서 경로를 확인했습니다." },
  "context-metadata": { title: "프로젝트 설정", description: "분석한 파일에서 프로젝트 구조를 설명하는 루트 설정 파일을 확인했습니다." },
  "verification-tests": { title: "테스트 코드", description: "분석한 파일에서 테스트로 분류할 수 있는 파일을 확인했습니다. 테스트의 실제 통과 여부까지 실행해 확인한 것은 아닙니다." },
  "verification-config": { title: "검사 설정", description: "분석한 파일에서 타입 검사, 린트 또는 커버리지와 관련된 설정을 확인했습니다." },
  "traceability-changelog": { title: "변경 기록", description: "분석한 파일에서 변경 사항을 정리한 기록을 확인했습니다." },
  "traceability-decisions": { title: "의사결정 기록", description: "분석한 파일에서 주요 결정이나 ADR을 기록한 파일을 확인했습니다." },
  "traceability-templates": { title: "이슈·PR 템플릿", description: "분석한 파일에서 이슈나 Pull Request의 기록을 돕는 템플릿을 확인했습니다." },
  "traceability-migrations": { title: "변경 단계", description: "분석한 파일에서 데이터 구조의 변경 과정을 추적할 수 있는 마이그레이션 파일을 확인했습니다." },
  "automation-ci": { title: "자동 검사", description: "분석한 파일에서 GitHub Actions 워크플로를 확인했습니다. 워크플로의 실제 실행 성공 여부까지 확인한 것은 아닙니다." },
  "automation-dependencies": { title: "의존성 관리", description: "분석한 파일에서 의존성 업데이트를 자동화하는 설정을 확인했습니다." },
  "automation-delivery": { title: "배포 설정", description: "분석한 파일에서 컨테이너 또는 배포와 관련된 설정을 확인했습니다." },
  "automation-scripts": { title: "반복 작업 도구", description: "분석한 파일에서 반복 작업을 실행하기 위한 스크립트나 작업 파일을 확인했습니다." },
};

const englishEvidence: Record<RepositoryReportEvidenceId, { title: string; description: string }> = {
  "context-readme": { title: "Getting started", description: "A README describing a project entry point appears in the selected sample." },
  "context-guidance": { title: "Working instructions", description: "The selected sample includes instructions that people and AI can consult." },
  "context-docs": { title: "Documentation space", description: "A dedicated documentation path appears in the selected sample." },
  "context-metadata": { title: "Project configuration", description: "A root configuration file that describes the project structure appears in the selected sample." },
  "verification-tests": { title: "Test traces", description: "Files classified as tests appear in the selected sample. MyAiScore did not run them or verify that they pass." },
  "verification-config": { title: "Check configuration", description: "Type, lint, or coverage check configuration appears in the selected sample." },
  "traceability-changelog": { title: "Change history", description: "A file intended to record changes appears in the selected sample." },
  "traceability-decisions": { title: "Decision records", description: "Decision or ADR records appear in the selected sample." },
  "traceability-templates": { title: "Issue and PR templates", description: "Templates that help record issues or pull requests appear in the selected sample." },
  "traceability-migrations": { title: "Migration steps", description: "Migration files that track data-structure changes appear in the selected sample." },
  "automation-ci": { title: "Automated checks", description: "A GitHub Actions workflow appears in the selected sample. Its execution status was not checked." },
  "automation-dependencies": { title: "Dependency maintenance", description: "Automated dependency-update configuration appears in the selected sample." },
  "automation-delivery": { title: "Delivery setup", description: "Container or deployment configuration appears in the selected sample." },
  "automation-scripts": { title: "Repeatable task tools", description: "Scripts or task files for repeated work appear in the selected sample." },
};

const koreanGaps: Record<RepositoryReportAxis | "partial", string> = {
  context: "분석한 파일에서는 프로젝트의 목적과 작업 규칙을 보여주는 맥락 정보를 충분히 확인하지 못했습니다.",
  verification: "분석한 파일에서는 결과를 검증할 수 있는 테스트와 검사 설정을 충분히 확인하지 못했습니다.",
  traceability: "분석한 파일에서는 변경 사항과 의사결정 과정을 보여주는 기록을 충분히 확인하지 못했습니다.",
  automation: "분석한 파일에서는 반복적인 점검을 자동으로 실행하는 설정을 충분히 확인하지 못했습니다.",
  partial: "일부 파일만 수집되어 분석 범위 밖의 신호는 확인할 수 없습니다.",
};

const englishGaps: Record<RepositoryReportAxis | "partial", string> = {
  context: "The selected sample did not show enough context signals such as a README or working instructions.",
  verification: "The selected sample did not show enough test or check-configuration signals.",
  traceability: "The selected sample did not show enough change or decision-record signals.",
  automation: "The selected sample did not show enough CI or repeatable-automation signals.",
  partial: "Collection was partial, so signals outside the sample could not be assessed.",
};

const koreanChallenges: Record<RepositoryReportAxis, { title: string; description: string }> = {
  context: { title: "프로젝트 맥락 하나 남기기", description: "README나 작업 지침에 목표, 제약 사항, 완료 기준을 짧게 기록해 보세요." },
  verification: { title: "검증할 사례 하나 추가하기", description: "중요한 동작에서 발생할 수 있는 실패 사례 하나를 테스트로 남기고 실제 결과를 확인해 보세요." },
  traceability: { title: "의사결정 하나 기록하기", description: "이번 주에 내린 결정 하나를 결정한 이유, 검토한 대안, 관련 파일과 함께 짧게 기록해 보세요." },
  automation: { title: "반복 검사 하나 자동화하기", description: "반복해서 확인하는 명령 하나를 CI에 연결하고 실패했을 때 확인할 항목을 기록해 보세요." },
};

const englishChallenges: Record<RepositoryReportAxis, { title: string; description: string }> = {
  context: { title: "Leave one page of context", description: "Add a short goal, constraints, and completion criteria to a README or working-instructions file." },
  verification: { title: "Create one useful counterexample", description: "Add one input that could break an important behavior, then inspect and record the actual result." },
  traceability: { title: "Connect one decision", description: "Record one recent choice with its reason, alternatives, and related files." },
  automation: { title: "Automate one repeated check", description: "Connect one repeated command to CI and explain where to look when it fails." },
};

export function repositoryStylePresentation(id: RepositoryReportStyleId, locale: "ko" | "en") {
  return locale === "ko" ? { id, ...koreanStyles[id] } : { id, ...englishStyles[id] };
}

export function repositoryEvidencePresentation(id: RepositoryReportEvidenceId, locale: "ko" | "en") {
  const localized = locale === "ko" ? koreanEvidence[id] : englishEvidence[id];
  return { axis: REPOSITORY_REPORT_COPY.evidence[id].axis, ...localized };
}

function lowestAxis(report: RepositoryReport): RepositoryReportAxis {
  return REPOSITORY_AXIS_ORDER.reduce((lowest, axis) => report.score.axes[axis].value < report.score.axes[lowest].value ? axis : lowest, REPOSITORY_AXIS_ORDER[0]!);
}

export function repositoryPresentation(report: RepositoryReport, locale: "ko" | "en", copy: Messages) {
  const localizedEvidence = locale === "ko" ? koreanEvidence : englishEvidence;
  const localizedGaps = locale === "ko" ? koreanGaps : englishGaps;
  const localizedChallenges = locale === "ko" ? koreanChallenges : englishChallenges;
  const gaps = REPOSITORY_AXIS_ORDER.filter(axis => report.score.axes[axis].value < 10).map(axis => localizedGaps[axis]);
  if (report.coverage.status === "partial") gaps.push(localizedGaps.partial);
  return {
    scoreLabel: copy.presentation.scoreLabel, scoreExplanation: copy.presentation.scoreExplanation,
    style: repositoryStylePresentation(report.style.id as RepositoryReportStyleId, locale),
    evidence: localizedEvidence,
    gaps,
    coverageNote: locale === "ko"
      ? report.coverage.status === "complete"
        ? "계획한 공개 파일 표본을 정해진 범위 안에서 확인했습니다. 저장소 전체나 실제 실행 결과를 확인했다는 의미는 아닙니다."
        : "계획한 공개 파일 표본 중 일부만 확인했습니다. 확인된 신호만 점수에 반영했으며, 확인되지 않은 신호가 없다고 단정하지 않습니다."
      : report.coverage.status === "complete"
        ? "The planned public-file sample was read within the collection limits. This does not mean the entire repository or any execution result was checked."
        : "Only part of the planned public-file sample was read. The score uses visible signals and does not treat missing signals as absent.",
    nextChallenge: localizedChallenges[lowestAxis(report)],
  };
}
