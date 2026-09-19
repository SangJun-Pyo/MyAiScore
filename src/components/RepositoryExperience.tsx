"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactElement, useEffect, useRef, useState } from "react";
import { CrtBackground, StructureFlowCollection, UplinkLoader } from "@designcodeio/threeui";
import { buildRepositoryGuide } from "../i18n/repositoryGuide";
import { repositoryPresentation } from "../i18n/repositoryPresentation";
import { repositoryProfileNameCatalog, repositoryProfilePresentation } from "../i18n/repositoryProfilePresentation";
import { repositoryV2Presentation } from "../i18n/repositoryV2Presentation";
import { deriveRepositoryCohortComparison } from "../shared/repositoryCohort";
import {
  REPOSITORY_AXIS_ORDER,
  REPOSITORY_REPORT_COPY,
  REPOSITORY_SCORE_SIGNAL_ORDER,
  REPOSITORY_V23_COMMIT_PRACTICE_MAX_POINTS,
  deriveRepositoryCollaborationProfile,
  deriveRepositoryRecommendations,
  deriveRepositoryReportV2Presentation,
  parseRepositoryReport,
  repositoryV23EvidencePoints,
  type RepositoryReport,
  type RepositoryReportEvidenceCard,
  type RepositoryReportSignalAssessment,
  type RepositoryReportV2Diagnostics,
} from "../shared/repositoryReport";
import { LanguageSwitch, useLocale } from "./LocaleProvider";

const HISTORY_KEY = "myaiscore_repository_reports_v1";
const MAX_HISTORY = 20;
const MAX_HISTORY_BYTES = 512_000;
const UPLINK_RUN_MS = 8600;
const UPLINK_SETTLE_MS = 900;

function waitForUplinkCompletion(startedAt: number) {
  const elapsed = performance.now() - startedAt;
  const waitMs = elapsed < UPLINK_RUN_MS
    ? UPLINK_RUN_MS - elapsed + UPLINK_SETTLE_MS
    : UPLINK_SETTLE_MS;
  return new Promise(resolve => setTimeout(resolve, waitMs));
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const DEMO_EVIDENCE_CARDS: RepositoryReportEvidenceCard[] = [
  { id: "context-readme", ...REPOSITORY_REPORT_COPY.evidence["context-readme"], paths: ["README.md"] },
  { id: "context-guidance", ...REPOSITORY_REPORT_COPY.evidence["context-guidance"], paths: ["AGENTS.md"] },
  { id: "verification-entrypoint", ...REPOSITORY_REPORT_COPY.evidence["verification-entrypoint"], paths: ["package.json"] },
  { id: "verification-test-substance", ...REPOSITORY_REPORT_COPY.evidence["verification-test-substance"], paths: ["tests/browser/experience.spec.ts"] },
  { id: "verification-test-breadth", ...REPOSITORY_REPORT_COPY.evidence["verification-test-breadth"], paths: ["tests/browser/experience.spec.ts"] },
  { id: "verification-edge-cases", ...REPOSITORY_REPORT_COPY.evidence["verification-edge-cases"], paths: ["tests/browser/experience.spec.ts"] },
  { id: "verification-static-analysis", ...REPOSITORY_REPORT_COPY.evidence["verification-static-analysis"], paths: ["tsconfig.json"] },
  { id: "traceability-decisions", ...REPOSITORY_REPORT_COPY.evidence["traceability-decisions"], paths: ["docs/Architecture/ADR/0015-anonymous-korean-repository-reports.md"] },
  { id: "automation-ci-tests", ...REPOSITORY_REPORT_COPY.evidence["automation-ci-tests"], paths: [".github/workflows/ci.yml"] },
  { id: "automation-ci-quality", ...REPOSITORY_REPORT_COPY.evidence["automation-ci-quality"], paths: [".github/workflows/ci.yml"] },
];

function buildDemoReport(): RepositoryReport {
  const presentIds = new Set(DEMO_EVIDENCE_CARDS.map(card => card.id));
  const signalScores: RepositoryReportSignalAssessment[] = REPOSITORY_SCORE_SIGNAL_ORDER.map(id => {
    if (id === "traceability-commit-practice") {
      const substance = 0.5;
      const quality = Math.round((0.15 + 0.85 * substance) * 1_000) / 1_000;
      return { id, axis: "traceability", role: "bonus", status: "measured", presence: 1, substance, breadth: 1, quality, points: Math.round(REPOSITORY_V23_COMMIT_PRACTICE_MAX_POINTS * quality), maxPoints: REPOSITORY_V23_COMMIT_PRACTICE_MAX_POINTS };
    }
    const presence = presentIds.has(id) ? 1 : 0;
    const maxPoints = repositoryV23EvidencePoints(id);
    return {
      id,
      axis: REPOSITORY_REPORT_COPY.evidence[id].axis,
      role: ["context-readme", "context-metadata", "context-reproducibility", "verification-entrypoint", "verification-test-substance", "verification-test-breadth", "verification-edge-cases", "verification-static-analysis", "verification-coverage"].includes(id) ? "core" : "bonus",
      status: "measured",
      presence,
      substance: presence,
      breadth: 1,
      quality: presence,
      points: presence ? maxPoints : 0,
      maxPoints,
    } as RepositoryReportSignalAssessment;
  });
  const derived = deriveRepositoryReportV2Presentation(signalScores, "complete");
  const diagnostics: RepositoryReportV2Diagnostics = {
    provisional: false,
    reasons: [],
    profile: { databaseLikely: false },
    hygiene: { highConfidenceArtifacts: 0, generatedArtifactCandidates: 0, secretLikePaths: 0 },
    structure: { oversizedSourceCandidates: 0, sourceFilesOver400Lines: 0, sourceFilesOver800Lines: 0, topFiveSourceByteShare: null, largestSelectedSourceFiles: [] },
    commit: { sampledCommits: 4, evaluatedCommits: 4, excludedMergeOrAutomated: 0, nonGenericSubjectRatio: 0.75, distinctSubjectRatio: 1, scopedSubjectRatio: 0.5, rationaleBodyRatio: 0.25, referenceRatio: 0 },
  };
  return parseRepositoryReport({
    schemaVersion: "repository-report-v2",
    ruleVersion: "repository-signals-v2.7",
    repo: "example/sample-project",
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    coverage: {
      status: "complete",
      basis: "selected_files",
      selectedFiles: 18,
      readFiles: 18,
      candidateFiles: 42,
      treeTruncated: false,
      selectionLimited: false,
      note: REPOSITORY_REPORT_COPY.coverageNotes.complete,
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
    evidenceCards: DEMO_EVIDENCE_CARDS,
    gaps: derived.gaps,
    nextChallenge: derived.nextChallenge,
    signalScores,
    diagnostics,
    collaborationProfile: deriveRepositoryCollaborationProfile(signalScores, derived.axes, diagnostics),
    recommendations: deriveRepositoryRecommendations(signalScores, DEMO_EVIDENCE_CARDS),
    cohort: deriveRepositoryCohortComparison(derived.value, { candidateFiles: 42, status: "complete" }),
  });
}

const DEMO_REPORT = buildDemoReport();

let currentReport: RepositoryReport | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readHistory(): RepositoryReport[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  if (raw.length > MAX_HISTORY_BYTES) throw new Error("invalid_history");
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > MAX_HISTORY) throw new Error("invalid_history");
  return value.map(parseRepositoryReport);
}

function saveToHistory(report: RepositoryReport) {
  const dedupeKey = `${report.repo.toLowerCase()}@${report.commitSha.toLowerCase()}`;
  const next = [report, ...readHistory().filter(item => `${item.repo.toLowerCase()}@${item.commitSha.toLowerCase()}` !== dedupeKey)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function repoName(repo: string) {
  return repo.replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "");
}

function reportCollaborationProfile(report: RepositoryReport | null) {
  return report?.schemaVersion === "repository-report-v2" && "collaborationProfile" in report ? report.collaborationProfile : null;
}

function fitCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let text = value;
  while (text.length > 1 && context.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
  return `${text}…`;
}

async function createRepositoryShareCard(report: RepositoryReport, locale: "ko" | "en", axisLabels: Record<(typeof REPOSITORY_AXIS_ORDER)[number], string>, profileTitle: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");

  const background = context.createLinearGradient(0, 0, 1200, 630);
  background.addColorStop(0, "#101213");
  background.addColorStop(0.58, "#191b1d");
  background.addColorStop(1, "#251815");
  context.fillStyle = background;
  context.fillRect(0, 0, 1200, 630);
  const glow = context.createRadialGradient(970, 90, 10, 970, 90, 420);
  glow.addColorStop(0, "rgba(229,140,117,.28)");
  glow.addColorStop(1, "rgba(229,140,117,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 1200, 630);

  context.fillStyle = "#e58c75";
  context.fillRect(72, 58, 32, 4);
  context.font = "600 25px system-ui, sans-serif";
  context.fillText("MyAiScore", 120, 70);
  context.fillStyle = "#92979b";
  context.font = "500 15px system-ui, sans-serif";
  context.fillText(locale === "ko" ? "공개 저장소 협업 신호 리포트" : "PUBLIC REPOSITORY SIGNAL REPORT", 72, 116);

  context.fillStyle = "#f5f3ee";
  context.font = "600 32px system-ui, sans-serif";
  context.fillText(fitCanvasText(context, repoName(report.repo), 760), 72, 164);
  context.fillStyle = "#e58c75";
  context.font = "600 54px system-ui, sans-serif";
  context.fillText(fitCanvasText(context, profileTitle, 760), 72, 232);

  context.fillStyle = "#f5f3ee";
  context.font = "500 126px system-ui, sans-serif";
  context.fillText(String(report.score.value), 68, 380);
  context.fillStyle = "#92979b";
  context.font = "500 27px system-ui, sans-serif";
  context.fillText("/100", 246, 378);

  const cardWidth = 330;
  const cardHeight = 96;
  REPOSITORY_AXIS_ORDER.forEach((axis, index) => {
    const x = 420 + (index % 2) * (cardWidth + 22);
    const y = 254 + Math.floor(index / 2) * (cardHeight + 20);
    context.fillStyle = "rgba(255,255,255,.055)";
    context.fillRect(x, y, cardWidth, cardHeight);
    context.fillStyle = "#92979b";
    context.font = "500 15px system-ui, sans-serif";
    context.fillText(axisLabels[axis], x + 22, y + 34);
    context.fillStyle = "#f5f3ee";
    context.font = "600 28px system-ui, sans-serif";
    context.fillText(`${report.score.axes[axis].value}/25`, x + 22, y + 70);
    context.fillStyle = "#e58c75";
    context.fillRect(x, y + cardHeight - 4, Math.round(cardWidth * report.score.axes[axis].value / 25), 4);
  });

  context.fillStyle = "#777d81";
  context.font = "500 14px system-ui, sans-serif";
  context.fillText(`${report.commitSha.slice(0, 12)} · ${report.coverage.status}`, 72, 520);
  context.fillText(locale === "ko" ? "저장소의 정적 신호를 요약한 참고용 결과이며 개인의 AI 실력 인증이 아닙니다." : "A static repository-signal summary, not a certification of personal AI ability.", 72, 575);
  context.textAlign = "right";
  context.fillStyle = "#e58c75";
  context.fillText("myaiscore-production.up.railway.app", 1128, 575);

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("image_encoding_failed")), "image/png"));
  return { blob, fileName: `myaiscore-${repoName(report.repo).replace(/[^a-z0-9._-]+/gi, "-")}-${report.commitSha.slice(0, 12)}.png` };
}

function downloadShareCard(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function RepositoryShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { copy } = useLocale();
  const links = [
    { href: "/", name: copy.shell.home },
    { href: "/profile", name: copy.shell.profile },
    { href: "/insights", name: copy.shell.insights },
  ];
  return <>
    <a className="skip-link" href="#main" onClick={() => requestAnimationFrame(() => { const target = document.getElementById("main"); target?.setAttribute("tabindex", "-1"); target?.focus(); })}>{copy.shell.skip}</a>
    <header className="site-header"><div className="header-inner">
      <Link href="/" className="brand" aria-label={copy.shell.brandHome}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>MyAiScore<span className="beta">{copy.shell.beta}</span></Link>
      <div className="header-actions"><nav aria-label={copy.shell.navLabel}>{links.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.name}</Link>)}<a href="https://github.com/SangJun-Pyo/MyAiScore" target="_blank" rel="noreferrer">{copy.shell.github}</a><Link href="/evaluate" className="nav-evaluate" aria-current={pathname === "/evaluate" ? "page" : undefined}>{copy.shell.evaluate}</Link></nav><LanguageSwitch /></div>
    </div></header>
    {children}
    <footer className="site-footer"><Link href="/" className="brand">MyAiScore</Link><p>{copy.shell.footerLead}</p><span>{copy.shell.footerLimit}</span></footer>
  </>;
}

const AXIS_ICONS: Record<(typeof REPOSITORY_AXIS_ORDER)[number], ReactElement> = {
  context: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /><path d="M9 12h6M9 15.5h6M9 8.5h3" /></svg>,
  verification: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9 12.5l2 2 4-4.5" /></svg>,
  traceability: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9a8 8 0 1 1 1.5 6.5" /><path d="M4 4v5h5" /><path d="M12 8v4l3 2" /></svg>,
  automation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 0 1 13.5-5.5L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-13.5 5.5L4 15" /><path d="M4 20v-5h5" /></svg>,
};

function radarPoint(index: number, value: number, radius = 58) {
  const angle = (([-90, 0, 90, 180][index] ?? -90) * Math.PI) / 180;
  const ratio = Math.max(0, Math.min(1, value / 25));
  const center = 82;
  return {
    x: center + Math.cos(angle) * radius * ratio,
    y: center + Math.sin(angle) * radius * ratio,
  };
}

function RepositoryAxisRadar({ report }: { report: RepositoryReport }) {
  const { copy } = useLocale();
  const axes = REPOSITORY_AXIS_ORDER.map(axis => ({
    axis,
    label: copy.presentation.axes[axis].label,
    value: report.score.axes[axis].value,
  }));
  const polygon = axes.map((item, index) => {
    const point = radarPoint(index, item.value);
    return `${point.x},${point.y}`;
  }).join(" ");
  return <figure className="repo-axis-radar" aria-label={copy.report.axesEyebrow}>
    <div className="repo-axis-radar-plot">
      <svg viewBox="0 0 164 164" role="img" aria-label={axes.map(item => `${item.label} ${item.value}/25`).join(", ")}>
        {[1, 0.75, 0.5, 0.25].map(level => {
          const points = axes.map((_, index) => {
            const point = radarPoint(index, 25 * level);
            return `${point.x},${point.y}`;
          }).join(" ");
          return <polygon key={level} points={points} className="repo-axis-radar-grid" />;
        })}
        {axes.map((_, index) => {
          const end = radarPoint(index, 25);
          return <line key={index} x1="82" y1="82" x2={end.x} y2={end.y} className="repo-axis-radar-spoke" />;
        })}
        <polygon points={polygon} className="repo-axis-radar-shape" />
        {axes.map((item, index) => {
          const point = radarPoint(index, item.value);
          return <circle key={item.axis} cx={point.x} cy={point.y} r="3.5" className="repo-axis-radar-dot" />;
        })}
      </svg>
      {axes.map(item => <span key={`${item.axis}-label`} className={`repo-axis-radar-label is-${item.axis}`}>{item.label}</span>)}
    </div>
    <figcaption className="repo-axis-radar-legend">
      {axes.map(item => <span key={item.axis}><b>{item.label}</b><strong>{item.value}/25</strong></span>)}
    </figcaption>
  </figure>;
}

function RepositoryReportView({ report, demo = false, actions = true, overviewVariant = "guide" }: { report: RepositoryReport; demo?: boolean; actions?: boolean; overviewVariant?: "default" | "guide" }) {
  const [notice, setNotice] = useState<"saved" | "error" | "cardSaved" | "cardShared" | "shareFallback" | "cardError" | "">("");
  const [cardBusy, setCardBusy] = useState(false);
  const { locale, copy } = useLocale();
  const display = repositoryPresentation(report, locale, copy);
  const v2 = report.schemaVersion === "repository-report-v2" ? report : null;
  const actionable = v2 && (v2.ruleVersion === "repository-signals-v2.6" || v2.ruleVersion === "repository-signals-v2.7") ? v2 : null;
  const profile = reportCollaborationProfile(report);
  const profileDisplay = profile ? repositoryProfilePresentation(profile, locale) : null;
  const v2Display = repositoryV2Presentation(locale);
  const guideOverview = overviewVariant === "guide";
  async function makeCard(mode: "download" | "share") {
    if (cardBusy) return;
    setCardBusy(true);
    try {
      const card = await createRepositoryShareCard(report, locale, Object.fromEntries(REPOSITORY_AXIS_ORDER.map(axis => [axis, copy.presentation.axes[axis].label])) as Record<(typeof REPOSITORY_AXIS_ORDER)[number], string>, display.style.title);
      if (mode === "share") {
        const file = new File([card.blob], card.fileName, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `MyAiScore · ${repoName(report.repo)}`, text: display.style.title });
          setNotice("cardShared");
        } else {
          downloadShareCard(card.blob, card.fileName);
          setNotice("shareFallback");
        }
      } else {
        downloadShareCard(card.blob, card.fileName);
        setNotice("cardSaved");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("cardError");
    } finally {
      setCardBusy(false);
    }
  }
  const noticeCopy = notice === "saved" ? copy.report.saved : notice === "error" ? copy.report.saveError : notice === "cardSaved" ? copy.report.cardSaved : notice === "cardShared" ? copy.report.cardShared : notice === "shareFallback" ? copy.report.cardShareFallback : copy.report.cardError;
  return <section className="repo-report" aria-label={copy.report.aria}>
    {demo && <div className="repo-demo-banner"><span className="sample-chip">{copy.report.demoTag}</span><p>{copy.report.demoDescription}</p></div>}
    {guideOverview ? <section className="repo-overview-guide repo-hero-card product-panel" aria-label={display.scoreLabel}>
      <div className="repo-overview-guide-main">
        <div className="hero-card-logic-ambient" aria-hidden="true"><StructureFlowCollection variant="logic-core" hue={0} saturation={1.00} brightness={1.00} /></div>
        <span className="sample-chip">{copy.report.styleEyebrow}</span>
        <h2>{display.style.title}</h2>
        <div className="session-hero-number">{report.score.value}<small>/100</small></div>
        <p>{display.scoreLabel}</p>
        <div className="session-breakdown">{REPOSITORY_AXIS_ORDER.map(axis => <div key={axis}><span>{copy.presentation.axes[axis].label}</span><strong>{report.score.axes[axis].value}/25</strong></div>)}</div>
        <dl className="repo-overview-guide-meta"><div><dt>{copy.report.repository}</dt><dd>{repoName(report.repo)}</dd></div><div><dt>{copy.report.commit}</dt><dd><code>{report.commitSha.slice(0, 12)}</code></dd></div></dl>
        <p className="caption">{display.style.description}</p>
      </div>
      <aside className="repo-overview-guide-side">
        {profileDisplay && <div className="repo-overview-profile-summary">
          <span>{profileDisplay.eyebrow}</span>
          <div><strong className="repo-profile-code">{profileDisplay.code}</strong><b>{profileDisplay.title}</b></div>
          <p>{profileDisplay.description}</p>
        </div>}
        <RepositoryAxisRadar report={report} />
      </aside>
    </section> : <section className="repo-overview product-panel">
      <div className="repo-score"><span className="eyebrow">{display.scoreLabel}</span><strong>{report.score.value}</strong><small>/100</small><p>{display.scoreExplanation}</p></div>
      <div className="repo-style"><span className="eyebrow">{copy.report.styleEyebrow}</span><h2>{display.style.title}</h2><p>{display.style.description}</p><dl><div><dt>{copy.report.repository}</dt><dd>{repoName(report.repo)}</dd></div><div><dt>{copy.report.commit}</dt><dd><code>{report.commitSha.slice(0, 12)}</code></dd></div></dl></div>
    </section>}
    <p className="repo-boundary"><strong>{copy.report.boundaryStrong}</strong> {copy.report.boundaryMore}</p>
    {v2?.diagnostics.provisional && <p className="notice repo-provisional">{v2Display.provisional}</p>}
    {profileDisplay && <section className="product-panel repo-profile-panel" aria-label={profileDisplay.guideTitle}>
      <div className="repo-profile-heading"><div><span className="eyebrow">{profileDisplay.eyebrow}</span><h2>{profileDisplay.guideTitle}</h2></div><p>{profileDisplay.guideIntro}</p></div>
      {profileDisplay.code && <div className="repo-profile-identity"><div className="repo-profile-identity-code">{profileDisplay.code.split("").map((letter, index) => <span key={index}>{letter}</span>)}</div><div className="repo-profile-identity-text"><strong>{profileDisplay.title}</strong></div></div>}
      <div className="repo-profile-dimensions">{profileDisplay.dimensions.map(dimension => { const leftSelected = dimension.selectedPole === dimension.leftPole; const rightSelected = dimension.selectedPole === dimension.rightPole; const leftPct = Math.round(dimension.leftStrength * 100); return <article key={dimension.id}><div className="repo-profile-dim-top"><h3>{dimension.title}</h3><strong>{dimension.selectedLabel}</strong></div><p>{dimension.description}</p><div className="repo-profile-spectrum"><div className="repo-profile-spectrum-labels"><span className={leftSelected ? "is-selected" : undefined}>{dimension.leftPole} · {dimension.leftLabel}</span><span className={rightSelected ? "is-selected" : undefined}>{dimension.rightPole} · {dimension.rightLabel}</span></div><div className="repo-profile-spectrum-track">{leftSelected && <div className="repo-profile-spectrum-fill is-left" style={{ width: `${leftPct}%` }} />}{rightSelected && <div className="repo-profile-spectrum-fill is-right" style={{ width: `${100 - leftPct}%` }} />}<div className="repo-profile-spectrum-marker" style={{ left: `${leftPct}%` }} /></div></div><small>{profileDisplay.strength(dimension.leftStrength, dimension.rightStrength)}{dimension.boundaryLabel ? ` · ${dimension.boundaryLabel}` : ""}</small></article>; })}</div>
    </section>}
    <section className="repo-axis-section" aria-labelledby="axis-heading">
      <div className="repo-section-heading"><div><span className="eyebrow">{copy.report.axesEyebrow}</span><h2 id="axis-heading">{copy.report.axesHeading}</h2></div><p>{report.coverage.status === "complete" ? copy.report.complete : copy.report.partial} · {copy.report.staticOnly}</p></div>
      <div className="repo-axis-grid">{REPOSITORY_AXIS_ORDER.map(axis => {
        const cards = report.evidenceCards.filter(card => card.axis === axis);
        return <article className="repo-axis-card product-panel" key={axis}>
          <div className="repo-axis-top"><div className="repo-axis-identity"><span className="repo-axis-ring" style={{ background: `conic-gradient(var(--accent) ${(report.score.axes[axis].value / 25) * 360}deg, var(--line-strong) 0deg)` }}><span className="repo-axis-ring-inner">{AXIS_ICONS[axis]}</span></span><span>{copy.presentation.axes[axis].label}</span></div><strong>{report.score.axes[axis].value}<small>/25</small></strong></div>
          {cards.length ? cards.map(card => { const cardCopy = display.evidence[card.id]; const assessment = v2?.signalScores.find(item => item.id === card.id); return <div key={card.id} className="repo-evidence-card"><h3>{cardCopy.title}</h3>{assessment && <strong className="repo-signal-score">{assessment.substance === null ? v2Display.unmeasuredQuality(assessment.points, assessment.maxPoints) : v2Display.measuredQuality(assessment.points, assessment.maxPoints, Math.round(assessment.substance * 100))}</strong>}<p>{cardCopy.description}</p><details><summary>{copy.report.evidenceFiles(card.paths.length)}</summary><ul>{card.paths.map(path => <li key={path}><code>{path}</code></li>)}</ul></details></div>; }) : <p>{copy.report.noSignal}</p>}
          {axis === "traceability" && v2 && (() => { const assessment = v2.signalScores.find(item => item.id === "traceability-commit-practice"); return assessment?.presence ? <div className="repo-evidence-card"><h3>{v2Display.commitPractice}</h3><strong className="repo-signal-score">{v2Display.measuredQuality(assessment.points, assessment.maxPoints, Math.round((assessment.substance ?? 0) * 100))}</strong><p>{v2Display.commitPracticeDescription}</p></div> : null; })()}
          <p className="caption">{copy.presentation.axes[axis].question}</p>
        </article>;
      })}</div>
    </section>
    <div className="repo-detail-grid">
      <section className="product-panel repo-gaps"><span className="eyebrow">{copy.report.gapsEyebrow}</span><h2>{copy.report.gapsHeading}</h2>{display.gaps.length ? <ul>{display.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul> : <p>{copy.report.noGaps}</p>}<details><summary>{copy.report.coverageDetails}</summary><p>{display.coverageNote}</p>{report.coverage.treeTruncated && <p>{copy.report.treeTruncated}</p>}{report.coverage.selectionLimited && <p>{copy.report.selectionLimited}</p>}</details></section>
      {actionable ? <section className="repo-next repo-recommendations"><span className="eyebrow">{copy.report.recommendations}</span><p>{copy.report.recommendationsIntro}</p>{actionable.recommendations.length > 0 ? <ol>{actionable.recommendations.map(item => { const action = v2Display.recommendation(item.signalId); return <li key={item.signalId}><span>{v2Display.recommendationEffort[item.effort]}</span><h2>{action.title}</h2><p>{action.description}</p>{item.evidencePath && <small>{v2Display.recommendationPath(item.evidencePath)}</small>}</li>; })}</ol> : <p>{v2Display.noRecommendations}</p>}{actionable.ruleVersion === "repository-signals-v2.7" && actionable.cohort ? <aside className="repo-cohort"><span>{v2Display.cohortHeading}</span><strong>{v2Display.cohortPosition(actionable.cohort)}</strong><p>{v2Display.cohortDetails(actionable.cohort)}</p></aside> : <small className="repo-cohort-pending">{v2Display.cohortPending}</small>}</section> : <section className="repo-next"><span className="eyebrow">{copy.report.nextChallenge}</span><h2>{display.nextChallenge.title}</h2><p>{display.nextChallenge.description}</p></section>}
    </div>
    {v2 && <section className="product-panel repo-diagnostics"><span className="eyebrow">{v2Display.diagnosticsHeading}</span><p>{v2Display.hygieneSummary(v2.diagnostics.hygiene.highConfidenceArtifacts, v2.diagnostics.hygiene.generatedArtifactCandidates, v2.diagnostics.hygiene.secretLikePaths)}</p><p>{v2Display.structureSummary(v2.diagnostics.structure.oversizedSourceCandidates, v2.diagnostics.structure.sourceFilesOver400Lines, v2.diagnostics.structure.sourceFilesOver800Lines)}</p>{v2.diagnostics.structure.largestSelectedSourceFiles.length > 0 && <ul>{v2.diagnostics.structure.largestSelectedSourceFiles.map(file => <li key={file.path}><code>{file.path}</code> · {file.lineCount} lines</li>)}</ul>}</section>}
    {actions && <section className="repo-actions"><p className="caption">{copy.report.saveIntro}</p><div className="button-row"><button type="button" className="button button-primary" onClick={() => { try { saveToHistory(report); setNotice("saved"); } catch { setNotice("error"); } }}>{copy.report.save}</button><button type="button" className="button button-secondary" disabled={cardBusy} onClick={() => void makeCard("download")}>{copy.report.downloadCard}</button><button type="button" className="button button-secondary" disabled={cardBusy} onClick={() => void makeCard("share")}>{copy.report.shareCard}</button><Link href="/insights" className="text-button" onClick={() => { currentReport = report; }}>{copy.report.insightsLink}</Link></div><p className="repo-card-intro caption">{copy.report.cardIntro}</p>{notice && <p role="status" className="caption">{noticeCopy}</p>}</section>}
  </section>;
}

export function RepositoryHomeExperience() {
  const { locale, copy } = useLocale();
  const display = repositoryPresentation(DEMO_REPORT, locale, copy);
  const heroTitle = `${copy.home.title1} ${copy.home.title2}`;
  return <RepositoryShell><main id="main"><div className="landing-editorial">
    <section className="landing-hero repo-landing-hero" aria-labelledby="landing-title">
      <div className="shader-frame repo-crt-background" aria-hidden="true">
        <CrtBackground
          variant="terminal"
          speed={1.00}
          typeSpeed={1.00}
          motion={1.00}
          hue={0}
          saturation={1.00}
          brightness={1.00}
          opacity={1.00}
        />
      </div>
      <div className="landing-hero-copy"><p className="chapter-label"><i /> {copy.home.kicker}</p><div className="repo-hero-title-lockup"><h1 id="landing-title" className="repo-animated-title" aria-label={heroTitle}><span className="repo-title-line" data-text={copy.home.title1}>{copy.home.title1}</span><span className="repo-title-line repo-title-muted" data-text={copy.home.title2}>{copy.home.title2}</span></h1></div><p className="landing-lead">{copy.home.lead1}<br />{copy.home.lead2}</p><div className="landing-actions"><Link className="landing-primary" href="/evaluate">{copy.home.primary}</Link><a className="landing-text-action" href="#demo">{copy.home.example}</a></div><p className="landing-availability">{copy.home.availability}</p></div>
      <div className="landing-world repo-hero-card product-panel"><div className="hero-card-logic-ambient" aria-hidden="true"><StructureFlowCollection variant="logic-core" hue={0} saturation={1.00} brightness={1.00} /></div><span className="sample-chip">{copy.home.demoTag}</span><h2>{display.style.title}</h2><div className="session-hero-number">{DEMO_REPORT.score.value}<small>/100</small></div><p>{display.scoreLabel}</p><div className="session-breakdown">{REPOSITORY_AXIS_ORDER.map(axis => <div key={axis}><span>{copy.presentation.axes[axis].label}</span><strong>{DEMO_REPORT.score.axes[axis].value}/25</strong></div>)}</div><p className="caption">{copy.home.demoCaption}</p></div>
      <div className="landing-chapters">{copy.home.chapters.map((chapter, index) => <a key={chapter.label} href={`#${["flow", "scope", "demo"][index]}`}><span>0{index + 1}</span><div><b>{chapter.label}</b><p>{chapter.text}</p></div></a>)}</div>
    </section>
    <section id="flow" className="landing-section landing-process"><div className="chapter-heading"><span>{copy.home.flowLabel}</span><span>{copy.home.flowSide}</span></div><div className="landing-section-intro"><h2 className="landing-title">{copy.home.flowTitle1}<br /><em>{copy.home.flowTitle2}</em></h2><p>{copy.home.flowIntro}</p></div><div className="landing-process-grid">{copy.home.steps.map((item, index) => <article key={item.title}><div className="process-card-copy"><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></section>
    <section id="scope" className="landing-section landing-approach"><div className="chapter-heading"><span>{copy.home.scopeLabel}</span><span>{copy.home.scopeSide}</span></div><div className="landing-editorial-grid"><h2 className="landing-title">{copy.home.scopeTitle1}<br /><em>{copy.home.scopeTitle2}</em></h2><div className="landing-essay"><p className="landing-essay-lead">{copy.home.scopeLead1}<br />{copy.home.scopeLead2}</p><ul className="landing-scope-list"><li><strong>{copy.home.scopeKnownLabel}</strong><span>{copy.home.scopeBody1}</span></li><li><strong>{copy.home.scopeUnknownLabel}</strong><span>{copy.home.scopeBody2}</span></li></ul><p>{copy.home.scopeClosing}</p></div></div></section>
    <section id="demo" className="landing-section landing-example"><div className="chapter-heading"><span>{copy.home.demoLabel}</span><span>{copy.home.demoSide}</span></div><div className="landing-section-intro"><h2 className="landing-title">{copy.home.demoTitle1}<br /><em>{copy.home.demoTitle2}</em></h2><p>{copy.home.demoIntro1}<br />{copy.home.demoIntro2}</p></div><RepositoryReportView report={DEMO_REPORT} demo actions={false} /><div className="landing-workspaces"><Link href="/profile"><span>{copy.home.profileCardLabel}</span><h3>{copy.home.profileCardTitle}</h3><p>{copy.home.profileCardText}</p></Link><Link href="/insights"><span>{copy.home.insightsCardLabel}</span><h3>{copy.home.insightsCardTitle}</h3><p>{copy.home.insightsCardText}</p></Link></div></section>
    <section className="landing-closing"><p className="chapter-label"><i /> {copy.home.closingKicker}</p><h2 className="landing-title">{copy.home.closingTitle1}<br /><em>{copy.home.closingTitle2}</em></h2><Link className="landing-primary" href="/evaluate">{copy.home.closingCta}</Link><p>{copy.home.closingText}</p></section>
  </div></main></RepositoryShell>;
}

export function RepositoryEvaluateExperience() {
  const { copy } = useLocale();
  const [ready, setReady] = useState(false);
  const [repo, setRepo] = useState("");
  const [report, setReport] = useState<RepositoryReport | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [errorCode, setErrorCode] = useState("");
  const requestId = useRef(0);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const uplinkReadyAtRef = useRef<number | null>(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (status !== "loading") return;
    const root = progressRef.current;
    if (!root) return;
    const markReady = () => {
      if (!uplinkReadyAtRef.current && root.querySelector(".uplink-loader[data-state=\"ready\"]")) {
        uplinkReadyAtRef.current = performance.now();
      }
    };
    markReady();
    const observer = new MutationObserver(markReady);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, [status]);
  async function waitForUplinkReady(startedAt: number) {
    const deadline = Math.max(startedAt + 2500, performance.now() + 6000);
    while (!uplinkReadyAtRef.current && performance.now() < deadline) await delay(50);
    return uplinkReadyAtRef.current ?? startedAt;
  }
  async function waitForVisibleUplinkCompletion(startedAt: number) {
    const uplinkStartedAt = await waitForUplinkReady(startedAt);
    await waitForUplinkCompletion(uplinkStartedAt);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); const loadingStartedAt = performance.now(); const runId = requestId.current + 1; requestId.current = runId; uplinkReadyAtRef.current = null; setStatus("loading"); setErrorCode(""); setReport(null);
    try {
      const response = await fetch("/api/repository-report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repo_url: repo.trim() }) });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (runId !== requestId.current) return;
        const code = isRecord(data) && isRecord(data.error) && typeof data.error.code === "string" ? data.error.code : "";
        setStatus("error"); setErrorCode(code); return;
      }
      const parsed = parseRepositoryReport(data); await waitForVisibleUplinkCompletion(loadingStartedAt); if (runId !== requestId.current) return; currentReport = parsed; setReport(parsed); setStatus("done");
    } catch {
      if (runId !== requestId.current) return;
      setStatus("error"); setErrorCode("");
    }
  }
  const errorMessage = Object.entries(copy.evaluate.errors).find(([code]) => code === errorCode)?.[1] ?? copy.evaluate.genericError;
  return <RepositoryShell><main id="main" className="page-width product-page repo-evaluate">
    <header className="product-heading"><div><h1>{copy.evaluate.title}</h1><p>{copy.evaluate.description}</p></div></header>
    <form className="repo-form product-panel" onSubmit={submit} aria-busy={status === "loading"}><label htmlFor="repo-url">{copy.evaluate.label}</label><div className="repo-form-row"><input id="repo-url" name="repo_url" type="url" required autoComplete="url" inputMode="url" value={repo} onChange={event => setRepo(event.target.value)} placeholder={copy.evaluate.placeholder} disabled={!ready || status === "loading"} /><button className="button button-primary" type="submit" disabled={!ready || status === "loading"}>{status === "loading" ? copy.evaluate.submitting : copy.evaluate.submit}</button></div><p className="field-help">{copy.evaluate.help}</p></form>
    {status === "loading" && <div ref={progressRef} className="repo-progress repo-progress-uplink" role="status" aria-label={copy.evaluate.progressTitle}><div className="shader-frame repo-uplink-frame" aria-hidden="true"><UplinkLoader /></div><div className="repo-progress-copy"><strong>{copy.evaluate.progressTitle}</strong><p>{copy.evaluate.progressText}</p></div></div>}
    {status === "error" && <p className="notice notice-error" role="alert">{errorMessage}</p>}{status === "done" && <p className="notice" role="status">{copy.evaluate.complete}</p>}{report && <RepositoryReportView report={report} />}
    <details className="repo-cli-secondary"><summary>{copy.evaluate.cliSummary}</summary><p>{copy.evaluate.cliText}</p><pre className="session-command"><code>npm run session:report -- --project "C:/path/to/project" --out session-report.json</code></pre><p className="caption">{copy.evaluate.cliCaption}</p></details>
  </main></RepositoryShell>;
}

export function RepositoryProfileExperience() {
  const router = useRouter();
  const { locale, copy } = useLocale();
  const [reports, setReports] = useState<RepositoryReport[]>([]);
  const [error, setError] = useState<"history" | "update" | "">("");
  useEffect(() => { try { setReports(readHistory()); } catch { setError("history"); } }, []);
  function remove(index?: number) {
    try { const next = index === undefined ? [] : reports.filter((_, item) => item !== index); if (next.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); else localStorage.removeItem(HISTORY_KEY); setReports(next); setError(""); } catch { setError("update"); }
  }
  return <RepositoryShell><main id="main" className="page-width product-page">
    <header className="product-heading"><div><h1>{copy.profile.title}</h1><p>{copy.profile.description}</p></div><Link className="button button-primary" href="/evaluate">{copy.profile.newReport}</Link></header><p className="product-access-note">{copy.profile.privacy}</p>
    {error && <p className="notice notice-error" role="alert">{error === "history" ? copy.profile.historyError : copy.profile.updateError}</p>}
    {reports.length === 0 ? <section className="product-empty"><h2>{copy.profile.emptyTitle}</h2><p>{copy.profile.emptyText}</p><Link className="button button-primary" href="/evaluate">{copy.profile.emptyCta}</Link></section> : <section aria-label={copy.profile.historyAria} className="history-list">{reports.map((report, index) => { const display = repositoryPresentation(report, locale, copy); return <article className="history-entry" key={`${report.repo}@${report.commitSha}`}><div className="history-description"><span className="eyebrow">{report.coverage.status === "complete" ? copy.report.complete : copy.report.partial}</span><h2>{repoName(report.repo)}</h2><p>{display.style.title} · <code>{report.commitSha.slice(0, 12)}</code></p></div><div className="history-score"><strong>{report.score.value}</strong><small>/100</small></div><div className="history-actions"><button className="text-button" onClick={() => { currentReport = report; router.push("/insights"); }}>{copy.profile.view}</button><button className="text-button" onClick={() => remove(index)}>{copy.profile.remove}</button></div></article>; })}</section>}
    {(reports.length > 0 || error) && <button className="button button-secondary repo-clear" onClick={() => remove()}>{copy.profile.clear}</button>}<p className="caption session-footnote">{copy.profile.footnote}</p>
  </main></RepositoryShell>;
}

function RepositoryInterpretationGuide({ report }: { report: RepositoryReport | null }) {
  const { locale, copy } = useLocale();
  const reportProfile = reportCollaborationProfile(report);
  const referenceProfile = reportProfile ?? (!report ? reportCollaborationProfile(DEMO_REPORT) : null);
  const profileGuide = referenceProfile ? repositoryProfilePresentation(referenceProfile, locale) : null;
  const profileNames = repositoryProfileNameCatalog(locale);
  const guide = buildRepositoryGuide(locale, copy, report?.style.id);
  return <div className="repo-interpretation-guide">
    <details className="repo-guide repo-guide-disclosure product-panel" aria-labelledby="score-matrix-heading">
      <summary className="repo-guide-summary" aria-label={copy.insights.matrixToggle}>
        <span className="repo-guide-summary-copy"><span className="eyebrow">{copy.insights.matrixEyebrow}</span><h2 id="score-matrix-heading" className="repo-guide-title">{copy.insights.matrixTitle}</h2><span>{copy.insights.matrixIntro}</span></span>
        <span className="repo-guide-toggle" aria-hidden="true" />
      </summary>
      <div className="repo-guide-body">
        <div className="repo-score-table-wrap" role="region" aria-label={copy.insights.matrixScrollLabel} tabIndex={0}><table className="repo-score-table"><caption>{copy.insights.matrixCaption}</caption><thead><tr><th scope="col">{copy.insights.axisHeader}</th><th scope="col">{copy.insights.signalHeader}</th><th scope="col">{copy.insights.pointsHeader}</th></tr></thead>
          {guide.axes.map(axis => <tbody key={axis.id}>{axis.signals.map((signal, index) => <tr key={signal.id}>{index === 0 && <th scope="rowgroup" rowSpan={axis.signals.length + 1}>{axis.label}</th>}<th scope="row">{signal.title}</th><td>{copy.insights.points(signal.points)}</td></tr>)}<tr className="repo-axis-total"><th scope="row">{copy.insights.axisTotal}</th><td>{copy.insights.points(axis.total)}</td></tr></tbody>)}
        </table></div><p className="repo-guide-limit">{copy.insights.guideText}</p>
      </div>
    </details>
    <section className="repo-style-guide" aria-labelledby="style-guide-heading">
      <div className="repo-style-guide-heading"><div><span className="eyebrow">{copy.insights.stylesEyebrow}</span><h2 id="style-guide-heading">{copy.insights.stylesTitle}</h2></div><p>{copy.insights.stylesIntro}</p></div>
      <ol className="repo-style-rules">{guide.styles.map(style => <li key={style.id} className={style.active ? "is-active" : undefined} aria-current={style.active ? "true" : undefined}><div className="repo-style-rule-label"><span>{copy.insights.ruleStep(style.step)}</span>{style.active && <strong>{copy.insights.activeStyle}</strong>}</div><h3>{style.title}</h3><p>{style.rule}</p><small>{style.description}</small></li>)}</ol>
      <p className="repo-tie-priority">{guide.tiePriority}</p>
      {report && <p className="repo-current-style-note"><strong>{copy.insights.activeStyle}: {guide.styles.find(style => style.active)?.title}</strong><span>{copy.insights.distributionNote}</span></p>}
    </section>
    {profileGuide && <section className="repo-style-guide" aria-labelledby="profile-guide-heading">
      <div className="repo-style-guide-heading"><div><span className="eyebrow">{profileGuide.eyebrow}</span><h2 id="profile-guide-heading">{profileGuide.guideTitle}</h2></div><p>{profileGuide.guideIntro}</p></div>
      <div className="repo-profile-dimensions">{profileGuide.dimensions.map(dimension => { const leftSelected = dimension.selectedPole === dimension.leftPole; const rightSelected = dimension.selectedPole === dimension.rightPole; const leftPct = Math.round(dimension.leftStrength * 100); return <article key={dimension.id}><div className="repo-profile-dim-top"><h3>{dimension.title}</h3><strong>{dimension.selectedLabel}</strong></div><p>{dimension.description}</p><div className="repo-profile-spectrum"><div className="repo-profile-spectrum-labels"><span className={leftSelected ? "is-selected" : undefined}>{dimension.leftPole} · {dimension.leftLabel}</span><span className={rightSelected ? "is-selected" : undefined}>{dimension.rightPole} · {dimension.rightLabel}</span></div><div className="repo-profile-spectrum-track">{leftSelected && <div className="repo-profile-spectrum-fill is-left" style={{ width: `${leftPct}%` }} />}{rightSelected && <div className="repo-profile-spectrum-fill is-right" style={{ width: `${100 - leftPct}%` }} />}<div className="repo-profile-spectrum-marker" style={{ left: `${leftPct}%` }} /></div></div><small>{profileGuide.strength(dimension.leftStrength, dimension.rightStrength)}{dimension.boundaryLabel ? ` · ${dimension.boundaryLabel}` : ""}</small></article>; })}</div>
      <section className="repo-profile-name-guide" aria-labelledby="profile-name-guide-heading"><div className="repo-style-guide-heading"><div><span className="eyebrow">{copy.insights.profileNamesEyebrow}</span><h2 id="profile-name-guide-heading">{copy.insights.profileNamesTitle}</h2></div><p>{copy.insights.profileNamesIntro}</p></div><div className="repo-profile-name-grid">{profileNames.map(item => <div key={item.code}><strong>{item.code}</strong><span>{item.name}</span></div>)}</div></section>
    </section>}
    {!profileGuide && <section className="repo-style-guide" aria-labelledby="style-name-guide-heading">
      <section className="repo-profile-name-guide" aria-labelledby="style-name-guide-heading"><div className="repo-style-guide-heading"><div><span className="eyebrow">{copy.insights.profileNamesEyebrow}</span><h2 id="style-name-guide-heading">{copy.insights.profileNamesTitle}</h2></div><p>{copy.insights.profileNamesIntro}</p></div><div className="repo-profile-name-grid">{profileNames.map(item => <div key={item.code}><strong>{item.code}</strong><span>{item.name}</span></div>)}</div></section>
    </section>}
    <p className="repo-interpretation-limit">{copy.insights.profileLimit}</p>
  </div>;
}

export function RepositoryInsightsExperience() {
  const { copy } = useLocale();
  const [report, setReport] = useState<RepositoryReport | null>(currentReport);
  const [reports, setReports] = useState<RepositoryReport[]>([]);
  const [selectedIndex, setSelectedIndex] = useState("");
  useEffect(() => { try { setReports(readHistory()); } catch { /* The empty guide remains usable. */ } }, []);
  return <RepositoryShell><main id="main" className="page-width product-page">
    <header className="product-heading"><div><h1>{copy.insights.title}</h1><p>{copy.insights.description}</p></div></header>
    {reports.length > 0 && <div className="product-toolbar"><label className="repo-select">{copy.insights.savedReport}<select value={selectedIndex} onChange={event => { setSelectedIndex(event.target.value); const selected = reports[Number(event.target.value)]; if (selected) { currentReport = selected; setReport(selected); } }}><option value="" disabled>{copy.insights.choose}</option>{reports.map((item, index) => <option key={`${item.repo}@${item.commitSha}`} value={index}>{repoName(item.repo)} · {copy.profile.points(item.score.value)}</option>)}</select></label></div>}
    {report ? <RepositoryReportView report={report} actions={false} overviewVariant="guide" /> : <section className="product-empty"><h2>{copy.insights.emptyTitle}</h2><p>{copy.insights.emptyText}</p><Link className="button button-primary" href="/evaluate">{copy.insights.emptyCta}</Link></section>}
    <RepositoryInterpretationGuide report={report} />
  </main></RepositoryShell>;
}
