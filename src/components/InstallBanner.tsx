'use client';

import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

/**
 * A dismissible banner that prompts the user to install the PWA.
 * Only renders when the browser fires `beforeinstallprompt`.
 */
export function InstallBanner() {
  const { canShow, promptInstall, dismiss } = useInstallPrompt();

  if (!canShow) return null;

  return (
    <div
      role="banner"
      aria-label="Install app prompt"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 z-50 animate-slide-up"
    >
      <div className="card p-4 shadow-lg border-sage-200 flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sage-100 flex items-center justify-center">
          <Download className="w-5 h-5 text-sage-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800">
            Install Operation Burrito
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            Add to your home screen for quick access and offline use.
          </p>
          <button
            onClick={promptInstall}
            className="btn-primary mt-2 text-xs px-3 py-1.5 min-h-[36px]"
            aria-label="Install the app"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-stone-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4 text-stone-400" />
        </button>
      </div>
    </div>
  );
}
