"use client";

import { useState, useEffect, useCallback } from "react";
import { Baby, Moon, Droplets, X, ChevronDown, ChevronUp, Pencil, Check } from "lucide-react";
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

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pct(iso: string): number {
  const d = new Date(iso);
  return ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * 100;
}

// ── Multi-day timeline chart ──────────────────────────────────────────────────

interface DayData {
  key: string;         // YYYY-MM-DD
  label: string;       // "Jun 8"
  feeds: number[];     // pct positions
  diapers: number[];   // pct positions
  sleeps: { left: number; width: number }[];
  feedCount: number;
  diaperCount: number;
  sleepMins: number;
}

function buildDayData(events: NewbornLogEvent[]): DayData[] {
  const days: Record<string, DayData> = {};

  const ensureDay = (key: string) => {
    if (!days[key]) {
      const [y, m, d] = key.split("-").map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
      days[key] = { key, label, feeds: [], diapers: [], sleeps: [], feedCount: 0, diaperCount: 0, sleepMins: 0 };
    }
    return days[key];
  };

  for (const e of events) {
    if (e.type === "feed") {
      const k = dateKey(e.timestamp);
      const day = ensureDay(k);
      day.feeds.push(pct(e.timestamp));
      day.feedCount++;
    } else if (e.type === "diaper") {
      const k = dateKey(e.timestamp);
      const day = ensureDay(k);
      day.diapers.push(pct(e.timestamp));
      day.diaperCount++;
    } else if (e.type === "sleep") {
      const startKey = dateKey(e.startTime);
      const endTime = e.endTime ?? new Date().toISOString();
      const endKey = dateKey(endTime);

      if (startKey === endKey) {
        const day = ensureDay(startKey);
        const left = pct(e.startTime);
        const rightPct = pct(endTime);
        const width = Math.max(rightPct - left, 0.5);
        day.sleeps.push({ left, width });
        day.sleepMins += (new Date(endTime).getTime() - new Date(e.startTime).getTime()) / 60000;
      } else {
        // Cross-midnight: split into two segments
        const dayStart = ensureDay(startKey);
        dayStart.sleeps.push({ left: pct(e.startTime), width: 100 - pct(e.startTime) });
        dayStart.sleepMins += (new Date(startKey + "T23:59:59").getTime() - new Date(e.startTime).getTime()) / 60000;

        const dayEnd = ensureDay(endKey);
        dayEnd.sleeps.push({ left: 0, width: pct(endTime) });
        dayEnd.sleepMins += (new Date(endTime).getTime() - new Date(endKey + "T00:00:00").getTime()) / 60000;
      }
    }
  }

  return Object.values(days).sort((a, b) => b.key.localeCompare(a.key));
}

const HOUR_LABELS = ["12a", "3", "6", "9", "12p", "3", "6", "9", "12a"];

function TimelineChart({ events }: { events: NewbornLogEvent[] }) {
  const days = buildDayData(events);
  if (days.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Hour axis */}
      <div className="flex items-center gap-1 pl-[56px] pr-[80px]">
        <div className="flex-1 relative h-3">
          {HOUR_LABELS.map((label, i) => (
            <span
              key={i}
              className="absolute text-[9px] text-stone-300 dark:text-stone-600 -translate-x-1/2"
              style={{ left: `${(i / (HOUR_LABELS.length - 1)) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Day rows */}
      {days.map(day => (
        <div key={day.key} className="flex items-center gap-1">
          {/* Date label */}
          <div className="w-[52px] shrink-0 text-right pr-1.5">
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">{day.label}</span>
          </div>

          {/* Timeline bar */}
          <div className="flex-1 relative h-6 bg-stone-50 dark:bg-stone-800/60 rounded overflow-hidden border border-stone-100 dark:border-stone-700/50">
            {/* Hour grid lines */}
            {[1,2,3,4,5,6,7].map(h => (
              <div
                key={h}
                className="absolute top-0 bottom-0 w-px bg-stone-100 dark:bg-stone-700/40"
                style={{ left: `${(h / 8) * 100}%` }}
              />
            ))}

            {/* Sleep blocks */}
            {day.sleeps.map((s, i) => (
              <div
                key={i}
                className="absolute top-1 bottom-1 bg-indigo-300 dark:bg-indigo-500/60 rounded-sm opacity-80"
                style={{ left: `${s.left}%`, width: `${Math.max(s.width, 0.8)}%` }}
              />
            ))}

            {/* Feed dots */}
            {day.feeds.map((pos, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sage-400 dark:bg-sage-500 -translate-x-1/2"
                style={{ left: `${pos}%` }}
              />
            ))}

            {/* Diaper dots */}
            {day.diapers.map((pos, i) => (
              <div
                key={i}
                className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-500 -translate-x-1/2"
                style={{ left: `${pos}%` }}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="w-[76px] shrink-0 flex items-center gap-1.5 pl-1.5">
            <span className="text-[10px] text-stone-400 tabular-nums">🤱{day.feedCount}</span>
            <span className="text-[10px] text-stone-400 tabular-nums">💧{day.diaperCount}</span>
            <span className="text-[10px] text-stone-400 tabular-nums">{(day.sleepMins / 60).toFixed(1)}h</span>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-3 pt-1 pl-[56px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-indigo-300 dark:bg-indigo-500/60" />
          <span className="text-[9px] text-stone-400">Sleep</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-sage-400" />
          <span className="text-[9px] text-stone-400">Feed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-amber-400" />
          <span className="text-[9px] text-stone-400">Diaper</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string, includeDate = false): string {
  const d = new Date(iso);
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (!includeDate) return timeStr;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + timeStr;
}

// datetime-local input format: "YYYY-MM-DDTHH:MM"
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(val: string): string {
  return new Date(val).toISOString();
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

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  event,
  onSave,
  onClose,
}: {
  event: NewbornLogEvent;
  onSave: (updated: NewbornLogEvent) => void;
  onClose: () => void;
}) {
  // Feed fields
  const [feedType, setFeedType] = useState<FeedType>(event.type === "feed" ? event.feedType : "breast-left");
  const [feedTime, setFeedTime] = useState(event.type === "feed" ? toLocalInput(event.timestamp) : "");
  const [durationMin, setDurationMin] = useState(event.type === "feed" && event.durationMin ? String(event.durationMin) : "");
  const [amountMl, setAmountMl] = useState(event.type === "feed" && event.amountMl ? String(event.amountMl) : "");

  // Sleep fields
  const [sleepStart, setSleepStart] = useState(event.type === "sleep" ? toLocalInput(event.startTime) : "");
  const [sleepEnd, setSleepEnd] = useState(event.type === "sleep" && event.endTime ? toLocalInput(event.endTime) : "");

  // Diaper fields
  const [diaperType, setDiaperType] = useState<DiaperType>(event.type === "diaper" ? event.diaperType : "wet");
  const [diaperTime, setDiaperTime] = useState(event.type === "diaper" ? toLocalInput(event.timestamp) : "");

  // Shared
  const [notes, setNotes] = useState(event.notes ?? "");

  const save = () => {
    if (event.type === "feed") {
      onSave({
        ...event,
        feedType,
        timestamp: fromLocalInput(feedTime),
        durationMin: durationMin ? parseInt(durationMin) : undefined,
        amountMl: amountMl ? parseInt(amountMl) : undefined,
        notes: notes.trim() || undefined,
      });
    } else if (event.type === "sleep") {
      onSave({
        ...event,
        startTime: fromLocalInput(sleepStart),
        endTime: sleepEnd ? fromLocalInput(sleepEnd) : undefined,
        notes: notes.trim() || undefined,
      });
    } else if (event.type === "diaper") {
      onSave({
        ...event,
        diaperType,
        timestamp: fromLocalInput(diaperTime),
        notes: notes.trim() || undefined,
      });
    }
  };

  const inputCls = "w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 dark:focus:ring-sage-600";
  const labelCls = "text-[10px] font-medium text-stone-400 uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl p-4 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Edit {event.type === "feed" ? "Feed" : event.type === "sleep" ? "Sleep" : "Diaper"}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X size={16} />
          </button>
        </div>

        {event.type === "feed" && (
          <>
            <div>
              <label className={labelCls}>Feed Type</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FEED_LABELS) as FeedType[]).map(ft => (
                  <button
                    key={ft}
                    onClick={() => setFeedType(ft)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                      feedType === ft
                        ? "bg-sage-100 text-sage-700 border-sage-300 dark:bg-sage-900/40 dark:text-sage-300 dark:border-sage-700"
                        : "bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700"
                    )}
                  >
                    {FEED_ICON[ft]} {FEED_LABELS[ft]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="datetime-local" value={feedTime} onChange={e => setFeedTime(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Duration (min)</label>
                <input type="number" min="0" placeholder="e.g. 20" value={durationMin} onChange={e => setDurationMin(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Amount (mL)</label>
                <input type="number" min="0" placeholder="e.g. 90" value={amountMl} onChange={e => setAmountMl(e.target.value)} className={inputCls} />
              </div>
            </div>
          </>
        )}

        {event.type === "sleep" && (
          <>
            <div>
              <label className={labelCls}>Start Time</label>
              <input type="datetime-local" value={sleepStart} onChange={e => setSleepStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Time</label>
              <input type="datetime-local" value={sleepEnd} onChange={e => setSleepEnd(e.target.value)} className={inputCls} />
            </div>
          </>
        )}

        {event.type === "diaper" && (
          <>
            <div>
              <label className={labelCls}>Type</label>
              <div className="flex gap-2">
                {(["wet", "dirty", "both"] as DiaperType[]).map(dt => (
                  <button
                    key={dt}
                    onClick={() => setDiaperType(dt)}
                    className={clsx(
                      "flex-1 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors",
                      diaperType === dt
                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"
                        : "bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700"
                    )}
                  >
                    {dt === "wet" ? "💧" : dt === "dirty" ? "💩" : "💧💩"} {dt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="datetime-local" value={diaperTime} onChange={e => setDiaperTime(e.target.value)} className={inputCls} />
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>Notes</label>
          <input type="text" placeholder="Optional note" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Check size={14} /> Save Changes
          </button>
          <button onClick={onClose} className="px-4 py-2 text-stone-500 text-sm hover:text-stone-700 dark:hover:text-stone-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewbornTrackerPage() {
  const [data, setData] = useState<NewbornTrackerData>({ events: [], babyName: "Baby" });
  const [now, setNow] = useState(Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingEvent, setEditingEvent] = useState<NewbornLogEvent | null>(null);

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

  const getEventTime = (e: NewbornLogEvent) => e.type === "sleep" ? e.startTime : (e as FeedEvent | DiaperEvent).timestamp;
  const allEvents = [...data.events].sort((a, b) => new Date(getEventTime(b)).getTime() - new Date(getEventTime(a)).getTime());
  const todayEvents = allEvents.filter(e => isToday(getEventTime(e)));
  const historyEvents = allEvents.filter(e => !isToday(getEventTime(e)));

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

  const saveEditedEvent = useCallback((updated: NewbornLogEvent) => {
    update(d => ({ ...d, events: d.events.map(e => e.id === updated.id ? updated : e) }));
    setEditingEvent(null);
  }, [update]);

  const saveName = () => {
    if (nameInput.trim()) update(d => ({ ...d, babyName: nameInput.trim() }));
    setEditingName(false);
  };

  return (
    <PageTransition className="max-w-2xl mx-auto pt-10 md:pt-0 pb-8">
      {editingEvent && (
        <EditModal
          event={editingEvent}
          onSave={saveEditedEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

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
              <LogRow key={event.id} event={event} onDelete={deleteEvent} onEdit={setEditingEvent} />
            ))}
          </div>
        )}
      </div>

      {/* History chart + log */}
      {allEvents.length > 0 && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">History</p>
          <TimelineChart events={allEvents} />

          {historyEvents.length > 0 && (
            <>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 pt-1"
              >
                <span>{showHistory ? "Hide" : "Show"} event log ({historyEvents.length} events)</span>
                {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showHistory && (
                <div className="divide-y divide-stone-50 dark:divide-stone-800">
                  {historyEvents.slice(0, 100).map(event => (
                    <LogRow key={event.id} event={event} onDelete={deleteEvent} onEdit={setEditingEvent} showDate />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PageTransition>
  );
}

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow({
  event,
  onDelete,
  onEdit,
  showDate = false,
}: {
  event: NewbornLogEvent;
  onDelete: (id: string) => void;
  onEdit: (e: NewbornLogEvent) => void;
  showDate?: boolean;
}) {
  const actions = (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={() => onEdit(event)}
        className="text-stone-300 hover:text-sage-500 dark:text-stone-600 dark:hover:text-sage-400 transition-colors p-1 rounded"
        aria-label="Edit"
      >
        <Pencil size={11} />
      </button>
      <button
        onClick={() => onDelete(event.id)}
        className="text-stone-300 hover:text-red-400 dark:text-stone-600 dark:hover:text-red-400 transition-colors p-1 rounded"
        aria-label="Delete"
      >
        <X size={12} />
      </button>
    </div>
  );

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
              {event.amountMl ? ` · ${event.amountMl}mL` : ""}
            </p>
          </div>
        </div>
        {actions}
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
        {actions}
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
        {actions}
      </div>
    );
  }

  return null;
}
