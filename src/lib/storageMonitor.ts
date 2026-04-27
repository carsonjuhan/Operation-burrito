/**
 * localStorage size monitoring utilities.
 *
 * Browsers typically allow ~5 MB per origin. This module calculates approximate
 * usage and provides threshold checks so the UI can warn users before hitting
 * the limit.
 */

/** Estimated browser localStorage limit in bytes (5 MB). */
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

/** Fraction of the limit at which a warning should be shown. */
export const WARNING_THRESHOLD = 0.8;

const STORAGE_KEY = "operation-burrito-store";

/**
 * Calculate the byte size of the app's localStorage entry.
 *
 * JavaScript strings are stored as UTF-16, so each character is 2 bytes.
 * We measure both the key and value for accuracy.
 */
export function getStorageSize(): { bytes: number; formatted: string } {
  if (typeof window === "undefined") return { bytes: 0, formatted: "0 B" };
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return { bytes: 0, formatted: "0 B" };
    // UTF-16: 2 bytes per character for both key and value
    const bytes = (STORAGE_KEY.length + value.length) * 2;
    return { bytes, formatted: formatBytes(bytes) };
  } catch {
    return { bytes: 0, formatted: "0 B" };
  }
}

/**
 * Return usage as a percentage of the estimated limit (0-100).
 */
export function getStoragePercent(bytes?: number): number {
  const size = bytes ?? getStorageSize().bytes;
  return Math.min(100, Math.round((size / STORAGE_LIMIT_BYTES) * 1000) / 10);
}

/**
 * Return true when usage exceeds the warning threshold (80%).
 */
export function isStorageWarning(bytes?: number): boolean {
  const size = bytes ?? getStorageSize().bytes;
  return size / STORAGE_LIMIT_BYTES >= WARNING_THRESHOLD;
}

/**
 * Format a byte count to a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
