import { describe, it, expect } from "vitest";
import {
  encodeRegistry,
  decodeRegistry,
  itemsToShareable,
  shareableToItems,
} from "../registryShare";
import { BabyItem, ItemCategory, ItemPriority } from "@/types";

function makeItem(overrides: Partial<BabyItem> = {}): BabyItem {
  return {
    id: "test-1",
    name: "Car Seat",
    category: "Travel" as ItemCategory,
    priority: "Must Have" as ItemPriority,
    purchased: false,
    notes: "",
    createdAt: "2024-01-01",
    ...overrides,
  };
}

// ── Round-trip encode/decode ──────────────────────────────────────────────

describe("encodeRegistry / decodeRegistry round-trip", () => {
  it("round-trips a single item", () => {
    const items = [makeItem()];
    const encoded = encodeRegistry(items);
    const decoded = decodeRegistry(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.length).toBe(1);
    expect(decoded![0].name).toBe("Car Seat");
    expect(decoded![0].category).toBe("Travel");
    expect(decoded![0].priority).toBe("Must Have");
    expect(decoded![0].purchased).toBe(false);
  });

  it("round-trips multiple items with all fields", () => {
    const items = [
      makeItem({
        name: "Crib",
        category: "Nursery",
        priority: "Must Have",
        purchased: true,
        notes: "White convertible crib",
        link: "https://example.com/crib",
        estimatedCost: 299.99,
      }),
      makeItem({
        name: "Bottles",
        category: "Feeding",
        priority: "Nice to Have",
        purchased: false,
        notes: "Anti-colic",
        estimatedCost: 25,
      }),
      makeItem({
        name: "Toy Set",
        category: "Toys & Gear",
        priority: "Optional",
        purchased: false,
        notes: "",
      }),
    ];
    const encoded = encodeRegistry(items);
    const decoded = decodeRegistry(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.length).toBe(3);
    expect(decoded![0].name).toBe("Crib");
    expect(decoded![0].purchased).toBe(true);
    expect(decoded![0].notes).toBe("White convertible crib");
    expect(decoded![0].link).toBe("https://example.com/crib");
    expect(decoded![0].estimatedCost).toBe(299.99);
    expect(decoded![1].name).toBe("Bottles");
    expect(decoded![1].priority).toBe("Nice to Have");
    expect(decoded![2].name).toBe("Toy Set");
    expect(decoded![2].priority).toBe("Optional");
  });

  it("preserves Unicode characters in names and notes", () => {
    const items = [
      makeItem({
        name: "Babybjorn Bouncer",
        notes: "Colour: gris clair / helgraa",
      }),
    ];
    const encoded = encodeRegistry(items);
    const decoded = decodeRegistry(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded![0].name).toBe("Babybjorn Bouncer");
    expect(decoded![0].notes).toBe("Colour: gris clair / helgraa");
  });
});

// ── Empty data ────────────────────────────────────────────────────────────

describe("empty data", () => {
  it("round-trips an empty array", () => {
    const encoded = encodeRegistry([]);
    const decoded = decodeRegistry(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.length).toBe(0);
  });
});

// ── Invalid input ─────────────────────────────────────────────────────────

describe("decodeRegistry with invalid input", () => {
  it("returns null for empty string", () => {
    expect(decodeRegistry("")).toBeNull();
  });

  it("returns null for garbage base64", () => {
    expect(decodeRegistry("not-valid-base64!!!")).toBeNull();
  });

  it("returns null for valid base64 but non-JSON", () => {
    const encoded = btoa("this is not json");
    expect(decodeRegistry(encoded)).toBeNull();
  });

  it("returns null for valid JSON but not an array", () => {
    const encoded = btoa(JSON.stringify({ foo: "bar" }));
    expect(decodeRegistry(encoded)).toBeNull();
  });

  it("returns null for array without required fields", () => {
    const encoded = btoa(JSON.stringify([{ x: 1 }]));
    expect(decodeRegistry(encoded)).toBeNull();
  });
});

// ── Large datasets ────────────────────────────────────────────────────────

describe("large datasets", () => {
  it("round-trips 100 items", () => {
    const items: BabyItem[] = Array.from({ length: 100 }, (_, i) =>
      makeItem({
        id: `item-${i}`,
        name: `Item ${i}`,
        category: (["Nursery", "Clothing", "Feeding", "Safety", "Travel"] as ItemCategory[])[i % 5],
        priority: (["Must Have", "Nice to Have", "Optional"] as ItemPriority[])[i % 3],
        purchased: i % 2 === 0,
        notes: `Note for item ${i}`,
        estimatedCost: i * 10,
      })
    );
    const encoded = encodeRegistry(items);
    const decoded = decodeRegistry(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.length).toBe(100);
    expect(decoded![0].name).toBe("Item 0");
    expect(decoded![99].name).toBe("Item 99");
    expect(decoded![50].purchased).toBe(true);
    expect(decoded![51].purchased).toBe(false);
  });

  it("produces a string for 200 items (stress test)", () => {
    const items: BabyItem[] = Array.from({ length: 200 }, (_, i) =>
      makeItem({
        id: `item-${i}`,
        name: `Baby Item Number ${i} with a longer name for realism`,
        notes: `Detailed notes about item ${i}`,
        estimatedCost: Math.round(Math.random() * 500),
      })
    );
    const encoded = encodeRegistry(items);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = decodeRegistry(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.length).toBe(200);
  });
});

// ── itemsToShareable / shareableToItems ───────────────────────────────────

describe("itemsToShareable", () => {
  it("strips internal fields (id, createdAt) and uses compact keys", () => {
    const items = [makeItem({ notes: "some note", link: "https://a.com", estimatedCost: 50 })];
    const shareable = itemsToShareable(items);
    expect(shareable[0]).toEqual({
      n: "Car Seat",
      c: "Travel",
      p: "Must Have",
      b: false,
      no: "some note",
      lk: "https://a.com",
      co: 50,
    });
  });

  it("omits optional fields when empty", () => {
    const items = [makeItem()];
    const shareable = itemsToShareable(items);
    expect(shareable[0]).toEqual({
      n: "Car Seat",
      c: "Travel",
      p: "Must Have",
      b: false,
    });
    expect("no" in shareable[0]).toBe(false);
    expect("lk" in shareable[0]).toBe(false);
    expect("co" in shareable[0]).toBe(false);
  });
});

describe("shareableToItems", () => {
  it("generates placeholder IDs and empty createdAt", () => {
    const result = shareableToItems([{ n: "Test", c: "Other", p: "Optional", b: true }]);
    expect(result[0].id).toBe("shared-0");
    expect(result[0].createdAt).toBe("");
    expect(result[0].name).toBe("Test");
    expect(result[0].purchased).toBe(true);
  });
});
