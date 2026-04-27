"use client";

import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: ShortcutEntry[];
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: [isMac ? "Cmd" : "Ctrl", "K"], description: "Open global search" },
      { keys: ["Arrow Up / Down"], description: "Navigate sidebar items (when focused)" },
    ],
  },
  {
    label: "General",
    shortcuts: [
      { keys: ["?"], description: "Show this help overlay" },
      { keys: ["Esc"], description: "Close overlay / modal" },
    ],
  },
];

interface KeyboardShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutHelp({ isOpen, onClose }: KeyboardShortcutHelpProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the overlay
  useEffect(() => {
    if (!isOpen) return;
    const firstFocusable = overlayRef.current?.querySelector<HTMLElement>(
      'button, [tabindex="0"]'
    );
    firstFocusable?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-page-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        ref={overlayRef}
        className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-sage-600" />
            <h2 className="text-base font-semibold text-stone-800">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="Close shortcuts help"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-stone-600">{shortcut.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="text-stone-300 text-xs mx-0.5">+</span>
                          )}
                          <kbd className="inline-block min-w-[24px] text-center px-2 py-0.5 text-xs font-medium text-stone-600 bg-stone-100 border border-stone-200 rounded-md shadow-sm">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100">
          <p className="text-xs text-stone-400 text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-white border border-stone-200 rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
