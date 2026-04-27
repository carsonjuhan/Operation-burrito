import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal("localStorage", localStorageMock);

describe("useTheme", () => {
  let matchMediaListeners: Map<string, ((e: { matches: boolean }) => void)>;
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock.clear();

    // Remove dark class
    document.documentElement.classList.remove("dark");

    // Mock matchMedia
    matchMediaListeners = new Map();
    mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (event: string, handler: (e: { matches: boolean }) => void) => {
        matchMediaListeners.set(event, handler);
      },
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
    localStorageMock.clear();
  });

  it("defaults to system theme when nothing is stored", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it("reads stored theme from localStorage", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("adds dark class when theme is dark", () => {
    localStorage.setItem("theme", "dark");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not add dark class when theme is light", () => {
    localStorage.setItem("theme", "light");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists theme to localStorage when setTheme is called", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switches from dark to light", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("resolvedTheme returns the effective theme for system preference", () => {
    // matchMedia returns false (light), so system = light
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe("light");
  });

  it("resolvedTheme updates when system preference changes and theme is system", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    expect(result.current.resolvedTheme).toBe("light");

    // Simulate system changing to dark
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    // Trigger the change listener
    const changeHandler = matchMediaListeners.get("change");
    if (changeHandler) {
      act(() => {
        changeHandler({ matches: true });
      });
    }

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(result.current.resolvedTheme).toBe("dark");
  });

  it("ignores invalid stored theme and defaults to system", () => {
    localStorage.setItem("theme", "invalid-value");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it("cleans up matchMedia listener on unmount", () => {
    const removeListener = vi.fn();
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: removeListener,
    });

    const { unmount } = renderHook(() => useTheme());
    unmount();

    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
