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
 * Returns the service worker URL accounting for basePath.
 * In production, Next.js uses /Operation-burrito as basePath.
 */
export function getServiceWorkerURL(): string {
  const basePath = process.env.NODE_ENV === 'production' ? '/Operation-burrito' : '';
  return `${basePath}/sw.js`;
}

/**
 * Returns the scope for the service worker registration.
 */
export function getServiceWorkerScope(): string {
  const basePath = process.env.NODE_ENV === 'production' ? '/Operation-burrito' : '';
  return `${basePath}/`;
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
 */
export function useServiceWorker(): void {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

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
              // A new version has been activated — the user will get it on next navigation.
              // S-019/S-020 can add a UI prompt here to reload.
              console.log('[SW] New version activated. Refresh for updates.');
            }
          });
        });
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);
}
