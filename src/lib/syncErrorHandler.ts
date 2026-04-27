/**
 * Sync error classification and failure tracking for auto-sync.
 * S-011: Auto-Sync Error Handling and Retry
 */

export type SyncErrorType = "network" | "auth" | "unknown";

/**
 * Classify a sync error by inspecting its message and properties.
 * - Network errors: fetch failures, timeouts, DNS issues
 * - Auth errors: 401/403 status codes, token issues
 * - Unknown: everything else
 */
export function classifySyncError(error: unknown): SyncErrorType {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Network-level failures (fetch itself fails)
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("dns") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("offline") ||
    message.includes("load failed") ||
    message.includes("err_internet_disconnected")
  ) {
    return "network";
  }

  // Auth failures (API responded with 401 or 403)
  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid token") ||
    message.includes("bad credentials")
  ) {
    return "auth";
  }

  return "unknown";
}

/**
 * Return a user-facing message for each error type.
 */
export function getSyncErrorMessage(type: SyncErrorType): string {
  switch (type) {
    case "network":
      return "Sync failed — unable to reach GitHub. Check your internet connection.";
    case "auth":
      return "Sync failed — your GitHub token may have expired or been revoked. Reconnect in Settings.";
    case "unknown":
      return "Sync failed — an unexpected error occurred. Try again or check Settings.";
  }
}

// ── Failure Tracker ────────────────────────────────────────────────────────

export const MAX_CONSECUTIVE_FAILURES = 3;

export interface SyncFailureState {
  consecutiveFailures: number;
  isPaused: boolean;
  lastErrorType: SyncErrorType | null;
  lastErrorMessage: string;
}

export const INITIAL_SYNC_FAILURE_STATE: SyncFailureState = {
  consecutiveFailures: 0,
  isPaused: false,
  lastErrorType: null,
  lastErrorMessage: "",
};

/**
 * Record a sync failure. Returns updated state.
 * Pauses auto-sync after MAX_CONSECUTIVE_FAILURES.
 */
export function recordSyncFailure(
  state: SyncFailureState,
  error: unknown
): SyncFailureState {
  const errorType = classifySyncError(error);
  const errorMessage = getSyncErrorMessage(errorType);
  const newCount = state.consecutiveFailures + 1;

  return {
    consecutiveFailures: newCount,
    isPaused: newCount >= MAX_CONSECUTIVE_FAILURES,
    lastErrorType: errorType,
    lastErrorMessage: errorMessage,
  };
}

/**
 * Record a successful sync. Resets all failure state.
 */
export function recordSyncSuccess(): SyncFailureState {
  return { ...INITIAL_SYNC_FAILURE_STATE };
}

/**
 * Dismiss the warning without retrying. Resets state but keeps paused false
 * so auto-sync will resume on next mutation.
 */
export function dismissSyncWarning(): SyncFailureState {
  return { ...INITIAL_SYNC_FAILURE_STATE };
}
