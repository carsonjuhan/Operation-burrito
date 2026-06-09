"use client";

import { useState, useMemo } from "react";
import { Stethoscope, Search, X, ChevronDown, ChevronUp, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import type { Symptom } from "@/types";
import symptomsData from "../../../data/symptoms.json";

const ALL_SYMPTOMS: Symptom[] = symptomsData.symptoms as Symptom[];

function SymptomCard({ symptom, forceOpen }: { symptom: Symptom; forceOpen: boolean }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceOpen || localOpen;
  const hasER = symptom.goERIf && symptom.goERIf.length > 0;

  return (
    <div className={clsx(
      "bg-white dark:bg-neutral-800 rounded-xl border overflow-hidden",
      hasER ? "border-red-200 dark:border-red-900/50" : "border-neutral-200 dark:border-neutral-700"
    )}>
      <button
        className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        onClick={() => setLocalOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-xl leading-none mt-0.5">{symptom.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{symptom.name}</h3>
            {hasER && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
                ER risk
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">{symptom.description}</p>
        </div>
        <div className="mt-1 text-neutral-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-700 space-y-3 pt-3">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{symptom.description}</p>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
              <Info size={12} /> What&apos;s normal
            </div>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">{symptom.normalRange}</p>
          </div>

          {symptom.ageNote && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">{symptom.ageNote}</p>
          )}

          {symptom.callDoctorIf.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                <AlertTriangle size={12} /> Call your doctor if…
              </div>
              <ul className="space-y-1">
                {symptom.callDoctorIf.map((c, i) => (
                  <li key={i} className="text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {symptom.goERIf && symptom.goERIf.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">
                <AlertOctagon size={12} /> Go to ER / call 000 if…
              </div>
              <ul className="space-y-1">
                {symptom.goERIf.map((g, i) => (
                  <li key={i} className="text-sm text-red-800 dark:text-red-300 flex gap-2">
                    <span className="shrink-0 mt-0.5 font-bold">!</span>
                    <span>{g}</span>
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

export default function SymptomsPage() {
  const [query, setQuery] = useState("");
  const [erOnly, setErOnly] = useState(false);
  const [expandAll, setExpandAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_SYMPTOMS.filter(s => {
      if (erOnly && !(s.goERIf && s.goERIf.length > 0)) return false;
      if (q) {
        const hay = [s.name, s.description, s.normalRange, ...s.callDoctorIf, ...(s.goERIf ?? []), s.ageNote ?? ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, erOnly]);

  const hasFilters = query.trim() || erOnly;

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <Stethoscope size={22} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Symptom Checker</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{ALL_SYMPTOMS.length} symptoms · what&apos;s normal, when to call, when to go</p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <strong>Note:</strong> This is a reference guide, not medical advice. When in doubt, call your paediatrician.
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search symptoms…"
            className="w-full pl-8 pr-8 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 dark:focus:ring-teal-700"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setErOnly(e => !e)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              erOnly
                ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
            )}
          >
            🚨 ER risks only
          </button>
          {hasFilters && (
            <button
              onClick={() => { setQuery(""); setErOnly(false); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Count */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{filtered.length} of {ALL_SYMPTOMS.length} symptoms</span>
          <button
            onClick={() => setExpandAll(e => !e)}
            className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            {expandAll ? "Collapse all" : "Expand all"}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Stethoscope size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No symptoms match your search.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => (
              <SymptomCard key={s.id} symptom={s} forceOpen={expandAll} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
