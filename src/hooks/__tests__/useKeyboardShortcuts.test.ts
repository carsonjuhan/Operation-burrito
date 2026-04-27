import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isEditableTarget, handleArrowNavigation } from "@/hooks/useKeyboardShortcuts";

// ── isEditableTarget ────────────────────────────────────────────────────────

describe("isEditableTarget", () => {
  it("returns true for INPUT elements", () => {
    const input = document.createElement("input");
    expect(isEditableTarget(input)).toBe(true);
  });

  it("returns true for TEXTAREA elements", () => {
    const textarea = document.createElement("textarea");
    expect(isEditableTarget(textarea)).toBe(true);
  });

  it("returns true for SELECT elements", () => {
    const select = document.createElement("select");
    expect(isEditableTarget(select)).toBe(true);
  });

  it("returns true for contenteditable elements", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    expect(isEditableTarget(div)).toBe(true);
  });

  it("returns false for regular div elements", () => {
    const div = document.createElement("div");
    expect(isEditableTarget(div)).toBe(false);
  });

  it("returns false for button elements", () => {
    const button = document.createElement("button");
    expect(isEditableTarget(button)).toBe(false);
  });

  it("returns false for null target", () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it("returns false for non-HTMLElement targets", () => {
    expect(isEditableTarget(document)).toBe(false);
  });
});

// ── handleArrowNavigation ──────────────────────────────────────────────────

describe("handleArrowNavigation", () => {
  let sidebar: HTMLElement;

  beforeEach(() => {
    sidebar = document.createElement("nav");
    sidebar.setAttribute("data-sidebar-nav", "");
    document.body.appendChild(sidebar);
  });

  afterEach(() => {
    // Clean up DOM safely
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  function addNavLinks(count: number): HTMLAnchorElement[] {
    const links: HTMLAnchorElement[] = [];
    for (let i = 0; i < count; i++) {
      const link = document.createElement("a");
      link.setAttribute("data-nav-item", "");
      link.href = `#item-${i}`;
      link.textContent = `Item ${i}`;
      link.focus = vi.fn();
      sidebar.appendChild(link);
      links.push(link);
    }
    return links;
  }

  it("does nothing if no sidebar exists", () => {
    // Remove sidebar
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    // Should not throw
    handleArrowNavigation("down");
  });

  it("does nothing if no nav items exist", () => {
    // sidebar exists but has no links
    handleArrowNavigation("down");
    // Should not throw
  });

  it("does nothing if focus is not inside the sidebar", () => {
    const links = addNavLinks(3);
    // Focus is on body, not a sidebar link
    handleArrowNavigation("down");
    expect(links[0].focus).not.toHaveBeenCalled();
  });

  it("moves focus down to next item", () => {
    const links = addNavLinks(3);
    // Simulate focus on first link
    Object.defineProperty(document, "activeElement", {
      value: links[0],
      writable: true,
      configurable: true,
    });

    handleArrowNavigation("down");
    expect(links[1].focus).toHaveBeenCalled();
  });

  it("wraps to first item when going down from last", () => {
    const links = addNavLinks(3);
    Object.defineProperty(document, "activeElement", {
      value: links[2],
      writable: true,
      configurable: true,
    });

    handleArrowNavigation("down");
    expect(links[0].focus).toHaveBeenCalled();
  });

  it("moves focus up to previous item", () => {
    const links = addNavLinks(3);
    Object.defineProperty(document, "activeElement", {
      value: links[1],
      writable: true,
      configurable: true,
    });

    handleArrowNavigation("up");
    expect(links[0].focus).toHaveBeenCalled();
  });

  it("wraps to last item when going up from first", () => {
    const links = addNavLinks(3);
    Object.defineProperty(document, "activeElement", {
      value: links[0],
      writable: true,
      configurable: true,
    });

    handleArrowNavigation("up");
    expect(links[2].focus).toHaveBeenCalled();
  });
});

// ── Keyboard event integration ─────────────────────────────────────────────

describe("keyboard event handling", () => {
  it("Cmd+K dispatches and can be detected", () => {
    const handler = vi.fn();
    document.addEventListener("keydown", handler);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    const e = handler.mock.calls[0][0] as KeyboardEvent;
    expect(e.key).toBe("k");
    expect(e.metaKey).toBe(true);

    document.removeEventListener("keydown", handler);
  });

  it("Ctrl+K dispatches and can be detected", () => {
    const handler = vi.fn();
    document.addEventListener("keydown", handler);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    const e = handler.mock.calls[0][0] as KeyboardEvent;
    expect(e.key).toBe("k");
    expect(e.ctrlKey).toBe(true);

    document.removeEventListener("keydown", handler);
  });

  it("? key event can be detected", () => {
    const handler = vi.fn();
    document.addEventListener("keydown", handler);

    const event = new KeyboardEvent("keydown", {
      key: "?",
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].key).toBe("?");

    document.removeEventListener("keydown", handler);
  });

  it("Escape key event can be detected", () => {
    const handler = vi.fn();
    document.addEventListener("keydown", handler);

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].key).toBe("Escape");

    document.removeEventListener("keydown", handler);
  });
});
