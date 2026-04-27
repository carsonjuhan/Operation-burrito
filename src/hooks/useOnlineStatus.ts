'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Reactive hook that tracks browser online/offline status.
 * Returns the current online state and fires callbacks on transitions.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const previousOnlineRef = useRef(isOnline);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    // Sync with actual browser state on mount
    setIsOnline(navigator.onLine);
    previousOnlineRef.current = navigator.onLine;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Track whether we just came back online
  const wasOffline = previousOnlineRef.current === false && isOnline;

  // Update the ref after rendering
  useEffect(() => {
    previousOnlineRef.current = isOnline;
  }, [isOnline]);

  return { isOnline, wasOffline };
}
