"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Star, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import type { MilestoneCategory } from "@/types";

const STORAGE_KEY = "milestones_tracker";

interface Milestone {
  id: string;
  label: string;
  ageRangeWeeks: [number, number];
  category: MilestoneCategory;
  achievedAt?: string;
}

const ALL_MILESTONES: Milestone[] = [
  // 0–2 weeks
  { id: "m1", label: "Focuses on faces within 20–30 cm", ageRangeWeeks: [0, 2], category: "Vision & Hearing" },
  { id: "m2", label: "Reacts to loud sounds (startle/Moro reflex)", ageRangeWeeks: [0, 2], category: "Vision & Hearing" },
  { id: "m3", label: "Turns head toward voice or sound", ageRangeWeeks: [0, 2], category: "Vision & Hearing" },
  { id: "m4", label: "Makes small fist-clenching movements", ageRangeWeeks: [0, 2], category: "Motor" },
  { id: "m5", label: "Rooting reflex — turns toward cheek touch", ageRangeWeeks: [0, 2], category: "Motor" },
  { id: "m6", label: "Cries to communicate hunger, discomfort", ageRangeWeeks: [0, 2], category: "Communication" },
  { id: "m7", label: "Calms briefly at a parent's voice", ageRangeWeeks: [0, 2], category: "Social" },

  // 2–4 weeks
  { id: "m8", label: "Briefly lifts head during tummy time", ageRangeWeeks: [2, 4], category: "Motor" },
  { id: "m9", label: "Eyes track a slowly moving object briefly", ageRangeWeeks: [2, 4], category: "Vision & Hearing" },
  { id: "m10", label: "Makes soft sounds (grunts, small coos)", ageRangeWeeks: [2, 4], category: "Communication" },
  { id: "m11", label: "Shows a fleeting first social smile (reflexive)", ageRangeWeeks: [2, 4], category: "Social" },
  { id: "m12", label: "Recognises mum/dad's voice distinctly", ageRangeWeeks: [2, 4], category: "Social" },

  // 4–6 weeks
  { id: "m13", label: "First intentional social smile", ageRangeWeeks: [4, 6], category: "Social" },
  { id: "m14", label: "Eyes track moving object side to side", ageRangeWeeks: [4, 6], category: "Vision & Hearing" },
  { id: "m15", label: "Holds head up for a few seconds during tummy time", ageRangeWeeks: [4, 6], category: "Motor" },
  { id: "m16", label: "Different cries for different needs (hunger vs tired)", ageRangeWeeks: [4, 6], category: "Communication" },

  // 6–8 weeks
  { id: "m17", label: "Smiles responsively at faces", ageRangeWeeks: [6, 8], category: "Social" },
  { id: "m18", label: "Cooing sounds in response to talking", ageRangeWeeks: [6, 8], category: "Communication" },
  { id: "m19", label: "Holds head at 45° during tummy time", ageRangeWeeks: [6, 8], category: "Motor" },
  { id: "m20", label: "Visually follows faces across midline", ageRangeWeeks: [6, 8], category: "Vision & Hearing" },
  { id: "m21", label: "Shows excitement (kicking, arm movements) when sees caregiver", ageRangeWeeks: [6, 8], category: "Social" },

  // 8–12 weeks
  { id: "m22", label: "Laughs out loud", ageRangeWeeks: [8, 12], category: "Social" },
  { id: "m23", label: "Back and forth 'conversation' cooing", ageRangeWeeks: [8, 12], category: "Communication" },
  { id: "m24", label: "Holds head steady when held upright", ageRangeWeeks: [8, 12], category: "Motor" },
  { id: "m25", label: "Follows objects past midline smoothly", ageRangeWeeks: [8, 12], category: "Vision & Hearing" },
  { id: "m26", label: "Recognises and reacts to own name", ageRangeWeeks: [8, 12], category: "Communication" },
  { id: "m27", label: "Bears weight on forearms during tummy time", ageRangeWeeks: [8, 12], category: "Motor" },
  { id: "m28", label: "Opens and shuts hands, swipes at objects", ageRangeWeeks: [8, 12], category: "Motor" },
];

type AgeGroup = { label: string; weeks: [number, number] };

const AGE_GROUPS: AgeGroup[] = [
  { label: "0–2 weeks", weeks: [0, 2] },
  { label: "2–4 weeks", weeks: [2, 4] },
  { label: "4–6 weeks", weeks: [4, 6] },
  { label: "6–8 weeks", weeks: [6, 8] },
  { label: "8–12 weeks", weeks: [8, 12] },
];

const CATEGORY_COLORS: Record<MilestoneCategory, string> = {
  Motor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Social: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Communication: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Vision & Hearing": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

function formatAchievedDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MilestonesPage() {
  const [achieved, setAchieved] = useState<Record<string, string>>({});
  const [selectedCategories, setSelectedCategories] = useState<Set<MilestoneCategory>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAchieved(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  const toggle = useCallback((id: string) => {
    setAchieved(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = new Date().toISOString();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleCategory = (cat: MilestoneCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const totalAchieved = Object.keys(achieved).length;

  const filteredMilestones = useMemo(() => {
    if (selectedCategories.size === 0) return ALL_MILESTONES;
    return ALL_MILESTONES.filter(m => selectedCategories.has(m.category));
  }, [selectedCategories]);

  const categories: MilestoneCategory[] = ["Motor", "Social", "Communication", "Vision & Hearing"];

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <Star size={22} className="text-yellow-500 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Milestones</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {totalAchieved} of {ALL_MILESTONES.length} achieved · 0–3 months
              </p>
            </div>
          </div>
          {totalAchieved > 0 && (
            <button
              onClick={() => {
                setAchieved({});
                localStorage.removeItem(STORAGE_KEY);
              }}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                selectedCategories.has(cat)
                  ? CATEGORY_COLORS[cat] + " border-current"
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        {ALL_MILESTONES.length > 0 && (
          <div className="space-y-1">
            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 dark:bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${(totalAchieved / ALL_MILESTONES.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Age groups */}
        <div className="space-y-4">
          {AGE_GROUPS.map(group => {
            const groupMilestones = filteredMilestones.filter(
              m => m.ageRangeWeeks[0] === group.weeks[0] && m.ageRangeWeeks[1] === group.weeks[1]
            );
            if (groupMilestones.length === 0) return null;
            const groupAchieved = groupMilestones.filter(m => achieved[m.id]).length;

            return (
              <div key={group.label} className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{group.label}</h2>
                  <span className="text-xs text-neutral-400">{groupAchieved}/{groupMilestones.length}</span>
                </div>
                <div className="space-y-1.5">
                  {groupMilestones.map(m => {
                    const isAchieved = !!achieved[m.id];
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        className={clsx(
                          "w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border transition-all",
                          isAchieved
                            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                            : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                        )}
                      >
                        <div className={clsx(
                          "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          isAchieved
                            ? "bg-yellow-400 border-yellow-400"
                            : "border-neutral-300 dark:border-neutral-600"
                        )}>
                          {isAchieved && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            "text-sm",
                            isAchieved ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-800 dark:text-neutral-200"
                          )}>
                            {m.label}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={clsx("text-xs px-1.5 py-0.5 rounded-full font-medium", CATEGORY_COLORS[m.category])}>
                              {m.category}
                            </span>
                            {isAchieved && achieved[m.id] && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                                ✨ {formatAchievedDate(achieved[m.id])}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-neutral-400 text-center pb-2">
          Milestones vary widely — these are typical ranges, not strict deadlines. Talk to your paediatrician with any concerns.
        </p>
      </div>
    </PageTransition>
  );
}
