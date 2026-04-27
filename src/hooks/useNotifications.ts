'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage browser Notification API permissions.
 * Returns whether notifications are supported, the current permission state,
 * and a function to request permission.
 */
export function useNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'Notification' in window;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) return 'denied';
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      // Safari older versions use callback-based API
      return new Promise((resolve) => {
        Notification.requestPermission((result) => {
          setPermission(result);
          resolve(result);
        });
      });
    }
  }, [supported]);

  return { supported, permission, requestPermission };
}
