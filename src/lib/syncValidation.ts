import { AppStore } from "@/types";
import { DEFAULT_STORE, DEFAULT_BIRTH_PLAN, DEFAULT_BAG_ITEMS } from "@/hooks/useStore";

// ── Constants ─────────────────────────────────────────────────────────────

export const SNAPSHOT_KEY = "ob-pre-pull-snapshot";

// ── Array field keys on AppStore ──────────────────────────────────────────

const ARRAY_FIELDS: (keyof AppStore)[] = [
  "items",
  "classes",
  "materials",
  "notes",
  "hospitalBag",
  "appointments",
  "contacts",
  "contractions",
];

// ── Validation result ─────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  store: AppStore | null;
  errors: string[];
  warnings: string[];
}

// ── Core validation ───────────────────────────────────────────────────────

/**
 * Validate and normalize pulled data into a valid AppStore.
 * - If data is not an object, returns invalid with errors.
 * - Missing array fields are filled with defaults.
 * - Missing birthPlan is filled with the default.
 * - Extra unknown fields are preserved for forward compatibility.
 */
export function validateAppStore(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must be a non-null object
  if (data === null || data === undefined) {
    return { valid: false, store: null, errors: ["Data is null or undefined."], warnings };
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    return {
      valid: false,
      store: null,
      errors: [`Expected an object but received ${Array.isArray(data) ? "an array" : typeof data}.`],
      warnings,
    };
  }

  const raw = data as Record<string, unknown>;

  // Validate and fill array fields
  const result: Record<string, unknown> = { ...raw };

  for (const field of ARRAY_FIELDS) {
    const value = raw[field];
    if (value === undefined || value === null) {
      const defaultValue = field === "hospitalBag" ? DEFAULT_BAG_ITEMS : DEFAULT_STORE[field];
      result[field] = defaultValue;
      warnings.push(`Missing field "${field}" filled with default value.`);
    } else if (!Array.isArray(value)) {
      errors.push(`Field "${field}" expected to be an array but received ${typeof value}.`);
    }
    // If it's a valid array, keep it as-is
  }

  // Validate birthPlan
  const birthPlan = raw.birthPlan;
  if (birthPlan === undefined || birthPlan === null) {
    result.birthPlan = DEFAULT_BIRTH_PLAN;
    warnings.push('Missing field "birthPlan" filled with default value.');
  } else if (typeof birthPlan !== "object" || Array.isArray(birthPlan)) {
    errors.push(`Field "birthPlan" expected to be an object but received ${Array.isArray(birthPlan) ? "an array" : typeof birthPlan}.`);
  } else {
    // Deep-fill missing birthPlan sub-fields
    const bp = birthPlan as Record<string, unknown>;
    const filledBp: Record<string, unknown> = { ...DEFAULT_BIRTH_PLAN };
    for (const key of Object.keys(DEFAULT_BIRTH_PLAN)) {
      if (bp[key] !== undefined && bp[key] !== null) {
        // Deep merge for nested objects within birthPlan
        const defaultVal = (DEFAULT_BIRTH_PLAN as unknown as Record<string, unknown>)[key];
        if (typeof defaultVal === "object" && defaultVal !== null && !Array.isArray(defaultVal) &&
            typeof bp[key] === "object" && bp[key] !== null && !Array.isArray(bp[key])) {
          filledBp[key] = { ...defaultVal as object, ...bp[key] as object };
        } else {
          filledBp[key] = bp[key];
        }
      } else {
        warnings.push(`Missing birthPlan field "${key}" filled with default.`);
      }
    }
    // Preserve any extra fields from the remote birthPlan
    for (const key of Object.keys(bp)) {
      if (!(key in filledBp)) {
        filledBp[key] = bp[key];
      }
    }
    result.birthPlan = filledBp;
  }

  // Validate lastModifiedAt (optional field, fill with empty string if missing)
  if (result.lastModifiedAt === undefined || result.lastModifiedAt === null) {
    result.lastModifiedAt = undefined; // Optional, no default needed
  } else if (typeof result.lastModifiedAt !== "string") {
    result.lastModifiedAt = String(result.lastModifiedAt);
    warnings.push('"lastModifiedAt" was not a string; converted.');
  }

  // Validate registryUrl
  if (result.registryUrl === undefined || result.registryUrl === null) {
    result.registryUrl = "";
    warnings.push('Missing field "registryUrl" filled with default value.');
  } else if (typeof result.registryUrl !== "string") {
    result.registryUrl = String(result.registryUrl);
    warnings.push('"registryUrl" was not a string; converted.');
  }

  // If there are hard errors (type mismatches on required fields), fail
  if (errors.length > 0) {
    return { valid: false, store: null, errors, warnings };
  }

  return { valid: true, store: result as unknown as AppStore, errors: [], warnings };
}

// ── Snapshot management ───────────────────────────────────────────────────

/**
 * Save the current store as a pre-pull snapshot for recovery.
 */
export function savePrePullSnapshot(store: AppStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(store));
  } catch {
    // If localStorage is full, silently skip — the user at least still has their current data
  }
}

/**
 * Retrieve the pre-pull snapshot, or null if none exists.
 */
export function getPrePullSnapshot(): AppStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppStore;
  } catch {
    return null;
  }
}

/**
 * Remove the pre-pull snapshot.
 */
export function clearPrePullSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // Silently ignore if localStorage is unavailable
  }
}

/**
 * Check if a pre-pull snapshot exists.
 */
export function hasPrePullSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SNAPSHOT_KEY) !== null;
  } catch {
    return false;
  }
}
