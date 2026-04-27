"use client";

import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

interface PageErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function PageErrorFallback({ error, reset }: PageErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="card max-w-md w-full p-8 text-center space-y-5">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-blush-50 flex items-center justify-center">
            <AlertTriangle size={28} className="text-blush-500" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-800">
            Something went wrong
          </h2>
          <p className="text-sm text-stone-500">
            An unexpected error occurred while loading this page.
            Your data is safe -- try reloading or go back to the dashboard.
          </p>
        </div>

        {/* Error details (development aid) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="bg-stone-50 rounded-lg p-3 text-left">
            <p className="text-xs font-mono text-stone-500 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="btn-primary"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            <RefreshCw size={16} />
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
