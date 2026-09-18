export const LOCALE_COOKIE = "myaiscore_locale";
export const DEFAULT_LOCALE = "ko" as const;
export const SUPPORTED_LOCALES = ["ko", "en"] as const;

export type Locale = typeof SUPPORTED_LOCALES[number];

export function parseLocale(value: unknown): Locale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}
