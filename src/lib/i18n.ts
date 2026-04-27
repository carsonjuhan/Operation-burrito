/**
 * Lightweight i18n utilities for Operation Burrito.
 *
 * No external dependencies — just plain TypeScript objects + simple
 * `{variable}` interpolation.
 */

import en from "@/locales/en";

export type Translations = Record<string, string>;

/** Registry of loaded locale data (en is always available). */
const localeCache: Record<string, Translations> = { en };

/**
 * Register a translation object for a locale so it can be used by
 * `getTranslation`. Called lazily when the user switches locales.
 */
export function registerLocale(locale: string, translations: Translations): void {
  localeCache[locale] = translations;
}

/**
 * Return the translated string for `key` in the given `locale`.
 *
 * - Falls back to English if the key is missing in the requested locale.
 * - Returns the key itself if it is missing from all locales (useful for
 *   debugging & graceful degradation).
 * - Supports simple `{variable}` interpolation via the optional `params` map.
 *
 * @example
 *   getTranslation("items.count", "en", { count: 5 })
 *   // → "5 items tracked"
 */
export function getTranslation(
  key: string,
  locale: string = "en",
  params?: Record<string, string | number>,
): string {
  const dict = localeCache[locale] ?? localeCache.en;
  let value = dict[key] ?? localeCache.en[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return value;
}

/**
 * List of supported locale codes. Extend this when adding new languages.
 */
export const SUPPORTED_LOCALES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];
