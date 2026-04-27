'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';

/**
 * Side-effect-only component that registers the service worker.
 * Renders nothing to the DOM.
 */
export function ServiceWorkerRegistration() {
  useServiceWorker();
  return null;
}
