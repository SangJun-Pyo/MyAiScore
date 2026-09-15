import { InsightsExperience } from "../../components/experience";
import { Suspense } from "react";

export default function Page() { return <Suspense fallback={<main id="main" className="page-width workspace-page"><h1>Insights</h1><p role="status">Preparing your assessment view…</p></main>}><InsightsExperience /></Suspense>; }
