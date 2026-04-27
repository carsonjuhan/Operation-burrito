import { AppStore } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ActionEntry {
  id: string;
  timestamp: string;
  description: string;
  snapshot: AppStore;
}

// ── Circular buffer (in-memory only) ──────────────────────────────────────

const MAX_ENTRIES = 20;
let buffer: ActionEntry[] = [];

/**
 * Record a new action with a deep-cloned snapshot of the store.
 * The snapshot is taken BEFORE the mutation so reverting restores the prior state.
 */
export function recordAction(description: string, snapshot: AppStore): void {
  const entry: ActionEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    description,
    snapshot: JSON.parse(JSON.stringify(snapshot)) as AppStore,
  };
  buffer = [entry, ...buffer].slice(0, MAX_ENTRIES);
}

/**
 * Return all history entries, newest first.
 */
export function getHistory(): ActionEntry[] {
  return [...buffer];
}

/**
 * Look up a single entry by ID.
 */
export function getEntry(id: string): ActionEntry | undefined {
  return buffer.find((e) => e.id === id);
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  buffer = [];
}
