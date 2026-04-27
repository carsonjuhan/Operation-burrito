import { AppStore } from "@/types";
import { validateAppStore, ValidationResult } from "@/lib/syncValidation";

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Trigger a JSON file download of the full AppStore.
 * Filename includes a timestamp for easy identification.
 */
export function exportStoreAsJSON(store: AppStore): void {
  const json = JSON.stringify(store, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `operation-burrito-${date}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build the export filename (exposed for testing).
 */
export function buildExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `operation-burrito-${date}.json`;
}

// ── Import ──────────────────────────────────────────────────────────────────

/**
 * Read a File object as text.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

/**
 * Parse and validate an imported JSON file against the AppStore schema.
 * Returns a ValidationResult with the validated store or error details.
 */
export async function parseImportFile(file: File): Promise<ValidationResult> {
  // Check file type
  if (!file.name.toLowerCase().endsWith(".json")) {
    return {
      valid: false,
      store: null,
      errors: ["File must be a .json file."],
      warnings: [],
    };
  }

  // Read file contents
  let text: string;
  try {
    text = await readFileAsText(file);
  } catch {
    return {
      valid: false,
      store: null,
      errors: ["Failed to read the file. Please try again."],
      warnings: [],
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      valid: false,
      store: null,
      errors: ["File contains invalid JSON. Please check the file and try again."],
      warnings: [],
    };
  }

  // Validate against AppStore schema (reuses S-007 validation)
  return validateAppStore(parsed);
}
