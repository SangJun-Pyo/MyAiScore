"use client";

import Link from "next/link";
import { useState } from "react";
import HeroScene from "./HeroScene";

const perspectives = [
  { code: "A", name: "Problem framing", question: "Start with the right problem.", detail: "Make the goal, constraints and definition of done clear before asking AI to build.", weight: 15 },
  { code: "B", name: "Context & delegation", question: "Give the work a useful shape.", detail: "Share relevant context and delegate a scope you can understand, review and steer.", weight: 20 },
  { code: "C", name: "Tool choice", question: "Choose with a reason.", detail: "Connect the tools and approach you chose to the actual needs of the problem.", weight: 15 },
  { code: "D", name: "Verification", question: "Look beyond a working demo.", detail: "Check the result, examine failure cases and show what the evidence supports.", weight: 30 },
  { code: "E", name: "Judgment & iteration", question: "Make the final call yours.", detail: "Review AI suggestions, explain your decisions and change direction when the evidence calls for it.", weight: 20 },
] as const;

/** Kage-inspired chapter composition. Attribution: /third-party/threeui/NOTICE.md. */
export default function LandingPage({ onExample, children }: { onExample: () => void; children: React.ReactNode }) {
  const [axis, setAxis] = useState<(typeof perspectives)[number]["code"]>("D");
  const selected = perspectives.find(item => item.code === axis)!;
  return <div className="landing-editorial" data-testid="english-landing">
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-hero-grid" aria-hidden="true" />
      <div className="landing-hero-copy">
        <p className="chapter-label"><i /> 00 / A clearer view of your work</p>
        <h1 id="landing-title">Build with AI.<br /><span>Know your part.</span></h1>
        <p className="landing-lead">The output is only the beginning.<br />See the decisions, context and care<br className="wide-only" /> behind what you built.</p>
        <div className="landing-actions"><Link className="landing-primary" href="/evaluate">Assess a project <span aria-hidden="true">↗</span></Link><button className="landing-text-action" onClick={onExample}>Explore a sample <span aria-hidden="true">↗</span></button></div>
        <p className="landing-availability">Experimental beta <span>·</span> No account required</p>
      </div>
      <div className="landing-world" aria-label="An interactive illustration of five assessment perspectives">
        <div className="landing-world-halo" aria-hidden="true" />
        <span className="landing-world-label">PROJECT / PERSPECTIVES</span>
        <div className="landing-world-scene"><HeroScene activeAxis={axis} /></div>
        <div className="landing-world-note" aria-live="polite"><span>{selected.code} / {selected.name}</span><p>{selected.question}</p></div>
        <div className="landing-axis-controls" role="group" aria-label="Choose an assessment perspective">{perspectives.map(item => <button key={item.code} aria-label={`${item.code} ${item.name}`} aria-pressed={axis === item.code} onClick={() => setAxis(item.code)}><span>{item.code}</span><i /></button>)}</div>
        <span className="landing-world-caption">An illustration, not a live assessment.</span>
      </div>
      <div className="landing-wordmark" aria-hidden="true">HUMAN IN THE LOOP.</div>
      <div className="landing-chapters"><a href="#approach"><span>01</span><div><b>The approach</b><p>Evidence over assumptions.</p></div></a><a href="#process"><span>02</span><div><b>The process</b><p>From project to perspective.</p></div></a><a href="#perspectives"><span>03</span><div><b>The five lenses</b><p>Decisions worth examining.</p></div></a><a href="#example"><span>04</span><div><b>The next step</b><p>A report you can act on.</p></div></a></div>
    </section>

    <section id="approach" className="landing-section landing-approach">
      <div className="chapter-heading"><span>01 / THE APPROACH</span><span>MORE THAN THE OUTPUT</span></div>
      <div className="landing-editorial-grid"><h2 className="landing-title">Good output.<br />Better questions.<br /><em>Clearer decisions.</em></h2><div className="landing-essay"><p className="landing-essay-lead">AI can write the code.<br />Your choices tell the other half.</p><p>A finished repository can't show every trade-off, rejected suggestion or moment you stopped to check. MyAiScore brings your project and the collaboration evidence you choose to share into the same conversation.</p><p>Find what your work demonstrates, what is still unknown, and one practical thing to do next.</p><Link href="/insights" className="landing-inline-link">Read the assessment criteria <span aria-hidden="true">↗</span></Link></div></div>
      <div className="landing-facts"><div><strong>01</strong><span>Public repository<br />per assessment</span></div><div><strong>05</strong><span>Perspectives on<br />your collaboration</span></div><div><strong>01</strong><span>Focused action<br />to take forward</span></div><div className="landing-fact-note"><i /><p>No token-count contest.<br />No personal skill certification.</p></div></div>
    </section>

    <section id="process" className="landing-section landing-process">
      <div className="chapter-heading"><span>02 / THE PROCESS</span><span>FROM WHAT YOU BUILT TO WHY</span></div>
      <div className="landing-section-intro"><h2 className="landing-title">A project.<br />A conversation.<br />A way forward.</h2><p>Start with the work you already have.<br />Add the context only you can provide.</p></div>
      <div className="landing-process-grid">
        <article><div className="process-art process-repository" aria-hidden="true"><div className="process-window"><div className="process-window-bar"><i /><i /><i /><span>your-project /</span></div><div className="file-line">⌑ <span>src/</span><b>source</b></div><div className="file-line">⌑ <span>tests/</span><b>checks</b></div><div className="file-line">⌑ <span>README.md</span><b>context</b></div><div className="commit-label"><i /> Snapshot tied to a commit</div></div></div><div className="process-card-copy"><span>01 / CONNECT</span><h3>Bring the project.</h3><p>Link one public GitHub repository. We read a bounded selection of files at a fixed commit, without running your code.</p></div></article>
        <article><div className="process-art process-context" aria-hidden="true"><div className="context-bubble"><span>YOUR DECISION</span><p>“I changed the approach<br />because the test failed.”</p></div><div className="context-evidence"><span>↳</span><div>Connect the decision<br /><b>to the evidence.</b></div></div></div><div className="process-card-copy"><span>02 / REFLECT</span><h3>Add your perspective.</h3><p>Share an optional collaboration case and selected excerpts. Answer three questions grounded in the available evidence.</p></div></article>
        <article><div className="process-art process-report" aria-hidden="true"><div className="report-paper"><span>YOUR NEXT ACTION</span><h4>Test the assumption.</h4><div><i /><b>Reproduce the failure</b></div><div><i /><b>Compare the result</b></div><div><i /><b>Record your decision</b></div><small>ILLUSTRATIVE ACTION</small></div></div><div className="process-card-copy"><span>03 / IMPROVE</span><h3>Leave with a next step.</h3><p>Read the evidence behind each observation and take away a focused improvement task with a clear definition of done.</p></div></article>
      </div>
    </section>

    <section id="perspectives" className="landing-section landing-perspectives">
      <div className="chapter-heading"><span>03 / THE FIVE LENSES</span><span>HOW WE LOOK AT COLLABORATION</span></div>
      <div className="landing-lenses-grid"><div className="landing-lenses-copy"><h2 className="landing-title">Five perspectives.<br /><em>One fuller picture.</em></h2><p>Less about which AI you use.<br />More about how you work with it.</p><div className="experimental-note"><span>AN EXPERIMENTAL FRAMEWORK</span><p>The weights and four-level rubric are still being calibrated. Unknown is not zero. An overall score requires evidence for all five criteria.</p></div></div><div className="landing-lens-list">{perspectives.map(item => <Link href={`/insights?axis=${item.code}`} key={item.code}><span className="lens-letter">{item.code}</span><div><h3>{item.name}</h3><p>{item.detail}</p></div><span className="lens-weight">{item.weight}%<i aria-hidden="true">↗</i></span></Link>)}</div></div>
    </section>

    <section id="example" className="landing-section landing-example">
      <div className="chapter-heading"><span>04 / FROM INSIGHT TO ACTION</span><span>SEE WHAT COMES NEXT</span></div>
      <div className="landing-section-intro"><h2 className="landing-title">A number is a start.<br /><em>The next move is yours.</em></h2><p>Explore the report format with a synthetic example.<br />It is not a real user's result or a measure of model accuracy.</p></div>
      {children}
      <div className="landing-workspaces"><Link href="/profile"><span>YOUR WORKSPACE</span><h3>Keep your projects in view.</h3><p>Revisit assessments started in this browser tab.</p><i aria-hidden="true">↗</i></Link><Link href="/insights"><span>BEHIND THE OBSERVATION</span><h3>Read the evidence, not just the score.</h3><p>Explore each criterion alongside the assessment you select.</p><i aria-hidden="true">↗</i></Link></div>
    </section>

    <section className="landing-section landing-principles" aria-labelledby="principles-title"><div><p className="chapter-label">A FEW THINGS WORTH KNOWING</p><h2 className="landing-title" id="principles-title">Clear about<br />the limits.</h2></div><div className="landing-faq"><details><summary>What does the score actually describe?<span>+</span></summary><p>Only this project and the evidence submitted with it. It is an experimental assessment of collaboration, not a certification of your overall ability or engineering skill.</p></details><details><summary>What if there isn't enough evidence?<span>+</span></summary><p>We distinguish missing evidence from an observed behavior. You can still read the supported observations and next action. The overall score is withheld if all five criteria cannot be assessed.</p></details><details><summary>Who can see my assessment?<span>+</span></summary><p>Results are private by default. You can choose to publish a limited summary. Your collaboration excerpts, answers and access token are excluded from that public summary.</p></details><details><summary>Can I run a real assessment today?<span>+</span></summary><p>The interface and synthetic example are available now. Live assessment requires a configured service model and explicit budget. The assessment form shows whether it is enabled.</p></details></div></section>

    <section className="landing-closing"><p className="chapter-label"><i /> YOUR NEXT BETTER COLLABORATION</p><h2 className="landing-title">You made something.<br /><em>Now see how.</em></h2><Link href="/evaluate" className="landing-primary">Start with your project <span aria-hidden="true">↗</span></Link><p>One project. Honest observations. A useful next step.</p><a className="landing-back-top" href="#main">BACK TO TOP ↑</a></section>
  </div>;
}
