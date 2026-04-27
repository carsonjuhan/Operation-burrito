import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDismissed,
  persistDismissal,
  isStandalone,
} from '@/hooks/useInstallPrompt';

// ── sessionStorage mock ────────────────────────────────────────────────────

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

vi.stubGlobal('sessionStorage', sessionStorageMock);

const DISMISS_KEY = 'ob-install-banner-dismissed';

// ── matchMedia mock ────────────────────────────────────────────────────────

let matchMediaMatches = false;

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: query === '(display-mode: standalone)' ? matchMediaMatches : false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useInstallPrompt utilities', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    matchMediaMatches = false;
    // Reset navigator.standalone
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── isDismissed ──────────────────────────────────────────────────────────

  describe('isDismissed', () => {
    it('returns false when nothing is stored', () => {
      expect(isDismissed()).toBe(false);
    });

    it('returns true when dismissal is stored', () => {
      sessionStorageMock.setItem(DISMISS_KEY, 'true');
      expect(isDismissed()).toBe(true);
    });

    it('returns false for non-true values', () => {
      sessionStorageMock.setItem(DISMISS_KEY, 'false');
      expect(isDismissed()).toBe(false);
    });
  });

  // ── persistDismissal ─────────────────────────────────────────────────────

  describe('persistDismissal', () => {
    it('stores dismissal flag in sessionStorage', () => {
      persistDismissal();
      expect(sessionStorageMock.getItem(DISMISS_KEY)).toBe('true');
    });
  });

  // ── isStandalone ─────────────────────────────────────────────────────────

  describe('isStandalone', () => {
    it('returns false when not in standalone mode', () => {
      matchMediaMatches = false;
      expect(isStandalone()).toBe(false);
    });

    it('returns true when display-mode: standalone matches', () => {
      matchMediaMatches = true;
      expect(isStandalone()).toBe(true);
    });

    it('returns true when navigator.standalone is true (iOS)', () => {
      matchMediaMatches = false;
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
        configurable: true,
      });
      expect(isStandalone()).toBe(true);
    });

    it('returns false when navigator.standalone is false', () => {
      matchMediaMatches = false;
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true,
        configurable: true,
      });
      expect(isStandalone()).toBe(false);
    });
  });
});

// ── BeforeInstallPromptEvent integration ───────────────────────────────────

describe('beforeinstallprompt event handling', () => {
  it('event can be captured and prevented', () => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    let capturedEvent: Event | null = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      capturedEvent = e;
    });

    window.dispatchEvent(event);
    expect(capturedEvent).toBe(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('appinstalled event can be listened for', () => {
    let installed = false;
    window.addEventListener('appinstalled', () => {
      installed = true;
    });
    window.dispatchEvent(new Event('appinstalled'));
    expect(installed).toBe(true);
  });
});
