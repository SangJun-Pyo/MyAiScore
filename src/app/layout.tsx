import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";
import "../components/evidence-preview.css";
import "../components/session-report.css";
import "../components/repository-report.css";

export const metadata: Metadata = {
  title: "MyAiScore — 공개 저장소의 AI 협업 신호",
  description: "로그인 없이 공개 GitHub 저장소의 맥락, 검증, 기록, 자동화 신호를 살펴보세요.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#111213", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
