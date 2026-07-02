"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Moon, Square, X, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useToast } from "@/contexts/ToastContext";
import type { DiaperType, FeedType, NewbornLogEvent, SleepEvent } from "@/types";
import {
  FEED_ICON,
  FEED_LABELS,
  durationStr,
  loadNewbornData,
  saveNewbornData,
  vibrate,
  NEWBORN_UPDATED_EVENT,
} from "@/lib/newbornTracker";
import {
  getActiveSleep,
  suggestedNextSide,
  startNursing,
  finishNursing,
  cancelNursing,
  restoreNursing,
  logInstantFeed,
  startSleep,
  endSleep,
  finishNursingAndStartSleep,
  logDiaper as logDiaperAction,
} from "@/lib/newbornActions";

type ActiveNursing = { feedType: FeedType; startTime: string };

const NURSING_TYPES: FeedType[] = ["breast-left", "breast-right", "both"];

/** Undo helper: put an ended sleep back into the list (endTime cleared). */
function restoreSleepIn(events: NewbornLogEvent[], sleep: SleepEvent): NewbornLogEvent[] {
  const restored: SleepEvent = { ...sleep, endTime: undefined, updatedAt: new Date().toISOString() };
  return events.map(e => (e.id === sleep.id ? restored : e));
}

export function QuickLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addToast } = useToast();
  // Snapshot of tracker state, loaded fresh each time the sheet opens
  const [suggestedSide, setSuggestedSide] = useState<FeedType | null>(null);
  const [activeSleep, setActiveSleep] = useState<SleepEvent | null>(null);
  const [activeNursing, setActiveNursing] = useState<ActiveNursing | null>(null);
  // Tick so live timer labels (nursing / sleep) update while the sheet is open
  const [, setNow] = useState(() => Date.now());
  // Two-tap confirm for "start sleep while nursing is running"
  const [sleepConfirm, setSleepConfirm] = useState(false);
  const sleepConfirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const reload = () => {
      const data = loadNewbornData();
      setSuggestedSide(suggestedNextSide(data.events));
      setActiveSleep(getActiveSleep(data.events) ?? null);
      setActiveNursing(data.activeNursing ?? null);
    };
    reload();
    // Re-check while the sheet stays open so a session ended on another
    // device (picked up by the background sync poll) clears the timer here too.
    window.addEventListener(NEWBORN_UPDATED_EVENT, reload);
    return () => window.removeEventListener(NEWBORN_UPDATED_EVENT, reload);
  }, [open]);

  // Tick every second while a timer is running so durations display live
  useEffect(() => {
    if (!open || (!activeNursing && !activeSleep)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, activeNursing, activeSleep]);

  // Reset the two-tap sleep confirm when the sheet closes; clear its timeout on unmount
  useEffect(() => {
    if (!open) setSleepConfirm(false);
    return () => {
      if (sleepConfirmTimeout.current) clearTimeout(sleepConfirmTimeout.current);
    };
  }, [open]);

  if (!open) return null;

  const nowISO = () => new Date().toISOString();

  const logFeed = (feedType: FeedType) => {
    const data = loadNewbornData();
    if (NURSING_TYPES.includes(feedType)) {
      // Nursing feeds start a live timer (matches the full tracker page)
      const { data: next, endedSleep } = startNursing(data, feedType, nowISO());
      saveNewbornData(next);
      vibrate();
      if (endedSleep) {
        addToast(`Sleep ended · ${durationStr(endedSleep.startTime)} — nursing started`, "success", {
          label: "Undo",
          onClick: () => {
            const d = loadNewbornData();
            saveNewbornData({
              ...d,
              events: restoreSleepIn(d.events, endedSleep),
              activeNursing: undefined,
              activeNursingUpdatedAt: nowISO(),
            });
          },
        });
      } else {
        addToast(`Nursing started · ${FEED_LABELS[feedType]}`, "success");
      }
      onClose();
      return;
    }
    // Bottle / formula: instant log
    const { data: next, event, endedSleep } = logInstantFeed(data, feedType, nowISO());
    saveNewbornData(next);
    vibrate();
    if (endedSleep) {
      addToast(`Sleep ended · ${durationStr(endedSleep.startTime)} — logged ${FEED_LABELS[feedType]}`, "success", {
        label: "Undo",
        onClick: () => {
          const d = loadNewbornData();
          saveNewbornData({
            ...d,
            events: restoreSleepIn(d.events.filter(e => e.id !== event.id), endedSleep),
          });
        },
      });
    } else {
      addToast(`Logged ${FEED_LABELS[feedType]}`, "success", {
        label: "Undo",
        onClick: () => {
          const d = loadNewbornData();
          saveNewbornData({ ...d, events: d.events.filter(e => e.id !== event.id) });
        },
      });
    }
    onClose();
  };

  const handleFinishNursing = () => {
    const data = loadNewbornData();
    const { data: next, event } = finishNursing(data, nowISO());
    saveNewbornData(next);
    vibrate();
    if (event) {
      const nursing: ActiveNursing = { feedType: event.feedType, startTime: event.timestamp };
      addToast(`Logged ${FEED_LABELS[event.feedType]} · ${event.durationMin}min`, "success", {
        label: "Undo",
        onClick: () => {
          const d = loadNewbornData();
          const { data: restored } = restoreNursing(
            { ...d, events: d.events.filter(e => e.id !== event.id) },
            nursing,
            nowISO()
          );
          saveNewbornData(restored);
        },
      });
    }
    onClose();
  };

  const handleCancelNursing = () => {
    const data = loadNewbornData();
    const { data: next, cancelled } = cancelNursing(data, nowISO());
    saveNewbornData(next);
    vibrate();
    if (cancelled) {
      addToast("Nursing timer cancelled", "info", {
        label: "Undo",
        onClick: () => {
          const d = loadNewbornData();
          const { data: restored } = restoreNursing(d, cancelled, nowISO());
          saveNewbornData(restored);
        },
      });
    }
    onClose();
  };

  const logDiaper = (diaperType: DiaperType) => {
    const data = loadNewbornData();
    const { data: next, event } = logDiaperAction(data, diaperType, nowISO());
    saveNewbornData(next);
    vibrate();
    addToast(`Logged ${diaperType} diaper`, "success", {
      label: "Undo",
      onClick: () => {
        const d = loadNewbornData();
        saveNewbornData({ ...d, events: d.events.filter(e => e.id !== event.id) });
      },
    });
    onClose();
  };

  const handleSleepTap = () => {
    const data = loadNewbornData();

    // End a running sleep session
    if (activeSleep) {
      const { data: next, endedSleep } = endSleep(data, activeSleep.id, nowISO());
      saveNewbornData(next);
      vibrate();
      if (endedSleep) addToast(`Sleep ended · ${durationStr(endedSleep.startTime)}`, "success");
      onClose();
      return;
    }

    // Nursing is running: two-tap confirm before finishing the feed + starting sleep
    if (data.activeNursing) {
      if (!sleepConfirm) {
        setSleepConfirm(true);
        if (sleepConfirmTimeout.current) clearTimeout(sleepConfirmTimeout.current);
        sleepConfirmTimeout.current = setTimeout(() => setSleepConfirm(false), 4000);
        return;
      }
      if (sleepConfirmTimeout.current) clearTimeout(sleepConfirmTimeout.current);
      setSleepConfirm(false);
      const { data: next, feedEvent } = finishNursingAndStartSleep(data, nowISO());
      saveNewbornData(next);
      vibrate();
      addToast(
        feedEvent
          ? `Logged ${FEED_LABELS[feedEvent.feedType]} · ${feedEvent.durationMin}min — sleep started`
          : "Sleep started",
        "success"
      );
      onClose();
      return;
    }

    // Plain start
    const { data: next, event } = startSleep(data, nowISO());
    saveNewbornData(next);
    vibrate();
    addToast("Sleep started", "success", {
      label: "Undo",
      onClick: () => {
        const d = loadNewbornData();
        saveNewbornData({ ...d, events: d.events.filter(e => e.id !== event.id) });
      },
    });
    onClose();
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
        {activeNursing ? (
          /* Live nursing timer — mirrors the tracker page hero */
          <div className="rounded-xl p-4 bg-gradient-to-br from-indigo-950 via-stone-900 to-stone-950 border border-indigo-900/50 text-white shadow-md shadow-indigo-950/20">
            <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-300/80 font-semibold">
              Nursing · {FEED_LABELS[activeNursing.feedType]} · {durationStr(activeNursing.startTime)}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleFinishNursing}
                className="flex-1 min-h-[56px] flex items-center justify-center gap-2 bg-sage-500 hover:bg-sage-600 active:bg-sage-700 text-white rounded-xl text-sm font-semibold transition-colors select-none touch-manipulation"
              >
                <Square size={13} fill="currentColor" /> Finish &amp; Log
              </button>
              <button
                onClick={handleCancelNursing}
                className="px-4 min-h-[56px] text-indigo-300/70 hover:text-indigo-200 text-sm transition-colors select-none touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
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
        )}

        {/* Sleep */}
        <button
          onClick={handleSleepTap}
          className={clsx(
            "w-full min-h-[56px] px-4 py-2 rounded-xl text-sm font-semibold border transition-all select-none touch-manipulation",
            sleepConfirm
              ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 active:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
              : activeSleep
                ? "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 active:bg-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700 shadow-sm"
                : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 active:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
          )}
        >
          <Moon size={15} className="inline mr-1.5 -mt-0.5" />
          {sleepConfirm
            ? "Nursing running — finish feed & sleep?"
            : activeSleep
              ? `End Sleep · ${durationStr(activeSleep.startTime)}`
              : "Start Sleep"}
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
