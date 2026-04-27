import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SyncQueueManager } from '@/components/SyncQueueManager';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRetrySyncNow = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@/contexts/StoreContext', () => ({
  useStoreContext: () => ({
    retrySyncNow: mockRetrySyncNow,
  }),
}));

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

const mockGetQueue = vi.fn<() => string[]>().mockReturnValue([]);
const mockClearQueue = vi.fn();

vi.mock('@/hooks/useServiceWorker', () => ({
  getOfflineSyncQueue: (...args: unknown[]) => mockGetQueue(...(args as [])),
  clearOfflineSyncQueue: (...args: unknown[]) => mockClearQueue(...(args as [])),
}));

// ── localStorage mock ─────────────────────────────────────────────────────

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

describe('SyncQueueManager', () => {
  let originalOnLine: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    mockRetrySyncNow.mockClear();
    mockAddToast.mockClear();
    mockGetQueue.mockReturnValue([]);
    mockClearQueue.mockClear();
    localStorageMock.clear();
  });

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    } else {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
    }
    vi.restoreAllMocks();
  });

  it('renders nothing to the DOM', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    const { container } = render(<SyncQueueManager />);
    expect(container.innerHTML).toBe('');
  });

  it('triggers sync replay when coming back online with queued operations', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(<SyncQueueManager />);

    // Set up queue before coming online
    mockGetQueue.mockReturnValue(['https://api.github.com/gists/abc123']);

    // Come back online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(mockClearQueue).toHaveBeenCalled();
    expect(mockRetrySyncNow).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      'Back online. Syncing 1 queued operation...',
      'info'
    );
  });

  it('shows success toast when coming back online with no queued operations', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(<SyncQueueManager />);

    mockGetQueue.mockReturnValue([]);

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(mockAddToast).toHaveBeenCalledWith('Back online.', 'success');
    expect(mockRetrySyncNow).not.toHaveBeenCalled();
  });

  it('does not trigger sync when already online on mount', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    render(<SyncQueueManager />);

    expect(mockRetrySyncNow).not.toHaveBeenCalled();
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('handles plural queued operations message', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(<SyncQueueManager />);

    mockGetQueue.mockReturnValue([
      'https://api.github.com/gists/abc123',
      'https://api.github.com/gists/def456',
    ]);

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      'Back online. Syncing 2 queued operations...',
      'info'
    );
  });
});
