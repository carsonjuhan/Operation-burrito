"use client";

import { useI18n } from "@/contexts/I18nContext";

export function LanguageSelector() {
  const { locale, setLocale, supportedLocales, t } = useI18n();

  // Don't render if there's only one language available
  if (supportedLocales.length <= 1) {
    return null;
  }

  return (
    <div>
      <label htmlFor="language-select" className="label">
        {t("settings.language")}
      </label>
      <p className="text-xs text-stone-400 mb-2">
        {t("settings.languageDescription")}
      </p>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="input w-full max-w-xs"
      >
        {supportedLocales.map((loc) => (
          <option key={loc.code} value={loc.code}>
            {loc.label}
          </option>
        ))}
      </select>
    </div>
  );
}
