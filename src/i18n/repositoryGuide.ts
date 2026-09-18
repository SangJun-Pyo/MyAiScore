import {
  REPOSITORY_AXIS_ORDER,
  REPOSITORY_EVIDENCE_ORDER,
  REPOSITORY_REPORT_COPY,
  REPOSITORY_STYLE_ORDER,
  REPOSITORY_STYLE_THRESHOLDS,
  REPOSITORY_STYLE_TIE_PRIORITY,
  repositoryEvidencePoints,
  type RepositoryReportAxis,
  type RepositoryReportStyleId,
} from "../shared/repositoryReport";
import type { Locale } from "./locale";
import type { Messages } from "./messages";
import { repositoryEvidencePresentation, repositoryStylePresentation } from "./repositoryPresentation";

const dominantAxisByStyle: Partial<Record<RepositoryReportStyleId, RepositoryReportAxis>> = {
  "context-cartographer": "context",
  "verification-radar": "verification",
  "trace-collector": "traceability",
  "automation-tamer": "automation",
};

export function buildRepositoryGuide(locale: Locale, copy: Messages, activeStyleId?: string) {
  const axes = REPOSITORY_AXIS_ORDER.map(axis => {
    const signals = REPOSITORY_EVIDENCE_ORDER
      .filter(id => REPOSITORY_REPORT_COPY.evidence[id].axis === axis)
      .map(id => ({ id, title: repositoryEvidencePresentation(id, locale).title, points: repositoryEvidencePoints(id) }));
    return {
      id: axis,
      label: copy.presentation.axes[axis].label,
      signals,
      total: signals.reduce((sum, signal) => sum + signal.points, 0),
    };
  });

  const dominantSteps: Record<RepositoryReportAxis, string> = { context: "3A", verification: "3B", traceability: "3C", automation: "3D" };
  const styles = REPOSITORY_STYLE_ORDER.map(id => {
    const style = repositoryStylePresentation(id, locale);
    const dominantAxis = dominantAxisByStyle[id];
    const rule = id === "first-signals"
      ? copy.insights.firstSignalsRule(REPOSITORY_STYLE_THRESHOLDS.firstSignalsTotalExclusive)
      : id === "balanced-builder"
        ? copy.insights.balancedRule(REPOSITORY_STYLE_THRESHOLDS.balancedAxisMinimum, REPOSITORY_STYLE_THRESHOLDS.balancedSpreadMaximum)
        : copy.insights.dominantRule(copy.presentation.axes[dominantAxis!].label);
    return {
      id,
      title: style.title,
      description: style.description,
      step: id === "first-signals" ? "1" : id === "balanced-builder" ? "2" : dominantSteps[dominantAxis!],
      rule,
      active: activeStyleId === id,
    };
  });

  return {
    axes,
    styles,
    tiePriority: copy.insights.tiePriority(REPOSITORY_STYLE_TIE_PRIORITY.map(axis => copy.presentation.axes[axis].label).join(" → ")),
  };
}
