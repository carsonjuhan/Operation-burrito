"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Moon, ChevronDown, ChevronUp, X, Check, Plus, Baby, Info, Clock } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/contexts/ToastContext";
import type { SleepTrainingData, SleepTrainingMethod, SleepTrainingNight } from "@/types";

const STORAGE_KEY = "sleep_training";

function load(): SleepTrainingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save(data: SleepTrainingData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Ferber interval schedule by night number (1-indexed)
const FERBER_SCHEDULE: { night: number; waits: number[] }[] = [
  { night: 1, waits: [3, 5, 10] },
  { night: 2, waits: [5, 10, 12] },
  { night: 3, waits: [10, 12, 15] },
  { night: 4, waits: [12, 15, 17] },
  { night: 5, waits: [15, 17, 20] },
  { night: 6, waits: [17, 20, 25] },
  { night: 7, waits: [20, 25, 30] },
];

function getFerberIntervals(nightNumber: number): number[] {
  const row = FERBER_SCHEDULE[Math.min(nightNumber - 1, FERBER_SCHEDULE.length - 1)];
  return row.waits;
}

const METHOD_INFO: Record<SleepTrainingMethod, { label: string; emoji: string; description: string }> = {
  ferber: {
    label: "Ferber",
    emoji: "⏱️",
    description: "Graduated check-ins: wait progressively longer before briefly comforting. Don't pick up. Typically works in 3–7 nights.",
  },
  cio: {
    label: "Cry It Out",
    emoji: "😤",
    description: "Full extinction: put baby down and don't return until morning. Faster results, harder to stick to.",
  },
  fading: {
    label: "Chair / Fading",
    emoji: "🪑",
    description: "Sit next to the crib, gradually move the chair further away each night until you leave the room.",
  },
  "no-cry": {
    label: "No-Cry",
    emoji: "🤗",
    description: "Gentle pick-up/put-down and gradual association removal. Slower but minimal crying.",
  },
};

const RATING_LABELS: Record<1 | 2 | 3, { emoji: string; label: string; color: string }> = {
  1: { emoji: "😩", label: "Rough", color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800" },
  2: { emoji: "😐", label: "OK", color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
  3: { emoji: "😊", label: "Good", color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" },
};

function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nightNumber(startDate: string, forDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const target = new Date(forDate + "T00:00:00");
  return Math.max(1, Math.round((target.getTime() - start.getTime()) / 86400000) + 1);
}

function ageWeeks(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (7 * 24 * 3600 * 1000));
}

// ── Setup wizard ──────────────────────────────────────────────────────────────

function SetupWizard({ onStart }: { onStart: (data: SleepTrainingData) => void }) {
  const [method, setMethod] = useState<SleepTrainingMethod>("ferber");
  const [birthDate, setBirthDate] = useState("");
  const [startToday, setStartToday] = useState(true);
  const [startDate, setStartDate] = useState(dateKey());

  const weeks = birthDate ? ageWeeks(birthDate) : null;
  const readyAt16 = weeks !== null && weeks >= 16;

  const inputCls = "w-full px-3 py-2 text-[16px] bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-300 dark:focus:ring-sage-600";

  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-3">
          <Moon size={28} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Set Up Sleep Training</h2>
        <p className="text-sm text-stone-500 mt-1">Takes 30 seconds — we&apos;ll track your nightly progress.</p>
      </div>

      {/* Method */}
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Choose a method</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(METHOD_INFO) as SleepTrainingMethod[]).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={clsx(
                "p-3 rounded-xl border text-left transition-all",
                method === m
                  ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30"
                  : "border-stone-200 dark:border-stone-700 hover:border-stone-300"
              )}
            >
              <span className="text-base">{METHOD_INFO[m].emoji}</span>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-0.5">{METHOD_INFO[m].label}</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-snug mt-0.5">{METHOD_INFO[m].description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Birth date — optional, for age readiness check */}
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Baby&apos;s birth date <span className="text-stone-300 font-normal normal-case">(optional)</span></p>
        <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls} />
        {birthDate && (
          <div className={clsx(
            "mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2",
            readyAt16
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          )}>
            <Info size={12} className="shrink-0" />
            {readyAt16
              ? `Baby is ${weeks} weeks — good time to start!`
              : `Baby is ${weeks} weeks — most methods work best from 16 weeks (4 months). Check with your pediatrician first.`}
          </div>
        )}
      </div>

      {/* Start date */}
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Start training</p>
        <div className="flex gap-2">
          <button
            onClick={() => { setStartToday(true); setStartDate(dateKey()); }}
            className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
              startToday ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "border-stone-200 dark:border-stone-700")}
          >
            Tonight
          </button>
          <button
            onClick={() => setStartToday(false)}
            className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
              !startToday ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "border-stone-200 dark:border-stone-700")}
          >
            Choose date
          </button>
        </div>
        {!startToday && (
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={clsx(inputCls, "mt-2")} />
        )}
      </div>

      <button
        onClick={() => onStart({ method, startDate, babyBirthDate: birthDate || undefined, nights: [] })}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors"
      >
        Start Sleep Training
      </button>
    </div>
  );
}

// ── Log night modal ───────────────────────────────────────────────────────────

function LogNightModal({
  nightNum,
  existingNight,
  onSave,
  onClose,
}: {
  nightNum: number;
  existingNight?: SleepTrainingNight;
  onSave: (night: SleepTrainingNight) => void;
  onClose: () => void;
}) {
  const [bedtime, setBedtime] = useState(existingNight?.bedtime ?? "19:30");
  const [minutesToSettle, setMinutesToSettle] = useState(String(existingNight?.minutesToSettle ?? ""));
  const [wakeUps, setWakeUps] = useState(String(existingNight?.wakeUps ?? "0"));
  const [totalCryMins, setTotalCryMins] = useState(String(existingNight?.totalCryMins ?? ""));
  const [rating, setRating] = useState<1 | 2 | 3>(existingNight?.rating ?? 2);
  const [notes, setNotes] = useState(existingNight?.notes ?? "");

  const intervals = nightNum <= 7 ? getFerberIntervals(nightNum) : null;

  const inputCls = "w-full px-3 py-2 text-[16px] bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600";
  const labelCls = "text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1 block";

  const handleSave = () => {
    const night: SleepTrainingNight = {
      id: existingNight?.id ?? Date.now().toString(),
      date: existingNight?.date ?? dateKey(),
      bedtime,
      minutesToSettle: parseInt(minutesToSettle) || 0,
      wakeUps: parseInt(wakeUps) || 0,
      totalCryMins: parseInt(totalCryMins) || 0,
      rating,
      notes: notes.trim() || undefined,
    };
    onSave(night);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 space-y-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Night {nightNum} Log
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1"><X size={16} /></button>
        </div>

        {intervals && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1.5">Tonight&apos;s Ferber intervals</p>
            <div className="flex items-center gap-2">
              {intervals.map((min, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-indigo-300 text-xs">→</span>}
                  <span className="px-2 py-0.5 bg-white dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-700">{min}m</span>
                </div>
              ))}
              <span className="text-[10px] text-indigo-400 ml-1">then repeat {intervals[intervals.length - 1]}m</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Bedtime</label>
            <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mins to settle</label>
            <input type="number" min="0" placeholder="e.g. 25" value={minutesToSettle} onChange={e => setMinutesToSettle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Wake-ups</label>
            <input type="number" min="0" placeholder="0" value={wakeUps} onChange={e => setWakeUps(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Total cry (mins)</label>
            <input type="number" min="0" placeholder="e.g. 40" value={totalCryMins} onChange={e => setTotalCryMins(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>How did it go?</label>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map(r => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={clsx(
                  "py-2 rounded-xl text-sm font-medium border transition-all",
                  rating === r ? RATING_LABELS[r].color : "border-stone-200 dark:border-stone-700 text-stone-500"
                )}
              >
                {RATING_LABELS[r].emoji} {RATING_LABELS[r].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <input type="text" placeholder="Anything notable..." value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Check size={14} /> Save Night
          </button>
          <button onClick={onClose} className="px-4 text-stone-500 text-sm hover:text-stone-700 dark:hover:text-stone-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SleepTrainingPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<SleepTrainingData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loggingNight, setLoggingNight] = useState<{ nightNum: number; existing?: SleepTrainingNight } | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWhenToStart, setShowWhenToStart] = useState(false);

  useEffect(() => { setData(load()); setLoaded(true); }, []);

  const update = useCallback((fn: (d: SleepTrainingData) => SleepTrainingData) => {
    setData(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const handleStart = useCallback((newData: SleepTrainingData) => {
    save(newData);
    setData(newData);
    addToast("Sleep training started!", "success");
  }, [addToast]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    addToast("Sleep training data cleared", "info");
  }, [addToast]);

  const saveNight = useCallback((night: SleepTrainingNight) => {
    update(d => ({
      ...d,
      nights: d.nights.some(n => n.id === night.id)
        ? d.nights.map(n => n.id === night.id ? night : n)
        : [...d.nights, night],
    }));
    setLoggingNight(null);
    addToast(`Night ${loggingNight?.nightNum} logged`, "success");
  }, [update, addToast, loggingNight]);

  const deleteNight = useCallback((id: string) => {
    let removed: SleepTrainingNight | undefined;
    update(d => {
      removed = d.nights.find(n => n.id === id);
      return { ...d, nights: d.nights.filter(n => n.id !== id) };
    });
    if (removed) {
      const r = removed;
      addToast("Night deleted", "info", { label: "Undo", onClick: () => update(d => ({ ...d, nights: [...d.nights, r] })) });
    }
  }, [update, addToast]);

  const todayKey = dateKey();

  const { currentNightNum, todayNight, sortedNights, avgSettleTrend } = useMemo(() => {
    if (!data) return { currentNightNum: 1, todayNight: undefined, sortedNights: [], avgSettleTrend: [] };
    const currentNightNum = nightNumber(data.startDate, todayKey);
    const sortedNights = [...data.nights].sort((a, b) => a.date.localeCompare(b.date));
    const todayNight = sortedNights.find(n => n.date === todayKey);
    const avgSettleTrend = sortedNights.map(n => n.minutesToSettle);
    return { currentNightNum, todayNight, sortedNights, avgSettleTrend };
  }, [data, todayKey]);

  if (!loaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-stone-400 text-sm">Loading…</div>
    </div>
  );

  return (
    <PageTransition className="max-w-xl mx-auto pt-10 md:pt-0 pb-8">
      {loggingNight && (
        <LogNightModal
          nightNum={loggingNight.nightNum}
          existingNight={loggingNight.existing}
          onSave={saveNight}
          onClose={() => setLoggingNight(null)}
        />
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Moon size={20} className="text-indigo-500" />
          <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-stone-100">Sleep Training</h1>
        </div>
        <p className="text-sm text-stone-400">Track your nightly progress and intervals.</p>
      </div>

      {/* When to get started — always visible */}
      <div className="card p-4 mb-4">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowWhenToStart(s => !s)}
        >
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">When to get started</p>
          </div>
          {showWhenToStart ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
        </button>

        {showWhenToStart && (
          <div className="mt-3 space-y-3">
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">16–20 weeks (4–5 months) is the sweet spot</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Most methods work best in this window before habits entrench.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1.5">Go when all of these are true</p>
              {[
                "Baby is at least 16 weeks corrected age",
                "Back to birth weight and gaining consistently",
                "Night feeds have dropped to 1–2 per night naturally",
                "Pediatrician gives the OK at the 4-month visit",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-stone-600 dark:text-stone-300">{item}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2.5 bg-rose-50 dark:bg-rose-900/10 rounded-lg">
                <span className="text-sm shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Don&apos;t start before 16 weeks</p>
                  <p className="text-xs text-rose-600 dark:text-rose-400">Under 4 months the nervous system isn&apos;t developed enough to self-soothe — crying without learning.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                <span className="text-sm shrink-0">💡</span>
                <div>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">The 4-month regression is your signal</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Around weeks 16–18 baby often starts waking every 2 hours. Old patterns are already broken — that&apos;s the ideal moment to start.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                <span className="text-sm shrink-0">📅</span>
                <div>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Don&apos;t wait past 6 months</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">After 6 months habits are more entrenched and separation anxiety (peaks ~8–9 months) makes it significantly harder.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup or active tracker */}
      {!data ? (
        <div className="card p-5">
          <SetupWizard onStart={handleStart} />
        </div>
      ) : (
        <>
          {/* Status header */}
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide font-semibold">Method</p>
                <p className="text-base font-bold text-stone-800 dark:text-stone-100">
                  {METHOD_INFO[data.method].emoji} {METHOD_INFO[data.method].label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400 uppercase tracking-wide font-semibold">Night</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">{currentNightNum}</p>
              </div>
            </div>

            {/* Progress dots */}
            {data.nights.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {sortedNights.map((n, i) => {
                  const r = RATING_LABELS[n.rating];
                  return (
                    <button
                      key={n.id}
                      onClick={() => setLoggingNight({ nightNum: nightNumber(data.startDate, n.date), existing: n })}
                      className="flex flex-col items-center gap-0.5"
                      title={`Night ${i + 1}: ${r.label}`}
                    >
                      <span className="text-base leading-none">{r.emoji}</span>
                      <span className="text-[9px] text-stone-400">{i + 1}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Trend line: minutes to settle */}
            {avgSettleTrend.length >= 2 && (
              <div className="mb-3">
                <p className="text-[10px] text-stone-400 mb-1">Minutes to settle by night</p>
                <div className="flex items-end gap-1 h-10">
                  {avgSettleTrend.map((mins, i) => {
                    const max = Math.max(...avgSettleTrend, 1);
                    const h = Math.max((mins / max) * 100, 8);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className="w-full rounded-t bg-indigo-200 dark:bg-indigo-700/60 transition-all"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[8px] text-stone-400">{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tonight CTA */}
            {!todayNight ? (
              <button
                onClick={() => setLoggingNight({ nightNum: currentNightNum })}
                className="w-full min-h-[52px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors"
              >
                <Plus size={16} /> Log Tonight (Night {currentNightNum})
              </button>
            ) : (
              <button
                onClick={() => setLoggingNight({ nightNum: currentNightNum, existing: todayNight })}
                className="w-full min-h-[52px] flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-300 font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors"
              >
                <Check size={16} /> Night {currentNightNum} logged — edit
              </button>
            )}
          </div>

          {/* Tonight's interval schedule (Ferber only) */}
          {data.method === "ferber" && (
            <div className="card p-4 mb-4">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setShowSchedule(s => !s)}
              >
                <div>
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Ferber Interval Schedule</p>
                  <p className="text-xs text-stone-400">Tonight: wait {getFerberIntervals(currentNightNum).join(", ")} min before check-ins</p>
                </div>
                {showSchedule ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
              </button>

              {showSchedule && (
                <div className="mt-3 space-y-1">
                  <div className="grid grid-cols-5 gap-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wide px-2">
                    <span>Night</span>
                    <span>1st</span>
                    <span>2nd</span>
                    <span>3rd+</span>
                    <span>Status</span>
                  </div>
                  {FERBER_SCHEDULE.map(row => {
                    const logged = data.nights.find(n => nightNumber(data.startDate, n.date) === row.night);
                    const isCurrent = currentNightNum === row.night;
                    return (
                      <div
                        key={row.night}
                        className={clsx(
                          "grid grid-cols-5 gap-1 px-2 py-1.5 rounded-lg text-xs",
                          isCurrent ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                        )}
                      >
                        <span className={clsx("font-semibold", isCurrent ? "text-indigo-600 dark:text-indigo-400" : "text-stone-500")}>
                          {isCurrent ? "→" : ""} {row.night}
                        </span>
                        {row.waits.map((w, i) => (
                          <span key={i} className="text-stone-600 dark:text-stone-300">{w}m</span>
                        ))}
                        <span>
                          {logged ? RATING_LABELS[logged.rating].emoji : isCurrent ? "🌙 tonight" : ""}
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-stone-400 px-2 pt-1">After each check-in: 1–2 min only, no picking up. Then leave.</p>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {sortedNights.length > 0 && (
            <div className="card p-4 mb-4">
              <button
                className="w-full flex items-center justify-between mb-1"
                onClick={() => setShowHistory(h => !h)}
              >
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Night Log ({sortedNights.length})</p>
                {showHistory ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
              </button>

              {showHistory && (
                <div className="divide-y divide-stone-50 dark:divide-stone-800 mt-2">
                  {[...sortedNights].reverse().map(n => {
                    const nNum = nightNumber(data.startDate, n.date);
                    const r = RATING_LABELS[n.rating];
                    return (
                      <div key={n.id} className="flex items-center gap-3 py-2.5">
                        <div className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{nNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                              {new Date(n.date + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", r.color)}>
                              {r.emoji} {r.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Bed {n.bedtime} · {n.minutesToSettle}m to settle · {n.wakeUps} wake-up{n.wakeUps !== 1 ? "s" : ""} · {n.totalCryMins}m crying
                          </p>
                          {n.notes && <p className="text-[11px] text-stone-500 dark:text-stone-400 italic mt-0.5 truncate">{n.notes}</p>}
                        </div>
                        <button
                          onClick={() => deleteNight(n.id)}
                          className="text-stone-300 hover:text-red-400 p-2 rounded-lg active:bg-red-50 dark:active:bg-red-950/30 shrink-0"
                          aria-label="Delete night"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Readiness reminder */}
          {data.babyBirthDate && (
            <div className="card p-4 mb-4 flex items-start gap-3">
              <Baby size={16} className="text-stone-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Baby&apos;s age</p>
                <p className="text-xs text-stone-400">
                  {ageWeeks(data.babyBirthDate)} weeks old · started training at night {1}
                </p>
              </div>
            </div>
          )}

          {/* Tips for tonight */}
          <div className="card p-4 mb-4 space-y-1.5">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">Tips for tonight</p>
            {[
              "Consistent bedtime routine: bath → feed → song → crib",
              "Put baby down drowsy but still awake",
              "When you check in: voice only or brief pat — do not pick up",
              "Both partners stick to the same plan (hardest part)",
              "It usually peaks on night 2–3, then improves quickly",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-indigo-300 text-xs mt-0.5 shrink-0">•</span>
                <p className="text-xs text-stone-600 dark:text-stone-300">{tip}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="w-full py-2 text-xs text-stone-400 hover:text-red-400 transition-colors"
          >
            Reset sleep training data
          </button>
        </>
      )}
    </PageTransition>
  );
}
