"use client";

import { useRouter } from "next/navigation";
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_COOKIE, type Locale } from "../i18n/locale";
import { messagesFor, type Messages } from "../i18n/messages";

type LocaleContextValue = { locale: Locale; copy: Messages; setLocale: (locale: Locale) => void };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useEffect(() => { setLocaleState(initialLocale); document.documentElement.lang = initialLocale; }, [initialLocale]);
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    copy: messagesFor(locale),
    setLocale(next) {
      setLocaleState(next);
      document.documentElement.lang = next;
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
      startTransition(() => router.refresh());
    },
  }), [locale, router]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is missing.");
  return value;
}

export function LanguageSwitch() {
  const { locale, copy, setLocale } = useLocale();
  return <div className="language-switch" role="group" aria-label={copy.language.label}>
    <button type="button" lang="ko" aria-pressed={locale === "ko"} onClick={() => setLocale("ko")}>{copy.language.ko}</button>
    <button type="button" lang="en" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>{copy.language.en}</button>
  </div>;
}
