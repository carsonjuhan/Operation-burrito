import { BabyItem, ItemCategory, ItemPriority } from "@/types";

/**
 * Shareable item — a subset of BabyItem fields for the URL payload.
 * Keeps the encoded string compact by omitting internal IDs, timestamps, etc.
 */
export interface ShareableItem {
  n: string;          // name
  c: ItemCategory;    // category
  p: ItemPriority;    // priority
  b: boolean;         // purchased (bought)
  co?: number;        // estimatedCost
  lk?: string;        // link
  no?: string;        // notes
}

/**
 * Convert full BabyItem[] into the compact shareable format.
 */
export function itemsToShareable(items: BabyItem[]): ShareableItem[] {
  return items.map((item) => {
    const s: ShareableItem = {
      n: item.name,
      c: item.category,
      p: item.priority,
      b: item.purchased,
    };
    if (item.estimatedCost != null) s.co = item.estimatedCost;
    if (item.link) s.lk = item.link;
    if (item.notes) s.no = item.notes;
    return s;
  });
}

/**
 * Convert shareable items back into BabyItem-like objects (read-only display).
 * Generates placeholder IDs and timestamps since these won't be edited.
 */
export function shareableToItems(shareable: ShareableItem[]): BabyItem[] {
  return shareable.map((s, i) => ({
    id: `shared-${i}`,
    name: s.n,
    category: s.c,
    priority: s.p,
    purchased: s.b,
    notes: s.no ?? "",
    link: s.lk,
    estimatedCost: s.co,
    createdAt: "",
  }));
}

/**
 * Encode items into a URL-safe base64 string for sharing via URL hash.
 * Uses btoa with Unicode-safe encoding (same pattern as birthPlanShare.ts).
 */
export function encodeRegistry(items: BabyItem[]): string {
  const shareable = itemsToShareable(items);
  const json = JSON.stringify(shareable);
  const encoded = btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
  return encoded;
}

/**
 * Decode a base64 string back into BabyItem[].
 * Returns null if the string is invalid or cannot be parsed.
 */
export function decodeRegistry(encoded: string): BabyItem[] | null {
  try {
    const json = decodeURIComponent(
      Array.from(atob(encoded))
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    // Basic validation: every element must have at least name and category
    const valid = parsed.every(
      (s: unknown) =>
        typeof s === "object" &&
        s !== null &&
        "n" in s &&
        "c" in s
    );
    if (!valid) return null;
    return shareableToItems(parsed as ShareableItem[]);
  } catch {
    return null;
  }
}

/**
 * Generate a full shareable URL for the registry/items list.
 * Uses the URL hash so data never leaves the browser.
 */
export function generateRegistryShareUrl(items: BabyItem[]): string {
  const encoded = encodeRegistry(items);
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname.replace(/\/items\/?$/, "")
      : "";
  return `${base}/items/share#${encoded}`;
}
