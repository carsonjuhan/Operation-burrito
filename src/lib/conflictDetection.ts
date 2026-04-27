/**
 * Conflict detection for sync operations.
 * S-008: Conflict Detection for Sync
 *
 * Detects when local changes and remote Gist changes have diverged
 * since the last sync, preventing silent data overwrites.
 */

const LAST_MODIFIED_KEY = "ob-last-modified-at";

// ── localStorage helpers ──────────────────────────────────────────────────

/**
 * Get the timestamp of the last local mutation.
 */
export function getLastModifiedAt(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_MODIFIED_KEY) ?? "";
}

/**
 * Update the last-modified timestamp to the current time.
 * Called on every local store mutation.
 */
export function setLastModifiedAt(iso?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_MODIFIED_KEY, iso ?? new Date().toISOString());
}

/**
 * Clear the last-modified timestamp (e.g., on disconnect).
 */
export function clearLastModifiedAt(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_MODIFIED_KEY);
}

// ── Conflict checks ──────────────────────────────────────────────────────

/**
 * Check whether the local store has been modified since the last sync.
 * Used before pull to warn that local changes would be overwritten.
 *
 * Returns true if lastModifiedAt is after lastSynced (or if lastSynced is empty).
 */
export function hasLocalChanges(lastSynced: string, lastModifiedAt?: string): boolean {
  const modified = lastModifiedAt ?? getLastModifiedAt();
  if (!modified) return false;
  if (!lastSynced) return true; // Never synced but has local changes
  return new Date(modified).getTime() > new Date(lastSynced).getTime();
}

/**
 * Check whether the remote Gist has been updated since the last sync.
 * Used before push to warn that remote changes would be overwritten.
 *
 * Returns true if gistUpdatedAt is after lastSynced.
 */
export function hasRemoteChanges(gistUpdatedAt: string, lastSynced: string): boolean {
  if (!gistUpdatedAt) return false;
  if (!lastSynced) return false; // First push, no remote to overwrite
  return new Date(gistUpdatedAt).getTime() > new Date(lastSynced).getTime();
}

// ── Conflict info for UI ─────────────────────────────────────────────────

export interface ConflictInfo {
  type: "local-changes-on-pull" | "remote-changes-on-push";
  localModifiedAt: string;
  remoteUpdatedAt: string;
  lastSynced: string;
}

/**
 * Format an ISO timestamp into a human-readable local string.
 * Returns "Never" for empty/invalid timestamps.
 */
export function formatTimestamp(iso: string): string {
  if (!iso) return "Never";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

/**
 * Calculate the relative time description (e.g. "5 minutes ago").
 */
export function relativeTime(iso: string): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
}
