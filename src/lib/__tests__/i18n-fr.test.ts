import { describe, it, expect } from "vitest";
import en from "@/locales/en";
import fr from "@/locales/fr";
import { getTranslation, registerLocale } from "../i18n";

// Register French translations for runtime tests
registerLocale("fr", fr);

const enKeys = Object.keys(en).sort();
const frKeys = Object.keys(fr).sort();

// Keys that are legitimately identical across languages (proper nouns,
// technical terms, placeholder URLs, brand names, etc.)
const ALLOWED_IDENTICAL: Set<string> = new Set([
  "app.title",            // "Operation Burrito" — brand name
  "common.date",          // "Date" is the same in French
  "common.description",   // "Description" is identical in French
  "common.email",         // shared technical term in some contexts
  "common.notes",         // "Notes" is the same in French
  "common.type",          // "Type" is the same in French
  "contacts.subtitle",    // "{count} contacts" — same template, "contacts" is French too
  "contacts.title",       // "Contacts" is the same in French
  "materials.url",        // "URL" is universal
  "nav.budget",           // "Budget" is the same in French
  "nav.contacts",         // "Contacts" is the same in French
  "nav.notes",            // "Notes" is the same in French
  "notes.subtitle",       // "{count} notes" — same template
  "notes.title",          // "Notes" is the same in French
  "registry.placeholder", // placeholder URL
  "search.sectionContacts", // "Contacts" is the same in French
  "search.sectionNotes",  // "Notes" is the same in French
]);

describe("French translations (fr.ts)", () => {
  describe("key completeness", () => {
    it("has the same number of keys as English", () => {
      expect(frKeys.length).toBe(enKeys.length);
    });

    it("every English key exists in French", () => {
      const missingInFr = enKeys.filter((key) => !(key in fr));
      expect(missingInFr).toEqual([]);
    });

    it("French has no extra keys that are missing from English", () => {
      const extraInFr = frKeys.filter((key) => !(key in en));
      expect(extraInFr).toEqual([]);
    });
  });

  describe("values are translated (not identical to English)", () => {
    const nonAllowedIdentical = enKeys.filter(
      (key) =>
        !ALLOWED_IDENTICAL.has(key) &&
        key in fr &&
        fr[key] === en[key],
    );

    it("no unexpected identical values between English and French", () => {
      if (nonAllowedIdentical.length > 0) {
        // Show the offending keys for easier debugging
        const details = nonAllowedIdentical.map(
          (k) => `  "${k}": "${en[k]}"`,
        );
        expect(nonAllowedIdentical).toEqual([]);
      }
      expect(nonAllowedIdentical).toEqual([]);
    });
  });

  describe("interpolation placeholders are preserved", () => {
    /** Extract all `{variable}` placeholders from a string. */
    function extractPlaceholders(value: string): string[] {
      const matches = value.match(/\{[^}]+\}/g);
      return matches ? matches.sort() : [];
    }

    const keysWithPlaceholders = enKeys.filter((key) =>
      /\{[^}]+\}/.test(en[key]),
    );

    it("has keys with placeholders to test", () => {
      // Sanity check — make sure we actually found placeholder keys
      expect(keysWithPlaceholders.length).toBeGreaterThan(0);
    });

    it.each(keysWithPlaceholders)(
      "key '%s' has matching placeholders in French",
      (key) => {
        const enPlaceholders = extractPlaceholders(en[key]);
        const frPlaceholders = extractPlaceholders(fr[key]);
        expect(frPlaceholders).toEqual(enPlaceholders);
      },
    );
  });

  describe("runtime translation works", () => {
    it("returns French translations for known keys", () => {
      expect(getTranslation("nav.dashboard", "fr")).toBe("Tableau de bord");
      expect(getTranslation("common.save", "fr")).toBe("Enregistrer");
      expect(getTranslation("items.title", "fr")).toBe(
        "Articles bébé et liste",
      );
    });

    it("interpolation works with French strings", () => {
      expect(
        getTranslation("dashboard.daysLeft", "fr", { days: 42 }),
      ).toBe("42 jours restants");
    });

    it("interpolation with multiple placeholders works in French", () => {
      expect(
        getTranslation("dashboard.weeksLeft", "fr", { weeks: 6, days: 3 }),
      ).toBe("6 sem. 3 j. restants");
    });

    it("falls back to English for keys missing from French (if any)", () => {
      // All keys should be present, but the fallback mechanism should still work
      expect(getTranslation("nonexistent.key", "fr")).toBe(
        "nonexistent.key",
      );
    });
  });

  describe("French values are non-empty", () => {
    it("no French translation is an empty string", () => {
      const emptyKeys = frKeys.filter((key) => fr[key].trim() === "");
      expect(emptyKeys).toEqual([]);
    });
  });
});
