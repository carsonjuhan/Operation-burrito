"use client";

import { useState } from "react";
import { History, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import type { ActionEntry } from "@/lib/actionHistory";

interface ActionHistoryProps {
  history: ActionEntry[];
  revertTo: (id: string) => void;
  clearHistory: () => void;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ActionHistory({ history, revertTo, clearHistory }: ActionHistoryProps) {
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  function handleRevert(id: string) {
    if (confirmRevertId === id) {
      revertTo(id);
      setConfirmRevertId(null);
    } else {
      setConfirmRevertId(id);
    }
  }

  function handleClear() {
    if (confirmClear) {
      clearHistory();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  }

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History size={18} className="text-stone-600 dark:text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Action History
          </h2>
          {history.length > 0 && (
            <span className="text-xs text-stone-400 dark:text-stone-500">
              ({history.length})
            </span>
          )}
        </div>
        {history.length > 0 && (
          confirmClear ? (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-stone-500 dark:text-stone-400">Clear all?</span>
              <button
                onClick={handleClear}
                className="btn-danger text-xs"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleClear}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear
            </button>
          )
        )}
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">
        Recent changes this session. Reverting restores the app to the state before that action.
        History clears on page refresh.
      </p>

      {history.length === 0 ? (
        <div className="text-center py-6 text-stone-400 dark:text-stone-500">
          <History size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No actions recorded yet.</p>
          <p className="text-xs mt-1">Changes you make will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-700 dark:text-stone-200 truncate">
                  {entry.description}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  {formatTimestamp(entry.timestamp)}
                </p>
              </div>
              {confirmRevertId === entry.id ? (
                <div className="flex gap-1.5 shrink-0 items-center">
                  <AlertTriangle size={13} className="text-amber-500" />
                  <button
                    onClick={() => handleRevert(entry.id)}
                    className="btn-danger text-xs"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmRevertId(null)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleRevert(entry.id)}
                  className="btn-secondary text-xs shrink-0 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Revert
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
