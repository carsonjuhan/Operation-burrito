"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import type { GrowthEntry } from "@/types";

const STORAGE_KEY = "growth_tracker";

function loadEntries(): GrowthEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: GrowthEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// WHO reference ranges (approximate) for 0–12 weeks — median weight kg
const WHO_REF = [
  { week: 0, weightKgLow: 2.5, weightKgMid: 3.3, weightKgHigh: 4.2, note: "Birth" },
  { week: 1, weightKgLow: 2.5, weightKgMid: 3.3, weightKgHigh: 4.2, note: "Expect 7–10% loss" },
  { week: 2, weightKgLow: 2.8, weightKgMid: 3.5, weightKgHigh: 4.4, note: "Back to birth weight" },
  { week: 4, weightKgLow: 3.3, weightKgMid: 4.2, weightKgHigh: 5.2, note: "1 month" },
  { week: 8, weightKgLow: 4.2, weightKgMid: 5.2, weightKgHigh: 6.4, note: "2 months" },
  { week: 12, weightKgLow: 5.0, weightKgMid: 6.1, weightKgHigh: 7.5, note: "3 months" },
];

export default function GrowthTrackerPage() {
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [weightKg, setWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [headCm, setHeadCm] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { setEntries(loadEntries()); }, []);

  const addEntry = useCallback(() => {
    if (!date) return;
    const entry: GrowthEntry = {
      id: uid(),
      date,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      lengthCm: lengthCm ? parseFloat(lengthCm) : undefined,
      headCm: headCm ? parseFloat(headCm) : undefined,
      notes: notes.trim() || undefined,
    };
    const next = [entry, ...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEntries(next);
    saveEntries(next);
    setWeightKg(""); setLengthCm(""); setHeadCm(""); setNotes("");
    setShowForm(false);
  }, [date, weightKg, lengthCm, headCm, notes, entries]);

  const deleteEntry = useCallback((id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveEntries(next);
    setDeleteId(null);
  }, [entries]);

  const latestWeight = entries.find(e => e.weightKg !== undefined)?.weightKg;
  const latestLength = entries.find(e => e.lengthCm !== undefined)?.lengthCm;
  const latestHead = entries.find(e => e.headCm !== undefined)?.headCm;

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <TrendingUp size={22} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Growth Tracker</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Log
          </button>
        </div>

        {/* Log form */}
        {showForm && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">New Entry</h2>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-[16px]"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 3.45"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-[16px]"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Length (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 51.5"
                  value={lengthCm}
                  onChange={e => setLengthCm(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-[16px]"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Head circ. (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 34.5"
                  value={headCm}
                  onChange={e => setHeadCm(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-[16px]"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Notes</label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-[16px]"
                />
              </div>
            </div>

            <button
              onClick={addEntry}
              disabled={!date || (!weightKg && !lengthCm && !headCm)}
              className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              Save Entry
            </button>
          </div>
        )}

        {/* Latest summary */}
        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Weight", value: latestWeight ? `${latestWeight} kg` : "—", color: "text-violet-600 dark:text-violet-400" },
              { label: "Length", value: latestLength ? `${latestLength} cm` : "—", color: "text-sky-600 dark:text-sky-400" },
              { label: "Head", value: latestHead ? `${latestHead} cm` : "—", color: "text-emerald-600 dark:text-emerald-400" },
            ].map(m => (
              <div key={m.label} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-3 text-center">
                <p className={clsx("text-lg font-bold", m.color)}>{m.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Latest {m.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Entries — card layout */}
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{formatDate(e.date)}</p>
                    {e.notes && <p className="text-xs text-neutral-400 mt-0.5">{e.notes}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {e.weightKg != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium">
                          ⚖️ {e.weightKg} kg
                        </span>
                      )}
                      {e.lengthCm != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-medium">
                          📏 {e.lengthCm} cm
                        </span>
                      )}
                      {e.headCm != null && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                          👤 {e.headCm} cm
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteId(deleteId === e.id ? null : e.id)}
                    className="p-2.5 text-neutral-300 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400 transition-colors rounded-lg active:bg-red-50 dark:active:bg-red-950/30 shrink-0"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {deleteId === e.id && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      Delete entry
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="px-3 py-1.5 text-neutral-500 text-xs hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-400">
            <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No entries yet</p>
            <p className="text-xs mt-1">Tap Log to record your first measurement.</p>
          </div>
        )}

        {/* WHO reference table */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
            onClick={() => setShowRef(r => !r)}
          >
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">WHO Weight Reference (0–3 months)</span>
            {showRef ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
          </button>
          {showRef && (
            <div className="border-t border-neutral-100 dark:border-neutral-700">
              <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr] px-3 py-2 bg-neutral-50 dark:bg-neutral-700/50 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>Week</span>
                <span className="text-center">Low</span>
                <span className="text-center">Median</span>
                <span className="text-center">High</span>
                <span className="text-center">Note</span>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {WHO_REF.map(r => (
                  <div key={r.week} className="grid grid-cols-[60px_1fr_1fr_1fr_1fr] px-3 py-2.5 text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400 font-medium">W{r.week}</span>
                    <span className="text-center text-neutral-500 dark:text-neutral-400">{r.weightKgLow}</span>
                    <span className="text-center font-medium text-neutral-800 dark:text-neutral-200">{r.weightKgMid}</span>
                    <span className="text-center text-neutral-500 dark:text-neutral-400">{r.weightKgHigh}</span>
                    <span className="text-center text-xs text-neutral-400">{r.note}</span>
                  </div>
                ))}
              </div>
              <p className="px-3 py-2 text-xs text-neutral-400 border-t border-neutral-100 dark:border-neutral-700">
                WHO child growth standards (girls median). Values in kg. Wide variation is normal — consult your paediatrician.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
