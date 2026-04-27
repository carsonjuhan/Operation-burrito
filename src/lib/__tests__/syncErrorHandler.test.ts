import { describe, it, expect } from "vitest";
import {
  classifySyncError,
  getSyncErrorMessage,
  recordSyncFailure,
  recordSyncSuccess,
  dismissSyncWarning,
  INITIAL_SYNC_FAILURE_STATE,
  MAX_CONSECUTIVE_FAILURES,
  type SyncErrorType,
} from "@/lib/syncErrorHandler";

// ── classifySyncError ────────────────────────────────────────────────────────

describe("classifySyncError", () => {
  it("classifies fetch failures as network errors", () => {
    expect(classifySyncError(new Error("Failed to fetch"))).toBe("network");
    expect(classifySyncError(new Error("Load failed"))).toBe("network");
    expect(classifySyncError(new TypeError("Failed to fetch"))).toBe("network");
  });

  it("classifies connectivity issues as network errors", () => {
    expect(classifySyncError(new Error("NetworkError when attempting to fetch"))).toBe("network");
    expect(classifySyncError(new Error("net::ERR_INTERNET_DISCONNECTED"))).toBe("network");
    expect(classifySyncError(new Error("DNS lookup failed: ENOTFOUND"))).toBe("network");
    expect(classifySyncError(new Error("Request timeout"))).toBe("network");
  });

  it("classifies 401/403 as auth errors", () => {
    expect(classifySyncError(new Error("Failed to update Gist: 401"))).toBe("auth");
    expect(classifySyncError(new Error("Failed to update Gist: 403"))).toBe("auth");
  });

  it("classifies token-related messages as auth errors", () => {
    expect(classifySyncError(new Error("Invalid token — check scopes and try again."))).toBe("auth");
    expect(classifySyncError(new Error("Bad credentials"))).toBe("auth");
    expect(classifySyncError(new Error("Unauthorized access"))).toBe("auth");
  });

  it("classifies other errors as unknown", () => {
    expect(classifySyncError(new Error("Failed to update Gist: 500"))).toBe("unknown");
    expect(classifySyncError(new Error("Something went wrong"))).toBe("unknown");
    expect(classifySyncError("string error")).toBe("unknown");
  });

  it("handles non-Error objects gracefully", () => {
    expect(classifySyncError(null)).toBe("unknown");
    expect(classifySyncError(undefined)).toBe("unknown");
    expect(classifySyncError(42)).toBe("unknown");
  });
});

// ── getSyncErrorMessage ────────────────────────────────────────────────────

describe("getSyncErrorMessage", () => {
  it("returns distinct messages for each error type", () => {
    const types: SyncErrorType[] = ["network", "auth", "unknown"];
    const messages = types.map(getSyncErrorMessage);

    // All messages should be non-empty strings
    messages.forEach((m) => {
      expect(typeof m).toBe("string");
      expect(m.length).toBeGreaterThan(0);
    });

    // All messages should be distinct
    const unique = new Set(messages);
    expect(unique.size).toBe(types.length);
  });

  it("network message mentions internet/connection", () => {
    const msg = getSyncErrorMessage("network");
    expect(msg.toLowerCase()).toMatch(/internet|connection/);
  });

  it("auth message mentions token or settings", () => {
    const msg = getSyncErrorMessage("auth");
    expect(msg.toLowerCase()).toMatch(/token|settings/);
  });
});

// ── Failure tracking ──────────────────────────────────────────────────────

describe("recordSyncFailure", () => {
  it("increments consecutive failure count", () => {
    const state1 = recordSyncFailure(INITIAL_SYNC_FAILURE_STATE, new Error("Failed to fetch"));
    expect(state1.consecutiveFailures).toBe(1);
    expect(state1.isPaused).toBe(false);

    const state2 = recordSyncFailure(state1, new Error("Failed to fetch"));
    expect(state2.consecutiveFailures).toBe(2);
    expect(state2.isPaused).toBe(false);
  });

  it("pauses auto-sync after MAX_CONSECUTIVE_FAILURES", () => {
    let state = INITIAL_SYNC_FAILURE_STATE;
    for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
      state = recordSyncFailure(state, new Error("Failed to fetch"));
    }
    expect(state.consecutiveFailures).toBe(MAX_CONSECUTIVE_FAILURES);
    expect(state.isPaused).toBe(true);
  });

  it("tracks the last error type and message", () => {
    const state = recordSyncFailure(
      INITIAL_SYNC_FAILURE_STATE,
      new Error("Failed to update Gist: 401")
    );
    expect(state.lastErrorType).toBe("auth");
    expect(state.lastErrorMessage).toMatch(/token/i);
  });

  it("updates error type on subsequent different failures", () => {
    const state1 = recordSyncFailure(INITIAL_SYNC_FAILURE_STATE, new Error("Failed to fetch"));
    expect(state1.lastErrorType).toBe("network");

    const state2 = recordSyncFailure(state1, new Error("Failed to update Gist: 401"));
    expect(state2.lastErrorType).toBe("auth");
    expect(state2.consecutiveFailures).toBe(2);
  });
});

describe("recordSyncSuccess", () => {
  it("resets all failure state", () => {
    const failedState = recordSyncFailure(
      recordSyncFailure(INITIAL_SYNC_FAILURE_STATE, new Error("fail")),
      new Error("fail again")
    );
    expect(failedState.consecutiveFailures).toBe(2);

    const successState = recordSyncSuccess();
    expect(successState.consecutiveFailures).toBe(0);
    expect(successState.isPaused).toBe(false);
    expect(successState.lastErrorType).toBe(null);
    expect(successState.lastErrorMessage).toBe("");
  });
});

describe("dismissSyncWarning", () => {
  it("resets failure state so auto-sync resumes", () => {
    let state = INITIAL_SYNC_FAILURE_STATE;
    for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
      state = recordSyncFailure(state, new Error("fail"));
    }
    expect(state.isPaused).toBe(true);

    const dismissed = dismissSyncWarning();
    expect(dismissed.isPaused).toBe(false);
    expect(dismissed.consecutiveFailures).toBe(0);
  });
});

// ── Constants ────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("MAX_CONSECUTIVE_FAILURES is 3", () => {
    expect(MAX_CONSECUTIVE_FAILURES).toBe(3);
  });

  it("INITIAL_SYNC_FAILURE_STATE has correct defaults", () => {
    expect(INITIAL_SYNC_FAILURE_STATE).toEqual({
      consecutiveFailures: 0,
      isPaused: false,
      lastErrorType: null,
      lastErrorMessage: "",
    });
  });
});
