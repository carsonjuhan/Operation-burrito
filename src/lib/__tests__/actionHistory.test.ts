import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordAction,
  getHistory,
  getEntry,
  clearHistory,
} from "../actionHistory";
import type { AppStore } from "@/types";
import { DEFAULT_BIRTH_PLAN } from "@/hooks/useStore";

// Minimal valid AppStore for testing
function makeStore(overrides: Partial<AppStore> = {}): AppStore {
  return {
    items: [],
    classes: [],
    materials: [],
    birthPlan: DEFAULT_BIRTH_PLAN,
    notes: [],
    hospitalBag: [],
    appointments: [],
    contacts: [],
    contractions: [],
    postBirthTasks: [],
    registryUrl: "",
    ...overrides,
  };
}

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `uuid-${++uuidCounter}`,
});

describe("actionHistory", () => {
  beforeEach(() => {
    clearHistory();
    uuidCounter = 0;
  });

  it("records and retrieves actions", () => {
    const store = makeStore();
    recordAction("Added item 'Baby Monitor'", store);
    recordAction("Deleted note 'Shopping list'", store);

    const history = getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].description).toBe("Deleted note 'Shopping list'");
    expect(history[1].description).toBe("Added item 'Baby Monitor'");
  });

  it("returns entries newest-first", () => {
    const store = makeStore();
    recordAction("First", store);
    recordAction("Second", store);
    recordAction("Third", store);

    const history = getHistory();
    expect(history[0].description).toBe("Third");
    expect(history[1].description).toBe("Second");
    expect(history[2].description).toBe("First");
  });

  it("enforces circular buffer at 20 entries", () => {
    const store = makeStore();
    for (let i = 1; i <= 25; i++) {
      recordAction(`Action ${i}`, store);
    }

    const history = getHistory();
    expect(history).toHaveLength(20);
    // Newest should be Action 25, oldest should be Action 6
    expect(history[0].description).toBe("Action 25");
    expect(history[19].description).toBe("Action 6");
  });

  it("clears history", () => {
    const store = makeStore();
    recordAction("Something", store);
    recordAction("Another", store);
    expect(getHistory()).toHaveLength(2);

    clearHistory();
    expect(getHistory()).toHaveLength(0);
  });

  it("retrieves a specific entry by ID", () => {
    const store = makeStore();
    recordAction("First", store);
    recordAction("Second", store);

    const history = getHistory();
    const target = history[1]; // "First"
    const found = getEntry(target.id);
    expect(found).toBeDefined();
    expect(found!.description).toBe("First");
  });

  it("returns undefined for non-existent entry ID", () => {
    expect(getEntry("non-existent-id")).toBeUndefined();
  });

  it("deep-clones the snapshot to avoid reference issues", () => {
    const store = makeStore({ items: [{ id: "1", name: "Original", category: "Nursery", priority: "Must Have", purchased: false, notes: "", createdAt: "" }] });
    recordAction("Added item", store);

    // Mutate the original store
    store.items[0].name = "Mutated";

    const history = getHistory();
    expect(history[0].snapshot.items[0].name).toBe("Original");
  });

  it("getHistory returns a copy (not the internal buffer reference)", () => {
    const store = makeStore();
    recordAction("Test", store);

    const h1 = getHistory();
    const h2 = getHistory();
    expect(h1).not.toBe(h2);
    expect(h1).toEqual(h2);
  });
});
