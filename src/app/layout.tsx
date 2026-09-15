import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";
import "../components/evidence-preview.css";
import "../components/session-report.css";

export const metadata: Metadata = {
  title: "MyAiScore — Discover your session style.",
  description: "Turn local Claude Code session activity into a playful style card, transparent counts, and one next challenge.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#111213", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

