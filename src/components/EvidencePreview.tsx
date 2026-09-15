"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

const perspectives = [
  {
    code: "A", name: "Problem framing", question: "What would a good result look like?",
    evidence: "A clear completion condition", source: "A task brief can connect the problem to a constraint and a checkable outcome.",
    decision: "I defined the failure case before asking for an implementation.",
    review: "Connect the brief to the result.", next: "Show how you checked the outcome against the conditions you set.",
  },
  {
    code: "B", name: "Context & delegation", question: "What did the AI need to understand?",
    evidence: "The context behind the request", source: "Selected files and task boundaries can show what you chose to delegate.",
    decision: "I clarified the interface when the first suggestion missed a constraint.",
    review: "Show how the context evolved.", next: "Connect the missing context, your clarification and the revised approach.",
  },
  {
    code: "C", name: "Tool choice", question: "Why did this approach fit the problem?",
    evidence: "A reason for the approach", source: "A comparison can explain the relevant trade-off behind a tool choice.",
    decision: "I chose the simpler option because it covered the behavior we needed.",
    review: "Make the trade-off visible.", next: "Link your choice to the task constraints and the limits you considered.",
  },
  {
    code: "D", name: "Verification", question: "What did you check before accepting it?",
    evidence: "A failing input", source: "A test or review record can show what happened, beyond the presence of a test file.",
    decision: "I revised the suggestion after checking the failure case.",
    review: "Connect the change to its outcome.", next: "Show the result before and after the fix. Missing results remain unknown.",
  },
  {
    code: "E", name: "Judgment & iteration", question: "Where did your judgment change the work?",
    evidence: "The reasoning behind a revision", source: "A suggestion and its revision can show where you intervened and why.",
    decision: "I kept the useful part and changed the part that conflicted with our constraints.",
    review: "Explain the decision and its effect.", next: "Connect what you accepted or changed to the evidence behind that decision.",
  },
] as const;

/** Authored illustration of evidence review, not a collected or scored assessment. */
export default function EvidencePreview() {
  const [selectedIndex, setSelectedIndex] = useState(3);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const selected = perspectives[selectedIndex]!;

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % perspectives.length;
    else if (event.key === "ArrowLeft") next = (index + perspectives.length - 1) % perspectives.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = perspectives.length - 1;
    else return;
    event.preventDefault();
    setSelectedIndex(next);
    tabs.current[next]?.focus();
  }

  return <section className="evidence-preview" aria-label="Illustrative evidence review" data-testid="evidence-preview">
    <header className="evidence-preview-header">
      <span className="evidence-preview-product"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M5 2.5h7l3 3v12H5zM12 2.5V6h3M8 9h4M8 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>Project review</span>
      <span className="evidence-preview-label">Illustrative preview</span>
    </header>

    <div className="evidence-preview-tabs" role="tablist" aria-label="Assessment perspectives">
      {perspectives.map((item, index) => <button key={item.code} type="button" role="tab"
        id={`${id}-tab-${item.code}`} aria-controls={`${id}-panel`} aria-selected={index === selectedIndex}
        aria-label={`${item.code} ${item.name}`} tabIndex={index === selectedIndex ? 0 : -1}
        ref={element => { tabs.current[index] = element; }}
        onClick={() => setSelectedIndex(index)} onKeyDown={event => navigate(event, index)}>{item.code}</button>)}
    </div>

    <div className="evidence-preview-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected.code}`} tabIndex={0}>
      <div className="evidence-preview-heading"><h2>{selected.name}</h2><p>{selected.question}</p></div>
      <div className="evidence-preview-record">
        <span className="evidence-preview-kicker">Project evidence</span>
        <h3>{selected.evidence}</h3><p>{selected.source}</p>
      </div>
      <div className="evidence-preview-decision">
        <span className="evidence-preview-kicker">Your decision</span>
        <blockquote>“{selected.decision}”</blockquote>
      </div>
      <div className="evidence-preview-review">
        <span className="evidence-preview-kicker">Review</span>
        <h3>{selected.review}</h3><p>{selected.next}</p>
      </div>
    </div>

    <footer className="evidence-preview-footer">Example content. No project has been analyzed.</footer>
  </section>;
}
