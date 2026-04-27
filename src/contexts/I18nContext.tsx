"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  getTranslation,
  registerLocale,
  SUPPORTED_LOCALES,
  type Translations,
} from "@/lib/i18n";

// ── Types ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  /** Current locale code, e.g. "en" */
  locale: string;
  /** Translate a key with optional interpolation params. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Switch the active locale. Persists to localStorage. */
  setLocale: (locale: string) => void;
  /** List of supported locales for the language selector. */
  supportedLocales: typeof SUPPORTED_LOCALES;
}

// ── Context ────────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue | null>(null);

// ── Lazy-load map — maps locale code to a dynamic import function ──────────
// Extend this when adding new locale files (e.g. S-053 adds French).
const LOCALE_LOADERS: Record<string, () => Promise<{ default: Translations }>> = {
  "fr": () => import("@/locales/fr"),
};

// ── Provider ───────────────────────────────────────────────────────────────

const LOCALE_STORAGE_KEY = "locale";

function getInitialLocale(): string {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && (stored === "en" || stored in LOCALE_LOADERS)) {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(getInitialLocale);
  const [, setLoadCount] = useState(0); // trigger re-render after lazy load

  // Lazy-load the locale file when locale changes
  useEffect(() => {
    if (locale === "en") return; // en is bundled, no need to load
    const loader = LOCALE_LOADERS[locale];
    if (!loader) return;

    loader().then((mod) => {
      registerLocale(locale, mod.default);
      setLoadCount((c) => c + 1); // force re-render with new translations
    });
  }, [locale]);

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      getTranslation(key, locale, params),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, supportedLocales: SUPPORTED_LOCALES }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
