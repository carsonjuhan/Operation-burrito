"use client";

import { useState, useMemo } from "react";
import { Heart, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import type { SootheTechnique, SootheDifficulty } from "@/types";
import sootheData from "../../../data/soothe_techniques.json";

const ALL_TECHNIQUES: SootheTechnique[] = sootheData.techniques as SootheTechnique[];

const DIFFICULTY_STYLES: Record<SootheDifficulty, string> = {
  easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "takes practice": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

const DIFFICULTY_OPTIONS: { value: SootheDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "takes practice", label: "Takes Practice" },
];

function TechniqueCard({ technique, forceOpen }: { technique: SootheTechnique; forceOpen: boolean }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceOpen || localOpen;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <button
        className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        onClick={() => setLocalOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-2xl leading-none mt-0.5">{technique.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{technique.name}</h3>
            <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", DIFFICULTY_STYLES[technique.difficulty])}>
              {technique.difficulty}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{technique.whenToUse}</p>
        </div>
        <div className="mt-1 text-neutral-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-700 space-y-3 pt-3">
          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">Steps</p>
            <ol className="space-y-2">
              {technique.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {technique.tips && technique.tips.length > 0 && (
            <div className="bg-neutral-50 dark:bg-neutral-700/40 rounded-lg p-3">
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Good to know</p>
              <ul className="space-y-1">
                {technique.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-neutral-600 dark:text-neutral-300 flex gap-2">
                    <span className="text-rose-400 shrink-0 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SoothePage() {
  const [query, setQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Set<SootheDifficulty>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const toggleDifficulty = (d: SootheDifficulty) => {
    setSelectedDifficulty(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_TECHNIQUES.filter(t => {
      if (selectedDifficulty.size > 0 && !selectedDifficulty.has(t.difficulty)) return false;
      if (q) {
        const hay = [t.name, t.whenToUse, ...t.steps, ...(t.tips ?? [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, selectedDifficulty]);

  const hasFilters = query.trim() || selectedDifficulty.size > 0;

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
            <Heart size={22} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Soothe Techniques</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{ALL_TECHNIQUES.length} techniques · calming, settling & comfort</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search techniques…"
            className="w-full pl-8 pr-8 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-700"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Difficulty filters */}
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map(d => (
            <button
              key={d.value}
              onClick={() => toggleDifficulty(d.value)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                selectedDifficulty.has(d.value)
                  ? DIFFICULTY_STYLES[d.value] + " border-current"
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
              )}
            >
              {d.label}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={() => { setQuery(""); setSelectedDifficulty(new Set()); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Count + expand */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{filtered.length} of {ALL_TECHNIQUES.length} techniques</span>
          <button
            onClick={() => setExpandAll(e => !e)}
            className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
          >
            {expandAll ? "Collapse all" : "Expand all"}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Heart size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No techniques match your search.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <TechniqueCard key={t.id} technique={t} forceOpen={expandAll} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
