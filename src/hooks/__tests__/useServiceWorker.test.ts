import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  shouldRegisterSW,
  getServiceWorkerURL,
  getServiceWorkerScope,
  queueOfflineSync,
  getOfflineSyncQueue,
  clearOfflineSyncQueue,
} from '@/hooks/useServiceWorker';

// ── localStorage mock ───────────────────────────────────────────────────────

const localStorageMock = (() => {
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

vi.stubGlobal('localStorage', localStorageMock);

// ── Helpers ─────────────────────────────────────────────────────────────────

const OFFLINE_QUEUE_KEY = 'ob-offline-sync-queue';

let originalNavigator: PropertyDescriptor | undefined;

beforeEach(() => {
  originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  localStorageMock.clear();
});

afterEach(() => {
  // Restore navigator
  if (originalNavigator) {
    Object.defineProperty(globalThis, 'navigator', originalNavigator);
  }
  vi.restoreAllMocks();
});

// ── shouldRegisterSW ────────────────────────────────────────────────────────

describe('shouldRegisterSW', () => {
  it('returns false when serviceWorker is not in navigator', () => {
    const nav = { ...navigator };
    delete (nav as Record<string, unknown>).serviceWorker;
    Object.defineProperty(globalThis, 'navigator', {
      value: nav,
      writable: true,
      configurable: true,
    });
    expect(shouldRegisterSW()).toBe(false);
  });

  it('returns false in development/test mode', () => {
    // NODE_ENV is "test" during vitest runs, which is not "production"
    // We need serviceWorker to be present to reach the env check
    const nav = {
      ...navigator,
      serviceWorker: { register: vi.fn() },
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: nav,
      writable: true,
      configurable: true,
    });
    expect(shouldRegisterSW()).toBe(false);
  });
});

// ── getServiceWorkerURL ─────────────────────────────────────────────────────

describe('getServiceWorkerURL', () => {
  it('returns /sw.js without basePath in non-production', () => {
    // NODE_ENV is "test" during vitest
    const url = getServiceWorkerURL();
    expect(url).toBe('/sw.js');
  });
});

// ── getServiceWorkerScope ───────────────────────────────────────────────────

describe('getServiceWorkerScope', () => {
  it('returns / without basePath in non-production', () => {
    const scope = getServiceWorkerScope();
    expect(scope).toBe('/');
  });
});

// ── Offline Sync Queue ──────────────────────────────────────────────────────

describe('queueOfflineSync', () => {
  it('queues a URL to localStorage', () => {
    queueOfflineSync('https://api.github.com/gists/abc123');
    const stored = localStorageMock.getItem(OFFLINE_QUEUE_KEY);
    expect(stored).not.toBeNull();
    const queue = JSON.parse(stored!);
    expect(queue).toEqual(['https://api.github.com/gists/abc123']);
  });

  it('does not duplicate URLs', () => {
    queueOfflineSync('https://api.github.com/gists/abc123');
    queueOfflineSync('https://api.github.com/gists/abc123');
    const queue = JSON.parse(localStorageMock.getItem(OFFLINE_QUEUE_KEY)!);
    expect(queue).toHaveLength(1);
  });

  it('appends to existing queue', () => {
    queueOfflineSync('https://api.github.com/gists/abc123');
    queueOfflineSync('https://api.github.com/gists/def456');
    const queue = JSON.parse(localStorageMock.getItem(OFFLINE_QUEUE_KEY)!);
    expect(queue).toEqual([
      'https://api.github.com/gists/abc123',
      'https://api.github.com/gists/def456',
    ]);
  });
});

describe('getOfflineSyncQueue', () => {
  it('returns empty array when nothing is queued', () => {
    expect(getOfflineSyncQueue()).toEqual([]);
  });

  it('returns queued URLs', () => {
    localStorageMock.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(['https://api.github.com/gists/abc123'])
    );
    expect(getOfflineSyncQueue()).toEqual(['https://api.github.com/gists/abc123']);
  });

  it('returns empty array on malformed JSON', () => {
    localStorageMock.setItem(OFFLINE_QUEUE_KEY, 'not-json');
    expect(getOfflineSyncQueue()).toEqual([]);
  });
});

describe('clearOfflineSyncQueue', () => {
  it('removes the queue from localStorage', () => {
    localStorageMock.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(['https://api.github.com/gists/abc123'])
    );
    clearOfflineSyncQueue();
    expect(localStorageMock.getItem(OFFLINE_QUEUE_KEY)).toBeNull();
  });

  it('does not throw when queue does not exist', () => {
    expect(() => clearOfflineSyncQueue()).not.toThrow();
  });
});

// ── useServiceWorker hook (integration) ─────────────────────────────────────

describe('useServiceWorker hook registration', () => {
  it('exports a callable function', async () => {
    const mod = await import('@/hooks/useServiceWorker');
    expect(typeof mod.useServiceWorker).toBe('function');
  });
});
