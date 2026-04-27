"use client";

import { useToast, type ToastVariant } from "@/contexts/ToastContext";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import clsx from "clsx";

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; text: string; icon: typeof Info }> = {
  success: { bg: "bg-emerald-50 dark:bg-emerald-950", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-800 dark:text-emerald-300", icon: CheckCircle2 },
  error: { bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", text: "text-red-800 dark:text-red-300", icon: AlertCircle },
  warning: { bg: "bg-amber-50 dark:bg-amber-950", border: "border-amber-200 dark:border-amber-800", text: "text-amber-800 dark:text-amber-300", icon: AlertTriangle },
  info: { bg: "bg-sky-50 dark:bg-sky-950", border: "border-sky-200 dark:border-sky-800", text: "text-sky-800 dark:text-sky-300", icon: Info },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const style = VARIANT_STYLES[toast.variant];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={clsx(
              "flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right",
              style.bg,
              style.border
            )}
            role="alert"
          >
            <Icon size={16} className={clsx(style.text, "mt-0.5 shrink-0")} />
            <div className="flex-1 min-w-0">
              <p className={clsx("text-sm", style.text)}>{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    removeToast(toast.id);
                  }}
                  className={clsx("text-xs font-semibold underline mt-1", style.text)}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={clsx("shrink-0 mt-0.5", style.text, "opacity-60 hover:opacity-100")}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
