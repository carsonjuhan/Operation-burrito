"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Baby, Moon, Sun, X, ChevronDown, ChevronUp, Pencil, Check, Square, Stethoscope, LineChart, Pill, Bell, BellOff, Settings2 } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import { SleepTrainingPanel } from "@/components/SleepTrainingPanel";
import { useToast } from "@/contexts/ToastContext";
import { useStoreContext } from "@/contexts/StoreContext";
import { useNotifications } from "@/hooks/useNotifications";
import { getLastSynced, getPAT, getGistId } from "@/lib/gistSync";
import { relativeTime } from "@/lib/conflictDetection";
import {
  DEFAULT_REMINDER_SETTINGS,
  feedAnchorMs,
  countFeedSessions,
  unlockAudio,
  playAlertSound,
} from "@/lib/reminderTimers";
import type { FeedType, DiaperType, FeedEvent, SleepEvent, DiaperEvent, MedEvent, NewbornLogEvent, NewbornTrackerData } from "@/types";
import {
  FEED_ICON,
  FEED_LABELS,
  NEWBORN_UPDATED_EVENT,
  durationStr,
  loadNewbornData as loadData,
  saveNewbornData as saveData,
  vibrate,
} from "@/lib/newbornTracker";

const NIGHT_MODE_KEY = "nb-night-mode";

// Live timer display: "4:32"
function clockStr(startIso: string, now: number): string {
  const secs = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Countdown label for a reminder timer: "in 1h 23m", "5m overdue", "due now"
function dueLabel(dueAt: number, now: number): { text: string; overdue: boolean } {
  const ms = dueAt - now;
  const overdue = ms <= 0;
  const totalMin = Math.floor(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const hm = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return {
    text: overdue ? (totalMin === 0 ? "due now" : `${hm} overdue`) : `in ${hm}`,
    overdue,
  };
}

// Feed window status: before it opens, open, or overdue past the max.
function feedWindowLabel(start: number, end: number, now: number): { text: string; tone: "wait" | "open" | "overdue" } {
  const fmt = (ms: number) => {
    const min = Math.floor(Math.abs(ms) / 60000);
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  if (now < start) return { text: `in ${fmt(start - now)}`, tone: "wait" };
  if (now <= end) return { text: `now · ${fmt(end - now)} left`, tone: "open" };
  return { text: `${fmt(now - end)} overdue`, tone: "overdue" };
}

// First-week diaper expectations (day of life → minimum wet / dirty)
function diaperExpectation(dayOfLife: number): { wet: number; dirty: number } | null {
  if (dayOfLife < 1 || dayOfLife > 7) return null;
  return { wet: Math.min(dayOfLife, 6), dirty: dayOfLife <= 2 ? 1 : 3 };
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
  feedTimes: number[]; // raw ms, for session clustering
  diapers: number[];   // pct positions
  sleeps: { left: number; width: number }[];
  feedCount: number;   // feeding sessions (left+right within 30min = 1)
  diaperCount: number;
  sleepMins: number;
}

function buildDayData(events: NewbornLogEvent[]): DayData[] {
  const days: Record<string, DayData> = {};

  const ensureDay = (key: string) => {
    if (!days[key]) {
      const [y, m, d] = key.split("-").map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
      days[key] = { key, label, feeds: [], feedTimes: [], diapers: [], sleeps: [], feedCount: 0, diaperCount: 0, sleepMins: 0 };
    }
    return days[key];
  };

  for (const e of events) {
    if (e.type === "feed") {
      const k = dateKey(e.timestamp);
      const day = ensureDay(k);
      day.feeds.push(pct(e.timestamp));
      day.feedTimes.push(new Date(e.timestamp).getTime());
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

  for (const day of Object.values(days)) {
    day.feedCount = countFeedSessions(day.feedTimes);
  }
  return Object.values(days).sort((a, b) => b.key.localeCompare(a.key));
}

// ── Daily trends bar chart (sleep hours / feed count / diaper count) ──────────

function DailyTrendsChart({ events }: { events: NewbornLogEvent[] }) {
  const days = buildDayData(events).slice(0, 14).reverse(); // ascending, most recent 14
  if (days.length < 2) return null;

  const maxSleepH = Math.max(...days.map(d => d.sleepMins / 60), 1);
  const maxFeeds = Math.max(...days.map(d => d.feedCount), 1);
  const maxDiapers = Math.max(...days.map(d => d.diaperCount), 1);

  return (
    <div>
      <div className="flex items-end gap-1.5 h-[90px]">
        {days.map(day => (
          <div
            key={day.key}
            className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
            title={`${day.label}: ${(day.sleepMins / 60).toFixed(1)}h sleep, ${day.feedCount} feeds, ${day.diaperCount} diapers`}
          >
            <div className="flex items-end gap-0.5 h-full w-full justify-center">
              <div
                className="w-1.5 bg-indigo-300 dark:bg-indigo-500/60 rounded-t-sm min-h-[2px]"
                style={{ height: `${Math.max((day.sleepMins / 60 / maxSleepH) * 100, day.sleepMins > 0 ? 3 : 0)}%` }}
              />
              <div
                className="w-1.5 bg-sage-400 dark:bg-sage-500 rounded-t-sm min-h-[2px]"
                style={{ height: `${Math.max((day.feedCount / maxFeeds) * 100, day.feedCount > 0 ? 3 : 0)}%` }}
              />
              <div
                className="w-1.5 bg-amber-400 dark:bg-amber-500 rounded-t-sm min-h-[2px]"
                style={{ height: `${Math.max((day.diaperCount / maxDiapers) * 100, day.diaperCount > 0 ? 3 : 0)}%` }}
              />
            </div>
            <span className="text-[8px] text-stone-400 dark:text-stone-500 whitespace-nowrap">
              {day.label.split(" ")[1]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-indigo-300 dark:bg-indigo-500/60" />
          <span className="text-[9px] text-stone-400">Sleep (h)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-sage-400" />
          <span className="text-[9px] text-stone-400">Feeds</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-amber-400" />
          <span className="text-[9px] text-stone-400">Diapers</span>
        </div>
      </div>
    </div>
  );
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

  // Med fields
  const [medName, setMedName] = useState(event.type === "med" ? (event.medName ?? "") : "");
  const [medTime, setMedTime] = useState(event.type === "med" ? toLocalInput(event.timestamp) : "");

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
    } else if (event.type === "med") {
      onSave({
        ...event,
        medName: medName.trim() || undefined,
        timestamp: fromLocalInput(medTime),
        notes: notes.trim() || undefined,
      });
    }
  };

  const inputCls = "w-full px-2.5 py-2 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 dark:focus:ring-sage-600" + " text-[16px]"; // 16px prevents iOS zoom
  const labelCls = "text-[10px] font-medium text-stone-400 uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 space-y-3"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Edit {event.type === "feed" ? "Feed" : event.type === "sleep" ? "Sleep" : event.type === "med" ? "Medication" : "Diaper"}
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

        {event.type === "med" && (
          <>
            <div>
              <label className={labelCls}>Medication</label>
              <input type="text" placeholder="e.g. Vitamin D, Tylenol" value={medName} onChange={e => setMedName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="datetime-local" value={medTime} onChange={e => setMedTime(e.target.value)} className={inputCls} />
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
  const { addToast } = useToast();
  const [data, setData] = useState<NewbornTrackerData>({ events: [], babyName: "Baby" });
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<"log" | "trends" | "sleep">("log");
  const [showHistory, setShowHistory] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingEvent, setEditingEvent] = useState<NewbornLogEvent | null>(null);

  const { store, updateReminderSettings } = useStoreContext();
  const [nightMode, setNightMode] = useState(false);
  const [syncedAgo, setSyncedAgo] = useState("");
  // Synced across devices via the AppStore (see hooks/useStore.ts) so e.g.
  // changing the med interval on one phone updates the other.
  const reminders = store.reminderSettings ?? DEFAULT_REMINDER_SETTINGS;
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const { permission: notifPermission, requestPermission } = useNotifications();
  // Track which due-time we've already alerted for, so each cycle alerts once
  const alertedFeedRef = useRef<number>(0);
  const alertedMedRef = useRef<number>(0);

  const updateReminders = updateReminderSettings;

  useEffect(() => { setData(loadData()); }, []);
  useEffect(() => {
    setNightMode(localStorage.getItem(NIGHT_MODE_KEY) === "1");
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  // Fast tick while a nursing timer is running
  useEffect(() => {
    if (!data.activeNursing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data.activeNursing]);
  // Reload when the Quick Log sheet writes events from another page/component
  useEffect(() => {
    const reload = () => setData(loadData());
    window.addEventListener(NEWBORN_UPDATED_EVENT, reload);
    return () => window.removeEventListener(NEWBORN_UPDATED_EVENT, reload);
  }, []);
  // Sync trust indicator — refresh with the clock tick
  useEffect(() => {
    if (!(getPAT() && getGistId())) { setSyncedAgo(""); return; }
    const last = getLastSynced();
    setSyncedAgo(last ? relativeTime(last) : "never");
  }, [now]);

  // Night mode: force dark theme + warm dim overlay while enabled
  const toggleNightMode = useCallback(() => {
    setNightMode(prev => {
      const next = !prev;
      localStorage.setItem(NIGHT_MODE_KEY, next ? "1" : "0");
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        // Restore the user's normal theme preference
        try {
          const t = localStorage.getItem("theme");
          const dark = t === "dark" || (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
          document.documentElement.classList.toggle("dark", dark);
        } catch { /* keep dark */ }
      }
      return next;
    });
  }, []);
  useEffect(() => {
    if (nightMode) document.documentElement.classList.add("dark");
  }, [nightMode]);

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
  // Suggest alternating breast side based on the last nursing feed
  const lastNursing = allEvents.find(e => e.type === "feed" && ["breast-left", "breast-right"].includes((e as FeedEvent).feedType)) as FeedEvent | undefined;
  const suggestedSide: FeedType | null = lastNursing
    ? (lastNursing.feedType === "breast-left" ? "breast-right" : "breast-left")
    : null;
  const activeSleep = allEvents.find(e => e.type === "sleep" && !(e as SleepEvent).endTime) as SleepEvent | undefined;
  const lastEndedSleep = allEvents.find(e => e.type === "sleep" && !!(e as SleepEvent).endTime) as SleepEvent | undefined;
  const lastMed = allEvents.find(e => e.type === "med") as MedEvent | undefined;

  // Feed window: anchored to the FIRST feed of the latest cluster (so logging
  // both breasts in one session doesn't push the next feed out). Window opens
  // at feedMinHours and is "overdue" past feedMaxHours.
  const feedAnchor = reminders.feedEnabled
    ? feedAnchorMs(allEvents.filter(e => e.type === "feed").map(e => new Date((e as FeedEvent).timestamp).getTime()))
    : null;
  const feedWindowStart = feedAnchor !== null ? feedAnchor + reminders.feedMinHours * 3600_000 : null;
  const feedWindowEnd = feedAnchor !== null ? feedAnchor + reminders.feedMaxHours * 3600_000 : null;
  const medDueAt = reminders.medEnabled && lastMed
    ? new Date(lastMed.timestamp).getTime() + reminders.medHours * 3600_000
    : null;

  // Fast tick while a sleep timer is running OR a reminder is active, so the
  // counter ticks live and we catch the due moment within a second.
  useEffect(() => {
    if (!activeSleep && feedWindowStart === null && medDueAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSleep?.id, feedWindowStart, medDueAt]);

  // Fire the alert (sound + vibrate + notification) once when a timer comes due
  useEffect(() => {
    const fire = (label: string) => {
      if (reminders.soundEnabled) playAlertSound();
      vibrate();
      if (notifPermission === "granted") {
        try { new Notification(label, { body: "Tap to open Operation Burrito", tag: label }); } catch { /* ignore */ }
      }
      addToast(label, "info");
    };
    // Feed alert fires when the window opens (feedMinHours since the cluster start)
    if (feedWindowStart !== null && now >= feedWindowStart && alertedFeedRef.current !== feedWindowStart) {
      alertedFeedRef.current = feedWindowStart;
      fire("🍼 Feed window open");
    }
    if (medDueAt !== null && now >= medDueAt && alertedMedRef.current !== medDueAt) {
      alertedMedRef.current = medDueAt;
      fire("💊 Meds due");
    }
  }, [now, feedWindowStart, medDueAt, reminders.soundEnabled, notifPermission, addToast]);

  const todayFeedings = todayEvents.filter(e => e.type === "feed").length;
  const todayDiapers = todayEvents.filter(e => e.type === "diaper").length;
  const todaySleepMins = (todayEvents.filter(e => e.type === "sleep") as SleepEvent[]).reduce((acc, s) => {
    const ms = (s.endTime ? new Date(s.endTime).getTime() : now) - new Date(s.startTime).getTime();
    return acc + ms / 60000;
  }, 0);

  // ── Pediatrician summary: last 24h and 7-day daily averages ─────────────
  const sleepMinsInWindow = (events: SleepEvent[], cutoff: number) =>
    events.reduce((acc, s) => {
      const start = Math.max(new Date(s.startTime).getTime(), cutoff);
      const end = s.endTime ? new Date(s.endTime).getTime() : now;
      return end > start ? acc + (end - start) / 60000 : acc;
    }, 0);

  const cutoff24 = now - 24 * 3600e3;
  const cutoff7d = now - 7 * 24 * 3600e3;
  const within = (e: NewbornLogEvent, cutoff: number) => new Date(getEventTime(e)).getTime() >= cutoff;
  const ev24 = allEvents.filter(e => within(e, cutoff24));
  const ev7d = allEvents.filter(e => within(e, cutoff7d));
  const stats24 = {
    feeds: countFeedSessions(ev24.filter(e => e.type === "feed").map(e => new Date((e as FeedEvent).timestamp).getTime())),
    wet: ev24.filter(e => e.type === "diaper" && ["wet", "both"].includes((e as DiaperEvent).diaperType)).length,
    dirty: ev24.filter(e => e.type === "diaper" && ["dirty", "both"].includes((e as DiaperEvent).diaperType)).length,
    sleepH: sleepMinsInWindow(ev24.filter(e => e.type === "sleep") as SleepEvent[], cutoff24) / 60,
  };
  const oldest7d = ev7d.length ? new Date(getEventTime(ev7d[ev7d.length - 1])).getTime() : now;
  const trackedDays = Math.min(7, Math.max(1, (now - oldest7d) / (24 * 3600e3)));
  const stats7d = {
    feedsPerDay: countFeedSessions(ev7d.filter(e => e.type === "feed").map(e => new Date((e as FeedEvent).timestamp).getTime())) / trackedDays,
    diapersPerDay: ev7d.filter(e => e.type === "diaper").length / trackedDays,
    sleepHPerDay: sleepMinsInWindow(ev7d.filter(e => e.type === "sleep") as SleepEvent[], cutoff7d) / 60 / trackedDays,
  };

  // Day of life from due date (first week diaper guidance)
  const dueDateStr = store.birthPlan?.personalInfo?.dueDate;
  const dayOfLife = (() => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr); due.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = Math.round((t.getTime() - due.getTime()) / (24 * 3600e3)) + 1;
    return d >= 1 ? d : null;
  })();
  const expectation = dayOfLife ? diaperExpectation(dayOfLife) : null;

  const deleteEvent = useCallback((id: string) => {
    update(d => ({ ...d, events: d.events.filter(e => e.id !== id) }));
  }, [update]);

  // Row deletes get an undo toast since there's no confirmation step
  const deleteEventWithUndo = useCallback((id: string) => {
    let removed: NewbornLogEvent | undefined;
    update(d => {
      removed = d.events.find(e => e.id === id);
      return { ...d, events: d.events.filter(e => e.id !== id) };
    });
    if (removed) {
      const event = removed;
      addToast("Event deleted", "info", {
        label: "Undo",
        onClick: () => update(d => ({ ...d, events: [...d.events, event] })),
      });
    }
  }, [update, addToast]);

  const logFeed = (feedType: FeedType) => {
    unlockAudio(); // prime audio within this tap so the timer can beep later
    // Nursing feeds start a live timer; bottle/formula log instantly
    if (feedType === "breast-left" || feedType === "breast-right" || feedType === "both") {
      const startTime = new Date().toISOString();
      update(d => ({ ...d, activeNursing: { feedType, startTime }, activeNursingUpdatedAt: startTime }));
      vibrate();
      return;
    }
    const id = Date.now().toString();
    update(d => ({
      ...d,
      events: [...d.events, { id, type: "feed", timestamp: new Date().toISOString(), feedType, updatedAt: new Date().toISOString() } as FeedEvent],
    }));
    vibrate();
    addToast(`Logged ${FEED_LABELS[feedType]}`, "success", { label: "Undo", onClick: () => deleteEvent(id) });
  };

  const finishNursing = () => {
    const nursing = data.activeNursing;
    if (!nursing) return;
    const id = Date.now().toString();
    const durationMin = Math.max(1, Math.round((Date.now() - new Date(nursing.startTime).getTime()) / 60000));
    update(d => ({
      ...d,
      activeNursing: undefined,
      activeNursingUpdatedAt: new Date().toISOString(),
      events: [...d.events, {
        id, type: "feed", timestamp: nursing.startTime, feedType: nursing.feedType, durationMin, updatedAt: new Date().toISOString(),
      } as FeedEvent],
    }));
    vibrate();
    addToast(`Logged ${FEED_LABELS[nursing.feedType]} · ${durationMin}min`, "success", { label: "Undo", onClick: () => deleteEvent(id) });
  };

  const cancelNursing = () => {
    const nursing = data.activeNursing;
    if (!nursing) return;
    update(d => ({ ...d, activeNursing: undefined, activeNursingUpdatedAt: new Date().toISOString() }));
    addToast("Nursing timer cancelled", "info", {
      label: "Undo",
      onClick: () => update(d => ({ ...d, activeNursing: nursing, activeNursingUpdatedAt: new Date().toISOString() })),
    });
  };

  const toggleSleep = () => {
    vibrate();
    if (activeSleep) {
      update(d => ({
        ...d,
        events: d.events.map(e => e.id === activeSleep.id ? { ...e, endTime: new Date().toISOString(), updatedAt: new Date().toISOString() } : e),
      }));
      addToast(`Sleep ended · ${durationStr(activeSleep.startTime)}`, "success");
    } else {
      const id = Date.now().toString();
      update(d => ({
        ...d,
        events: [...d.events, { id, type: "sleep", startTime: new Date().toISOString(), updatedAt: new Date().toISOString() } as SleepEvent],
      }));
      addToast("Sleep started", "success", { label: "Undo", onClick: () => deleteEvent(id) });
    }
  };

  const logDiaper = (diaperType: DiaperType) => {
    const id = Date.now().toString();
    update(d => ({
      ...d,
      events: [...d.events, { id, type: "diaper", timestamp: new Date().toISOString(), diaperType, updatedAt: new Date().toISOString() } as DiaperEvent],
    }));
    vibrate();
    addToast(`Logged ${diaperType} diaper`, "success", { label: "Undo", onClick: () => deleteEvent(id) });
  };

  const logMed = () => {
    unlockAudio(); // prime audio within this tap so the timer can beep later
    const id = Date.now().toString();
    update(d => ({
      ...d,
      events: [...d.events, { id, type: "med", timestamp: new Date().toISOString(), updatedAt: new Date().toISOString() } as MedEvent],
    }));
    vibrate();
    addToast("Logged medication", "success", { label: "Undo", onClick: () => deleteEvent(id) });
  };

  const saveEditedEvent = useCallback((updated: NewbornLogEvent) => {
    const stamped = { ...updated, updatedAt: new Date().toISOString() };
    update(d => ({ ...d, events: d.events.map(e => e.id === updated.id ? stamped : e) }));
    setEditingEvent(null);
  }, [update]);

  const saveName = () => {
    if (nameInput.trim()) update(d => ({ ...d, babyName: nameInput.trim() }));
    setEditingName(false);
  };

  return (
    <PageTransition className="max-w-2xl mx-auto pb-8">
      {editingEvent && (
        <EditModal
          event={editingEvent}
          onSave={saveEditedEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Night mode: warm dim overlay over everything */}
      {nightMode && (
        <div
          className="fixed inset-0 z-[90] pointer-events-none"
          style={{ background: "rgba(70, 25, 0, 0.45)", mixBlendMode: "multiply" }}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Baby size={20} className="text-sage-600" />
          <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-stone-100">
            Newborn Tracker
          </h1>
          <button
            onClick={toggleNightMode}
            className={clsx(
              "ml-auto p-2.5 rounded-xl border transition-colors",
              nightMode
                ? "bg-amber-900/40 border-amber-700 text-amber-300"
                : "bg-stone-50 border-stone-200 text-stone-400 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400"
            )}
            aria-label={nightMode ? "Exit night mode" : "Night mode — dim for 3am"}
            aria-pressed={nightMode}
          >
            {nightMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-stone-400 dark:text-stone-500 flex flex-wrap items-center gap-x-1.5">
          {syncedAgo && <span>☁️ Synced {syncedAgo}</span>}
          <span className={clsx(syncedAgo && "text-stone-300 dark:text-stone-600")}>
            Built {new Date(process.env.NEXT_PUBLIC_BUILD_TIME!).toLocaleString("en-CA", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {" · "}<span className="font-mono">{process.env.NEXT_PUBLIC_COMMIT_SHA}</span>
          </span>
        </p>
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

      {/* Nocturnal hero — the number you want at 3am */}
      <div className="mb-5 rounded-2xl p-5 bg-gradient-to-br from-indigo-950 via-stone-900 to-stone-950 border border-indigo-900/50 text-white shadow-lg shadow-indigo-950/20">
        {data.activeNursing ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-300/80 font-semibold mb-1">Nursing now · {FEED_LABELS[data.activeNursing.feedType]}</p>
            <p className="font-display text-5xl leading-none tabular-nums">{clockStr(data.activeNursing.startTime, now)}</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={finishNursing}
                className="flex-1 min-h-[48px] flex items-center justify-center gap-2 bg-sage-500 hover:bg-sage-600 active:bg-sage-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Square size={13} fill="currentColor" /> Finish &amp; Log
              </button>
              <button
                onClick={cancelNursing}
                className="px-4 min-h-[48px] text-indigo-300/70 hover:text-indigo-200 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-300/80 font-semibold mb-1">Since last feed</p>
            <p className="font-display text-5xl leading-none tabular-nums">
              {lastFeed ? durationStr(lastFeed.timestamp) : "—"}
            </p>
            <p className="text-xs text-indigo-200/60 mt-2">
              {lastFeed ? `${FEED_LABELS[lastFeed.feedType]} at ${formatTime(lastFeed.timestamp)}` : "No feeds logged yet"}
              {activeSleep && <span className="text-indigo-300"> · 😴 sleeping {durationStr(activeSleep.startTime)}</span>}
            </p>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/60">
        {([
          { id: "log", label: "Log", icon: Baby },
          { id: "trends", label: "Trends", icon: LineChart },
          { id: "sleep", label: "Sleep", icon: Moon },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors",
              tab === id
                ? "bg-white dark:bg-stone-700 text-sage-700 dark:text-sage-300 shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            )}
            aria-current={tab === id ? "true" : undefined}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "log" && (
      <>
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
              <p className="text-sm font-bold text-stone-700 dark:text-stone-200 leading-tight">
                {lastEndedSleep ? `Awake ${durationStr(lastEndedSleep.endTime!)}` : "Awake"}
              </p>
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

      {/* Next Due reminders */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Next Due</p>
          <button
            onClick={() => setShowReminderSettings(s => !s)}
            className="text-stone-400 hover:text-sage-500 dark:text-stone-500 dark:hover:text-sage-400 p-1 rounded-lg transition-colors"
            aria-label="Reminder settings"
          >
            <Settings2 size={15} />
          </button>
        </div>

        {/* Feed — window between feedMinHours and feedMaxHours, anchored to cluster start */}
        {(() => {
          const fw = feedWindowStart !== null && feedWindowEnd !== null
            ? feedWindowLabel(feedWindowStart, feedWindowEnd, now) : null;
          const toneCls = fw?.tone === "overdue" ? "text-rose-500 dark:text-rose-400"
            : fw?.tone === "open" ? "text-amber-500 dark:text-amber-400"
            : "text-sage-600 dark:text-sage-400";
          return (
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none">🍼</span>
                <div>
                  <p className="text-xs font-medium text-stone-700 dark:text-stone-200">Feed · {reminders.feedMinHours}–{reminders.feedMaxHours}h window</p>
                  <p className="text-[10px] text-stone-400">
                    {!reminders.feedEnabled ? "reminder off" : !lastFeed ? "log a feed to start" : "from first feed of the session"}
                  </p>
                </div>
              </div>
              {reminders.feedEnabled && fw && (
                <span className={clsx("text-sm font-semibold tabular-nums text-right", toneCls)}>{fw.text}</span>
              )}
            </div>
          );
        })()}

        {/* Meds — fixed interval from last dose */}
        {(() => {
          const d = medDueAt !== null ? dueLabel(medDueAt, now) : null;
          return (
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none">💊</span>
                <div>
                  <p className="text-xs font-medium text-stone-700 dark:text-stone-200">Meds · every {reminders.medHours}h</p>
                  <p className="text-[10px] text-stone-400">
                    {!reminders.medEnabled ? "reminder off" : !lastMed ? "log a med to start" : "auto-resets from last dose"}
                  </p>
                </div>
              </div>
              {reminders.medEnabled && d && (
                <span className={clsx(
                  "text-sm font-semibold tabular-nums",
                  d.overdue ? "text-rose-500 dark:text-rose-400" : "text-sage-600 dark:text-sage-400"
                )}>
                  {d.text}
                </span>
              )}
            </div>
          );
        })()}

        {showReminderSettings && (
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
            {/* Feed window: min–max hours */}
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={reminders.feedEnabled}
                  onChange={e => updateReminders({ feedEnabled: e.target.checked })}
                  className="accent-sage-500"
                />
                Feed window
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0.5} max={12} step={0.5}
                  value={reminders.feedMinHours}
                  onChange={e => updateReminders({ feedMinHours: Math.max(0.5, Number(e.target.value) || reminders.feedMinHours) })}
                  className="w-12 px-1.5 py-1 text-xs rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-center"
                />
                <span className="text-[11px] text-stone-400">to</span>
                <input
                  type="number" min={0.5} max={12} step={0.5}
                  value={reminders.feedMaxHours}
                  onChange={e => updateReminders({ feedMaxHours: Math.max(reminders.feedMinHours, Number(e.target.value) || reminders.feedMaxHours) })}
                  className="w-12 px-1.5 py-1 text-xs rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-center"
                />
                <span className="text-[11px] text-stone-400">h</span>
              </div>
            </div>
            {/* Meds: single interval */}
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={reminders.medEnabled}
                  onChange={e => updateReminders({ medEnabled: e.target.checked })}
                  className="accent-sage-500"
                />
                Meds reminder
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-stone-400">every</span>
                <input
                  type="number" min={1} max={24} step={0.5}
                  value={reminders.medHours}
                  onChange={e => updateReminders({ medHours: Math.max(0.5, Number(e.target.value) || reminders.medHours) })}
                  className="w-14 px-2 py-1 text-xs rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-center"
                />
                <span className="text-[11px] text-stone-400">h</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={reminders.soundEnabled}
                  onChange={e => { unlockAudio(); updateReminders({ soundEnabled: e.target.checked }); }}
                  className="accent-sage-500"
                />
                Sound alert
              </label>
              {notifPermission !== "granted" ? (
                <button onClick={() => requestPermission()} className="btn-secondary text-[11px]">
                  <Bell size={12} /> Enable notifications
                </button>
              ) : (
                <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                  <Bell size={12} /> Notifications on
                </span>
              )}
            </div>
            <p className="text-[10px] text-stone-400 leading-relaxed">
              <BellOff size={10} className="inline -mt-0.5 mr-0.5" />
              Sound &amp; alerts only fire while this app is open on screen — iOS can&apos;t wake a web app in the background.
            </p>
          </div>
        )}
      </div>

      {/* Quick Log */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">Quick Log</p>

        {!data.activeNursing && (
        <div className="mb-4">
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2 flex items-center gap-1">
            🤱 Feeding
            {suggestedSide && (
              <span className="text-sage-500 dark:text-sage-400 font-medium">
                · {suggestedSide === "breast-left" ? "left" : "right"} side next
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

        <div className="mb-4">
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">🌙 Sleep</p>
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
            {activeSleep
              ? `End Sleep · ${clockStr(activeSleep.startTime, now)}`
              : "Start Sleep"}
          </button>
        </div>

        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">💧 Diaper</p>
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
        </div>

        <div className="mt-4">
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">💊 Medication</p>
          <button
            onClick={logMed}
            className="w-full min-h-[56px] px-4 py-2 rounded-xl text-sm font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-colors select-none touch-manipulation"
          >
            <Pill size={15} className="inline mr-1.5 -mt-0.5" /> Log Medication
          </button>
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
              <LogRow key={event.id} event={event} onDelete={deleteEventWithUndo} onEdit={setEditingEvent} />
            ))}
          </div>
        )}
      </div>

      </>
      )}

      {tab === "trends" && (
      <>
      {allEvents.length === 0 && (
        <div className="card p-8 text-center">
          <LineChart size={28} className="mx-auto mb-2 text-stone-200 dark:text-stone-700" />
          <p className="text-sm text-stone-400">No data yet. Log feeds, sleep and diapers to see trends and a pediatrician summary here.</p>
        </div>
      )}

      {/* Pediatrician summary */}
      {allEvents.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope size={14} className="text-sky-500" />
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">For the Pediatrician</p>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[
              { label: "Feedings", v24: String(stats24.feeds), v7: `${stats7d.feedsPerDay.toFixed(1)}/d` },
              { label: "Wet", v24: String(stats24.wet), v7: "" },
              { label: "Dirty", v24: String(stats24.dirty), v7: "" },
              { label: "Sleep", v24: `${stats24.sleepH.toFixed(1)}h`, v7: `${stats7d.sleepHPerDay.toFixed(1)}h/d` },
            ].map(({ label, v24, v7 }) => (
              <div key={label} className="text-center rounded-xl bg-stone-50 dark:bg-stone-800/60 py-2">
                <p className="font-display text-xl text-stone-800 dark:text-stone-100 tabular-nums leading-tight">{v24}</p>
                <p className="text-[10px] text-stone-400">{label} · 24h</p>
                {v7 && <p className="text-[9px] text-stone-300 dark:text-stone-600">{v7} avg</p>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-stone-400 text-center">
            7-day avg: {stats7d.feedsPerDay.toFixed(1)} feedings · {stats7d.diapersPerDay.toFixed(1)} diapers · {stats7d.sleepHPerDay.toFixed(1)}h sleep per day
          </p>
          <p className="text-[9px] text-stone-300 dark:text-stone-600 text-center mt-1">
            Feedings count nursing sessions — left + right within 30 min count as one.
          </p>
          {expectation && (
            <div className={clsx(
              "mt-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2",
              stats24.wet >= expectation.wet && stats24.dirty >= expectation.dirty
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            )}>
              <span className="shrink-0">💧</span>
              <span>
                Day {dayOfLife}: expect at least <b>{expectation.wet} wet</b> and <b>{expectation.dirty} dirty</b> in 24h —
                {" "}you&apos;re at {stats24.wet} wet, {stats24.dirty} dirty.
                {!(stats24.wet >= expectation.wet && stats24.dirty >= expectation.dirty) && " If low by end of day, mention it to your midwife."}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Daily trends over time */}
      {allEvents.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">Trends Over Time</p>
          <DailyTrendsChart events={allEvents} />
        </div>
      )}

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
                    <LogRow key={event.id} event={event} onDelete={deleteEventWithUndo} onEdit={setEditingEvent} showDate />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      </>
      )}

      {tab === "sleep" && <SleepTrainingPanel showHeader={false} />}
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
        className="text-stone-300 hover:text-sage-500 dark:text-stone-600 dark:hover:text-sage-400 transition-colors p-3 rounded-lg active:bg-stone-100 dark:active:bg-stone-700"
        aria-label="Edit"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => onDelete(event.id)}
        className="text-stone-300 hover:text-red-400 dark:text-stone-600 dark:hover:text-red-400 transition-colors p-3 rounded-lg active:bg-red-50 dark:active:bg-red-950/30"
        aria-label="Delete"
      >
        <X size={14} />
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

  if (event.type === "med") {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">💊</span>
          <div>
            <p className="text-xs font-medium text-stone-700 dark:text-stone-200">{event.medName || "Medication"}</p>
            <p className="text-[10px] text-stone-400">{formatTime(event.timestamp, showDate)}</p>
          </div>
        </div>
        {actions}
      </div>
    );
  }

  return null;
}
