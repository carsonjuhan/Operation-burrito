"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dumbbell, ChevronDown, ChevronUp, X, Check, Plus, Flame } from "lucide-react";
import clsx from "clsx";
import { useToast } from "@/contexts/ToastContext";
import type { ExerciseRoutine, ExerciseSession, ExerciseTrackerData } from "@/types";
import {
  ROUTINE_INFO,
  loadExerciseData as load,
  saveExerciseData as save,
  sessionsThisWeek,
  totalMinutes,
  minutesByRoutine,
  currentStreakDays,
} from "@/lib/exerciseTracker";

const ROUTINES = Object.keys(ROUTINE_INFO) as ExerciseRoutine[];

function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Log session modal ─────────────────────────────────────────────────────────

function LogSessionModal({
  defaultRoutine,
  onSave,
  onClose,
}: {
  defaultRoutine: ExerciseRoutine;
  onSave: (session: ExerciseSession) => void;
  onClose: () => void;
}) {
  const [routine, setRoutine] = useState<ExerciseRoutine>(defaultRoutine);
  const [durationMin, setDurationMin] = useState("5");
  const [notes, setNotes] = useState("");

  const inputCls = "w-full px-3 py-2 text-[16px] bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-300 dark:focus:ring-sage-600";
  const labelCls = "text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1 block";

  const handleSave = () => {
    const mins = parseInt(durationMin);
    if (!mins || mins <= 0) return;
    onSave({
      id: Date.now().toString(),
      routine,
      date: dateKey(),
      durationMin: mins,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 space-y-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Log Session</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1"><X size={16} /></button>
        </div>

        <div>
          <label className={labelCls}>Routine</label>
          <div className="grid grid-cols-2 gap-2">
            {ROUTINES.map(r => (
              <button
                key={r}
                onClick={() => setRoutine(r)}
                className={clsx(
                  "p-2.5 rounded-xl border text-left transition-all",
                  routine === r
                    ? "border-sage-300 bg-sage-50 dark:border-sage-700 dark:bg-sage-900/30"
                    : "border-stone-200 dark:border-stone-700 hover:border-stone-300"
                )}
              >
                <span className="text-base">{ROUTINE_INFO[r].emoji}</span>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 mt-0.5">{ROUTINE_INFO[r].label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Duration (min)</label>
          <div className="flex gap-1.5 mb-2">
            {[3, 5, 10, 15, 20].map(m => (
              <button
                key={m}
                onClick={() => setDurationMin(String(m))}
                className={clsx(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  durationMin === String(m)
                    ? "bg-sage-100 text-sage-700 border-sage-300 dark:bg-sage-900/40 dark:text-sage-300 dark:border-sage-700"
                    : "bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700"
                )}
              >
                {m}m
              </button>
            ))}
          </div>
          <input type="number" min="1" value={durationMin} onChange={e => setDurationMin(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <input type="text" placeholder="Anything notable..." value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Check size={14} /> Save Session
          </button>
          <button onClick={onClose} className="px-4 text-stone-500 text-sm hover:text-stone-700 dark:hover:text-stone-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function NewbornExercisePanel({ showHeader = true }: { showHeader?: boolean }) {
  const { addToast } = useToast();
  const [data, setData] = useState<ExerciseTrackerData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [logging, setLogging] = useState<ExerciseRoutine | null>(null);
  const [showGuidance, setShowGuidance] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { setData(load()); setLoaded(true); }, []);

  const update = useCallback((fn: (d: ExerciseTrackerData) => ExerciseTrackerData) => {
    setData(prev => {
      const base = prev ?? { sessions: [] };
      const next = fn(base);
      save(next);
      return next;
    });
  }, []);

  const saveSession = useCallback((session: ExerciseSession) => {
    update(d => ({ ...d, sessions: [...d.sessions, session] }));
    setLogging(null);
    addToast(`${ROUTINE_INFO[session.routine].label} logged`, "success");
  }, [update, addToast]);

  const deleteSession = useCallback((id: string) => {
    let removed: ExerciseSession | undefined;
    update(d => {
      removed = d.sessions.find(s => s.id === id);
      return { ...d, sessions: d.sessions.filter(s => s.id !== id) };
    });
    if (removed) {
      const r = removed;
      addToast("Session deleted", "info", { label: "Undo", onClick: () => update(d => ({ ...d, sessions: [...d.sessions, r] })) });
    }
  }, [update, addToast]);

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const { weekSessions, weekMinutes, byRoutine, streak } = useMemo(() => {
    const weekSessions = sessionsThisWeek(sessions);
    return {
      weekSessions,
      weekMinutes: totalMinutes(weekSessions),
      byRoutine: minutesByRoutine(weekSessions),
      streak: currentStreakDays(sessions),
    };
  }, [sessions]);

  if (!loaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-stone-400 text-sm">Loading…</div>
    </div>
  );

  return (
    <>
      {logging && (
        <LogSessionModal
          defaultRoutine={logging}
          onSave={saveSession}
          onClose={() => setLogging(null)}
        />
      )}

      {showHeader && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell size={20} className="text-sage-600" />
            <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-stone-100">Exercises</h1>
          </div>
          <p className="text-sm text-stone-400">Tummy time, reading, and sensory play — track daily sessions.</p>
        </div>
      )}

      {/* This week's progress */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide font-semibold">This Week</p>
            <p className="text-base font-bold text-stone-800 dark:text-stone-100">{weekMinutes} min · {weekSessions.length} sessions</p>
          </div>
          {streak > 0 && (
            <div className="text-right flex items-center gap-1 text-amber-500">
              <Flame size={18} />
              <span className="text-2xl font-bold leading-none">{streak}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ROUTINES.map(r => (
            <div key={r} className="text-center rounded-xl bg-stone-50 dark:bg-stone-800/60 py-2">
              <p className="text-base leading-none">{ROUTINE_INFO[r].emoji}</p>
              <p className="text-xs font-bold text-stone-700 dark:text-stone-200 mt-1">{byRoutine[r]}m</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick log */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">Log a Session</p>
        <div className="grid grid-cols-2 gap-2">
          {ROUTINES.map(r => (
            <button
              key={r}
              onClick={() => setLogging(r)}
              className="min-h-[56px] flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-sage-50 text-sage-700 hover:bg-sage-100 active:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50 border border-sage-200 dark:border-sage-800 transition-colors select-none touch-manipulation"
            >
              <span className="text-base leading-none">{ROUTINE_INFO[r].emoji}</span>
              {ROUTINE_INFO[r].label}
              <Plus size={13} className="ml-auto opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {/* Guidance by routine */}
      <div className="card p-4 mb-4">
        <button className="w-full flex items-center justify-between" onClick={() => setShowGuidance(s => !s)}>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Age Guidance</p>
          {showGuidance ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
        </button>
        {showGuidance && (
          <div className="mt-3 space-y-2.5">
            {ROUTINES.map(r => (
              <div key={r} className="flex items-start gap-2.5">
                <span className="text-base leading-none shrink-0">{ROUTINE_INFO[r].emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                    {ROUTINE_INFO[r].label} <span className="text-stone-400 font-normal">· {ROUTINE_INFO[r].ageGuidance}</span>
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">{ROUTINE_INFO[r].description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {sessions.length > 0 && (
        <div className="card p-4 mb-4">
          <button className="w-full flex items-center justify-between mb-1" onClick={() => setShowHistory(h => !h)}>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Session Log ({sessions.length})</p>
            {showHistory ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </button>

          {showHistory && (
            <div className="divide-y divide-stone-50 dark:divide-stone-800 mt-2">
              {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-base leading-none shrink-0">{ROUTINE_INFO[s.routine].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                      {ROUTINE_INFO[s.routine].label} <span className="text-stone-400 font-normal">· {s.durationMin}m</span>
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {new Date(s.date + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="text-stone-300 hover:text-red-400 p-2 rounded-lg active:bg-red-50 dark:active:bg-red-950/30 shrink-0"
                    aria-label="Delete session"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
