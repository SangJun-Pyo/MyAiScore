import { REPOSITORY_AXIS_ORDER, REPOSITORY_REPORT_COPY, repositoryStyleCopy, type RepositoryReport, type RepositoryReportAxis, type RepositoryReportEvidenceId, type RepositoryReportStyleId } from "../shared/repositoryReport";
import type { Messages } from "./messages";

const englishStyles: Record<RepositoryReportStyleId, { title: string; description: string }> = {
  "first-signals": { title: "First-signal explorer", description: "This repository has a few early clues. Recording one more working practice would make its collaboration foundation clearer." },
  "balanced-builder": { title: "Balanced builder", description: "Context, verification, traceability, and automation signals appear in a relatively even mix." },
  "context-cartographer": { title: "Context cartographer", description: "Context signals such as READMEs and working instructions stand out." },
  "verification-radar": { title: "Verification radar", description: "Tests and check configurations intended to examine results stand out." },
  "trace-collector": { title: "Trace collector", description: "Records that help later readers follow changes and decisions stand out." },
  "automation-tamer": { title: "Automation tamer", description: "The repository has visible foundations for running repeated checks automatically." },
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

const englishGaps: Record<RepositoryReportAxis | "partial", string> = {
  context: "The selected sample did not show enough context signals such as a README or working instructions.",
  verification: "The selected sample did not show enough test or check-configuration signals.",
  traceability: "The selected sample did not show enough change or decision-record signals.",
  automation: "The selected sample did not show enough CI or repeatable-automation signals.",
  partial: "Collection was partial, so signals outside the sample could not be assessed.",
};

const englishChallenges: Record<RepositoryReportAxis, { title: string; description: string }> = {
  context: { title: "Leave one page of context", description: "Add a short goal, constraints, and completion criteria to a README or working-instructions file." },
  verification: { title: "Create one useful counterexample", description: "Add one input that could break an important behavior, then inspect and record the actual result." },
  traceability: { title: "Connect one decision", description: "Record one recent choice with its reason, alternatives, and related files." },
  automation: { title: "Automate one repeated check", description: "Connect one repeated command to CI and explain where to look when it fails." },
};

export function repositoryStylePresentation(id: RepositoryReportStyleId, locale: "ko" | "en") {
  return locale === "ko" ? repositoryStyleCopy(id) : { id, ...englishStyles[id] };
}

export function repositoryEvidencePresentation(id: RepositoryReportEvidenceId, locale: "ko" | "en") {
  return locale === "ko" ? REPOSITORY_REPORT_COPY.evidence[id] : { axis: REPOSITORY_REPORT_COPY.evidence[id].axis, ...englishEvidence[id] };
}

function lowestAxis(report: RepositoryReport): RepositoryReportAxis {
  return REPOSITORY_AXIS_ORDER.reduce((lowest, axis) => report.score.axes[axis].value < report.score.axes[lowest].value ? axis : lowest, REPOSITORY_AXIS_ORDER[0]!);
}

export function repositoryPresentation(report: RepositoryReport, locale: "ko" | "en", copy: Messages) {
  if (locale === "ko") return {
    scoreLabel: report.score.label, scoreExplanation: report.score.explanation, style: report.style,
    evidence: Object.fromEntries(report.evidenceCards.map(card => [card.id, { title: card.title, description: card.description }])) as Record<RepositoryReportEvidenceId, { title: string; description: string }>,
    gaps: report.gaps, coverageNote: report.coverage.note, nextChallenge: report.nextChallenge,
  };
  const gaps = REPOSITORY_AXIS_ORDER.filter(axis => report.score.axes[axis].value < 10).map(axis => englishGaps[axis]);
  if (report.coverage.status === "partial") gaps.push(englishGaps.partial);
  return {
    scoreLabel: copy.presentation.scoreLabel,
    scoreExplanation: report.schemaVersion === "repository-report-v2"
      ? "A deterministic score that combines signal presence, bounded content substance, and scanned-tree breadth. It does not evaluate personal AI ability, code correctness, or successful execution."
      : copy.presentation.scoreExplanation,
    style: repositoryStylePresentation(report.style.id as RepositoryReportStyleId, locale),
    evidence: englishEvidence,
    gaps,
    coverageNote: report.coverage.status === "complete"
      ? "The planned public-file sample was read within the collection limits. This does not mean the entire repository or any execution result was checked."
      : "Only part of the planned public-file sample was read. The score uses visible signals and does not treat missing signals as absent.",
    nextChallenge: englishChallenges[lowestAxis(report)],
  };
}
