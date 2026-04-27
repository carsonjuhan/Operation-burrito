"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcutOptions {
  onToggleHelp: () => void;
  onCloseOverlays: () => void;
}

/**
 * Returns true if the active element is an input, textarea, or contenteditable,
 * meaning keyboard shortcuts should be suppressed.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") return true;
  return false;
}

/**
 * Navigates sidebar items with arrow keys.
 * Finds all sidebar nav links and moves focus between them.
 */
function handleArrowNavigation(direction: "up" | "down"): void {
  const sidebar = document.querySelector("[data-sidebar-nav]");
  if (!sidebar) return;

  const links = Array.from(
    sidebar.querySelectorAll<HTMLAnchorElement>("a[data-nav-item]")
  );
  if (links.length === 0) return;

  const activeElement = document.activeElement as HTMLElement | null;
  const currentIndex = activeElement ? links.indexOf(activeElement as HTMLAnchorElement) : -1;

  // Only handle arrow keys if focus is already inside the sidebar
  if (currentIndex === -1) return;

  let nextIndex: number;
  if (direction === "down") {
    nextIndex = currentIndex + 1 >= links.length ? 0 : currentIndex + 1;
  } else {
    nextIndex = currentIndex - 1 < 0 ? links.length - 1 : currentIndex - 1;
  }

  links[nextIndex]?.focus();
}

export function useKeyboardShortcuts({
  onToggleHelp,
  onCloseOverlays,
}: KeyboardShortcutOptions): void {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl+K — global search (always active, even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/search");
        // Focus the search input after navigation
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Search"]'
          );
          searchInput?.focus();
        }, 100);
        return;
      }

      // Escape — close overlays
      if (e.key === "Escape") {
        onCloseOverlays();
        return;
      }

      // Don't process other shortcuts when typing in inputs
      if (isEditableTarget(e.target)) return;

      // ? — toggle help overlay
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // Arrow keys — sidebar navigation
      if (e.key === "ArrowDown") {
        handleArrowNavigation("down");
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        handleArrowNavigation("up");
        e.preventDefault();
        return;
      }
    },
    [router, onToggleHelp, onCloseOverlays]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export { isEditableTarget, handleArrowNavigation };
