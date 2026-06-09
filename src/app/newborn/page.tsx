"use client";

import { useState, useEffect, useCallback } from "react";
import { Baby, Moon, Droplets, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import type { FeedType, DiaperType, FeedEvent, SleepEvent, DiaperEvent, NewbornLogEvent, NewbornTrackerData } from "@/types";

const STORAGE_KEY = "newborn_tracker";

function loadData(): NewbornTrackerData {
  if (typeof window === "undefined") return { events: [], babyName: "Baby" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { events: [], babyName: "Baby" };
  } catch {
    return { events: [], babyName: "Baby" };
  }
}

function saveData(data: NewbornTrackerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function timeSince(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
}

function durationStr(startIso: string, endIso?: string): string {
  const ms = (endIso ? new Date(endIso).getTime() : Date.now()) - new Date(startIso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function formatTime(iso: string, includeDate = false): string {
  const d = new Date(iso);
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (!includeDate) return timeStr;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + timeStr;
}

const FEED_LABELS: Record<FeedType, string> = {
  "breast-left": "Left Breast",
  "breast-right": "Right Breast",
  "both": "Both Breasts",
  "bottle": "Bottle (Pumped)",
  "formula": "Formula",
};

const FEED_ICON: Record<FeedType, string> = {
  "breast-left": "🤱",
  "breast-right": "🤱",
  "both": "🤱",
  "bottle": "🍼",
  "formula": "🍼",
};

export default function NewbornTrackerPage() {
  const [data, setData] = useState<NewbornTrackerData>({ events: [], babyName: "Baby" });
  const [now, setNow] = useState(Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => { setData(loadData()); }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const update = useCallback((fn: (d: NewbornTrackerData) => NewbornTrackerData) => {
    setData(prev => {
      const next = fn(prev);
      saveData(next);
      return next;
    });
  }, []);

  // Sort events newest first
  const getEventTime = (e: NewbornLogEvent) => e.type === "sleep" ? e.startTime : (e as FeedEvent | DiaperEvent).timestamp;
  const allEvents = [...data.events].sort((a, b) => new Date(getEventTime(b)).getTime() - new Date(getEventTime(a)).getTime());
  const todayEvents = allEvents.filter(e => isToday(getEventTime(e)));
  const historyEvents = allEvents.filter(e => !isToday(getEventTime(e)));

  // Derived status
  const lastFeed = allEvents.find(e => e.type === "feed") as FeedEvent | undefined;
  const activeSleep = allEvents.find(e => e.type === "sleep" && !(e as SleepEvent).endTime) as SleepEvent | undefined;
  const lastEndedSleep = allEvents.find(e => e.type === "sleep" && !!(e as SleepEvent).endTime) as SleepEvent | undefined;

  const todayFeedings = todayEvents.filter(e => e.type === "feed").length;
  const todayDiapers = todayEvents.filter(e => e.type === "diaper").length;
  const todaySleepMins = (todayEvents.filter(e => e.type === "sleep") as SleepEvent[]).reduce((acc, s) => {
    const ms = (s.endTime ? new Date(s.endTime).getTime() : now) - new Date(s.startTime).getTime();
    return acc + ms / 60000;
  }, 0);

  const logFeed = (feedType: FeedType) => {
    update(d => ({
      ...d,
      events: [...d.events, { id: Date.now().toString(), type: "feed", timestamp: new Date().toISOString(), feedType } as FeedEvent],
    }));
  };

  const toggleSleep = () => {
    if (activeSleep) {
      update(d => ({
        ...d,
        events: d.events.map(e => e.id === activeSleep.id ? { ...e, endTime: new Date().toISOString() } : e),
      }));
    } else {
      update(d => ({
        ...d,
        events: [...d.events, { id: Date.now().toString(), type: "sleep", startTime: new Date().toISOString() } as SleepEvent],
      }));
    }
  };

  const logDiaper = (diaperType: DiaperType) => {
    update(d => ({
      ...d,
      events: [...d.events, { id: Date.now().toString(), type: "diaper", timestamp: new Date().toISOString(), diaperType } as DiaperEvent],
    }));
  };

  const deleteEvent = (id: string) => {
    update(d => ({ ...d, events: d.events.filter(e => e.id !== id) }));
  };

  const saveName = () => {
    if (nameInput.trim()) update(d => ({ ...d, babyName: nameInput.trim() }));
    setEditingName(false);
  };

  return (
    <PageTransition className="max-w-2xl mx-auto pt-10 md:pt-0 pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Baby size={20} className="text-sage-600" />
          <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-stone-100">
            Newborn Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {editingName ? (
            <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Baby's name"
                className="input text-sm py-1 px-2 w-32"
              />
              <button type="submit" className="text-xs text-sage-600 font-medium hover:underline">Save</button>
              <button type="button" onClick={() => setEditingName(false)} className="text-xs text-stone-400 hover:underline">Cancel</button>
            </form>
          ) : (
            <button onClick={() => { setNameInput(data.babyName); setEditingName(true); }} className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
              Tracking: <span className="font-medium text-stone-600 dark:text-stone-300">{data.babyName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Last Feed</p>
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200 leading-tight">
            {lastFeed ? timeSince(lastFeed.timestamp, now) : "—"}
          </p>
          {lastFeed && (
            <p className="text-[10px] text-stone-400 mt-0.5">{FEED_LABELS[lastFeed.feedType]}</p>
          )}
        </div>

        <div className={clsx(
          "card p-3 text-center transition-colors",
          activeSleep && "border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30"
        )}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Sleep</p>
          {activeSleep ? (
            <>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-300 leading-tight">Sleeping</p>
              <p className="text-[10px] text-indigo-400 mt-0.5">{durationStr(activeSleep.startTime)}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-stone-700 dark:text-stone-200 leading-tight">Awake</p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {lastEndedSleep ? `since ${formatTime(lastEndedSleep.endTime!)}` : "—"}
              </p>
            </>
          )}
        </div>

        <div className="card p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Today</p>
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200 leading-tight">
            {todayFeedings}🤱 {todayDiapers}💧
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            {(todaySleepMins / 60).toFixed(1)}h sleep
          </p>
        </div>
      </div>

      {/* Quick Log */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">Quick Log</p>

        {/* Feeding */}
        <div className="mb-4">
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2 flex items-center gap-1">
            🤱 Feeding
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FEED_LABELS) as FeedType[]).map(ft => (
              <button
                key={ft}
                onClick={() => logFeed(ft)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-sage-50 text-sage-700 hover:bg-sage-100 active:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50 border border-sage-200 dark:border-sage-800 transition-colors"
              >
                {FEED_ICON[ft]} {FEED_LABELS[ft]}
              </button>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <div className="mb-4">
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">🌙 Sleep</p>
          <button
            onClick={toggleSleep}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-semibold border transition-all",
              activeSleep
                ? "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700 shadow-sm"
                : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
            )}
          >
            <Moon size={12} className="inline mr-1.5 -mt-0.5" />
            {activeSleep
              ? `End Sleep · ${durationStr(activeSleep.startTime)}`
              : "Start Sleep"}
          </button>
        </div>

        {/* Diaper */}
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">💧 Diaper</p>
          <div className="flex flex-wrap gap-2">
            {(["wet", "dirty", "both"] as DiaperType[]).map(dt => (
              <button
                key={dt}
                onClick={() => logDiaper(dt)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors capitalize"
              >
                {dt === "wet" ? "💧" : dt === "dirty" ? "💩" : "💧💩"} {dt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Log */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
          Today&apos;s Log
          {todayEvents.length > 0 && (
            <span className="ml-1.5 text-stone-400 normal-case font-normal">({todayEvents.length} events)</span>
          )}
        </p>
        {todayEvents.length === 0 ? (
          <div className="text-center py-6">
            <Baby size={28} className="mx-auto mb-2 text-stone-200 dark:text-stone-700" />
            <p className="text-sm text-stone-400">No events logged today. Use Quick Log above to start tracking.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50 dark:divide-stone-800">
            {todayEvents.map(event => (
              <LogRow key={event.id} event={event} onDelete={deleteEvent} />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {historyEvents.length > 0 && (
        <div className="card p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide"
          >
            <span>Previous Days ({historyEvents.length} events)</span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showHistory && (
            <div className="mt-3 divide-y divide-stone-50 dark:divide-stone-800">
              {historyEvents.slice(0, 100).map(event => (
                <LogRow key={event.id} event={event} onDelete={deleteEvent} showDate />
              ))}
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}

function LogRow({
  event,
  onDelete,
  showDate = false,
}: {
  event: NewbornLogEvent;
  onDelete: (id: string) => void;
  showDate?: boolean;
}) {
  if (event.type === "feed") {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{FEED_ICON[event.feedType]}</span>
          <div>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-200">{FEED_LABELS[event.feedType]}</p>
            <p className="text-[10px] text-stone-400">
              {formatTime(event.timestamp, showDate)}
              {event.durationMin ? ` · ${event.durationMin}min` : ""}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(event.id)} className="text-stone-300 hover:text-red-400 transition-colors p-1 rounded">
          <X size={12} />
        </button>
      </div>
    );
  }

  if (event.type === "sleep") {
    const dur = event.endTime ? durationStr(event.startTime, event.endTime) : null;
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <Moon size={15} className={clsx("shrink-0", event.endTime ? "text-indigo-300" : "text-indigo-500")} />
          <div>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-200">
              Sleep {dur ? <span className="text-stone-400 font-normal">({dur})</span> : <span className="text-indigo-500 font-normal">(ongoing)</span>}
            </p>
            <p className="text-[10px] text-stone-400">
              {formatTime(event.startTime, showDate)}{event.endTime ? ` → ${formatTime(event.endTime)}` : ""}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(event.id)} className="text-stone-300 hover:text-red-400 transition-colors p-1 rounded">
          <X size={12} />
        </button>
      </div>
    );
  }

  if (event.type === "diaper") {
    const icon = event.diaperType === "wet" ? "💧" : event.diaperType === "dirty" ? "💩" : "💧💩";
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{icon}</span>
          <div>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-200 capitalize">Diaper — {event.diaperType}</p>
            <p className="text-[10px] text-stone-400">{formatTime(event.timestamp, showDate)}</p>
          </div>
        </div>
        <button onClick={() => onDelete(event.id)} className="text-stone-300 hover:text-red-400 transition-colors p-1 rounded">
          <X size={12} />
        </button>
      </div>
    );
  }

  return null;
}
