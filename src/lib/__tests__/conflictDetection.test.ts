import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hasLocalChanges,
  hasRemoteChanges,
  formatTimestamp,
  relativeTime,
  getLastModifiedAt,
  setLastModifiedAt,
  clearLastModifiedAt,
} from "@/lib/conflictDetection";

// ── localStorage mock ─────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

// ── hasLocalChanges ──────────────────────────────────────────────────────

describe("hasLocalChanges", () => {
  it("returns false when no lastModifiedAt is set", () => {
    expect(hasLocalChanges("2026-04-20T10:00:00Z")).toBe(false);
  });

  it("returns true when lastModifiedAt is after lastSynced", () => {
    expect(
      hasLocalChanges("2026-04-20T10:00:00Z", "2026-04-20T12:00:00Z")
    ).toBe(true);
  });

  it("returns false when lastModifiedAt is before lastSynced", () => {
    expect(
      hasLocalChanges("2026-04-20T12:00:00Z", "2026-04-20T10:00:00Z")
    ).toBe(false);
  });

  it("returns false when timestamps are equal", () => {
    expect(
      hasLocalChanges("2026-04-20T10:00:00Z", "2026-04-20T10:00:00Z")
    ).toBe(false);
  });

  it("returns true when lastSynced is empty but has local modifications", () => {
    expect(hasLocalChanges("", "2026-04-20T10:00:00Z")).toBe(true);
  });

  it("reads from localStorage when lastModifiedAt not provided", () => {
    setLastModifiedAt("2026-04-20T15:00:00Z");
    expect(hasLocalChanges("2026-04-20T10:00:00Z")).toBe(true);
  });

  it("returns false when both are empty", () => {
    expect(hasLocalChanges("")).toBe(false);
  });
});

// ── hasRemoteChanges ─────────────────────────────────────────────────────

describe("hasRemoteChanges", () => {
  it("returns true when gistUpdatedAt is after lastSynced", () => {
    expect(
      hasRemoteChanges("2026-04-20T14:00:00Z", "2026-04-20T10:00:00Z")
    ).toBe(true);
  });

  it("returns false when gistUpdatedAt is before lastSynced", () => {
    expect(
      hasRemoteChanges("2026-04-20T08:00:00Z", "2026-04-20T10:00:00Z")
    ).toBe(false);
  });

  it("returns false when timestamps are equal", () => {
    expect(
      hasRemoteChanges("2026-04-20T10:00:00Z", "2026-04-20T10:00:00Z")
    ).toBe(false);
  });

  it("returns false when gistUpdatedAt is empty", () => {
    expect(hasRemoteChanges("", "2026-04-20T10:00:00Z")).toBe(false);
  });

  it("returns false when lastSynced is empty (first push)", () => {
    expect(hasRemoteChanges("2026-04-20T14:00:00Z", "")).toBe(false);
  });

  it("returns false when both are empty", () => {
    expect(hasRemoteChanges("", "")).toBe(false);
  });
});

// ── localStorage helpers ─────────────────────────────────────────────────

describe("getLastModifiedAt / setLastModifiedAt / clearLastModifiedAt", () => {
  it("returns empty string when not set", () => {
    expect(getLastModifiedAt()).toBe("");
  });

  it("sets and retrieves the timestamp", () => {
    setLastModifiedAt("2026-04-20T10:00:00Z");
    expect(getLastModifiedAt()).toBe("2026-04-20T10:00:00Z");
  });

  it("sets current time when no argument provided", () => {
    const before = new Date().toISOString();
    setLastModifiedAt();
    const stored = getLastModifiedAt();
    const after = new Date().toISOString();
    expect(stored >= before).toBe(true);
    expect(stored <= after).toBe(true);
  });

  it("clears the timestamp", () => {
    setLastModifiedAt("2026-04-20T10:00:00Z");
    clearLastModifiedAt();
    expect(getLastModifiedAt()).toBe("");
  });
});

// ── formatTimestamp ──────────────────────────────────────────────────────

describe("formatTimestamp", () => {
  it('returns "Never" for empty string', () => {
    expect(formatTimestamp("")).toBe("Never");
  });

  it('returns "Unknown" for invalid date', () => {
    expect(formatTimestamp("not-a-date")).toBe("Unknown");
  });

  it("returns a formatted string for valid ISO date", () => {
    const result = formatTimestamp("2026-04-20T10:30:00Z");
    // Should contain year, month, and time components
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/Apr/);
  });

  it("handles various valid ISO formats", () => {
    expect(formatTimestamp("2026-01-15T08:00:00.000Z")).not.toBe("Unknown");
    expect(formatTimestamp("2026-12-31T23:59:59Z")).not.toBe("Unknown");
  });
});

// ── relativeTime ─────────────────────────────────────────────────────────

describe("relativeTime", () => {
  it("returns empty string for empty input", () => {
    expect(relativeTime("")).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(relativeTime("invalid")).toBe("");
  });

  it('returns "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe("just now");
  });

  it("returns minutes ago for timestamps within the hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(fiveMinAgo)).toMatch(/5 minutes ago/);
  });

  it("returns singular minute", () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(relativeTime(oneMinAgo)).toBe("1 minute ago");
  });

  it("returns hours ago for timestamps within the day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(threeHoursAgo)).toMatch(/3 hours ago/);
  });

  it("returns singular hour", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(relativeTime(oneHourAgo)).toBe("1 hour ago");
  });

  it("returns days ago for older timestamps", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(twoDaysAgo)).toMatch(/2 days ago/);
  });

  it("returns singular day", () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(oneDayAgo)).toBe("1 day ago");
  });
});
