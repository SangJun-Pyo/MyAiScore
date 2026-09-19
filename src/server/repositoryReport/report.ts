import {
  REPOSITORY_AXIS_ORDER,
  REPOSITORY_REPORT_COPY,
  deriveRepositoryCollaborationProfile,
  deriveRepositoryReportV2Presentation,
  parseRepositoryReport,
  sanitizeRepositoryPath,
  type RepositoryReport,
  type RepositoryReportAxis,
  type RepositoryReportEvidenceCard,
  type RepositoryReportEvidenceId,
} from "../../shared/repositoryReport.js";
import type { IngestionSnapshot, RepositoryInventory } from "../../shared/contracts/ingestion.js";
import { collectRepositorySignalPaths, isRepositoryDocumentationPath, isRepositorySourcePath, isRepositoryTestPath, repositoryPathMatchesEvidence } from "../../shared/repositorySignals.js";
import { analyzeRepositorySignals } from "./substance.js";

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

function fallbackInventory(snapshot: IngestionSnapshot, paths: string[]): RepositoryInventory {
  const signalCandidateCounts = Object.fromEntries(
    Object.keys(REPOSITORY_REPORT_COPY.evidence).map(id => [id, paths.filter(path => repositoryPathMatchesEvidence(id as RepositoryReportEvidenceId, path)).length]),
  ) as Record<RepositoryReportEvidenceId, number>;
  return {
    basis: "scanned_tree",
    scannedEntries: paths.length,
    treeTruncated: snapshot.coverage.treeTruncated,
    selectionLimited: snapshot.coverage.selectionLimited,
    sourceFiles: paths.filter(isRepositorySourcePath).length,
    testFiles: paths.filter(isRepositoryTestPath).length,
    documentationFiles: paths.filter(isRepositoryDocumentationPath).length,
    sourceFilesWithKnownSize: 0,
    sourceBytes: 0,
    oversizedSourceCandidates: 0,
    largestSourceFiles: [],
    signalCandidateCounts,
    hygiene: { highConfidenceArtifacts: 0, generatedArtifactCandidates: 0, secretLikePaths: 0 },
  };
}

/** Build copy only from allowlisted structural signals. Repository content is never interpolated. */
export function buildRepositoryReport(snapshot: IngestionSnapshot): RepositoryReport {
  if (!snapshot.commitSha || !/^[a-f0-9]{40}$/i.test(snapshot.commitSha) || !/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(snapshot.repo) ||
      (snapshot.ingestionStatus !== "complete" && snapshot.ingestionStatus !== "partial")) throw new Error("A collected public repository snapshot is required.");

  const paths = [...new Set(snapshot.files.map(file => sanitizeRepositoryPath(file.path)).filter((path): path is string => path !== null))]
    .sort((a, b) => a.localeCompare(b, "en"));
  const safePathSet = new Set(paths);
  const safeFiles = snapshot.files.filter(file => safePathSet.has(file.path));
  const inventory = snapshot.repositoryInventory ?? fallbackInventory(snapshot, paths);
  const signals = collectSignals(paths);
  const evidenceCards: RepositoryReportEvidenceCard[] = signals.map(item => {
    const copy = REPOSITORY_REPORT_COPY.evidence[item.id];
    return { id: item.id, axis: item.axis, title: copy.title, description: copy.description, paths: item.paths };
  });
  const coverageStatus = snapshot.ingestionStatus;
  const analysis = analyzeRepositorySignals(safeFiles, inventory, snapshot.commitTraceability);
  const derived = deriveRepositoryReportV2Presentation(analysis.assessments, coverageStatus);
  const testAssessment = analysis.assessments.find(item => item.id === "verification-tests");
  const reasons = [
    ...(coverageStatus === "partial" ? ["partial_collection" as const] : []),
    ...(snapshot.coverage.treeTruncated ? ["tree_truncated" as const] : []),
    ...(snapshot.coverage.selectionLimited ? ["selection_limited" as const] : []),
    ...(testAssessment?.status === "unmeasured" ? ["unmeasured_test_language" as const] : []),
    ...(!snapshot.commitTraceability ? ["commit_history_unavailable" as const] : []),
  ];
  const structure = snapshot.repositoryStructure;
  const diagnostics = {
    provisional: reasons.length > 0,
    reasons,
    profile: { databaseLikely: analysis.databaseLikely },
    hygiene: inventory.hygiene,
    structure: {
      oversizedSourceCandidates: inventory.oversizedSourceCandidates,
      sourceFilesOver400Lines: structure?.sourceFilesOver400Lines ?? 0,
      sourceFilesOver800Lines: structure?.sourceFilesOver800Lines ?? 0,
      topFiveSourceByteShare: structure?.topFiveSourceByteShare ?? null,
      largestSelectedSourceFiles: (structure?.largestSelectedSourceFiles ?? [])
        .filter(file => safePathSet.has(file.path)),
    },
    commit: snapshot.commitTraceability ? {
      sampledCommits: snapshot.commitTraceability.sampledCommits,
      evaluatedCommits: snapshot.commitTraceability.evaluatedCommits,
      excludedMergeOrAutomated: snapshot.commitTraceability.excludedMergeOrAutomated,
      nonGenericSubjectRatio: snapshot.commitTraceability.nonGenericSubjectRatio,
      distinctSubjectRatio: snapshot.commitTraceability.distinctSubjectRatio,
      scopedSubjectRatio: snapshot.commitTraceability.scopedSubjectRatio,
      rationaleBodyRatio: snapshot.commitTraceability.rationaleBodyRatio,
      referenceRatio: snapshot.commitTraceability.referenceRatio,
    } : null,
  };

  return parseRepositoryReport({
    schemaVersion: "repository-report-v2",
    ruleVersion: "repository-signals-v2.2",
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
      explanation: REPOSITORY_REPORT_COPY.scoreExplanationV2,
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
    signalScores: analysis.assessments,
    diagnostics,
    collaborationProfile: deriveRepositoryCollaborationProfile(analysis.assessments, derived.axes, diagnostics),
  });
}
