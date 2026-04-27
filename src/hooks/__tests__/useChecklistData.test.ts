import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useChecklistData, _resetCache } from "../useChecklistData";

// Mock the checklistData module
const mockData = {
  CHECKLIST_ITEMS: [
    { id: "1", name: "Baby Crib", category: "Nursery", timing: "Newborn (0-3 months)" },
    { id: "2", name: "Car Seat", category: "Travel", timing: "Hospital (Pre-birth)" },
  ],
  TIMING_OPTIONS: [
    "Pregnancy",
    "Hospital (Pre-birth)",
    "Newborn (0-3 months)",
    "1-6 months",
    "Special occasions",
    "Other",
  ],
  AMAZON_PURCHASED_ITEMS: [
    { id: "r-1", name: "Crib Sheet", category: "Nursery", purchasedFrom: "Amazon" },
  ],
  MATCHED_CHECKLIST_IDS: new Set(["1"]),
  UNIQUE_INVENTORY_ITEMS: [
    { id: "u-1", name: "Night Light", category: "Nursery" },
  ],
  MATCH_LOG: [
    { inventory: "Crib Sheet", checklist: "Baby Crib", matched: true },
    { inventory: "Night Light", checklist: "", matched: false },
  ],
};

vi.mock("@/lib/checklistData", () => mockData);

describe("useChecklistData", () => {
  beforeEach(() => {
    _resetCache();
  });

  it("starts in a loading state", () => {
    const { result } = renderHook(() => useChecklistData());
    // On first render before the effect fires, loading should be true
    expect(result.current.loading).toBe(true);
  });

  it("loads data and sets loading to false", async () => {
    const { result } = renderHook(() => useChecklistData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.CHECKLIST_ITEMS).toHaveLength(2);
    expect(result.current.data!.TIMING_OPTIONS).toHaveLength(6);
    expect(result.current.data!.AMAZON_PURCHASED_ITEMS).toHaveLength(1);
    expect(result.current.data!.MATCHED_CHECKLIST_IDS.size).toBe(1);
    expect(result.current.data!.UNIQUE_INVENTORY_ITEMS).toHaveLength(1);
    expect(result.current.data!.MATCH_LOG).toHaveLength(2);
  });

  it("returns the same data shape as the static exports", async () => {
    const { result } = renderHook(() => useChecklistData());

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });

    const data = result.current.data!;
    // Verify all expected keys exist
    expect(data).toHaveProperty("CHECKLIST_ITEMS");
    expect(data).toHaveProperty("TIMING_OPTIONS");
    expect(data).toHaveProperty("AMAZON_PURCHASED_ITEMS");
    expect(data).toHaveProperty("MATCHED_CHECKLIST_IDS");
    expect(data).toHaveProperty("UNIQUE_INVENTORY_ITEMS");
    expect(data).toHaveProperty("MATCH_LOG");

    // Verify types
    expect(Array.isArray(data.CHECKLIST_ITEMS)).toBe(true);
    expect(Array.isArray(data.TIMING_OPTIONS)).toBe(true);
    expect(Array.isArray(data.AMAZON_PURCHASED_ITEMS)).toBe(true);
    expect(data.MATCHED_CHECKLIST_IDS instanceof Set).toBe(true);
    expect(Array.isArray(data.UNIQUE_INVENTORY_ITEMS)).toBe(true);
    expect(Array.isArray(data.MATCH_LOG)).toBe(true);
  });

  it("caches data across multiple hook instances", async () => {
    // First render loads the data
    const { result: result1 } = renderHook(() => useChecklistData());

    await waitFor(() => {
      expect(result1.current.data).not.toBeNull();
    });

    // Second render should get cached data immediately (not loading)
    const { result: result2 } = renderHook(() => useChecklistData());

    // Cached data should be available immediately (no loading state)
    expect(result2.current.loading).toBe(false);
    expect(result2.current.data).not.toBeNull();
    expect(result2.current.data!.CHECKLIST_ITEMS).toHaveLength(2);
  });

  it("_resetCache clears the cache", async () => {
    // Load data first
    const { result: result1 } = renderHook(() => useChecklistData());
    await waitFor(() => {
      expect(result1.current.data).not.toBeNull();
    });

    // Reset the cache
    _resetCache();

    // New hook should start in loading state again
    const { result: result2 } = renderHook(() => useChecklistData());
    expect(result2.current.loading).toBe(true);

    // But should eventually load
    await waitFor(() => {
      expect(result2.current.data).not.toBeNull();
    });
  });
});
