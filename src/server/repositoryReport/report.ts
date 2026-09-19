import {
  REPOSITORY_AXIS_ORDER,
  REPOSITORY_REPORT_COPY,
  deriveRepositoryReportPresentation,
  parseRepositoryReport,
  sanitizeRepositoryPath,
  type RepositoryReport,
  type RepositoryReportAxis,
  type RepositoryReportEvidenceCard,
  type RepositoryReportEvidenceId,
} from "../../shared/repositoryReport.js";
import type { IngestionSnapshot } from "../../shared/contracts/ingestion.js";
import { collectRepositorySignalPaths } from "../../shared/repositorySignals.js";

interface Signal {
  id: RepositoryReportEvidenceId;
  axis: RepositoryReportAxis;
  paths: string[];
}

function signal(id: RepositoryReportEvidenceId, axis: RepositoryReportAxis, paths: string[]): Signal | null {
  return paths.length ? { id, axis, paths: paths.slice(0, 5) } : null;
}

function collectSignals(paths: string[]): Signal[] {
  const signals = collectRepositorySignalPaths(paths).map(item => signal(item.id, item.axis, item.paths));
  return signals.filter((item): item is Signal => item !== null);
}

/** Build copy only from allowlisted structural signals. Repository content is never interpolated. */
export function buildRepositoryReport(snapshot: IngestionSnapshot): RepositoryReport {
  if (!snapshot.commitSha || !/^[a-f0-9]{40}$/i.test(snapshot.commitSha) || !/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(snapshot.repo) ||
      (snapshot.ingestionStatus !== "complete" && snapshot.ingestionStatus !== "partial")) throw new Error("A collected public repository snapshot is required.");

  const paths = [...new Set(snapshot.files.map(file => sanitizeRepositoryPath(file.path)).filter((path): path is string => path !== null))]
    .sort((a, b) => a.localeCompare(b, "en"));
  const signals = collectSignals(paths);
  const evidenceCards: RepositoryReportEvidenceCard[] = signals.map(item => {
    const copy = REPOSITORY_REPORT_COPY.evidence[item.id];
    return { id: item.id, axis: item.axis, title: copy.title, description: copy.description, paths: item.paths };
  });
  const coverageStatus = snapshot.ingestionStatus;
  const derived = deriveRepositoryReportPresentation(evidenceCards, coverageStatus);

  return parseRepositoryReport({
    schemaVersion: "repository-report-v1",
    ruleVersion: "repository-signals-v1",
    repo: snapshot.repo,
    commitSha: snapshot.commitSha,
    coverage: {
      status: coverageStatus,
      basis: "selected_files",
      selectedFiles: snapshot.coverage.selectedFiles,
      readFiles: snapshot.coverage.readFiles,
      candidateFiles: snapshot.coverage.candidateFiles,
      treeTruncated: snapshot.coverage.treeTruncated,
      selectionLimited: snapshot.coverage.selectionLimited,
      note: REPOSITORY_REPORT_COPY.coverageNotes[coverageStatus],
    },
    score: {
      value: derived.value,
      label: "저장소 기반 AI 협업 준비도",
      explanation: REPOSITORY_REPORT_COPY.scoreExplanation,
      axes: {
        context: { label: REPOSITORY_REPORT_COPY.axisLabels.context, value: derived.axes.context },
        verification: { label: REPOSITORY_REPORT_COPY.axisLabels.verification, value: derived.axes.verification },
        traceability: { label: REPOSITORY_REPORT_COPY.axisLabels.traceability, value: derived.axes.traceability },
        automation: { label: REPOSITORY_REPORT_COPY.axisLabels.automation, value: derived.axes.automation },
      },
    },
    style: derived.style,
    evidenceCards,
    gaps: derived.gaps,
    nextChallenge: derived.nextChallenge,
  });
}
