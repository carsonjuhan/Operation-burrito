'use client';

import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getOfflineSyncQueue, clearOfflineSyncQueue } from '@/hooks/useServiceWorker';
import { useStoreContext } from '@/contexts/StoreContext';
import { useToast } from '@/contexts/ToastContext';

/**
 * Side-effect component that monitors online status and replays
 * queued sync operations when connectivity returns.
 * Renders nothing to the DOM.
 */
export function SyncQueueManager() {
  const { isOnline } = useOnlineStatus();
  const { retrySyncNow } = useStoreContext();
  const { addToast } = useToast();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    // We just came back online
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;

      const queue = getOfflineSyncQueue();
      if (queue.length > 0) {
        addToast(
          `Back online. Syncing ${queue.length} queued operation${queue.length > 1 ? 's' : ''}...`,
          'info'
        );
        clearOfflineSyncQueue();
        retrySyncNow();
      } else {
        addToast('Back online.', 'success');
      }
    }
  }, [isOnline, retrySyncNow, addToast]);

  return null;
}
