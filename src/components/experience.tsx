"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import HeroScene from "./HeroScene";

const AXES = [
  { code: "A", name: "문제 정의", weight: 15, short: "무엇을 만들 것인가", description: "목표와 제약, 완료 조건을 명확히 정했나요?" },
  { code: "B", name: "맥락 전달과 위임", weight: 20, short: "어떻게 맡길 것인가", description: "필요한 정보를 주고 적절한 범위의 일을 맡겼나요?" },
  { code: "C", name: "도구 선택", weight: 15, short: "왜 이 방법인가", description: "문제의 특성에 맞는 도구와 접근법을 골랐나요?" },
  { code: "D", name: "검증", weight: 30, short: "정말 작동하는가", description: "결과를 확인하고 실패 상황까지 살펴봤나요?" },
  { code: "E", name: "판단과 수정", weight: 20, short: "무엇을 바꿨는가", description: "AI의 제안을 검토하고 이유를 갖고 수정했나요?" },
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
type Assessment = {
  assessment_id?: string; repo_url?: string; commit_sha?: string | null; status?: string; ingestion_status?: string;
  questions?: Question[]; evidence?: Evidence[]; result?: Result | null; visibility?: string; share_id?: string | null;
  failure?: { code: string; message: string; retryable: boolean; stage?: string } | null;
  is_example?: boolean; example_kind?: string; example_source?: string; needs_retry?: boolean; previous_assessment_id?: string | null;
};
type Configuration = { live_enabled: boolean; provider_configured: boolean; limitations?: string[] };
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
async function request<T>(path: string, options: { method?: string; body?: unknown; id?: string } = {}): Promise<T> {
  const method = options.method || "GET";
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["Idempotency-Key"] = crypto.randomUUID();
  if (options.id) {
    const token = tokenFor(options.id);
    if (!token) throw new Error("이 탭에는 비공개 결과를 여는 접근 정보가 없습니다. 평가를 시작한 탭에서 확인해 주세요.");
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
  try { data = await response.json(); } catch { throw new Error("응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요."); }
  if (!response.ok) {
    const detail = data as { error?: { message?: string } };
    throw new Error(detail.error?.message || "요청을 완료하지 못했어요. 입력과 연결 상태를 확인해 주세요.");
  }
  return data as T;
}
function asMessage(error: unknown) { return error instanceof Error ? error.message : "작업을 완료하지 못했어요. 다시 시도해 주세요."; }
function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>; }

function Shell({ children }: { children: React.ReactNode }) {
  return <><a className="skip-link" href="#main">본문으로 이동</a><header className="site-header"><div className="header-inner"><Link href="/" className="brand" aria-label="MyAiScore 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>MyAiScore<span className="beta">BETA</span></Link><nav aria-label="주 메뉴"><a href="/#how">평가 방식</a><a href="/?view=example#example">결과 예시 <Arrow diagonal /></a></nav></div></header>{children}<footer className="site-footer"><Link href="/" className="brand">MyAiScore<span className="footer-dot">·</span></Link><p>더 많이 쓰는 것에서, 더 잘 함께 만드는 것으로.</p><span>프로젝트 단위의 실험적 진단</span></footer></>;
}
function Alert({ children, error = false }: { children: React.ReactNode; error?: boolean }) { return <div className={`notice ${error ? "notice-error" : ""}`} role={error ? "alert" : "status"}>{children}</div>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="eyebrow"><span />{children}</p>; }

export function HomeExperience() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [configError, setConfigError] = useState(false);
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
    void request<Configuration>("/api/config").then(setConfig).catch(() => setConfigError(true));
    if (new URLSearchParams(window.location.search).get("view") === "example") void loadExample();
  }, [loadExample]);
  return <Shell><main id="main">
    <section className="hero page-width"><div className="hero-copy"><SectionLabel>YOUR NEXT BETTER COLLABORATION</SectionLabel><h1>AI와 함께 만들었나요?<br />이제, <em>어떻게</em> 만들었는지.</h1><p className="hero-description">코드만으로는 보이지 않는 당신의 판단.<br />프로젝트와 협업 근거에서 강점을 찾고,<br className="mobile-break" /> 다음에 바꿀 한 가지를 알려드려요.</p><div className="hero-actions"><a className="button button-primary" href="#start">내 프로젝트 돌아보기 <Arrow /></a><button className="button button-text" onClick={() => { void loadExample(); document.getElementById("example")?.scrollIntoView({ behavior: "smooth" }); }}>결과 먼저 살펴보기 <Arrow diagonal /></button></div><div className="hero-trust"><span><i />공개 저장소 읽기 전용</span><span>결과는 기본 비공개</span><span>가입 없이 시작</span></div></div>
    <div className="hero-visual" aria-label="AI 협업 과정과 근거의 연결을 보여주는 시각화">
      <div className="hero-scene"><HeroScene /></div>
      <div className="scene-coordinate scene-coordinate-top" aria-hidden="true"><span className="scene-status-dot" />COLLABORATION INTELLIGENCE <span>01—05</span></div>
      <div className="scene-coordinate scene-coordinate-side" aria-hidden="true">FROM EVIDENCE TO INSIGHT</div>
      <div className="hero-insight"><div className="insight-icon" aria-hidden="true">⌘</div><div><span className="tiny-label">FIVE DIMENSIONS. ONE NEXT MOVE.</span><p>흩어진 근거를 연결하고,<br /><strong>다음 판단을 더 명확하게.</strong></p></div><span className="insight-arrow" aria-hidden="true">↗</span></div>
    </div></section>
    <section className="principle-strip"><div className="page-width"><p>많이 사용했는지보다,<br /><strong>잘 판단했는지를 봅니다.</strong></p><div><span className="strip-number">01</span><span>근거에서 출발하는 진단</span></div><div><span className="strip-number">02</span><span>확인하지 못한 것은 미확인</span></div><div><span className="strip-number">03</span><span>실행할 수 있는 다음 행동</span></div></div></section>
    <section className="section page-width" id="how"><div className="section-heading"><div><SectionLabel>WHAT WE LOOK AT</SectionLabel><h2>AI 협업을 보는<br />다섯 가지 관점.</h2></div><p>완성된 코드와 협업 과정을 구분해 살펴봐요.<br />토큰 사용량이나 도구 개수는 가산점이 아닙니다.</p></div><div className="axes-grid">{AXES.map(axis => <article className="axis-intro" key={axis.code}><div className="axis-top"><span className="axis-letter">{axis.code}</span><span>{axis.weight}%</span></div><p className="axis-short">{axis.short}</p><h3>{axis.name}</h3><p>{axis.description}</p></article>)}</div><p className="caption">가중치와 1–4단계 기준은 교정 중인 실험적 척도입니다. 다섯 항목을 모두 판단할 수 있을 때만 종합점수를 제공합니다.</p></section>
    <section className="start-section" id="start"><div className="page-width start-grid"><div className="start-copy"><SectionLabel>START WITH ONE PROJECT</SectionLabel><h2>프로젝트 하나로,<br />다음 작업을 더 잘.</h2><p>공개 GitHub 저장소와 기억에 남는<br />AI 협업 사례 하나면 시작할 수 있어요.</p><ol className="steps"><li><span>1</span><div><strong>프로젝트와 사례 연결</strong><p>무엇을 만들고 어떤 판단을 했는지 알려주세요.</p></div></li><li><span>2</span><div><strong>근거에 맞춘 질문 3개</strong><p>코드만으로 알 수 없는 과정을 확인해요.</p></div></li><li><span>3</span><div><strong>진단과 다음 행동 확인</strong><p>근거를 살펴보고 개선 작업서를 가져가세요.</p></div></li></ol><div className="privacy-note"><span aria-hidden="true">↳</span><p>저장소의 코드를 실행하거나 수정하지 않습니다.<br />직접 선택한 자료만 평가에 사용합니다.</p></div></div><AssessmentForm config={config} configError={configError} /></div></section>
    <section id="example" className="section page-width"><div className="section-heading"><div><SectionLabel>FROM INSIGHT TO ACTION</SectionLabel><h2>점수 다음에,<br />할 일이 남도록.</h2></div><p>예시는 합성 자료로 만든 화면입니다.<br />실제 모델의 평가 정확도를 보여주지는 않습니다.</p></div>{!example && <div className="example-prompt"><span className="example-symbol" aria-hidden="true">↗</span><div><h3>근거부터 개선 작업서까지</h3><p>가입이나 자료 제출 없이 결과의 전체 흐름을 확인하세요.</p></div><button className="button button-primary" disabled={loadingExample} onClick={() => void loadExample()}>{loadingExample ? "예시를 불러오는 중…" : "가상 결과 열어보기"}<Arrow /></button></div>}{exampleError && <Alert error>{exampleError}</Alert>}{example && <ResultView assessment={example} example />}</section>
  </main></Shell>;
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
      if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || !/^\/[^/]+\/[^/]+\/?$/.test(parsed.pathname)) throw new Error("https://github.com/소유자/저장소 형식의 공개 저장소 주소를 입력해 주세요.");
      const fields = ["problem", "constraints", "done_criteria", "ai_suggestion_summary", "user_action_detail", "verification_summary"];
      const collaborationCase = includeCase ? Object.fromEntries([...fields.map(key => [key, String(form.get(key) || "").trim()]), ["user_action", String(form.get("user_action") || "modified")]]) : undefined;
      if (collaborationCase && fields.reduce((count, key) => count + String(collaborationCase[key] || "").length, 0) > 4000) throw new Error("협업 사례 여섯 항목은 합쳐서 4,000자 이내로 적어주세요.");
      const result = await request<{ assessment_id: string; owner_access_token?: string }>("/api/assessments", { method: "POST", body: { repo_url: repoUrl, collaboration_case: collaborationCase, excerpts: excerpts.map(item => item.trim()).filter(Boolean), consent: form.get("consent") === "on" } });
      if (!result.owner_access_token && !tokenFor()) throw new Error("접근 정보를 받지 못해 평가를 열 수 없습니다. 다시 시작해 주세요.");
      if (result.owner_access_token) rememberToken(result.assessment_id, result.owner_access_token);
      router.push(`/assessments/${encodeURIComponent(result.assessment_id)}`);
    } catch (e) { setError(asMessage(e)); setBusy(false); }
  }
  return <form className="assessment-form" onSubmit={submit}><div className="form-heading"><h3>어떤 프로젝트인가요?</h3><span className="private-chip">비공개 진단</span></div><label htmlFor="repo-url">공개 GitHub 저장소 <span className="required">필수</span></label><input id="repo-url" name="repo_url" type="url" required placeholder="https://github.com/you/your-project" maxLength={500} autoComplete="url" /><p className="field-help">TypeScript·Next.js 프로젝트를 우선 지원합니다.</p>
    <div className="case-switch"><label><input type="checkbox" checked={includeCase} onChange={event => setIncludeCase(event.target.checked)} />협업 사례 추가하기 <span>선택</span></label><p>여섯 항목 합계 4,000자 이내. 사례가 없으면 일부 항목은 미확인으로 남을 수 있어요.</p></div>
    {includeCase && <div className="case-fields"><Field name="problem" label="해결하려던 문제" placeholder="누구의 어떤 문제를 해결하려고 했나요?" /><Field name="constraints" label="제약 조건" placeholder="시간, 기술, 비용 등 고려한 조건" /><Field name="done_criteria" label="완료 조건" placeholder="어떤 상태가 되면 성공이라고 정했나요?" /><Field name="ai_suggestion_summary" label="AI의 제안" placeholder="AI가 제안한 접근이나 구현 방법" /><label htmlFor="user_action">내 판단</label><select id="user_action" name="user_action"><option value="modified">제안을 수정했어요</option><option value="accepted">제안을 채택했어요</option><option value="rejected">제안을 거절했어요</option></select><Field name="user_action_detail" label="판단의 이유와 실행" placeholder="왜 그렇게 판단했고 실제로 무엇을 했나요?" /><Field name="verification_summary" label="검증 과정과 결과" placeholder="무엇을 확인했고 어떤 결과가 나왔나요? 미실행이라면 그대로 적어주세요." /></div>}
    <details className="excerpt-details"><summary>협업 기록 발췌 추가 <span>선택 · 최대 3개</span></summary><p className="field-help">직접 고른 대화나 실행 결과를 붙여넣으세요. 이름, 이메일, 비밀키 등 민감정보는 먼저 지워주세요. 컴퓨터의 다른 파일을 읽지 않습니다.</p>{excerpts.map((excerpt, index) => <div className="excerpt-item" key={index}><label htmlFor={`excerpt-${index}`}>발췌 {index + 1}</label><textarea id={`excerpt-${index}`} value={excerpt} maxLength={2000} rows={4} onChange={event => setExcerpts(items => items.map((item, i) => i === index ? event.target.value : item))} placeholder="평가에 사용할 부분만 붙여넣으세요." /><div className="excerpt-meta"><span>{excerpt.length}/2,000자</span><button type="button" className="text-button" onClick={() => setExcerpts(items => items.filter((_, i) => i !== index))}>삭제</button></div></div>)}{excerpts.length < 3 && <button className="button button-small button-secondary" type="button" onClick={() => setExcerpts(items => [...items, ""])}>+ 발췌 추가</button>}</details>
    <label className="consent"><input name="consent" type="checkbox" required /><span>선택한 공개 코드와 입력 자료가 서버 및 외부 AI 제공사로 전송되어 평가에 사용됨을 확인했습니다. 공유할 권한이 있는 자료만 제출합니다.</span></label>
    {configError ? <Alert error>서비스 준비 상태를 확인하지 못했어요. 새로고침 후 다시 시도해 주세요. 아래 가상 결과는 별도로 열어볼 수 있습니다.</Alert> : config && !config.live_enabled ? <Alert>실제 분석은 준비 중입니다. 지금은 아래 가상 결과로 진단 화면과 개선 작업서를 살펴볼 수 있어요.</Alert> : !config ? <p className="field-help" role="status">서비스 상태를 확인하고 있어요…</p> : null}
    {error && <Alert error>{error}</Alert>}<button className="button button-primary submit-button" type="submit" disabled={busy || !config?.live_enabled}>{busy ? "평가를 준비하는 중…" : "내 프로젝트 분석 시작"}<Arrow /></button><p className="form-footnote">총점은 모든 항목의 근거가 충분할 때만 발급합니다.</p></form>;
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
        setActivity("중단된 단계부터 다시 진행하고 있어요.");
        await request(`${base}/retry`, { method: "POST", id });
      } else if (stage === "scoring" || stage === "finalize") {
        setActivity("근거를 대조해 진단과 다음 행동을 정리하고 있어요.");
        await request(`${base}/finalize`, { method: "POST", id });
      } else {
        if (stage === "ingestion" || stage === "ingest" || (!stage && current.ingestion_status !== "complete" && current.ingestion_status !== "partial")) {
          setActivity("공개 저장소에서 확인할 파일을 읽고 있어요.");
          await request(`${base}/ingest`, { method: "POST", id });
          current = await refresh();
        }
        if (current.status === "failed") throw new Error(current.failure?.message || "수집을 완료하지 못했어요.");
        setActivity("프로젝트 근거에 맞는 질문을 준비하고 있어요.");
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
      setActivity("답변과 근거를 바탕으로 진단하고 있어요.");
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
      if (!fresh.assessment_id) throw new Error("새 평가를 열지 못했어요. 다시 시도해 주세요.");
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
  return <Shell><main id="main" className="page-width assessment-page"><Link href="/" className="back-link">← 홈으로</Link><div className="assessment-heading"><div><SectionLabel>YOUR COLLABORATION REVIEW</SectionLabel><h1>{status === "done" ? "다음 작업의 출발점." : "프로젝트를 함께 살펴볼게요."}</h1>{assessment?.repo_url && <p className="repo-label">{assessment.repo_url.replace("https://github.com/", "")}{assessment.commit_sha && <code>{assessment.commit_sha.slice(0, 8)}</code>}</p>}</div><span className="private-chip">{assessment?.visibility === "public" ? "요약만 공개" : "비공개"}</span></div><Progress status={status} />
    {error && <Alert error>{error}</Alert>}{!assessment && !error && <div className="loading-panel" role="status"><span className="spinner" />평가 정보를 불러오고 있어요.</div>}
    {(busy || pending) && <div className="loading-panel" role="status"><span className="spinner" /><div><strong>{activity || "요청한 작업을 처리하고 있어요."}</strong><p>이 탭에서 완료 상태를 확인할 수 있어요. 자료의 양에 따라 잠시 걸릴 수 있습니다.</p></div></div>}
    {assessment && status === "draft" && !busy && <section className="action-panel"><div><h2>분석할 준비가 됐어요.</h2><p>선택한 저장소를 읽고, 협업 과정을 확인할 질문을 준비합니다.</p><p className="caption">비공개 결과의 접근 정보는 현재 탭에 보관됩니다. 결과를 확인할 때까지 탭을 유지해 주세요.</p></div><button className="button button-primary" onClick={() => void run()}>근거 수집 시작 <Arrow /></button></section>}
    {assessment?.needs_retry && !busy && <section className="action-panel"><div><h2>진행이 중단됐어요.</h2><p>이전에 시작한 작업이 제한 시간 안에 완료되지 않았습니다. 해당 단계부터 다시 시도할 수 있어요.</p></div><button className="button button-primary" onClick={() => void run("retry")}>중단된 단계 재시도</button></section>}
    {assessment?.failure && !busy && <section className="action-panel failure-panel"><div><h2>이 단계를 마치지 못했어요.</h2><p>{assessment.failure.message}</p><p className="caption">실패한 분석으로 점수를 발급하지 않습니다.</p></div>{assessment.failure.retryable && <button className="button button-primary" onClick={() => void run("retry")}>이 단계 다시 시도</button>}</section>}
    {status === "awaiting_answers" && !busy && <form className="questions-panel" onSubmit={submitAnswers}><div className="section-heading"><div><SectionLabel>THE CONTEXT ONLY YOU KNOW</SectionLabel><h2>코드에 없는 이야기를<br />들려주세요.</h2></div><p>답변은 선택입니다. 기억나지 않는 부분은<br />비워두세요. 없는 행동을 추정하지 않습니다.</p></div>{assessment?.questions?.map((question, index) => <article className="question-card" key={question.question_id}><span className="question-number">0{index + 1}</span><div><label htmlFor={`question-${question.question_id}`}>{question.text}</label><div className="question-evidence">{question.grounding_evidence_ids?.map(evidenceId => { const item = assessment.evidence?.find(evidence => evidence.evidence_id === evidenceId); return <span key={evidenceId}>{item?.path || item?.summary || "제출한 협업 근거"}</span>; })}</div><textarea id={`question-${question.question_id}`} rows={4} maxLength={2000} value={answers[question.question_id] || ""} onChange={event => setAnswers(items => ({ ...items, [question.question_id]: event.target.value }))} placeholder="실제로 했던 판단과 확인한 결과를 적어주세요." /></div></article>)}<div className="question-submit"><p>입력한 답변은 같은 평가의 외부 AI 분석에 사용됩니다.</p><button className="button button-primary" type="submit">이 답변으로 진단 보기 <Arrow /></button></div></form>}
    {assessment?.result && status === "done" && <><ResultView assessment={assessment} />{assessment.previous_assessment_id && <ComparisonView id={id} previousId={assessment.previous_assessment_id} />}<section className="share-panel"><div><h3>공유할 때도, 필요한 만큼만.</h3><p>공개 요약에는 저장소 주소, 커밋, 평가 항목과 근거 범위가 표시됩니다.<br />협업 사례, 답변, 발췌 원문은 공유하지 않습니다.</p></div>{assessment.visibility === "public" && assessment.share_id ? <div className="share-actions"><Link href={`/results/${encodeURIComponent(assessment.share_id)}`} className="button button-secondary">공개 요약 보기 <Arrow diagonal /></Link><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/results/${encodeURIComponent(assessment.share_id!)}`); setCopyStatus("링크를 복사했어요."); } catch { setCopyStatus("복사하지 못했어요. 공개 요약을 열어 주소를 복사해 주세요."); } }}>링크 복사</button><button disabled={busy} className="text-button" onClick={() => void visibility(false)}>공유 중지</button><p role="status">{copyStatus}</p></div> : <button className="button button-secondary" disabled={busy} onClick={() => setShareConfirm(true)}>공개할 항목 확인</button>}</section>{shareConfirm && <section className="confirm-panel" role="region" aria-label="공개 요약 확인"><h3>이 항목이 링크를 가진 사람에게 보입니다.</h3><p>저장소 주소와 커밋, 다섯 항목의 단계, 종합점수 상태, 읽은 파일 수 등 근거 범위가 공개됩니다. 공개 후 언제든 공유를 중지할 수 있어요.</p><div className="share-preview">{AXES.map(axis => { const criterion = assessment.result?.criteria?.find(item => item.criterion_code === axis.code); return <span key={axis.code}>{axis.name} <strong>{criterion?.status === "observed" && criterion.level ? `${criterion.level}단계` : "미확인"}</strong></span>; })}</div><div className="button-row"><button className="button button-primary" disabled={busy} onClick={() => void visibility(true)}>이 요약 공개하기</button><button className="button button-secondary" onClick={() => setShareConfirm(false)}>취소</button></div></section>}</>}
    {assessment?.result && status === "done" && <section className="reassessment-panel"><div><h3>한 가지를 개선했다면, 다시 살펴보세요.</h3><p>같은 저장소의 최신 커밋으로 새 평가를 만듭니다. 근거가 달라진 것과 실제 행동이 개선된 것은 구분합니다.</p></div><button className="button button-secondary" disabled={busy} onClick={() => setReassessConfirm(true)}>새 커밋으로 다시 평가 <Arrow /></button></section>}
    {reassessConfirm && <section className="confirm-panel" aria-label="새 평가 시작 확인"><h3>같은 프로젝트를 새로 평가할까요?</h3><p>이전 결과는 보존합니다. 이전 사례·발췌·답변은 복사하지 않으며, 새 질문에 이번 협업 과정을 답할 수 있어요. 새 공개 코드와 입력 답변은 서버 및 외부 AI 제공사에 전송되어 평가에 사용됩니다.</p><div className="button-row"><button className="button button-primary" disabled={busy} onClick={() => void reassess()}>전송에 동의하고 새 평가</button><button className="button button-secondary" onClick={() => setReassessConfirm(false)}>취소</button></div></section>}
    {assessment && <div className="delete-section">{deleteConfirm ? <div className="confirm-panel"><h3>이 평가와 저장된 자료를 삭제할까요?</h3><p>공유 링크도 사용할 수 없게 됩니다. 삭제 후에는 복구할 수 없습니다.</p><div className="button-row"><button disabled={busy} className="button button-danger" onClick={() => void remove()}>평가 삭제</button><button className="button button-secondary" onClick={() => setDeleteConfirm(false)}>취소</button></div></div> : <button disabled={busy || pending} className="text-button muted" onClick={() => setDeleteConfirm(true)}>이 평가의 자료 삭제</button>}</div>}
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
    different_repository: "같은 저장소의 평가가 아닙니다.", invalid_result: "비교할 결과의 구조를 확인하지 못했습니다.",
    mode_mismatch: "두 평가의 실행 방식이 다릅니다.", synthetic_result: "합성 예시는 실제 평가의 점수 변화로 비교하지 않습니다.",
    version_mismatch: "평가 기준이나 처리 방식의 버전이 다릅니다.", provider_mismatch: "평가에 사용한 모델이 다릅니다.",
    model_identity_unavailable: "평가에 사용한 모델을 확인하지 못했습니다.", source_mismatch: "두 평가에 사용한 근거의 종류가 다릅니다.",
    coverage_mismatch: "수집 범위가 달라 점수를 직접 비교할 수 없습니다.", score_withheld: "두 평가 중 종합점수가 보류된 결과가 있습니다.",
  };
  const levelLabel = (value: { status: string; level: number | null } | null | undefined) => value?.status === "observed" && value.level !== null ? `${value.level}단계` : "미확인";
  return <section className="comparison-panel" aria-labelledby="comparison-heading"><div className="comparison-heading"><div><SectionLabel>LOOK BACK, MOVE FORWARD</SectionLabel><h2 id="comparison-heading">이전 진단과 나란히 보기.</h2></div><Link className="text-button" href={`/assessments/${encodeURIComponent(previousId)}`}>이전 결과 열기 <Arrow diagonal /></Link></div>
    {!comparison && !error && <p className="comparison-loading" role="status">이전 평가와 비교할 수 있는 범위를 확인하고 있어요.</p>}
    {error && <div className="notice"><p>현재 진단은 정상적으로 볼 수 있지만, 이전 결과와의 비교를 불러오지 못했어요.</p><p>{error}</p><button className="text-button" onClick={() => setAttempt(value => value + 1)}>비교 다시 불러오기</button></div>}
    {comparison && <><div className="comparison-summary"><div><span className="tiny-label">SCORE DIFFERENCE</span><strong>{comparison.comparison_allowed && typeof comparison.score_delta === "number" && Number.isFinite(comparison.score_delta) ? `${comparison.score_delta > 0 ? "+" : ""}${comparison.score_delta}점` : "점수 차이 표시 보류"}</strong><p>점수 차이는 개인의 실력 향상을 의미하지 않습니다.</p></div><div className="comparison-scope"><p><span>코드 커밋</span><strong>{comparison.code_revision_changed ? "이전과 다름" : "이전과 같음"}</strong></p><p><span>제출 근거</span><strong>{comparison.evidence_changed ? "변경됨" : "변경 확인 없음"}</strong></p><p><span>행동의 개선</span><strong>확인되지 않음</strong></p></div></div>
      {!comparison.comparison_allowed && comparison.reasons.length > 0 && <div className="comparison-reasons"><strong>직접적인 점수 비교가 어려운 이유</strong><ul>{comparison.reasons.map(reason => <li key={reason}>{reasonLabels[reason] || "두 결과의 비교 조건을 충족하지 못했습니다."}</li>)}</ul></div>}
      <div className="comparison-table-wrap"><table className="comparison-table"><caption>평가 항목별 이전과 현재의 관찰 결과</caption><thead><tr><th scope="col">평가 항목</th><th scope="col">이전 평가</th><th scope="col">이번 평가</th></tr></thead><tbody>{AXES.map(axis => { const item = comparison.axes.find(entry => entry.criterion_code === axis.code); return <tr key={axis.code}><th scope="row"><span className="comparison-axis-code">{axis.code}</span>{axis.name}</th><td>{levelLabel(item?.previous)}</td><td>{levelLabel(item?.current)}</td></tr>; })}</tbody></table></div>
      <div className="comparison-notes"><p>과거에 했던 행동의 기록을 새로 제출해도 진단은 달라질 수 있어요. 근거의 변화와 실제 행동의 변화를 구분해서 읽어주세요.</p>{comparison.explanations.length > 0 && <details><summary>비교 범위와 한계 자세히 보기</summary><ul>{comparison.explanations.map((explanation, index) => <li key={index}>{explanation}</li>)}</ul></details>}</div></>}
  </section>;
}

function Progress({ status }: { status?: string }) {
  const step = status === "done" ? 3 : status === "awaiting_answers" || status === "scoring" ? 2 : status === "draft" ? 0 : 1;
  return <ol className="progress" aria-label="평가 진행 단계">{["프로젝트 연결", "근거 확인", "맞춤 질문", "진단과 다음 행동"].map((label, index) => <li key={label} className={index <= step ? "active" : ""} aria-current={index === step ? "step" : undefined}><span>{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>;
}

export function SharedExperience({ id }: { id: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void request<Assessment>(`/api/results/${encodeURIComponent(id)}`).then(setAssessment).catch(e => setError(asMessage(e))); }, [id]);
  return <Shell><main id="main" className="page-width assessment-page"><SectionLabel>SHARED REVIEW</SectionLabel><h1>프로젝트 협업 진단 요약.</h1><p className="page-description">작성자가 공개한 요약입니다. 개인 협업 기록과 답변은 포함하지 않습니다.</p>{error && <Alert error>{error}</Alert>}{!assessment && !error && <div className="loading-panel" role="status"><span className="spinner" />공개 요약을 불러오고 있어요.</div>}{assessment && <ResultView assessment={assessment} shared />}<div className="shared-cta"><h2>내 AI 협업도 돌아볼까요?</h2><Link className="button button-primary" href="/#start">내 프로젝트 시작하기 <Arrow /></Link></div></main></Shell>;
}

function ResultView({ assessment, example = false, shared = false }: { assessment: Assessment; example?: boolean; shared?: boolean }) {
  const [copyState, setCopyState] = useState("");
  const result = assessment.result;
  if (!result) return <Alert>아직 표시할 진단이 없습니다.</Alert>;
  const issued = result.score?.status === "issued" && typeof result.score.value === "number";
  const observed = result.criteria?.filter(item => item.status === "observed").length || 0;
  const withholdingLabels: Record<string, string> = {
    insufficient_dimensions: "일부 항목을 판단할 근거가 충분하지 않습니다.",
    ingestion_partial: "선정한 저장소 자료를 일부만 읽어 종합점수를 보류합니다.",
    unresolved_conflict: "판정에 영향을 주는 근거의 충돌이 남아 있습니다.",
  };
  const task = result.improvement_task;
  async function copyTask() {
    const text = task?.copy_text || [task?.title, task?.why, ...(task?.steps || []).map((step, index) => `${index + 1}. ${step}`), "완료 조건", ...(task?.done_when || [])].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(text); setCopyState("작업서를 복사했어요."); } catch { setCopyState("자동 복사를 하지 못했어요. 아래 작업서의 내용을 직접 선택해 복사해 주세요."); }
  }
  return <div className="result-view">{(example || assessment.is_example) && <div className="example-banner"><span className="sample-chip">SYNTHETIC EXAMPLE</span><p>합성 자료로 만든 가상 예시입니다. 실제 사용자의 평가 결과나 실제 모델 실행 결과가 아닙니다.</p></div>}<div className="result-overview"><div className="score-panel"><span className="tiny-label">MY AI SCORE</span>{issued ? <div className="score-number">{result.score!.value}<span>/ 100</span></div> : <h2 className="withheld-title">점수 보류<span>근거를 더 확인해야 해요.</span></h2>}<span className="score-observation">{observed}/5 항목 확인</span><p>{issued ? "다섯 항목을 판단할 근거가 확인됐습니다." : "확인되지 않은 항목을 0점으로 계산하지 않습니다."}</p></div><div className="overview-copy"><SectionLabel>{issued ? "EVIDENCE BEFORE NUMBERS" : "UNKNOWN IS NOT ZERO"}</SectionLabel><h2>{issued ? <>점수는 시작점.<br />근거가 진단의 중심입니다.</> : <>모르는 것을 남겨두는 것도,<br />정확한 진단의 일부입니다.</>}</h2><p>이번 프로젝트와 제출 근거에 한정된 실험적 진단입니다. 개인의 전체 실력이나 채용 적합성을 인증하지 않습니다.</p>{result.confidence?.evidence_scope && <div className="evidence-scope"><span>읽은 파일 <strong>{result.confidence.evidence_scope.read_files ?? "—"}</strong></span><span>선정 후보 <strong>{result.confidence.evidence_scope.candidate_files ?? "—"}</strong></span></div>}<details className="score-explanation"><summary>점수는 어떻게 계산하나요?</summary><p>각 항목은 1–4단계로 판단하고 가중치를 적용합니다. 다섯 항목의 근거가 유효하고 수집이 완료된 경우에만 25–100점 범위의 총점을 제공합니다. 일부 근거가 부족하거나 수집이 불완전하면 보류합니다.</p></details></div></div>
    {!issued && Boolean(result.score?.reasons?.length) && <div className="notice"><strong>점수를 보류한 이유</strong><ul>{result.score!.reasons!.map(reason => <li key={reason}>{withholdingLabels[reason] || "점수 발급 조건을 확인하지 못했습니다."}</li>)}</ul></div>}
    <div className="findings-heading"><h3>다섯 가지 관점에서 본 협업</h3><span>{shared ? "공개 요약" : "항목을 펼쳐 근거를 확인하세요"}</span></div><div className="findings">{AXES.map(axis => { const criterion = result.criteria?.find(item => item.criterion_code === axis.code); const level = criterion?.status === "observed" ? criterion.level : null; return <details className="finding" key={axis.code}><summary><span className="axis-letter">{axis.code}</span><span className="finding-name">{axis.name}<small>가중치 {axis.weight}%</small></span><span className={`level-badge ${level === null ? "unobserved" : ""}`}>{level === null ? "미확인" : `${level}단계 / 4`}</span><span className="expand-icon" aria-hidden="true">+</span></summary><div className="finding-body">{criterion?.rationale ? <p>{criterion.rationale}</p> : <p>{shared ? "세부 근거와 개인 협업 기록은 비공개입니다." : axis.description}</p>}{!shared && criterion?.missing_evidence && <div className="missing-note"><strong>더 확인할 자료</strong><p>{Array.isArray(criterion.missing_evidence) ? criterion.missing_evidence.join(" · ") : criterion.missing_evidence}</p></div>}{!shared && Boolean(criterion?.supporting_evidence_ids?.length) && <div className="evidence-list">{criterion!.supporting_evidence_ids!.map(evidenceId => { const evidence = assessment.evidence?.find(item => item.evidence_id === evidenceId); return <article key={evidenceId}><span className="evidence-type">{evidence?.source_type?.includes("repo") || evidence?.path ? "코드 근거" : "협업 근거"}</span>{evidence?.path && <code>{evidence.path}</code>}<p>{evidence?.summary || "연결된 근거"}</p>{evidence?.verification_note && <small>{evidence.verification_note}</small>}</article>; })}</div>}</div></details>; })}</div>
    {!shared && Boolean(result.confidence?.remaining_uncertainty?.length) && <details className="uncertainty"><summary>이번 진단에서 확인하지 못한 것</summary><ul>{result.confidence!.remaining_uncertainty!.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
    {!shared && task && <section className="improvement-panel"><div className="improvement-heading"><div><SectionLabel>ONE NEXT MOVE</SectionLabel><h2>{task.title}</h2></div><span className="task-symbol" aria-hidden="true">↗</span></div>{task.why && <p className="task-why">{task.why}</p>}<div className="task-columns"><div><h3>이렇게 실행하세요</h3><ol>{task.steps?.map((step, index) => <li key={index}>{step}</li>)}</ol></div><div><h3>이렇게 되면 완료</h3><ul>{task.done_when?.map((step, index) => <li key={index}>{step}</li>)}</ul></div></div><div className="task-footer"><p>다음 작업에 붙여넣고 직접 실행해 보세요.</p><button className="button button-light" onClick={() => void copyTask()}>개선 작업서 복사 <Arrow /></button></div>{copyState && <p className="copy-status" role="status">{copyState}</p>}</section>}
  </div>;
}
