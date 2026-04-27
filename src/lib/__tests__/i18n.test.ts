import { describe, it, expect, beforeEach } from "vitest";
import { getTranslation, registerLocale } from "../i18n";

describe("i18n", () => {
  describe("getTranslation", () => {
    it("returns the correct English string for a known key", () => {
      expect(getTranslation("nav.dashboard", "en")).toBe("Dashboard");
      expect(getTranslation("common.save", "en")).toBe("Save");
      expect(getTranslation("app.title", "en")).toBe("Operation Burrito");
    });

    it("returns the key itself when the key is missing from all locales", () => {
      expect(getTranslation("nonexistent.key", "en")).toBe("nonexistent.key");
      expect(getTranslation("also.missing", "en")).toBe("also.missing");
    });

    it("defaults to English when locale is not specified", () => {
      expect(getTranslation("nav.dashboard")).toBe("Dashboard");
    });

    it("falls back to English when the key is missing in the requested locale", () => {
      registerLocale("fr", { "nav.dashboard": "Tableau de bord" });
      // "common.save" is not in the fr locale, so it should fall back to en
      expect(getTranslation("common.save", "fr")).toBe("Save");
    });

    it("falls back to English when the requested locale does not exist", () => {
      expect(getTranslation("nav.dashboard", "xx")).toBe("Dashboard");
    });

    it("uses the requested locale when the key exists there", () => {
      registerLocale("fr", { "nav.dashboard": "Tableau de bord" });
      expect(getTranslation("nav.dashboard", "fr")).toBe("Tableau de bord");
    });
  });

  describe("interpolation", () => {
    it("replaces a single {variable} placeholder", () => {
      expect(getTranslation("dashboard.daysLeft", "en", { days: 42 })).toBe(
        "42 days left",
      );
    });

    it("replaces multiple placeholders in one string", () => {
      expect(
        getTranslation("dashboard.weeksLeft", "en", { weeks: 6, days: 0 }),
      ).toBe("6w 0d to go");
    });

    it("replaces all occurrences of the same placeholder", () => {
      registerLocale("test", { "test.repeat": "{x} and {x}" });
      expect(getTranslation("test.repeat", "test", { x: "A" })).toBe(
        "A and A",
      );
    });

    it("leaves unmatched placeholders as-is when param is not provided", () => {
      expect(getTranslation("dashboard.daysLeft", "en", {})).toBe(
        "{days} days left",
      );
    });

    it("handles string params", () => {
      expect(
        getTranslation("sync.signedInAs", "en", { username: "jhouang" }),
      ).toBe("Signed in as @jhouang");
    });
  });

  describe("nested/dot-notation keys", () => {
    it("resolves dot-notation keys correctly", () => {
      expect(getTranslation("items.title", "en")).toBe(
        "Baby Items & Checklist",
      );
      expect(getTranslation("hospitalBag.title", "en")).toBe("Hospital Bag");
      expect(getTranslation("importExport.title", "en")).toBe(
        "Data Import & Export",
      );
    });

    it("resolves deeply nested-looking keys", () => {
      expect(getTranslation("sync.howItWorks", "en")).toBe(
        "How GitHub Gist sync works",
      );
    });
  });

  describe("registerLocale", () => {
    it("allows registering a new locale and using it", () => {
      registerLocale("de", {
        "nav.dashboard": "Übersicht",
        "common.save": "Speichern",
      });
      expect(getTranslation("nav.dashboard", "de")).toBe("Übersicht");
      expect(getTranslation("common.save", "de")).toBe("Speichern");
      // Falls back to en for missing keys
      expect(getTranslation("nav.settings", "de")).toBe("Settings");
    });
  });
});
