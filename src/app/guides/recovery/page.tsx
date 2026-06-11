"use client";

import { useState, useMemo } from "react";
import { Wind, Search, X, ChevronDown, ChevronUp, AlertTriangle, Phone, Lightbulb } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import recoveryData from "../../../../data/recovery_guide.json";

type RecoveryCategory = "caution" | "anatomy" | "technique";

interface RecoverySection {
  id: string;
  title: string;
  category: RecoveryCategory;
  summary: string;
  tips: string[];
  warnings?: string[];
  whenToCall?: string[];
}

const ALL_SECTIONS: RecoverySection[] = recoveryData.sections as RecoverySection[];

const CATEGORY_OPTIONS: { value: RecoveryCategory; label: string; emoji: string; color: string }[] = [
  { value: "caution", label: "Caution", emoji: "⚠️", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  { value: "anatomy", label: "Your Body", emoji: "🦴", color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800" },
  { value: "technique", label: "Technique", emoji: "🌬️", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
];

const BADGE_STYLES: Record<RecoveryCategory, string> = {
  caution: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  anatomy: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  technique: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function RecoveryGuidePage() {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<RecoveryCategory>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const toggleCategory = (cat: RecoveryCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_SECTIONS.filter(s => {
      if (selectedCategories.size > 0 && !selectedCategories.has(s.category)) return false;
      if (q) {
        const hay = [s.title, s.summary, ...s.tips, ...(s.warnings ?? []), ...(s.whenToCall ?? [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, selectedCategories]);

  const hasFilters = query.trim() || selectedCategories.size > 0;

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
            <Wind size={22} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Postpartum Recovery Guide</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{ALL_SECTIONS.length} topics · 360° breathing, pelvic floor & core realignment</p>
          </div>
        </div>

        {/* 3s in / 6-8s out reminder strip */}
        <div className="flex items-stretch gap-2 text-center">
          <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl py-2.5 px-2">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">3s</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Inhale · nose</p>
          </div>
          <div className="flex-1 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800 rounded-xl py-2.5 px-2">
            <p className="text-lg font-bold text-pink-600 dark:text-pink-400">6–8s</p>
            <p className="text-[11px] text-pink-700 dark:text-pink-300">Exhale · mouth</p>
          </div>
          <div className="flex-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl py-2.5 px-2">
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">∞</p>
            <p className="text-[11px] text-violet-700 dark:text-violet-300">Repeat · relaxed</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search recovery topics…"
            className="w-full pl-8 pr-8 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(cat => (
            <button
              key={cat.value}
              onClick={() => toggleCategory(cat.value)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                selectedCategories.has(cat.value)
                  ? cat.color
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
              )}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={() => { setQuery(""); setSelectedCategories(new Set()); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Count */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{filtered.length} of {ALL_SECTIONS.length} topics</span>
          <button
            onClick={() => setExpandAll(e => !e)}
            className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
          >
            {expandAll ? "Collapse all" : "Expand all"}
          </button>
        </div>

        {/* Sections */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Wind size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No topics match your search.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(section => (
              <ExpandableCard key={section.id} section={section} forceOpen={expandAll} />
            ))}
          </div>
        )}

        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center pb-4">
          General guidance only — clear any postpartum exercise with your care provider, especially after a C-section.
        </p>
      </div>
    </PageTransition>
  );
}

function ExpandableCard({ section, forceOpen }: { section: RecoverySection; forceOpen: boolean }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceOpen || localOpen;
  const cat = CATEGORY_OPTIONS.find(c => c.value === section.category);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <button
        className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        onClick={() => setLocalOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", BADGE_STYLES[section.category])}>
              {cat?.emoji} {cat?.label}
            </span>
          </div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-snug">{section.title}</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{section.summary}</p>
        </div>
        <div className="mt-1 text-neutral-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-700 space-y-3 pt-3">
          {section.tips.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                <Lightbulb size={12} /> Tips
              </div>
              <ul className="space-y-1.5">
                {section.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.warnings && section.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                <AlertTriangle size={12} /> Watch out
              </div>
              <ul className="space-y-1">
                {section.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.whenToCall && section.whenToCall.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">
                <Phone size={12} /> When to call your provider
              </div>
              <ul className="space-y-1">
                {section.whenToCall.map((w, i) => (
                  <li key={i} className="text-sm text-red-800 dark:text-red-300 flex gap-2">
                    <span className="shrink-0 mt-0.5">📞</span>
                    <span>{w}</span>
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
