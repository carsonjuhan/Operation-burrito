'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const DISMISS_KEY = 'ob-install-banner-dismissed';

/**
 * Extends the standard Event with the BeforeInstallPromptEvent interface.
 * This is a Chrome/Edge-specific event not yet in the TS DOM lib.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

/**
 * Checks whether the install banner has been dismissed this session.
 */
export function isDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists the dismissal state for the current session.
 */
export function persistDismissal(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, 'true');
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}

/**
 * Checks whether the app is already running in standalone mode
 * (i.e., has been installed and launched from the home screen).
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // Standard check
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari check
  if ('standalone' in window.navigator && (window.navigator as Record<string, unknown>).standalone === true) return true;
  return false;
}

export interface InstallPromptState {
  /** Whether the install banner should be shown */
  canShow: boolean;
  /** Trigger the native install prompt */
  promptInstall: () => Promise<void>;
  /** Dismiss the banner for the session */
  dismiss: () => void;
}

/**
 * Hook that captures the `beforeinstallprompt` event and exposes
 * a controlled install prompt and dismiss mechanism.
 *
 * The banner is suppressed if:
 * - The app is already installed (standalone mode)
 * - The user dismissed it this session
 * - The `beforeinstallprompt` event has not fired
 */
export function useInstallPrompt(): InstallPromptState {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isStandalone() || isDismissed()) return;

    const handler = (e: Event) => {
      // Prevent the mini-infobar on Chrome mobile
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for successful installation
    const installedHandler = () => {
      setCanShow(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    const choice = await prompt.userChoice;

    if (choice.outcome === 'accepted') {
      setCanShow(false);
    }
    // Clear the deferred prompt regardless of outcome — it can only be used once
    deferredPromptRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    setCanShow(false);
    deferredPromptRef.current = null;
    persistDismissal();
  }, []);

  return { canShow, promptInstall, dismiss };
}
