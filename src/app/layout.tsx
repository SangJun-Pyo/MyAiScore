import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAiScore — AI와 함께, 더 잘 만드는 법",
  description: "프로젝트와 협업 기록을 바탕으로 AI 활용 방식을 돌아보고, 다음에 실행할 개선 행동을 찾아보세요.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#08090e", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
