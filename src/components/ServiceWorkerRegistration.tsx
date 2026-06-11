'use client';

import { useCallback } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useToast } from '@/contexts/ToastContext';

/**
 * Side-effect-only component that registers the service worker and surfaces
 * an update prompt when a new deploy is ready.
 */
export function ServiceWorkerRegistration() {
  const { addToast } = useToast();

  const onUpdate = useCallback(() => {
    addToast(
      'A new version of the app is available.',
      'info',
      { label: 'Refresh', onClick: () => window.location.reload() },
      30000
    );
  }, [addToast]);

  useServiceWorker(onUpdate);
  return null;
}
