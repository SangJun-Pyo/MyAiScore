"use client";

import { useEffect, useRef, useState } from "react";
import { ResultView, Shell, type Assessment } from "./experience";

type Walkthrough = {
  example_kind: "repository_walkthrough";
  repo_url: string;
  commit_sha: string;
  collected_at: string;
  collection: {
    read_files: number; candidate_files: number; selected_files: number;
    http_requests: number; duration_ms: number; selection_limited: boolean; context_truncated: boolean;
  };
  provenance: { ingestion_status: "complete" | "partial" };
  questions: { question_id: string; text: string; grounding_evidence_ids: string[]; target_criteria: string[] }[];
  assessment: Assessment;
};

const stages = ["Repository snapshot", "3 scripted questions", "Report without answers"];

export default function RepositoryWalkthrough() {
  const [data, setData] = useState<Walkthrough | null>(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState(0);
  const stageChanged = useRef(false);
  useEffect(() => {
    if (!stageChanged.current) { stageChanged.current = true; return; }
    const target = document.getElementById(["snapshot-heading", "walkthrough-questions-heading", "walkthrough-report-heading"][stage]!);
    target?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage]);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/examples/myaiscore", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("The saved walkthrough could not be opened. Refresh to try again.");
      return response.json() as Promise<Walkthrough>;
    }).then(value => { if (!cancelled) setData(value); }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "The saved walkthrough could not be opened.");
    });
    return () => { cancelled = true; };
  }, []);

  return <Shell><main id="main" className="page-width product-page assessment-page">
    <header className="product-heading"><div><h1>MyAiScore repository walkthrough</h1><p>Explore a saved repository snapshot and a scripted review.</p></div></header>
    <div className="example-banner"><span className="sample-chip">REPOSITORY WALKTHROUGH</span><p>Real public repository snapshot; scripted walkthrough; no user answers or service-model evaluation.</p></div>
    <ol className="progress" aria-label="Walkthrough stages">{stages.map((label, index) => <li key={label} className={index === stage ? "active" : ""} aria-current={index === stage ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    {!data && !error && <p role="status">Opening the saved walkthrough…</p>}
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {data && <>
      <p className="repo-label">{data.repo_url.replace("https://github.com/", "")} <code>{data.commit_sha.slice(0, 12)}</code></p>
      {data.provenance.ingestion_status === "partial" && <div className="notice"><strong>Partial collection</strong><p>{data.collection.read_files} of {data.collection.selected_files} selected files were read from {data.collection.candidate_files} eligible files. Collection was incomplete; this is an additional reason the total score is withheld.</p></div>}
      {stage === 0 && <section className="product-panel assessment-form" aria-labelledby="snapshot-heading">
        <h2 id="snapshot-heading" tabIndex={-1}>Repository snapshot</h2>
        <p><a href={data.repo_url} target="_blank" rel="noreferrer">{data.repo_url.replace("https://github.com/", "")}</a></p>
        <p>Fixed commit: <a href={`${data.repo_url}/commit/${data.commit_sha}`} target="_blank" rel="noreferrer" title={data.commit_sha}><code>{data.commit_sha.slice(0, 12)}</code></a></p>
        <p>Collected: <time dateTime={data.collected_at}>{new Date(data.collected_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</time></p>
        <div className="evidence-scope"><span>Files read <strong>{data.collection.read_files}</strong></span><span>Eligible files <strong>{data.collection.candidate_files}</strong></span><span>Selected files <strong>{data.collection.selected_files}</strong></span></div>
        <p className="caption">This page replays saved material. It does not collect the repository again or run its code.</p>
        {(data.collection.selection_limited || data.collection.selected_files < data.collection.candidate_files || data.collection.context_truncated) && <div className="notice"><strong>Limited evidence coverage</strong><p>{data.collection.selected_files < data.collection.candidate_files && "Only a sample of eligible files was selected. "}{data.collection.selection_limited && "The repository tree scan was limited. "}{data.collection.context_truncated && "Some collected content was shortened for the assessment context."}</p></div>}
        <details className="score-explanation"><summary>Collection record</summary><p>The recorded collection used {data.collection.http_requests} HTTP requests and took {data.collection.duration_ms.toLocaleString("en-US")} ms. These are saved measurements, not activity happening now.</p></details>
        <div className="button-row"><button type="button" className="button button-primary" onClick={() => setStage(1)}>View scripted questions <span aria-hidden="true">→</span></button></div>
      </section>}
      {stage === 1 && <section className="questions-panel" aria-labelledby="walkthrough-questions-heading">
        <div className="section-heading"><div><h2 id="walkthrough-questions-heading" tabIndex={-1}>3 scripted questions</h2><p>Written for this snapshot. No service model generated these questions.</p></div></div>
        {data.questions.map((question, index) => <article className="question-card" key={question.question_id}><span className="question-number">0{index + 1}</span><div><h3>{question.text}</h3><div className="question-evidence">{question.grounding_evidence_ids.map(id => { const evidence = data.assessment.evidence?.find(item => item.evidence_id === id); return <span key={id}>{evidence?.path || evidence?.summary || "Linked snapshot evidence"}</span>; })}</div><p className="caption">No answer provided. The walkthrough does not invent your decisions or verification.</p></div></article>)}
        <div className="button-row"><button type="button" className="button button-secondary" onClick={() => setStage(0)}>Back to snapshot</button><button type="button" className="button button-primary" onClick={() => setStage(2)}>View report without answers <span aria-hidden="true">→</span></button></div>
      </section>}
      {stage === 2 && <section aria-labelledby="walkthrough-report-heading"><h2 id="walkthrough-report-heading" tabIndex={-1}>Scripted walkthrough report</h2><ResultView assessment={data.assessment} /><div className="button-row"><button type="button" className="button button-secondary" onClick={() => setStage(1)}>Back to scripted questions</button></div></section>}
      <p className="product-access-note">This walkthrough does not create a private assessment, save answers, or add a record to your profile.</p>
    </>}
  </main></Shell>;
}
