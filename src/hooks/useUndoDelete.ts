"use client";

import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";

const UNDO_DELAY_MS = 5000;

interface PendingDelete<T> {
  item: T;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Hook that provides undo-able delete functionality.
 *
 * Strategy: delete the item immediately from the store, but keep a reference.
 * If the user clicks "Undo" within 5 seconds, re-add the item to the store.
 *
 * @param deleteFromStore - function that removes the item (called immediately)
 * @param restoreToStore - function that re-adds the item on undo
 * @param getItemName - extract a display name from the item for the toast message
 */
export function useUndoDelete<T extends { id: string }>(
  deleteFromStore: (id: string) => void,
  restoreToStore: (item: T) => void,
  getItemName: (item: T) => string = () => "Item"
) {
  const { addToast } = useToast();
  const pendingRef = useRef<Map<string, PendingDelete<T>>>(new Map());

  // Clean up all pending timers on unmount
  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      pending.forEach((entry) => clearTimeout(entry.timer));
      pending.clear();
    };
  }, []);

  const undoDelete = useCallback(
    (id: string) => {
      const entry = pendingRef.current.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingRef.current.delete(id);
      restoreToStore(entry.item);
    },
    [restoreToStore]
  );

  const handleDelete = useCallback(
    (item: T) => {
      const id = item.id;
      const name = getItemName(item);

      // Delete immediately from store
      deleteFromStore(id);

      // If there was already a pending delete for this id (unlikely but safe), clear it
      const existing = pendingRef.current.get(id);
      if (existing) clearTimeout(existing.timer);

      // Set up timer — after 5s the delete is "permanent" (already done, just clean up reference)
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
      }, UNDO_DELAY_MS);

      pendingRef.current.set(id, { item, timer });

      // Show toast with undo action
      addToast(
        `"${name}" deleted`,
        "info",
        {
          label: "Undo",
          onClick: () => undoDelete(id),
        },
        UNDO_DELAY_MS + 500 // Toast stays slightly longer than undo window
      );
    },
    [deleteFromStore, getItemName, addToast, undoDelete]
  );

  return { handleDelete };
}
