import { InsightsExperience } from "../../components/experience";
import { Suspense } from "react";

export default function Page() { return <Suspense fallback={<main id="main" className="page-width workspace-page"><h1>항목별 분석</h1><p role="status">평가 화면을 준비하고 있어요…</p></main>}><InsightsExperience /></Suspense>; }
