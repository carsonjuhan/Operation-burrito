'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Fixed banner that appears at the top of the viewport when offline.
 * Uses role="alert" so screen readers announce the status change.
 */
export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md z-[100]"
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>You are offline. Changes will sync when connectivity returns.</span>
    </div>
  );
}
