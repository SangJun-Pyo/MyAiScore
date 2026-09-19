import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { LocaleProvider } from "../components/LocaleProvider";
import { LOCALE_COOKIE, parseLocale } from "../i18n/locale";
import { messagesFor } from "../i18n/messages";
import "./globals.css";
import "./landing.css";
import "@designcodeio/threeui/style.css";
import "../components/evidence-preview.css";
import "../components/session-report.css";
import "../components/repository-report.css";

async function requestLocale() {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = messagesFor(await requestLocale());
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: "/icon.svg",
      apple: "/icon.svg",
    },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#111213", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestLocale();
  return <html lang={locale}><body><LocaleProvider initialLocale={locale}>{children}</LocaleProvider></body></html>;
}
