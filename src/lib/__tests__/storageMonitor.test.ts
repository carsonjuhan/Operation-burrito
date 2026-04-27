import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import {
  getStorageSize,
  getStoragePercent,
  isStorageWarning,
  formatBytes,
  STORAGE_LIMIT_BYTES,
  WARNING_THRESHOLD,
} from "../storageMonitor";

// Create a proper localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

beforeAll(() => {
  vi.stubGlobal("localStorage", localStorageMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("storageMonitor", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("formatBytes", () => {
    it("formats 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("formats bytes under 1 KB", () => {
      expect(formatBytes(512)).toBe("512 B");
    });

    it("formats kilobytes", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(2560)).toBe("2.5 KB");
    });

    it("formats megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
      expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });
  });

  describe("getStorageSize", () => {
    it("returns 0 when localStorage has no app data", () => {
      const result = getStorageSize();
      expect(result.bytes).toBe(0);
      expect(result.formatted).toBe("0 B");
    });

    it("calculates correct byte size for stored data", () => {
      const value = "hello";
      localStorageMock.setItem("operation-burrito-store", value);
      const result = getStorageSize();
      // key = "operation-burrito-store" (23 chars) + value = "hello" (5 chars) = 28 chars * 2 bytes = 56
      expect(result.bytes).toBe(56);
    });

    it("returns formatted string for larger data", () => {
      const value = "x".repeat(500);
      localStorageMock.setItem("operation-burrito-store", value);
      const result = getStorageSize();
      // (23 + 500) * 2 = 1046 bytes
      expect(result.bytes).toBe(1046);
      expect(result.formatted).toBe("1.0 KB");
    });

    it("handles large data in MB range", () => {
      // Create ~1 MB of data: need 1MB / 2 = 524288 chars (minus key length)
      const value = "a".repeat(524288 - 23);
      localStorageMock.setItem("operation-burrito-store", value);
      const result = getStorageSize();
      expect(result.bytes).toBe(524288 * 2);
      expect(result.formatted).toBe("1.0 MB");
    });
  });

  describe("getStoragePercent", () => {
    it("returns 0 for empty storage", () => {
      expect(getStoragePercent(0)).toBe(0);
    });

    it("calculates correct percentage", () => {
      const halfLimit = STORAGE_LIMIT_BYTES / 2;
      expect(getStoragePercent(halfLimit)).toBe(50);
    });

    it("caps at 100%", () => {
      expect(getStoragePercent(STORAGE_LIMIT_BYTES * 2)).toBe(100);
    });

    it("uses passed byte value for calculation", () => {
      const oneMB = 1024 * 1024;
      const percent = getStoragePercent(oneMB);
      // 1 MB / 5 MB = 20%
      expect(percent).toBe(20);
    });
  });

  describe("isStorageWarning", () => {
    it("returns false when under threshold", () => {
      const underThreshold = STORAGE_LIMIT_BYTES * (WARNING_THRESHOLD - 0.1);
      expect(isStorageWarning(underThreshold)).toBe(false);
    });

    it("returns true when at threshold", () => {
      const atThreshold = STORAGE_LIMIT_BYTES * WARNING_THRESHOLD;
      expect(isStorageWarning(atThreshold)).toBe(true);
    });

    it("returns true when over threshold", () => {
      const overThreshold = STORAGE_LIMIT_BYTES * 0.9;
      expect(isStorageWarning(overThreshold)).toBe(true);
    });

    it("returns false for empty storage", () => {
      expect(isStorageWarning(0)).toBe(false);
    });
  });

  describe("constants", () => {
    it("STORAGE_LIMIT_BYTES is 5 MB", () => {
      expect(STORAGE_LIMIT_BYTES).toBe(5 * 1024 * 1024);
    });

    it("WARNING_THRESHOLD is 0.8", () => {
      expect(WARNING_THRESHOLD).toBe(0.8);
    });
  });
});
