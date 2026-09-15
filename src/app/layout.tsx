import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "MyAiScore — Build with AI. Know your part.",
  description: "Understand how you collaborate with AI through project evidence, grounded feedback, and a practical next step.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#090d10", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
