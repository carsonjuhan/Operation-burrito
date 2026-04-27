"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { Contraction } from "@/types";
import { Timer, StopCircle, PlayCircle, Trash2, AlertTriangle, Activity } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTimeOfDay(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// 5-1-1 Rule: contractions ≤5 min apart, ≥1 min long, for ≥1 hour
function check511Rule(contractions: Contraction[]): boolean {
  if (contractions.length < 4) return false;

  const recent = [...contractions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Check the window: first and last in the recent span must be ≥1 hour apart
  const first = new Date(recent[0].startTime).getTime();
  const last = new Date(recent[recent.length - 1].startTime).getTime();
  if (last - first < 60 * 60 * 1000) return false;

  // All contractions in that window must meet the criteria
  const inWindow = recent.filter(
    (c) => new Date(c.startTime).getTime() >= last - 60 * 60 * 1000
  );
  if (inWindow.length < 4) return false;

  return inWindow.every(
    (c) => c.duration >= 60 && c.interval > 0 && c.interval <= 5 * 60
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Phase = "idle" | "timing" | "between";

export default function TimerPage() {
  const { store, loaded, addContraction, clearContractions } = useStoreContext();

  const [phase, setPhase] = useState<Phase>("idle");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastContractionStart, setLastContractionStart] = useState<Date | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick elapsed every second while timing
  useEffect(() => {
    if (phase === "timing" && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (phase !== "timing") setElapsed(0);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, startTime]);

  const handleStart = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    setElapsed(0);
    setPhase("timing");
  }, []);

  const handleStop = useCallback(() => {
    if (!startTime) return;
    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const interval = lastContractionStart
      ? Math.floor((startTime.getTime() - lastContractionStart.getTime()) / 1000)
      : 0;

    const contraction: Contraction = {
      id: crypto.randomUUID(),
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      duration,
      interval,
    };

    addContraction(contraction);
    setLastContractionStart(startTime);
    setStartTime(null);
    setElapsed(0);
    setPhase("between");
  }, [startTime, lastContractionStart, addContraction]);

  const handleClearConfirmed = useCallback(() => {
    clearContractions();
    setPhase("idle");
    setStartTime(null);
    setElapsed(0);
    setLastContractionStart(null);
    setShowClearConfirm(false);
  }, [clearContractions]);

  const { contractions } = store;

  const sorted = useMemo(
    () => [...contractions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    ),
    [contractions]
  );

  const recent = useMemo(() => sorted.slice(0, 10), [sorted]);

  // Stats
  const last = sorted[0] ?? null;
  const avgInterval = useMemo(
    () =>
      contractions.length > 1
        ? Math.round(
            contractions
              .filter((c) => c.interval > 0)
              .reduce((sum, c) => sum + c.interval, 0) /
              contractions.filter((c) => c.interval > 0).length
          )
        : null,
    [contractions]
  );

  const is511 = useMemo(() => check511Rule(contractions), [contractions]);

  if (!loaded) return null;

  return (
    <PageTransition className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={20} className="text-sage-600" />
          <h1 className="text-2xl font-bold text-stone-800">Contraction Timer</h1>
        </div>
        <p className="text-sm text-stone-400">
          Track the frequency and duration of contractions
        </p>
      </div>

      {/* 5-1-1 Rule Warning Banner */}
      {is511 && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800" role="alert" aria-live="assertive">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold text-sm">5-1-1 Rule Active</p>
            <p className="text-sm mt-0.5 text-rose-700">
              Contractions are 5 minutes apart or less, lasting 1 minute or more, for over an
              hour. Time to call your provider or head to the hospital.
            </p>
          </div>
        </div>
      )}

      {/* Main Timer Card */}
      <div className="card p-8 mb-6 flex flex-col items-center gap-6">
        {/* Phase label */}
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "badge text-sm px-3 py-1",
              phase === "timing" && "bg-rose-100 text-rose-700",
              phase === "between" && "bg-sage-100 text-sage-700",
              phase === "idle" && "bg-stone-100 text-stone-500"
            )}
          >
            {phase === "idle" && "Ready"}
            {phase === "timing" && "Contraction in progress"}
            {phase === "between" && "Between contractions"}
          </span>
        </div>

        {/* Big timer display */}
        <div
          className={clsx(
            "font-mono font-bold tabular-nums transition-colors",
            phase === "timing" ? "text-8xl text-rose-600" : "text-8xl text-stone-500"
          )}
          role="timer"
          aria-live="off"
          aria-label={`Contraction timer: ${formatSeconds(elapsed)}`}
        >
          {formatSeconds(elapsed)}
        </div>

        {/* Action button */}
        {phase === "idle" || phase === "between" ? (
          <button
            onClick={handleStart}
            className={clsx(
              "inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-semibold transition-colors",
              "bg-sage-600 hover:bg-sage-700 text-white shadow-md"
            )}
          >
            <PlayCircle size={24} />
            Start Contraction
          </button>
        ) : (
          <button
            onClick={handleStop}
            className={clsx(
              "inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-semibold transition-colors",
              "bg-rose-600 hover:bg-rose-700 text-white shadow-md"
            )}
          >
            <StopCircle size={24} />
            Stop Contraction
          </button>
        )}

        {/* Hint text */}
        {phase === "between" && (
          <p className="text-xs text-stone-400 -mt-2">
            Press Start when the next contraction begins
          </p>
        )}
      </div>

      {/* Stats Bar */}
      {contractions.length > 0 && (
        <div className="card p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCell
            label="Last Duration"
            value={last ? formatSeconds(last.duration) : "—"}
            highlight={!!last && last.duration >= 60}
          />
          <StatCell
            label="Last Interval"
            value={last && last.interval > 0 ? formatSeconds(last.interval) : "—"}
            highlight={!!last && last.interval > 0 && last.interval <= 5 * 60}
          />
          <StatCell
            label="Avg Interval"
            value={avgInterval !== null ? formatSeconds(avgInterval) : "—"}
            highlight={avgInterval !== null && avgInterval <= 5 * 60}
          />
          <StatCell
            label="Total"
            value={String(contractions.length)}
          />
        </div>
      )}

      {/* Recent Contractions List */}
      {contractions.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Timer size={15} className="text-stone-400" />
              <h2 className="text-sm font-semibold text-stone-700">
                Recent Contractions
              </h2>
              <span className="badge bg-stone-100 text-stone-500">
                last {recent.length}
              </span>
            </div>
            {/* Clear button */}
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">Sure?</span>
                <button
                  onClick={handleClearConfirmed}
                  className="btn-danger py-1 px-2 text-xs"
                >
                  Yes, clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="btn-secondary py-1 px-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="btn-danger py-1 px-2 text-xs"
              >
                <Trash2 size={13} />
                Clear All
              </button>
            )}
          </div>

          {/* Table header */}
          <div className="grid grid-cols-4 px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-wide border-b border-stone-50">
            <span>#</span>
            <span>Duration</span>
            <span>Interval</span>
            <span>Time</span>
          </div>

          <div className="divide-y divide-stone-50">
            {recent.map((c, idx) => {
              const number = contractions.length - idx;
              const longEnough = c.duration >= 60;
              const closeEnough = c.interval > 0 && c.interval <= 5 * 60;
              return (
                <div
                  key={c.id}
                  className={clsx(
                    "grid grid-cols-4 px-4 py-3 text-sm items-center",
                    idx === 0 && "bg-stone-50/50"
                  )}
                >
                  <span className="text-stone-400 font-mono text-xs">{number}</span>
                  <span
                    className={clsx(
                      "font-mono font-medium",
                      longEnough ? "text-rose-600" : "text-stone-700"
                    )}
                  >
                    {formatSeconds(c.duration)}
                  </span>
                  <span
                    className={clsx(
                      "font-mono",
                      c.interval === 0
                        ? "text-stone-300"
                        : closeEnough
                        ? "text-amber-600 font-medium"
                        : "text-stone-600"
                    )}
                  >
                    {c.interval === 0 ? "—" : formatSeconds(c.interval)}
                  </span>
                  <span className="text-stone-400 text-xs tabular-nums">
                    {formatTimeOfDay(c.startTime)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {contractions.length === 0 && phase === "idle" && (
        <div className="text-center py-12 text-stone-400">
          <Timer size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Press Start when a contraction begins</p>
        </div>
      )}
    </PageTransition>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5">
      <span className="text-xs text-stone-400 uppercase tracking-wide">{label}</span>
      <span
        className={clsx(
          "text-xl font-mono font-semibold tabular-nums",
          highlight ? "text-rose-600" : "text-stone-700"
        )}
      >
        {value}
      </span>
    </div>
  );
}
