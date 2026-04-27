"use client";

import { useState, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutHelp } from "@/components/KeyboardShortcutHelp";

export function KeyboardShortcutProvider() {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleToggleHelp = useCallback(() => {
    setHelpOpen((prev) => !prev);
  }, []);

  const handleCloseOverlays = useCallback(() => {
    if (helpOpen) {
      setHelpOpen(false);
      return;
    }
    // Close mobile sidebar if open
    const closeSidebarBtn = document.querySelector<HTMLButtonElement>(
      "[data-sidebar-close]"
    );
    if (closeSidebarBtn) {
      closeSidebarBtn.click();
    }
  }, [helpOpen]);

  useKeyboardShortcuts({
    onToggleHelp: handleToggleHelp,
    onCloseOverlays: handleCloseOverlays,
  });

  return (
    <KeyboardShortcutHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
  );
}
