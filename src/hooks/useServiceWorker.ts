'use client';

import { useEffect, useRef } from 'react';

const OFFLINE_QUEUE_KEY = 'ob-offline-sync-queue';

/**
 * Determines whether the service worker should be registered.
 * Only registers in production (not during development).
 */
export function shouldRegisterSW(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  // process.env.NODE_ENV is inlined at build time by Next.js
  if (process.env.NODE_ENV !== 'production') return false;
  return true;
}

/**
 * Returns the service worker URL. The app deploys at the domain root
 * (baby.juhan.me), so no basePath is needed.
 */
export function getServiceWorkerURL(): string {
  return '/sw.js';
}

/**
 * Returns the scope for the service worker registration.
 */
export function getServiceWorkerScope(): string {
  return '/';
}

/**
 * Queues a failed sync URL in localStorage for later replay.
 */
export function queueOfflineSync(url: string): void {
  try {
    const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: string[] = existing ? JSON.parse(existing) : [];
    if (!queue.includes(url)) {
      queue.push(url);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/**
 * Retrieves the offline sync queue from localStorage.
 */
export function getOfflineSyncQueue(): string[] {
  try {
    const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

/**
 * Clears the offline sync queue.
 */
export function clearOfflineSyncQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // silently ignore
  }
}

/**
 * Hook that registers the service worker and listens for updates.
 * Only active in production builds.
 *
 * @param onUpdate Called when a new app version has been installed and is
 *                 ready — show a "Refresh" prompt to the user.
 */
export function useServiceWorker(onUpdate?: () => void): void {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!shouldRegisterSW()) return;

    const swURL = getServiceWorkerURL();
    const scope = getServiceWorkerScope();

    // Listen for offline sync messages from the service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_OFFLINE') {
        queueOfflineSync(event.data.url);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    navigator.serviceWorker
      .register(swURL, { scope })
      .then((registration) => {
        registrationRef.current = registration;

        // Detect updates: when a new SW is found, it enters the "installing" state
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'activated' &&
              navigator.serviceWorker.controller
            ) {
              // New version active — prompt the user to reload for fresh UI
              onUpdateRef.current?.();
            }
          });
        });
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });

    // Re-check for a new deploy when the app regains focus (PWAs can sit in
    // the app switcher for days) and on a slow interval while open.
    const checkForUpdate = () => registrationRef.current?.update().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);
}
