"use client";

import { useState, useCallback } from "react";
import {
  recordAction as _recordAction,
  getHistory,
  getEntry,
  clearHistory as _clearHistory,
  ActionEntry,
} from "@/lib/actionHistory";
import { AppStore } from "@/types";

/**
 * Hook that wraps the in-memory action history module and provides
 * React state updates so the UI re-renders when history changes.
 */
export function useActionHistory(loadFromExternal: (store: AppStore) => void) {
  // A counter that forces re-renders when the history changes
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const history: ActionEntry[] = getHistory();

  const recordAction = useCallback(
    (description: string, snapshot: AppStore) => {
      _recordAction(description, snapshot);
      bump();
    },
    [bump],
  );

  const revertTo = useCallback(
    (id: string) => {
      const entry = getEntry(id);
      if (!entry) return;
      // Deep-clone the snapshot to avoid reference issues
      const restored: AppStore = JSON.parse(JSON.stringify(entry.snapshot));
      loadFromExternal(restored);
      bump();
    },
    [loadFromExternal, bump],
  );

  const clearHistory = useCallback(() => {
    _clearHistory();
    bump();
  }, [bump]);

  return { history, recordAction, revertTo, clearHistory };
}
