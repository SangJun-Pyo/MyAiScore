"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LandingPage from "./LandingPage";
import { RUBRIC_CRITERIA } from "../server/evaluation/rubricCriteria";

const AXES = [
  { code: "A", name: "Problem framing", weight: 15, short: "What are you building?", description: "Did you define the goal, constraints, and completion criteria?" },
  { code: "B", name: "Context & delegation", weight: 20, short: "How will you delegate?", description: "Did you provide the right context and a clear scope of work?" },
  { code: "C", name: "Tool choice", weight: 15, short: "Why this approach?", description: "Did you choose tools and an approach that fit the problem?" },
  { code: "D", name: "Verification", weight: 30, short: "Does it actually work?", description: "Did you check the result and investigate important failure cases?" },
  { code: "E", name: "Judgment & iteration", weight: 20, short: "What did you change?", description: "Did you review the AI's suggestions and make reasoned decisions?" },
] as const;

type Evidence = { evidence_id: string; source_type?: string; summary?: string; path?: string | null; verification_note?: string | null };
type Criterion = { criterion_code: string; status: string; level: number | null; rationale?: string; missing_evidence?: string[] | string; supporting_evidence_ids?: string[] };
type Question = { question_id: string; text: string; grounding_evidence_ids?: string[]; target_criteria?: string[] };
type Result = {
  criteria?: Criterion[];
  score?: { status: string; value: number | null; reasons?: string[]; observed_dimensions?: number; total_dimensions?: number };
  confidence?: { remaining_uncertainty?: string[]; evidence_scope?: { read_files?: number; candidate_files?: number } };
  improvement_task?: { title: string; why?: string; steps?: string[]; done_when?: string[]; copy_text?: string };
  manifest?: { mode?: string; provider_id?: string };
};
export type Assessment = {
  assessment_id?: string; repo_url?: string; commit_sha?: string | null; status?: string; ingestion_status?: string;
  questions?: Question[]; evidence?: Evidence[]; result?: Result | null; visibility?: string; share_id?: string | null;
  failure?: { code: string; message: string; retryable: boolean; stage?: string } | null;
  is_example?: boolean; example_kind?: "synthetic" | "repository_walkthrough"; example_source?: string; needs_retry?: boolean; previous_assessment_id?: string | null;
};
type Configuration = { live_enabled: boolean; provider_configured: boolean; limitations?: string[] };
type HistoryEntry = {
  assessment_id: string; repo_url: string; commit_sha: string | null; status: string; created_at: string; expires_at: string;
  score: { status: string; value: number | null } | null; criteria: Pick<Criterion, "criterion_code" | "status" | "level">[]; visibility: string;
};
type HistoryResponse = { assessments: HistoryEntry[]; total: number; limit: number; has_more: boolean };
type Comparison = {
  comparison_allowed: boolean; score_delta: number | null; behavior_change: "not_established";
  reasons: string[]; evidence_changed: boolean; code_revision_changed: boolean; explanations: string[];
  previous_assessment_id: string; assessment_id: string;
  axes: { criterion_code: string; previous: { status: string; level: number | null } | null; current: { status: string; level: number | null } | null }[];
};

function tokenFor(_id?: string): string | null {
  try { return sessionStorage.getItem("myaiscore_owner_token"); }
  catch { return null; }
}
function rememberToken(_id: string, token: string) {
  sessionStorage.setItem("myaiscore_owner_token", token);
}
async function request<T>(path: string, options: { method?: string; body?: unknown; id?: string; owner?: boolean } = {}): Promise<T> {
  const method = options.method || "GET";
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["Idempotency-Key"] = crypto.randomUUID();
  if (options.id || options.owner) {
    const token = tokenFor(options.id);
    if (!token) throw new Error("This tab has no access token for this private result. Open it in the tab where you started the assessment.");
    headers.Authorization = `Bearer ${token}`;
  }
  if (path === "/api/assessments" && method === "POST" && tokenFor()) headers.Authorization = `Bearer ${tokenFor()}`;
  const response = await fetch(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), cache: "no-store" });
  if (response.status === 204) return undefined as T;
  if (response.status === 401 && path === "/api/assessments" && method === "POST" && headers.Authorization) {
    sessionStorage.removeItem("myaiscore_owner_token");
    return request<T>(path, options);
  }
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error("The response could not be read. Please try again shortly."); }
  if (!response.ok) {
    const detail = data as { error?: { message?: string } };
    throw new Error(detail.error?.message || "The request could not be completed. Check your input and connection.");
  }
  return data as T;
}
function asMessage(error: unknown) { return error instanceof Error ? error.message : "The operation could not be completed. Please try again."; }
function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>; }

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navigation = [{ href: "/", label: "Home" }, { href: "/profile", label: "Profile" }, { href: "/insights", label: "Insights" }];
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="header-inner"><Link href="/" className="brand" aria-label="MyAiScore home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>MyAiScore<span className="beta">BETA</span></Link><nav aria-label="Main navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}<Link href="/evaluate" className="nav-evaluate" aria-current={pathname === "/evaluate" ? "page" : undefined}>New assessment <Arrow /></Link></nav></div></header>{children}<footer className="site-footer"><Link href="/" className="brand">MyAiScore<span className="footer-dot">·</span></Link><p>From using more AI to building better together.</p><span>Experimental, project-specific feedback</span></footer></>;
}
function Alert({ children, error = false }: { children: React.ReactNode; error?: boolean }) { return <div className={`notice ${error ? "notice-error" : ""}`} role={error ? "alert" : "status"}>{children}</div>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="eyebrow"><span />{children}</p>; }

function useOwnerHistory() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    if (!tokenFor()) {
      setHistory({ assessments: [], total: 0, limit: 0, has_more: false }); setLoading(false);
      return;
    }
    void request<HistoryResponse>("/api/assessments", { owner: true })
      .then(result => { if (!cancelled) setHistory(result); })
      .catch(cause => { if (!cancelled) setError(asMessage(cause)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);
  return { history, loading, error, retry: () => setAttempt(value => value + 1) };
}

function repoName(url: string) { return url.replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""); }
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function statusLabel(status: string) {
  return ({ draft: "Ready to start", ingesting: "Collecting evidence", generating_questions: "Preparing questions", awaiting_answers: "Awaiting answers", scoring: "Reviewing", done: "Complete", failed: "Needs attention" } as Record<string, string>)[status] || "Checking status";
}
function criterionLabel(value: Pick<Criterion, "status" | "level"> | null | undefined, compact = false): string {
  if (value?.status === "observed" && typeof value.level === "number") return compact ? `${value.level} / 4` : `Level ${value.level}`;
  if (value?.status === "not_observed") return "Not observed";
  if (value?.status === "insufficient_evidence") return "Insufficient evidence";
  return "Not assessed";
}
function scoreLabel(score: HistoryEntry["score"]) { return score?.status === "issued" && typeof score.value === "number" ? `${score.value}` : score?.status === "withheld" ? "Withheld" : "—"; }

export function ProfileExperience() {
  const { history, loading, error, retry } = useOwnerHistory();
  const entries = history?.assessments || [];
  const completed = entries.filter(entry => entry.status === "done");
  return <Shell><main id="main" className="page-width workspace-page product-page profile-page">
    <header className="product-heading"><div><h1>Profile</h1><p>Your project assessments, in one place.</p></div><Link className="button button-primary" href="/evaluate">New assessment <Arrow /></Link></header>
    <p className="product-access-note">Records accessible in this tab. No account or personal ability certification.</p>
    {loading && <div className="loading-panel" role="status"><span className="spinner" />Loading your assessments.</div>}
    {error && <Alert error><p>{error}</p><button className="text-button" onClick={retry}>Reload assessments</button></Alert>}
    {!loading && !error && <>
      {entries.length > 0 && <div className="product-summary" aria-label="Assessment counts"><span><strong>{history?.total ?? 0}</strong> saved</span><span><strong>{completed.length}</strong> completed in this list</span><span><strong>{entries.length - completed.length}</strong> to continue</span></div>}
      {entries.length === 0 ? <section className="product-empty product-panel"><h2>No assessments yet.</h2><p>Add a public GitHub project to start your history.</p><div className="button-row"><Link href="/evaluate" className="button button-primary">Assess your first project <Arrow /></Link><Link href="/insights?view=example" className="text-button">Explore a synthetic example</Link></div></section> : <section className="history-section product-panel" aria-label="Assessment history">
        <div className="history-list">{entries.map(entry => <article key={entry.assessment_id} className="history-entry">
          <div className="history-description"><h2><Link href={`/assessments/${encodeURIComponent(entry.assessment_id)}`}>{repoName(entry.repo_url)}</Link></h2><p>{dateLabel(entry.created_at)}{entry.commit_sha && <code>{entry.commit_sha.slice(0, 8)}</code>}</p><span className={`history-status status-${entry.status}`}>{statusLabel(entry.status)}{entry.visibility === "public" ? " · Summary shared" : ""}</span></div>
          <div className="history-score"><strong>{scoreLabel(entry.score)}</strong>{entry.score?.status === "issued" && <small>/100</small>}</div>
          <div className="history-actions"><Link className="text-button" href={`/assessments/${encodeURIComponent(entry.assessment_id)}`}>{entry.status === "done" ? "View report" : "Continue"} <Arrow /></Link>{entry.status === "done" && <Link className="text-button" href={`/insights?assessment=${encodeURIComponent(entry.assessment_id)}`}>Insights <Arrow /></Link>}</div>
        </article>)}</div>
        {history?.has_more && <p className="caption">Showing the latest {entries.length} of {history.total} records. Completed and unfinished counts refer to this list.</p>}
      </section>}
      <p className="product-access-note">Closing this tab or clearing browser data may remove access. Expired and deleted records are removed from this list.</p>
    </>}
  </main></Shell>;
}

export function InsightsExperience() {
  const queryString = useSearchParams().toString();
  const { history, loading: loadingHistory, error: historyError, retry } = useOwnerHistory();
  const [axisCode, setAxisCode] = useState<(typeof AXES)[number]["code"]>("A");
  const [mode, setMode] = useState<"own" | "example">("own");
  const [selected, setSelected] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const completed = history?.assessments.filter(entry => entry.status === "done") || [];
  useEffect(() => {
    const query = new URLSearchParams(queryString);
    const code = query.get("axis");
    setAxisCode(AXES.some(axis => axis.code === code) ? code as typeof axisCode : "A");
    setMode(query.get("view") === "example" ? "example" : "own");
    setSelected(query.get("assessment") || "");
  }, [queryString]);
  useEffect(() => {
    if (selected || !history) return;
    const requested = new URLSearchParams(window.location.search).get("assessment");
    if (requested) { setSelected(requested); return; }
    const choice = history.assessments.find(entry => entry.status === "done");
    if (choice) setSelected(choice.assessment_id);
  }, [history, selected]);
  useEffect(() => {
    let cancelled = false;
    setAssessment(null); setError("");
    if (mode === "own" && !selected) { setLoadingDetail(false); return; }
    setLoadingDetail(true);
    void request<Assessment>(mode === "example" ? "/api/examples/starter" : `/api/assessments/${encodeURIComponent(selected)}`, mode === "example" ? {} : { id: selected })
      .then(value => { if (!cancelled) setAssessment(value); })
      .catch(cause => { if (!cancelled) setError(asMessage(cause)); })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [mode, selected]);
  function changeMode(value: "own" | "example") { if (value === mode) return; setAssessment(null); setMode(value); }
  const axis = AXES.find(item => item.code === axisCode)!;
  const rubric = RUBRIC_CRITERIA.find(item => item.code === axisCode)!;
  const criterion = assessment?.result?.criteria?.find(item => item.criterion_code === axisCode);
  const observed = criterion?.status === "observed" && typeof criterion.level === "number";
  const evidence = assessment?.evidence?.filter(item => criterion?.supporting_evidence_ids?.includes(item.evidence_id)) || [];
  function tabKeys(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % AXES.length : event.key === "ArrowLeft" ? (index + AXES.length - 1) % AXES.length : event.key === "Home" ? 0 : event.key === "End" ? AXES.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setAxisCode(AXES[next]!.code); document.getElementById(`insight-tab-${AXES[next]!.code}`)?.focus();
  }
  return <Shell><main id="main" className="page-width workspace-page product-page insights-page"><header className="product-heading"><div><h1>Insights</h1><p>Explore the evidence behind each assessment dimension.</p></div><Link href="/profile" className="text-button">Back to profile <Arrow /></Link></header>
    <div className="insight-source product-toolbar"><div className="source-toggle" role="group" aria-label="Assessment source"><button aria-pressed={mode === "own"} onClick={() => changeMode("own")}>My assessments</button><button aria-pressed={mode === "example"} onClick={() => changeMode("example")}>Synthetic example</button></div>{mode === "own" && (completed.length > 0 || selected) && <div className="record-selector"><label htmlFor="insight-record">Select an assessment</label><select id="insight-record" value={selected} onChange={event => { setAssessment(null); setSelected(event.target.value); }}>{selected && !completed.some(entry => entry.assessment_id === selected) && <option value={selected}>{assessment?.repo_url ? repoName(assessment.repo_url) : "Selected assessment"}{assessment?.status && assessment.status !== "done" ? ` · ${statusLabel(assessment.status)}` : ""}</option>}{completed.map(entry => <option key={entry.assessment_id} value={entry.assessment_id}>{repoName(entry.repo_url)} · {dateLabel(entry.created_at)}{entry.commit_sha ? ` · ${entry.commit_sha.slice(0, 7)}` : ""}</option>)}</select></div>}</div>
    {mode === "example" && <div className="example-banner"><span className="sample-chip">SYNTHETIC EXAMPLE</span><p>This is a synthetic example. It is not saved to your history and does not represent a real user's ability or an actual model evaluation.</p></div>}
    {historyError && mode === "own" && <Alert error><p>{historyError}</p><button className="text-button" onClick={retry}>Reload assessments</button></Alert>}
    {mode === "own" && !loadingHistory && !historyError && !selected && completed.length === 0 && <div className="insight-empty"><div><strong>No completed assessments to show.</strong><p>Explore the criteria below, or choose the synthetic example.</p></div><Link href="/evaluate" className="button button-secondary">Start your first assessment <Arrow /></Link></div>}
    <div className="insight-tabs" role="tablist" aria-label="Assessment dimensions">{AXES.map((item, index) => <button key={item.code} id={`insight-tab-${item.code}`} type="button" role="tab" aria-selected={axisCode === item.code} aria-controls="insight-panel" tabIndex={axisCode === item.code ? 0 : -1} onClick={() => setAxisCode(item.code)} onKeyDown={event => tabKeys(event, index)}><span>{item.code}</span><strong>{item.name}</strong><small>{item.weight}%</small></button>)}</div>
    <section id="insight-panel" role="tabpanel" aria-labelledby={`insight-tab-${axisCode}`} tabIndex={0} className="insight-panel"><div className="insight-axis-heading"><div><span className="axis-kicker">DIMENSION {axisCode} / 05</span><h2>{axis.name}</h2><p>{rubric.question}</p></div><div className="axis-weight"><strong>{axis.weight}<small>%</small></strong><span>Weight in the total score</span></div></div><div className="insight-columns"><div className="insight-observation"><div className="workspace-subheading"><h3>{mode === "example" ? "Example observations" : "This project's observations"}</h3><span className={`level-badge ${observed ? "" : "unobserved"}`}>{assessment?.status === "done" ? criterionLabel(criterion, true) : assessment ? "In progress" : "No assessment"}</span></div>
      {(loadingDetail || (loadingHistory && mode === "own")) && <p role="status" className="insight-loading">Loading assessment evidence…</p>}{error && <Alert error>{error}</Alert>}
      {!loadingDetail && assessment && assessment.status !== "done" && <Alert>This assessment is not finished. Open the full assessment to complete the remaining steps.</Alert>}
      {!loadingDetail && !error && (criterion ? <><p className="insight-rationale">{criterion.rationale || "No detailed explanation was provided."}</p>{criterion.missing_evidence && <div className="missing-note"><strong>Evidence still needed</strong><p>{Array.isArray(criterion.missing_evidence) ? criterion.missing_evidence.join(" · ") : criterion.missing_evidence}</p></div>}<h4>Linked evidence <span>{evidence.length}</span></h4>{evidence.length ? <div className="evidence-list">{evidence.map(item => <article key={item.evidence_id}><span className="evidence-type">{item.path ? "Code evidence" : "Process evidence"}</span>{item.path && <code>{item.path}</code>}<p>{item.summary || "No description provided"}</p>{item.verification_note && <small>{item.verification_note}</small>}</article>)}</div> : <p className="caption">No linked evidence is available for this dimension. This does not mean a score of zero.</p>}</> : <div className="insight-no-result"><span aria-hidden="true">—</span><p>Observed actions and evidence from the selected assessment appear here. We do not infer a level when records are missing.</p></div>)}
      {mode === "own" && assessment?.assessment_id && <Link className="text-button" href={`/assessments/${encodeURIComponent(assessment.assessment_id)}`}>Open the full review and personalized task <Arrow /></Link>}</div>
      <details className="rubric-guide assessment-criteria"><summary>Assessment criteria</summary><div className="rubric-guide-heading"><p>Levels 1–4 are experimental criteria under calibration. Missing evidence is a separate state, not a level.</p></div><ol>{rubric.levels.map(level => <li key={level.level} className={observed && criterion!.level === level.level ? "current-level" : ""}><div><span>{level.level}</span><strong>Level {level.level}</strong>{observed && criterion!.level === level.level && <small>{mode === "example" ? "Example" : "This review"}</small>}</div><p>{level.behavior}</p><details><summary>What to keep in mind</summary><p>{level.counterExample.replaceAll("not_observed", "not observed")}</p></details></li>)}</ol></details></div></section>
  </main></Shell>;
}

export function HomeExperience() {
  const [example, setExample] = useState<Assessment | null>(null);
  const [exampleError, setExampleError] = useState("");
  const [loadingExample, setLoadingExample] = useState(false);
  const loadExample = useCallback(async () => {
    setLoadingExample(true); setExampleError("");
    try { setExample(await request<Assessment>("/api/examples/starter")); }
    catch (e) { setExampleError(asMessage(e)); }
    finally { setLoadingExample(false); }
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "example") void loadExample();
    if (window.location.hash === "#start") window.location.replace("/evaluate");
  }, [loadExample]);
  return <Shell><main id="main"><LandingPage onExample={() => {
    void loadExample();
    document.getElementById("example")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }}>
    {!example && <div className="example-prompt"><span className="example-symbol" aria-hidden="true">↗</span><div><h3>From evidence to an improvement task</h3><p>Explore a full result without signing up or submitting your data.</p></div><button className="button button-primary" disabled={loadingExample} onClick={() => void loadExample()}>{loadingExample ? "Loading example…" : "Open the synthetic result"}<Arrow /></button></div>}
    {exampleError && <Alert error>{exampleError}</Alert>}
    {example && <ResultView assessment={example} example />}
  </LandingPage></main></Shell>;
}

export function EvaluateExperience() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [configError, setConfigError] = useState(false);
  useEffect(() => { void request<Configuration>("/api/config").then(setConfig).catch(() => setConfigError(true)); }, []);
  return <Shell><main id="main" className="page-width product-page evaluate-page"><div className="evaluate-container"><header className="product-heading"><div><h1>New assessment</h1><p>Review one public GitHub project and the AI collaboration behind it.</p></div></header><AssessmentForm config={config} configError={configError} /><p className="evaluate-example-link"><Link href="/?view=example#example" className="text-button">Preview a synthetic result <Arrow diagonal /></Link></p></div></main></Shell>;
}

function AssessmentForm({ config, configError }: { config: Configuration | null; configError: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [excerpts, setExcerpts] = useState<string[]>([]);
  const [includeCase, setIncludeCase] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const repoUrl = String(form.get("repo_url") || "").trim();
      const parsed = new URL(repoUrl);
      if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || !/^\/[^/]+\/[^/]+\/?$/.test(parsed.pathname)) throw new Error("Enter a public repository URL in the format https://github.com/owner/repository.");
      const fields = ["problem", "constraints", "done_criteria", "ai_suggestion_summary", "user_action_detail", "verification_summary"];
      const collaborationCase = includeCase ? Object.fromEntries([...fields.map(key => [key, String(form.get(key) || "").trim()]), ["user_action", String(form.get("user_action") || "modified")]]) : undefined;
      if (collaborationCase && fields.reduce((count, key) => count + String(collaborationCase[key] || "").length, 0) > 4000) throw new Error("Keep the six collaboration fields within 4,000 characters in total.");
      const result = await request<{ assessment_id: string; owner_access_token?: string }>("/api/assessments", { method: "POST", body: { repo_url: repoUrl, collaboration_case: collaborationCase, excerpts: excerpts.map(item => item.trim()).filter(Boolean), consent: form.get("consent") === "on" } });
      if (!result.owner_access_token && !tokenFor()) throw new Error("No access token was received, so this assessment cannot be opened. Please start again.");
      if (result.owner_access_token) rememberToken(result.assessment_id, result.owner_access_token);
      router.push(`/assessments/${encodeURIComponent(result.assessment_id)}`);
    } catch (e) { setError(asMessage(e)); setBusy(false); }
  }
  return <form className="assessment-form product-panel" onSubmit={submit}><label htmlFor="repo-url">Public GitHub repository <span className="required">Required</span></label><input id="repo-url" name="repo_url" type="url" required placeholder="https://github.com/you/your-project" maxLength={500} autoComplete="url" /><p className="field-help">TypeScript and Next.js projects are supported first.</p>
    <details className="case-details"><summary>Add a collaboration case <span>Optional</span></summary><div className="case-switch"><label><input type="checkbox" checked={includeCase} onChange={event => setIncludeCase(event.target.checked)} />Include this case in the assessment</label><p>Up to 4,000 characters across all six fields. Without a case, some dimensions may remain unobserved.</p></div>
    {includeCase && <div className="case-fields"><Field name="problem" label="The problem" placeholder="Whose problem were you trying to solve?" /><Field name="constraints" label="Constraints" placeholder="Time, technology, cost, or other constraints" /><Field name="done_criteria" label="Completion criteria" placeholder="What would count as a successful result?" /><Field name="ai_suggestion_summary" label="The AI's suggestion" placeholder="The approach or implementation suggested by the AI" /><label htmlFor="user_action">Your decision</label><select id="user_action" name="user_action"><option value="modified">I modified the suggestion</option><option value="accepted">I accepted the suggestion</option><option value="rejected">I rejected the suggestion</option></select><Field name="user_action_detail" label="Your reasoning and actions" placeholder="Why did you make that decision, and what did you do?" /><Field name="verification_summary" label="Verification and results" placeholder="What did you check, and what happened? If you did not run a check, say so." /></div>}</details>
    <details className="excerpt-details"><summary>Add collaboration excerpts <span>Optional · Up to 3</span></summary><p className="field-help">Paste selected conversation or execution records. Remove names, emails, secret keys, and other sensitive data first. We do not read other files on your computer.</p>{excerpts.map((excerpt, index) => <div className="excerpt-item" key={index}><label htmlFor={`excerpt-${index}`}>Excerpt {index + 1}</label><textarea id={`excerpt-${index}`} value={excerpt} maxLength={2000} rows={4} onChange={event => setExcerpts(items => items.map((item, i) => i === index ? event.target.value : item))} placeholder="Paste only the material you want assessed." /><div className="excerpt-meta"><span>{excerpt.length}/2,000 characters</span><button type="button" className="text-button" onClick={() => setExcerpts(items => items.filter((_, i) => i !== index))}>Remove</button></div></div>)}{excerpts.length < 3 && <button className="button button-small button-secondary" type="button" onClick={() => setExcerpts(items => [...items, ""])}>+ Add excerpt</button>}</details>
    <label className="consent"><input name="consent" type="checkbox" required /><span>I understand that selected public code and my inputs will be sent to the server and an external AI provider for assessment. I have permission to share this material.</span></label>
    {configError ? <Alert error>Service availability could not be checked. Refresh to try again, or explore the synthetic result on the home page.</Alert> : config && !config.live_enabled ? <Alert>Live assessment is not enabled yet. Explore the synthetic result on the home page to preview the review and improvement task.</Alert> : !config ? <p className="field-help" role="status">Checking service availability…</p> : null}
    {error && <Alert error>{error}</Alert>}<button className="button button-primary submit-button" type="submit" disabled={busy || !config?.live_enabled}>{busy ? "Preparing your assessment…" : "Start project assessment"}<Arrow /></button><p className="form-footnote">A total score is issued only when every dimension has sufficient evidence.</p></form>;
}

function Field({ name, label, placeholder }: { name: string; label: string; placeholder: string }) { return <div className="field"><label htmlFor={name}>{label}</label><textarea id={name} name={name} rows={2} maxLength={2000} placeholder={placeholder} /></div>; }

export function AssessmentExperience({ id }: { id: string }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [shareConfirm, setShareConfirm] = useState(false);
  const [reassessConfirm, setReassessConfirm] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const base = `/api/assessments/${encodeURIComponent(id)}`;
  const refresh = useCallback(async () => { const next = await request<Assessment>(`/api/assessments/${encodeURIComponent(id)}`, { id }); setAssessment(next); return next; }, [id]);
  useEffect(() => {
    setAssessment(null); setBusy(false); setActivity(""); setError(""); setAnswers({});
    setDeleteConfirm(false); setShareConfirm(false); setReassessConfirm(false); setCopyStatus("");
    void refresh().catch(e => setError(asMessage(e)));
  }, [refresh]);
  async function run(stage?: string) {
    setBusy(true); setError("");
    try {
      let current = assessment || await refresh();
      if (stage === "retry") {
        setActivity("Resuming from the interrupted step.");
        await request(`${base}/retry`, { method: "POST", id });
      } else if (stage === "scoring" || stage === "finalize") {
        setActivity("Comparing evidence to prepare your review and next step.");
        await request(`${base}/finalize`, { method: "POST", id });
      } else {
        if (stage === "ingestion" || stage === "ingest" || (!stage && current.ingestion_status !== "complete" && current.ingestion_status !== "partial")) {
          setActivity("Reading selected files from the public repository.");
          await request(`${base}/ingest`, { method: "POST", id });
          current = await refresh();
        }
        if (current.status === "failed") throw new Error(current.failure?.message || "Evidence collection could not be completed.");
        setActivity("Preparing questions grounded in your project.");
        await request(`${base}/questions`, { method: "POST", id });
      }
      await refresh();
    } catch (e) { setError(asMessage(e)); await refresh().catch(() => {}); }
    finally { setBusy(false); setActivity(""); }
  }
  async function submitAnswers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await request(`${base}/answers`, { method: "PUT", id, body: { answers: (assessment?.questions || []).map(question => ({ question_id: question.question_id, text: answers[question.question_id]?.trim() || "" })).filter(answer => answer.text.length > 0) } });
      setActivity("Reviewing your answers alongside the evidence.");
      await request(`${base}/finalize`, { method: "POST", id });
      await refresh();
    } catch (e) { setError(asMessage(e)); await refresh().catch(() => {}); }
    finally { setBusy(false); setActivity(""); }
  }
  async function visibility(publicView: boolean) {
    setBusy(true); setError("");
    try { await request(`${base}/visibility`, { method: "PATCH", id, body: { visibility: publicView ? "public" : "private" } }); await refresh(); setShareConfirm(false); }
    catch (e) { setError(asMessage(e)); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try { await request(base, { method: "DELETE", id }); router.replace("/"); }
    catch (e) { setError(asMessage(e)); setBusy(false); }
  }
  async function reassess() {
    setBusy(true); setError("");
    try {
      const fresh = await request<Assessment>(`${base}/reassess`, { method: "POST", id, body: { consent: true } });
      if (!fresh.assessment_id) throw new Error("The new assessment could not be opened. Please try again.");
      router.push(`/assessments/${encodeURIComponent(fresh.assessment_id)}`);
    } catch (e) { setError(asMessage(e)); setBusy(false); }
  }
  const status = assessment?.status;
  const pending = ["ingesting", "generating_questions", "scoring"].includes(status || "") && !assessment?.needs_retry;
  useEffect(() => {
    if (!pending || busy) return;
    const timer = setInterval(() => { void refresh().catch(e => setError(asMessage(e))); }, 3000);
    return () => clearInterval(timer);
  }, [pending, busy, refresh]);
  return <Shell><main id="main" className="page-width assessment-page"><Link href="/" className="back-link">← Back home</Link><div className="assessment-heading"><div><SectionLabel>YOUR COLLABORATION REVIEW</SectionLabel><h1>{status === "done" ? "Your next starting point." : "Let's explore your project."}</h1>{assessment?.repo_url && <p className="repo-label">{assessment.repo_url.replace("https://github.com/", "")}{assessment.commit_sha && <code>{assessment.commit_sha.slice(0, 8)}</code>}</p>}</div><span className="private-chip">{assessment?.visibility === "public" ? "Summary shared" : "Private"}</span></div><Progress status={status} />
    {error && <Alert error>{error}</Alert>}{!assessment && !error && <div className="loading-panel" role="status"><span className="spinner" />Loading assessment details.</div>}
    {(busy || pending) && <div className="loading-panel" role="status"><span className="spinner" /><div><strong>{activity || "Processing your request."}</strong><p>Keep this tab open to see the result. Larger submissions may take a little longer.</p></div></div>}
    {assessment && status === "draft" && !busy && <section className="action-panel"><div><h2>Ready to begin.</h2><p>We will read the selected repository and prepare questions about your collaboration.</p><p className="caption">Your private access token stays in this tab. Keep it open until you have reviewed the result.</p></div><button className="button button-primary" onClick={() => void run()}>Collect evidence <Arrow /></button></section>}
    {assessment?.needs_retry && !busy && <section className="action-panel"><div><h2>The process was interrupted.</h2><p>The previous step did not finish within its time limit. You can retry that step.</p></div><button className="button button-primary" onClick={() => void run("retry")}>Retry interrupted step</button></section>}
    {assessment?.failure && !busy && <section className="action-panel failure-panel"><div><h2>This step could not be completed.</h2><p>{assessment.failure.message}</p><p className="caption">A failed analysis never produces a score.</p></div>{assessment.failure.retryable && <button className="button button-primary" onClick={() => void run("retry")}>Retry this step</button>}</section>}
    {status === "awaiting_answers" && !busy && <form className="questions-panel" onSubmit={submitAnswers}><div className="section-heading"><div><SectionLabel>THE CONTEXT ONLY YOU KNOW</SectionLabel><h2>Tell us what<br />the code cannot show.</h2></div><p>Answers are optional. Leave anything you cannot recall<br />blank. We do not invent missing actions.</p></div>{assessment?.questions?.map((question, index) => <article className="question-card" key={question.question_id}><span className="question-number">0{index + 1}</span><div><label htmlFor={`question-${question.question_id}`}>{question.text}</label><div className="question-evidence">{question.grounding_evidence_ids?.map(evidenceId => { const item = assessment.evidence?.find(evidence => evidence.evidence_id === evidenceId); return <span key={evidenceId}>{item?.path || item?.summary || "Submitted collaboration evidence"}</span>; })}</div><textarea id={`question-${question.question_id}`} rows={4} maxLength={2000} value={answers[question.question_id] || ""} onChange={event => setAnswers(items => ({ ...items, [question.question_id]: event.target.value }))} placeholder="Describe the decisions you made and the results you observed." /></div></article>)}<div className="question-submit"><p>Your answers will be sent for external AI analysis as part of this assessment.</p><button className="button button-primary" type="submit">Review these answers <Arrow /></button></div></form>}
    {assessment?.result && status === "done" && <><ResultView assessment={assessment} />{assessment.previous_assessment_id && <ComparisonView id={id} previousId={assessment.previous_assessment_id} />}<section className="share-panel"><div><h3>Share only what is needed.</h3><p>A public summary shows the repository URL, commit, dimensions, and evidence coverage.<br />Your collaboration case, answers, and raw excerpts are not shared.</p></div>{assessment.visibility === "public" && assessment.share_id ? <div className="share-actions"><Link href={`/results/${encodeURIComponent(assessment.share_id)}`} className="button button-secondary">View public summary <Arrow diagonal /></Link><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/results/${encodeURIComponent(assessment.share_id!)}`); setCopyStatus("Link copied."); } catch { setCopyStatus("Could not copy the link. Open the public summary and copy its address."); } }}>Copy link</button><button disabled={busy} className="text-button" onClick={() => void visibility(false)}>Stop sharing</button><p role="status">{copyStatus}</p></div> : <button className="button button-secondary" disabled={busy} onClick={() => setShareConfirm(true)}>Preview what will be shared</button>}</section>{shareConfirm && <section className="confirm-panel" role="region" aria-label="Public summary preview"><h3>Anyone with the link will see these details.</h3><p>The repository URL and commit, five dimension levels, score status, and evidence coverage such as file counts will be public. You can stop sharing at any time.</p><div className="share-preview">{AXES.map(axis => { const criterion = assessment.result?.criteria?.find(item => item.criterion_code === axis.code); return <span key={axis.code}>{axis.name} <strong>{criterionLabel(criterion)}</strong></span>; })}</div><div className="button-row"><button className="button button-primary" disabled={busy} onClick={() => void visibility(true)}>Publish this summary</button><button className="button button-secondary" onClick={() => setShareConfirm(false)}>Cancel</button></div></section>}</>}
    {assessment?.result && status === "done" && <section className="reassessment-panel"><div><h3>Made a change? Take another look.</h3><p>Start a new assessment using the latest commit of the same repository. Changes in evidence do not automatically mean changes in behavior.</p></div><button className="button button-secondary" disabled={busy} onClick={() => setReassessConfirm(true)}>Assess the latest commit <Arrow /></button></section>}
    {reassessConfirm && <section className="confirm-panel" aria-label="Confirm a new assessment"><h3>Review this project again?</h3><p>The previous result is kept. Cases, excerpts, and answers are not copied; describe your latest process in the new questions. New public code and answers will be sent to the server and an external AI provider for assessment.</p><div className="button-row"><button className="button button-primary" disabled={busy} onClick={() => void reassess()}>Agree and start a new assessment</button><button className="button button-secondary" onClick={() => setReassessConfirm(false)}>Cancel</button></div></section>}
    {assessment && <div className="delete-section">{deleteConfirm ? <div className="confirm-panel"><h3>Delete this assessment and its stored data?</h3><p>Shared links will stop working. This cannot be undone.</p><div className="button-row"><button disabled={busy} className="button button-danger" onClick={() => void remove()}>Delete assessment</button><button className="button button-secondary" onClick={() => setDeleteConfirm(false)}>Cancel</button></div></div> : <button disabled={busy || pending} className="text-button muted" onClick={() => setDeleteConfirm(true)}>Delete this assessment's data</button>}</div>}
  </main></Shell>;
}

function ComparisonView({ id, previousId }: { id: string; previousId: string }) {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setComparison(null); setError("");
    void request<Comparison>(`/api/assessments/${encodeURIComponent(id)}/comparison`, { id })
      .then(result => { if (!cancelled) setComparison(result); })
      .catch(cause => { if (!cancelled) setError(asMessage(cause)); });
    return () => { cancelled = true; };
  }, [id, attempt]);
  const reasonLabels: Record<string, string> = {
    different_repository: "These assessments are from different repositories.", invalid_result: "The result structure could not be validated for comparison.",
    mode_mismatch: "The assessments used different execution modes.", synthetic_result: "Synthetic examples cannot be compared as real score changes.",
    version_mismatch: "The assessment criteria or processing versions differ.", provider_mismatch: "Different models were used for these assessments.",
    model_identity_unavailable: "The model used for an assessment could not be verified.", source_mismatch: "The assessments used different types of evidence.",
    coverage_mismatch: "Collection coverage differs, so scores cannot be directly compared.", score_withheld: "At least one assessment has a withheld total score.",
  };
  return <section className="comparison-panel" aria-labelledby="comparison-heading"><div className="comparison-heading"><div><SectionLabel>LOOK BACK, MOVE FORWARD</SectionLabel><h2 id="comparison-heading">Put your reviews side by side.</h2></div><Link className="text-button" href={`/assessments/${encodeURIComponent(previousId)}`}>Open previous result <Arrow diagonal /></Link></div>
    {!comparison && !error && <p className="comparison-loading" role="status">Checking which parts of these assessments can be compared.</p>}
    {error && <div className="notice"><p>Your current review is available, but the comparison could not be loaded.</p><p>{error}</p><button className="text-button" onClick={() => setAttempt(value => value + 1)}>Reload comparison</button></div>}
    {comparison && <><div className="comparison-summary"><div><span className="tiny-label">SCORE DIFFERENCE</span><strong>{comparison.comparison_allowed && typeof comparison.score_delta === "number" && Number.isFinite(comparison.score_delta) ? `${comparison.score_delta > 0 ? "+" : ""}${comparison.score_delta} points` : "Score comparison withheld"}</strong><p>A score difference does not establish an improvement in personal ability.</p></div><div className="comparison-scope"><p><span>Code commit</span><strong>{comparison.code_revision_changed ? "Different" : "Unchanged"}</strong></p><p><span>Submitted evidence</span><strong>{comparison.evidence_changed ? "Changed" : "No change detected"}</strong></p><p><span>Behavior improvement</span><strong>Not established</strong></p></div></div>
      {!comparison.comparison_allowed && comparison.reasons.length > 0 && <div className="comparison-reasons"><strong>Why these scores cannot be directly compared</strong><ul>{comparison.reasons.map(reason => <li key={reason}>{reasonLabels[reason] || "The requirements for comparing these results were not met."}</li>)}</ul></div>}
      <div className="comparison-table-wrap"><table className="comparison-table"><caption>Previous and current observations by dimension</caption><thead><tr><th scope="col">Assessment dimensions</th><th scope="col">Previous assessment</th><th scope="col">Current assessment</th></tr></thead><tbody>{AXES.map(axis => { const item = comparison.axes.find(entry => entry.criterion_code === axis.code); return <tr key={axis.code}><th scope="row"><span className="comparison-axis-code">{axis.code}</span>{axis.name}</th><td>{criterionLabel(item?.previous)}</td><td>{criterionLabel(item?.current)}</td></tr>; })}</tbody></table></div>
      <div className="comparison-notes"><p>Adding records of past actions can change a review. Distinguish a change in evidence from a change in actual behavior.</p>{comparison.explanations.length > 0 && <details><summary>Comparison scope and limitations</summary><ul>{comparison.explanations.map((explanation, index) => <li key={index}>{explanation}</li>)}</ul></details>}</div></>}
  </section>;
}

function Progress({ status }: { status?: string }) {
  const step = status === "done" ? 3 : status === "awaiting_answers" || status === "scoring" ? 2 : status === "draft" ? 0 : 1;
  return <ol className="progress" aria-label="Assessment progress">{["Connect project", "Check evidence", "Grounded questions", "Review and next step"].map((label, index) => <li key={label} className={index <= step ? "active" : ""} aria-current={index === step ? "step" : undefined}><span>{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>;
}

export function SharedExperience({ id }: { id: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void request<Assessment>(`/api/results/${encodeURIComponent(id)}`).then(setAssessment).catch(e => setError(asMessage(e))); }, [id]);
  return <Shell><main id="main" className="page-width assessment-page"><SectionLabel>SHARED REVIEW</SectionLabel><h1>Project collaboration summary.</h1><p className="page-description">A summary shared by its owner. Private collaboration records and answers are not included.</p>{error && <Alert error>{error}</Alert>}{!assessment && !error && <div className="loading-panel" role="status"><span className="spinner" />Loading the public summary.</div>}{assessment && <ResultView assessment={assessment} shared />}<div className="shared-cta"><h2>Ready to review your own collaboration?</h2><Link className="button button-primary" href="/evaluate">Start your project <Arrow /></Link></div></main></Shell>;
}

export function ResultView({ assessment, example = false, shared = false }: { assessment: Assessment; example?: boolean; shared?: boolean }) {
  const [copyState, setCopyState] = useState("");
  const result = assessment.result;
  if (!result) return <Alert>There is no review to show yet.</Alert>;
  const issued = result.score?.status === "issued" && typeof result.score.value === "number";
  const observed = result.criteria?.filter(item => item.status === "observed").length || 0;
  const withholdingLabels: Record<string, string> = {
    insufficient_dimensions: "Some dimensions do not have enough evidence to assess.",
    ingestion_partial: "Only part of the selected repository material was collected, so the total score is withheld.",
    unresolved_conflict: "Unresolved evidence conflicts still affect the assessment.",
  };
  const task = result.improvement_task;
  async function copyTask() {
    const text = task?.copy_text || [task?.title, task?.why, ...(task?.steps || []).map((step, index) => `${index + 1}. ${step}`), "Completion criteria", ...(task?.done_when || [])].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(text); setCopyState("Task copied."); } catch { setCopyState("Could not copy automatically. Select and copy the task text below."); }
  }
  return <div className="result-view">{(example || assessment.is_example) && <div className="example-banner"><span className="sample-chip">{assessment.example_kind === "repository_walkthrough" ? "REPOSITORY WALKTHROUGH" : "SYNTHETIC EXAMPLE"}</span><p>{assessment.example_kind === "repository_walkthrough" ? "Real public repository snapshot; scripted walkthrough; no user answers or service-model evaluation." : "This is a synthetic example, not a real user's result or an actual model evaluation."}</p></div>}<div className="result-overview"><div className="score-panel"><span className="tiny-label">MY AI SCORE</span>{issued ? <div className="score-number">{result.score!.value}<span>/ 100</span></div> : <h2 className="withheld-title">Score withheld<span>More evidence needs to be checked.</span></h2>}<span className="score-observation">{observed}/5 dimensions observed</span><p>{issued ? "Evidence was available to assess all five dimensions." : "Unobserved dimensions are not counted as zero."}</p></div><div className="overview-copy"><SectionLabel>{issued ? "EVIDENCE BEFORE NUMBERS" : "UNKNOWN IS NOT ZERO"}</SectionLabel><h2>{issued ? <>The score is a starting point.<br />Evidence is at the center.</> : <>Leaving unknowns visible<br />is part of an honest review.</>}</h2><p>An experimental review limited to this project and the submitted evidence. It does not certify overall ability or suitability for hiring.</p>{result.confidence?.evidence_scope && <div className="evidence-scope"><span>Files read <strong>{result.confidence.evidence_scope.read_files ?? "—"}</strong></span><span>Eligible files <strong>{result.confidence.evidence_scope.candidate_files ?? "—"}</strong></span></div>}<details className="score-explanation"><summary>How is the score calculated?</summary><p>Each dimension is assessed at levels 1–4 and weighted. A total from 25 to 100 is issued only when all five dimensions have valid evidence and collection is complete. Otherwise, the total is withheld.</p></details></div></div>
    {!issued && Boolean(result.score?.reasons?.length) && <div className="notice"><strong>Why the score was withheld</strong><ul>{result.score!.reasons!.map(reason => <li key={reason}>{withholdingLabels[reason] || "The requirements for issuing a score could not be confirmed."}</li>)}</ul></div>}
    <div className="findings-heading"><h3>Five perspectives on your collaboration</h3><span>{shared ? "Public summary" : "Expand a dimension to explore the evidence"}</span></div><div className="findings">{AXES.map(axis => { const criterion = result.criteria?.find(item => item.criterion_code === axis.code); const level = criterion?.status === "observed" ? criterion.level : null; return <details className="finding" key={axis.code}><summary><span className="axis-letter">{axis.code}</span><span className="finding-name">{axis.name}<small>Weight {axis.weight}%</small></span><span className={`level-badge ${level === null ? "unobserved" : ""}`}>{criterionLabel(criterion, true)}</span><span className="expand-icon" aria-hidden="true">+</span></summary><div className="finding-body">{criterion?.rationale ? <p>{criterion.rationale}</p> : <p>{shared ? "Detailed evidence and private collaboration records are not shared." : axis.description}</p>}{!shared && criterion?.missing_evidence && <div className="missing-note"><strong>Evidence still needed</strong><p>{Array.isArray(criterion.missing_evidence) ? criterion.missing_evidence.join(" · ") : criterion.missing_evidence}</p></div>}{!shared && Boolean(criterion?.supporting_evidence_ids?.length) && <div className="evidence-list">{criterion!.supporting_evidence_ids!.map(evidenceId => { const evidence = assessment.evidence?.find(item => item.evidence_id === evidenceId); return <article key={evidenceId}><span className="evidence-type">{evidence?.source_type?.includes("repo") || evidence?.path ? "Code evidence" : "Process evidence"}</span>{evidence?.path && <code>{evidence.path}</code>}<p>{evidence?.summary || "Linked evidence"}</p>{evidence?.verification_note && <small>{evidence.verification_note}</small>}</article>; })}</div>}</div></details>; })}</div>
    {!shared && Boolean(result.confidence?.remaining_uncertainty?.length) && <details className="uncertainty"><summary>What this review could not establish</summary><ul>{result.confidence!.remaining_uncertainty!.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
    {!shared && task && <section className="improvement-panel"><div className="improvement-heading"><div><SectionLabel>ONE NEXT MOVE</SectionLabel><h2>{task.title}</h2></div><span className="task-symbol" aria-hidden="true">↗</span></div>{task.why && <p className="task-why">{task.why}</p>}<div className="task-columns"><div><h3>What to do</h3><ol>{task.steps?.map((step, index) => <li key={index}>{step}</li>)}</ol></div><div><h3>Done when</h3><ul>{task.done_when?.map((step, index) => <li key={index}>{step}</li>)}</ul></div></div><div className="task-footer"><p>Take this task into your next working session.</p><button className="button button-light" onClick={() => void copyTask()}>Copy improvement task <Arrow /></button></div>{copyState && <p className="copy-status" role="status">{copyState}</p>}</section>}
  </div>;
}
