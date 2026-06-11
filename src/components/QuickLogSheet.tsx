"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, X, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useToast } from "@/contexts/ToastContext";
import type { DiaperType, FeedEvent, FeedType, NewbornLogEvent, SleepEvent, DiaperEvent } from "@/types";
import {
  FEED_ICON,
  FEED_LABELS,
  durationStr,
  loadNewbornData,
  saveNewbornData,
  vibrate,
} from "@/lib/newbornTracker";

export function QuickLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addToast } = useToast();
  // Snapshot of tracker state, loaded fresh each time the sheet opens
  const [suggestedSide, setSuggestedSide] = useState<FeedType | null>(null);
  const [activeSleep, setActiveSleep] = useState<SleepEvent | null>(null);

  useEffect(() => {
    if (!open) return;
    const data = loadNewbornData();
    const byTimeDesc = [...data.events].sort((a, b) => {
      const ta = a.type === "sleep" ? a.startTime : a.timestamp;
      const tb = b.type === "sleep" ? b.startTime : b.timestamp;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
    const lastNursing = byTimeDesc.find(
      e => e.type === "feed" && ["breast-left", "breast-right"].includes((e as FeedEvent).feedType)
    ) as FeedEvent | undefined;
    setSuggestedSide(lastNursing ? (lastNursing.feedType === "breast-left" ? "breast-right" : "breast-left") : null);
    const sleeping = byTimeDesc.find(e => e.type === "sleep" && !(e as SleepEvent).endTime) as SleepEvent | undefined;
    setActiveSleep(sleeping ?? null);
  }, [open]);

  if (!open) return null;

  const appendEvent = (event: NewbornLogEvent, message: string) => {
    const data = loadNewbornData();
    saveNewbornData({ ...data, events: [...data.events, event] });
    vibrate();
    addToast(message, "success", {
      label: "Undo",
      onClick: () => {
        const d = loadNewbornData();
        saveNewbornData({ ...d, events: d.events.filter(e => e.id !== event.id) });
      },
    });
    onClose();
  };

  const logFeed = (feedType: FeedType) => {
    appendEvent(
      { id: Date.now().toString(), type: "feed", timestamp: new Date().toISOString(), feedType } as FeedEvent,
      `Logged ${FEED_LABELS[feedType]}`
    );
  };

  const logDiaper = (diaperType: DiaperType) => {
    appendEvent(
      { id: Date.now().toString(), type: "diaper", timestamp: new Date().toISOString(), diaperType } as DiaperEvent,
      `Logged ${diaperType} diaper`
    );
  };

  const toggleSleep = () => {
    const data = loadNewbornData();
    if (activeSleep) {
      saveNewbornData({
        ...data,
        events: data.events.map(e => e.id === activeSleep.id ? { ...e, endTime: new Date().toISOString() } : e),
      });
      vibrate();
      addToast(`Sleep ended · ${durationStr(activeSleep.startTime)}`, "success");
      onClose();
    } else {
      appendEvent(
        { id: Date.now().toString(), type: "sleep", startTime: new Date().toISOString() } as SleepEvent,
        "Sleep started"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-stone-900 rounded-t-2xl shadow-2xl p-4 space-y-4 animate-slide-up"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle + header */}
        <div className="flex flex-col items-center -mt-1">
          <div className="w-9 h-1 rounded-full bg-stone-200 dark:bg-stone-700 mb-3" />
          <div className="w-full flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Quick Log</h3>
            <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Feeding */}
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">
            🤱 Feeding
            {suggestedSide && (
              <span className="text-sage-500 dark:text-sage-400 font-medium">
                {" "}· {suggestedSide === "breast-left" ? "left" : "right"} side next
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FEED_LABELS) as FeedType[]).map(ft => (
              <button
                key={ft}
                onClick={() => logFeed(ft)}
                className={clsx(
                  "relative min-h-[56px] px-3 py-2 rounded-xl text-sm font-medium border transition-colors select-none touch-manipulation",
                  "bg-sage-50 text-sage-700 hover:bg-sage-100 active:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50 border-sage-200 dark:border-sage-800",
                  ft === suggestedSide && "ring-2 ring-sage-400 dark:ring-sage-500 border-transparent",
                  ft === "formula" && "col-span-2"
                )}
              >
                {FEED_ICON[ft]} {FEED_LABELS[ft]}
                {ft === suggestedSide && (
                  <span className="absolute top-1 right-1.5 text-[9px] font-semibold uppercase tracking-wide text-sage-500 dark:text-sage-400">next</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <button
          onClick={toggleSleep}
          className={clsx(
            "w-full min-h-[56px] px-4 py-2 rounded-xl text-sm font-semibold border transition-all select-none touch-manipulation",
            activeSleep
              ? "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 active:bg-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700 shadow-sm"
              : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 active:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
          )}
        >
          <Moon size={15} className="inline mr-1.5 -mt-0.5" />
          {activeSleep ? `End Sleep · ${durationStr(activeSleep.startTime)}` : "Start Sleep"}
        </button>

        {/* Diaper */}
        <div className="grid grid-cols-3 gap-2">
          {(["wet", "dirty", "both"] as DiaperType[]).map(dt => (
            <button
              key={dt}
              onClick={() => logDiaper(dt)}
              className="min-h-[56px] px-3 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors capitalize select-none touch-manipulation"
            >
              {dt === "wet" ? "💧" : dt === "dirty" ? "💩" : "💧💩"} {dt}
            </button>
          ))}
        </div>

        <Link
          href="/newborn"
          onClick={onClose}
          className="flex items-center justify-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 pt-1"
        >
          Open full tracker <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
