"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  REPOSITORY_REPORT_COPY,
  parseRepositoryReport,
  type RepositoryReport,
} from "../shared/repositoryReport";

const HISTORY_KEY = "myaiscore_repository_reports_v1";
const MAX_HISTORY = 20;
const MAX_HISTORY_BYTES = 512_000;
const AXES = [
  { id: "context", name: "맥락", question: "AI가 프로젝트의 목표와 규칙을 이해할 단서가 있는가" },
  { id: "verification", name: "검증 기반", question: "결과를 확인하는 테스트와 점검 장치가 있는가" },
  { id: "traceability", name: "추적 가능성", question: "결정과 변경 이유를 나중에 따라갈 수 있는가" },
  { id: "automation", name: "자동화", question: "반복 점검을 자동으로 실행할 기반이 있는가" },
] as const;

const DEMO_REPORT: RepositoryReport = parseRepositoryReport({
  schemaVersion: "repository-report-v1",
  ruleVersion: "repository-signals-v1",
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
    value: 63,
    label: "저장소 기반 AI 협업 준비도",
    explanation: REPOSITORY_REPORT_COPY.scoreExplanation,
    axes: {
      context: { label: REPOSITORY_REPORT_COPY.axisLabels.context, value: 14 },
      verification: { label: REPOSITORY_REPORT_COPY.axisLabels.verification, value: 25 },
      traceability: { label: REPOSITORY_REPORT_COPY.axisLabels.traceability, value: 9 },
      automation: { label: REPOSITORY_REPORT_COPY.axisLabels.automation, value: 15 },
    },
  },
  style: REPOSITORY_REPORT_COPY.styles.verification,
  evidenceCards: [
    { id: "context-readme", ...REPOSITORY_REPORT_COPY.evidence["context-readme"], paths: ["README.md"] },
    { id: "context-guidance", ...REPOSITORY_REPORT_COPY.evidence["context-guidance"], paths: ["AGENTS.md"] },
    { id: "verification-tests", ...REPOSITORY_REPORT_COPY.evidence["verification-tests"], paths: ["tests/browser/experience.spec.ts"] },
    { id: "verification-config", ...REPOSITORY_REPORT_COPY.evidence["verification-config"], paths: ["playwright.config.ts"] },
    { id: "traceability-decisions", ...REPOSITORY_REPORT_COPY.evidence["traceability-decisions"], paths: ["docs/Architecture/ADR/0015-anonymous-korean-repository-reports.md"] },
    { id: "automation-ci", ...REPOSITORY_REPORT_COPY.evidence["automation-ci"], paths: [".github/workflows/ci.yml"] },
  ],
  gaps: [REPOSITORY_REPORT_COPY.gaps.traceability],
  nextChallenge: REPOSITORY_REPORT_COPY.challenges.traceability,
});

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

export function RepositoryShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const links = [
    { href: "/", name: "홈" },
    { href: "/profile", name: "내 리포트" },
    { href: "/insights", name: "해석 가이드" },
    { href: "/evaluate", name: "저장소 분석" },
  ];
  return <><a className="skip-link" href="#main" onClick={() => requestAnimationFrame(() => { const target = document.getElementById("main"); target?.setAttribute("tabindex", "-1"); target?.focus(); })}>본문으로 건너뛰기</a><header className="site-header"><div className="header-inner"><Link href="/" className="brand" aria-label="MyAiScore 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>MyAiScore<span className="beta">데모</span></Link><nav aria-label="주요 메뉴">{links.map(item => <Link key={item.href} href={item.href} className={item.href === "/evaluate" ? "nav-evaluate" : undefined} aria-current={pathname === item.href ? "page" : undefined}>{item.name}</Link>)}</nav></div></header>{children}<footer className="site-footer"><Link href="/" className="brand">MyAiScore</Link><p>공개 저장소에서 AI 협업의 흔적을 살펴봅니다.</p><span>개인의 AI 실력 인증이 아닙니다.</span></footer></>;
}

function RepositoryReportView({ report, demo = false, actions = true }: { report: RepositoryReport; demo?: boolean; actions?: boolean }) {
  const [notice, setNotice] = useState("");
  return <section className="repo-report" aria-label="저장소 분석 리포트">
    {demo && <div className="repo-demo-banner"><span className="sample-chip">가상 예시</span><p>화면 구성을 보여주기 위한 데이터입니다. 실제 저장소 분석 결과가 아닙니다.</p></div>}
    <section className="repo-overview product-panel">
      <div className="repo-score"><span className="eyebrow">{report.score.label}</span><strong>{report.score.value}</strong><small>/100</small><p>{report.score.explanation}</p></div>
      <div className="repo-style"><span className="eyebrow">저장소에서 보이는 협업 스타일</span><h2>{report.style.title}</h2><p>{report.style.description}</p><dl><div><dt>저장소</dt><dd>{repoName(report.repo)}</dd></div><div><dt>커밋</dt><dd><code>{report.commitSha.slice(0, 12)}</code></dd></div></dl></div>
    </section>
    <p className="repo-boundary"><strong>이 결과는 저장소에 남은 신호이며 개인 AI 실력 인증이 아닙니다.</strong> 실제 대화의 판단 과정이나 작업 성과 전체를 증명하지 않습니다.</p>
    <section className="repo-axis-section" aria-labelledby="axis-heading">
      <div className="repo-section-heading"><div><span className="eyebrow">네 가지 저장소 신호</span><h2 id="axis-heading">어떤 흔적이 점수에 반영됐나요?</h2></div><p>{report.coverage.readFiles}/{report.coverage.selectedFiles}개 선택 파일 확인 · {report.coverage.status === "complete" ? "수집 완료" : "일부 수집"}<br />파일에 남은 정적 신호만 반영</p></div>
      <div className="repo-axis-grid">{AXES.map(axis => {
        const cards = report.evidenceCards.filter(card => card.axis === axis.id);
        return <article className="repo-axis-card product-panel" key={axis.id}>
          <div className="repo-axis-top"><span>{axis.name}</span><strong>{report.score.axes[axis.id].value}<small>/25</small></strong></div>
          {cards.length ? cards.map(card => <div key={card.id} className="repo-evidence-card"><h3>{card.title}</h3><p>{card.description}</p><details><summary>근거 파일 {card.paths.length}개</summary><ul>{card.paths.map(path => <li key={path}><code>{path}</code></li>)}</ul></details></div>) : <p>선택된 표본에서 이 축의 신호를 확인하지 못했어요.</p>}
          <p className="caption">{axis.question}</p>
        </article>;
      })}</div>
    </section>
    <div className="repo-detail-grid"><section className="product-panel repo-gaps"><span className="eyebrow">확인할 수 없었던 것</span><h2>빈칸도 결과의 일부입니다.</h2>{report.gaps.length ? <ul>{report.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul> : <p>이번 규칙에서 별도로 표시된 빈칸이 없습니다.</p>}<details><summary>수집 범위 설명</summary><p>{report.coverage.note}</p>{report.coverage.treeTruncated && <p>GitHub가 파일 트리를 일부만 반환했어요.</p>}{report.coverage.selectionLimited && <p>후보가 많아 정해진 표본 한도 안에서 골라 읽었어요.</p>}</details></section><section className="repo-next"><span className="eyebrow">다음 도전</span><h2>{report.nextChallenge.title}</h2><p>{report.nextChallenge.description}</p></section></div>
    {actions && <section className="repo-actions"><p className="caption">저장은 선택 사항입니다. 원문이나 GitHub 계정 정보 없이 이 요약만 현재 브라우저에 저장됩니다.</p><div className="button-row"><button className="button button-primary" onClick={() => { try { saveToHistory(report); setNotice("이 브라우저의 내 리포트에 저장했습니다."); } catch { setNotice("브라우저 저장 공간에 리포트를 저장하지 못했습니다."); } }}>이 브라우저에 저장</button><Link href="/insights" className="text-button" onClick={() => { currentReport = report; }}>점수 해석 보기 →</Link></div>{notice && <p role="status" className="caption">{notice}</p>}</section>}
  </section>;
}

export function RepositoryHomeExperience() {
  return <RepositoryShell><main id="main"><div className="landing-editorial"><section className="landing-hero repo-landing-hero" aria-labelledby="landing-title"><div className="landing-hero-copy"><p className="chapter-label"><i /> 로그인 없이 바로 시작</p><h1 id="landing-title">공개 저장소에서<br /><span>AI 협업의 흔적을 찾습니다.</span></h1><p className="landing-lead">GitHub 공개 저장소 주소 하나로<br />맥락·검증·기록·자동화 신호를 살펴보세요.</p><div className="landing-actions"><Link className="landing-primary" href="/evaluate">내 저장소 분석하기 ↗</Link><a className="landing-text-action" href="#demo">예시 리포트 보기 ↘</a></div><p className="landing-availability">회원가입 없음 <span>·</span> 공개 저장소만 <span>·</span> AI 모델 호출 없음</p></div><div className="landing-world repo-hero-card product-panel"><span className="sample-chip">가상 화면 예시</span><h2>{DEMO_REPORT.style.title}</h2><div className="session-hero-number">{DEMO_REPORT.score.value}<small>/100</small></div><p>저장소 기반 AI 협업 준비도</p><div className="session-breakdown">{AXES.map(axis => <div key={axis.id}><span>{axis.name}</span><strong>{DEMO_REPORT.score.axes[axis.id].value}/25</strong></div>)}</div><p className="caption">실제 개인 평가가 아닌 저장소 신호 예시입니다.</p></div><div className="landing-chapters"><a href="#flow"><span>01</span><div><b>분석 방법</b><p>주소 입력, 신호 확인.</p></div></a><a href="#scope"><span>02</span><div><b>확인 범위</b><p>코드에 남은 흔적만.</p></div></a><a href="#demo"><span>03</span><div><b>리포트 예시</b><p>근거와 빈칸을 함께.</p></div></a></div></section><section id="flow" className="landing-section landing-process"><div className="chapter-heading"><span>01 / 분석 방법</span><span>공개 GITHUB 저장소</span></div><div className="landing-section-intro"><h2 className="landing-title">주소 하나면<br /><em>바로 확인할 수 있어요.</em></h2><p>GitHub 로그인이나 CLI 설치 없이 공개 저장소 URL을 입력합니다.</p></div><div className="landing-process-grid">{[{ title: "주소를 붙여 넣어요.", text: "github.com/소유자/저장소 형식의 공개 저장소 주소만 있으면 됩니다." }, { title: "네 가지 신호를 찾아요.", text: "맥락, 검증, 추적 가능성, 자동화에 해당하는 파일과 설정을 살펴봅니다." }, { title: "근거와 빈칸을 같이 봐요.", text: "점수뿐 아니라 반영된 파일 경로와 확인할 수 없었던 항목을 함께 보여줍니다." }].map((item, index) => <article key={item.title}><div className="process-card-copy"><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></section><section id="scope" className="landing-section landing-approach"><div className="chapter-heading"><span>02 / 확인 범위</span><span>해석의 경계</span></div><div className="landing-editorial-grid"><h2 className="landing-title">코드에 남은 신호를<br /><em>정직하게 읽습니다.</em></h2><div className="landing-essay"><p className="landing-essay-lead">확인할 수 있는 것과<br />없는 것을 구분합니다.</p><p>README, 작업 지침, 테스트, CI, 결정 기록처럼 저장소에 남아 있는 협업 기반을 찾습니다.</p><p>실제 AI 대화에서 무엇을 판단했고 어떤 제안을 거절했는지는 저장소만으로 알 수 없습니다. 이 결과는 개인의 AI 실력이나 작업 성과를 인증하지 않습니다.</p></div></div></section><section id="demo" className="landing-section landing-example"><div className="chapter-heading"><span>03 / 리포트 예시</span><span>가상 데이터</span></div><div className="landing-section-intro"><h2 className="landing-title">점수보다 먼저<br /><em>근거를 확인하세요.</em></h2><p>아래 내용은 화면 설명을 위한 가상 예시이며 저장되지 않습니다.</p></div><RepositoryReportView report={DEMO_REPORT} demo actions={false} /><div className="landing-workspaces"><Link href="/profile"><span>내 리포트</span><h3>선택한 결과만 저장합니다.</h3><p>현재 브라우저에 최대 20개까지 보관합니다.</p></Link><Link href="/insights"><span>해석 가이드</span><h3>네 축의 의미를 살펴봅니다.</h3><p>점수의 범위와 한계를 투명하게 설명합니다.</p></Link></div></section><section className="landing-closing"><p className="chapter-label"><i /> 공개 저장소로 시작하기</p><h2 className="landing-title">주소를 붙여 넣고<br /><em>협업 신호를 만나보세요.</em></h2><Link className="landing-primary" href="/evaluate">저장소 분석하기 ↗</Link><p>회원가입 없이, 공개 저장소의 신호만 분석합니다.</p></section></div></main></RepositoryShell>;
}

export function RepositoryEvaluateExperience() {
  const [ready, setReady] = useState(false);
  const [repo, setRepo] = useState("");
  const [report, setReport] = useState<RepositoryReport | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  useEffect(() => setReady(true), []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("loading"); setMessage(""); setReport(null);
    try {
      const response = await fetch("/api/repository-report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repo_url: repo.trim() }) });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const apiMessage = isRecord(data) && isRecord(data.error) && typeof data.error.message === "string" ? data.error.message : "저장소를 분석하지 못했습니다.";
        setStatus("error"); setMessage(apiMessage); return;
      }
      const parsed = parseRepositoryReport(data); currentReport = parsed; setReport(parsed); setStatus("done"); setMessage("분석이 완료되었습니다.");
    } catch {
      setStatus("error"); setMessage("서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }
  }
  return <RepositoryShell><main id="main" className="page-width product-page repo-evaluate"><header className="product-heading"><div><h1>공개 저장소 분석</h1><p>GitHub 주소 하나로 저장소에 남은 AI 협업 신호를 확인합니다.</p></div></header><form className="repo-form product-panel" onSubmit={submit} aria-busy={status === "loading"}><label htmlFor="repo-url">공개 GitHub 저장소 URL</label><div className="repo-form-row"><input id="repo-url" name="repo_url" type="url" required autoComplete="url" inputMode="url" value={repo} onChange={event => setRepo(event.target.value)} placeholder="https://github.com/owner/repository" disabled={!ready || status === "loading"} /><button className="button button-primary" type="submit" disabled={!ready || status === "loading"}>{status === "loading" ? "분석 중…" : "저장소 분석하기"}</button></div><p className="field-help">공개 저장소만 분석할 수 있습니다. GitHub 로그인이나 별도 계정은 필요하지 않습니다.</p></form>{status === "loading" && <div className="repo-progress" role="status"><span className="spinner" aria-hidden="true" /><div><strong>저장소의 협업 신호를 찾고 있습니다.</strong><p>파일 목록을 고르고 맥락·검증·기록·자동화 흔적을 확인합니다.</p></div></div>}{status === "error" && <p className="notice notice-error" role="alert">{message}</p>}{status === "done" && <p className="notice" role="status">{message}</p>}{report && <RepositoryReportView report={report} />}<details className="repo-cli-secondary"><summary>Claude Code 세션 리포트 CLI가 필요하다면</summary><p>선택한 로컬 Claude Code 세션의 활동 구성은 기존 CLI에서 별도로 만들 수 있습니다. 브라우저가 로컬 대화 기록을 자동으로 읽지는 않습니다.</p><pre className="session-command"><code>npm run session:report -- --project "C:/path/to/project" --out session-report.json</code></pre><p className="caption">이 기능은 공개 저장소 분석과 다른 리포트이며, 설치된 MyAiScore 체크아웃과 Node.js가 필요합니다.</p></details></main></RepositoryShell>;
}

export function RepositoryProfileExperience() {
  const router = useRouter();
  const [reports, setReports] = useState<RepositoryReport[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { try { setReports(readHistory()); } catch { setError("저장된 리포트를 읽을 수 없습니다. 목록을 비우고 다시 시작해 주세요."); } }, []);
  function remove(index?: number) {
    try { const next = index === undefined ? [] : reports.filter((_, item) => item !== index); if (next.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); else localStorage.removeItem(HISTORY_KEY); setReports(next); setError(""); } catch { setError("브라우저 저장 공간을 업데이트하지 못했습니다."); }
  }
  return <RepositoryShell><main id="main" className="page-width product-page"><header className="product-heading"><div><h1>내 리포트</h1><p>직접 저장한 공개 저장소 분석 결과입니다.</p></div><Link className="button button-primary" href="/evaluate">새 저장소 분석 →</Link></header><p className="product-access-note">계정 없이 현재 브라우저에만 저장됩니다. 브라우저 데이터를 지우면 함께 삭제됩니다.</p>{error && <p className="notice notice-error" role="alert">{error}</p>}{reports.length === 0 ? <section className="product-empty"><h2>저장한 리포트가 없습니다.</h2><p>공개 저장소를 분석한 뒤 ‘이 브라우저에 저장’을 선택하면 여기에 표시됩니다.</p><Link className="button button-primary" href="/evaluate">저장소 분석하기 →</Link></section> : <section aria-label="저장된 저장소 리포트" className="history-list">{reports.map((report, index) => <article className="history-entry" key={`${report.repo}@${report.commitSha}`}><div className="history-description"><span className="eyebrow">{report.coverage.status === "complete" ? "수집 완료" : "일부 수집"} · {report.coverage.readFiles}/{report.coverage.selectedFiles}개 파일</span><h2>{repoName(report.repo)}</h2><p>{report.style.title} · <code>{report.commitSha.slice(0, 12)}</code></p></div><div className="history-score"><strong>{report.score.value}</strong><small>/100</small></div><div className="history-actions"><button className="text-button" onClick={() => { currentReport = report; router.push("/insights"); }}>리포트 보기 →</button><button className="text-button" onClick={() => remove(index)}>삭제</button></div></article>)}</section>}{(reports.length > 0 || error) && <button className="button button-secondary repo-clear" onClick={() => remove()}>저장된 리포트 모두 삭제</button>}<p className="caption session-footnote">같은 저장소와 커밋은 한 번만 저장되며 최근 결과를 최대 20개까지 보관합니다.</p></main></RepositoryShell>;
}

export function RepositoryInsightsExperience() {
  const [report, setReport] = useState<RepositoryReport | null>(currentReport);
  const [reports, setReports] = useState<RepositoryReport[]>([]);
  useEffect(() => { try { setReports(readHistory()); } catch { /* The empty guide remains usable. */ } }, []);
  return <RepositoryShell><main id="main" className="page-width product-page"><header className="product-heading"><div><h1>해석 가이드</h1><p>저장소 리포트의 네 축과 한계를 설명합니다.</p></div></header>{reports.length > 0 && <div className="product-toolbar"><label className="repo-select">저장된 리포트<select value="" onChange={event => { const selected = reports[Number(event.target.value)]; if (selected) { currentReport = selected; setReport(selected); } }}><option value="" disabled>저장소 선택</option>{reports.map((item, index) => <option key={`${item.repo}@${item.commitSha}`} value={index}>{repoName(item.repo)} · {item.score.value}점</option>)}</select></label></div>}{report ? <RepositoryReportView report={report} actions={false} /> : <><section className="product-empty"><h2>선택한 리포트가 없습니다.</h2><p>저장소 분석 결과에서 ‘점수 해석 보기’를 선택하거나 저장된 리포트를 골라 주세요.</p><Link className="button button-primary" href="/evaluate">저장소 분석하기 →</Link></section><section className="repo-guide product-panel"><span className="eyebrow">점수 읽는 법</span><h2>각 축은 최대 25점입니다.</h2><div className="session-breakdown">{AXES.map(axis => <div key={axis.id}><span>{axis.name}</span><strong>0–25점</strong><p>{axis.question}</p></div>)}</div><p>총점은 저장소에 확인 가능한 신호의 구성을 설명합니다. 점수가 높다고 작업 결과가 더 좋거나 개인의 AI 활용 능력이 더 뛰어나다는 뜻은 아닙니다.</p></section></>}</main></RepositoryShell>;
}
