import { BirthPlan } from "@/types";

/**
 * Encode a BirthPlan into a URL-safe base64 string for sharing via URL hash.
 * Strips the updatedAt field to keep the payload smaller.
 */
export function encodeBirthPlan(plan: BirthPlan): string {
  const { updatedAt: _updatedAt, ...shareable } = plan;
  const json = JSON.stringify(shareable);
  // Use btoa for base64 encoding, handling Unicode via encodeURIComponent
  const encoded = btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
  return encoded;
}

/**
 * Decode a base64 string back into a BirthPlan object.
 * Returns null if the string is invalid or cannot be parsed.
 */
export function decodeBirthPlan(encoded: string): BirthPlan | null {
  try {
    const json = decodeURIComponent(
      Array.from(atob(encoded))
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(json);
    // Basic validation: check for expected top-level keys
    if (
      parsed &&
      typeof parsed === "object" &&
      "personalInfo" in parsed &&
      "labour" in parsed &&
      "afterBirth" in parsed &&
      "interventions" in parsed
    ) {
      return {
        updatedAt: "",
        notes: "",
        ...parsed,
      } as BirthPlan;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a full shareable URL for the birth plan.
 * Uses the URL hash so data never leaves the browser.
 */
export function generateShareUrl(plan: BirthPlan): string {
  const encoded = encodeBirthPlan(plan);
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname.replace(/\/birth-plan\/?$/, "")
      : "";
  return `${base}/birth-plan/view#${encoded}`;
}
