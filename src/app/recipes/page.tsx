"use client";

import { useState, useMemo } from "react";
import { UtensilsCrossed, Search, X, ChevronDown, ChevronUp, Clock, Users } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import type { PostpartumRecipe, RecipeProtein, RecipeCuisine, RecipePhase } from "@/types";
import recipesData from "../../../data/postpartum_recipes.json";

const ALL_RECIPES: PostpartumRecipe[] = recipesData.recipes as PostpartumRecipe[];

const PROTEIN_OPTIONS: { value: RecipeProtein; label: string }[] = [
  { value: "chicken", label: "Chicken" },
  { value: "pork", label: "Pork" },
  { value: "fish", label: "Fish" },
  { value: "beef", label: "Beef" },
  { value: "tofu", label: "Tofu" },
  { value: "egg", label: "Egg" },
  { value: "other", label: "Other" },
];

const CUISINE_OPTIONS: { value: RecipeCuisine; label: string }[] = [
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
];

const PHASE_OPTIONS: { value: RecipePhase; label: string; labelZh: string; days: string }[] = [
  { value: "rest", label: "Rest Period", labelZh: "休養期", days: "Days 0–7" },
  { value: "warm", label: "Warm Toning", labelZh: "溫補期", days: "Days 8–22" },
  { value: "major", label: "Major Toning", labelZh: "大補期", days: "Days 23–30" },
  { value: "maintenance", label: "Maintenance", labelZh: "保養期", days: "Day 31+" },
];

export default function RecipesPage() {
  const [query, setQuery] = useState("");
  const [selectedProteins, setSelectedProteins] = useState<Set<RecipeProtein>>(new Set());
  const [selectedCuisines, setSelectedCuisines] = useState<Set<RecipeCuisine>>(new Set());
  const [selectedPhases, setSelectedPhases] = useState<Set<RecipePhase>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleFilter = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_RECIPES.filter((r) => {
      if (selectedProteins.size > 0 && !selectedProteins.has(r.protein)) return false;
      if (selectedCuisines.size > 0 && !selectedCuisines.has(r.cuisine)) return false;
      if (selectedPhases.size > 0 && !r.phase.some((p) => selectedPhases.has(p))) return false;
      if (q) {
        const haystack = [
          r.name_en, r.name_zh ?? "", r.name_ja ?? "",
          ...r.ingredients, ...(r.tags ?? []),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [query, selectedProteins, selectedCuisines, selectedPhases]);

  const hasFilters = query.trim() || selectedProteins.size > 0 || selectedCuisines.size > 0 || selectedPhases.size > 0;

  const clearAll = () => {
    setQuery("");
    setSelectedProteins(new Set());
    setSelectedCuisines(new Set());
    setSelectedPhases(new Set());
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageTransition className="max-w-4xl mx-auto pt-10 md:pt-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed size={20} className="text-sage-600" />
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Postpartum Recipes</h1>
        </div>
        <p className="text-sm text-stone-400 dark:text-stone-500">
          {ALL_RECIPES.length} traditional Chinese & Japanese recovery recipes across 4 postpartum phases.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          type="text"
          className="input pl-10 py-3 text-base"
          placeholder="Search by name, ingredient, or tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Phase */}
        <div>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">Recovery Phase</p>
          <div className="flex flex-wrap gap-2">
            {PHASE_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => toggleFilter(selectedPhases, p.value, setSelectedPhases)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  selectedPhases.has(p.value)
                    ? "bg-sage-100 border-sage-300 text-sage-800 dark:bg-sage-900 dark:border-sage-700 dark:text-sage-200"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
                )}
              >
                {p.labelZh} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Protein */}
        <div>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">Protein</p>
          <div className="flex flex-wrap gap-2">
            {PROTEIN_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => toggleFilter(selectedProteins, p.value, setSelectedProteins)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  selectedProteins.has(p.value)
                    ? "bg-sage-100 border-sage-300 text-sage-800 dark:bg-sage-900 dark:border-sage-700 dark:text-sage-200"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cuisine */}
        <div>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5 uppercase tracking-wide">Cuisine</p>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => toggleFilter(selectedCuisines, c.value, setSelectedCuisines)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  selectedCuisines.has(c.value)
                    ? "bg-sage-100 border-sage-300 text-sage-800 dark:bg-sage-900 dark:border-sage-700 dark:text-sage-200"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count + clear */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {filtered.length} recipe{filtered.length !== 1 ? "s" : ""}
          {hasFilters && filtered.length !== ALL_RECIPES.length && ` of ${ALL_RECIPES.length}`}
        </p>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-sage-600 hover:underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <UtensilsCrossed size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm mb-2">No recipes match your filters.</p>
          <button onClick={clearAll} className="text-sm text-sage-600 hover:underline">
            Reset filters
          </button>
        </div>
      )}

      {/* Recipe grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            expanded={expandedIds.has(recipe.id)}
            onToggle={() => toggleExpanded(recipe.id)}
          />
        ))}
      </div>
    </PageTransition>
  );
}

// ── Recipe Card ─────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  expanded,
  onToggle,
}: {
  recipe: PostpartumRecipe;
  expanded: boolean;
  onToggle: () => void;
}) {
  const bilingualName = recipe.name_zh ?? recipe.name_ja ?? "";
  const cuisineFlag = recipe.cuisine === "chinese" ? "🇨🇳" : "🇯🇵";

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-tight">
              {cuisineFlag} {recipe.name_en}
            </p>
            {bilingualName && (
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{bilingualName}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-stone-400 dark:text-stone-500">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {recipe.prepTime}min
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} /> {recipe.servings}
              </span>
              <span className="capitalize">{recipe.protein}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.phase.map((p) => {
                const phaseInfo = PHASE_OPTIONS.find((o) => o.value === p);
                return (
                  <span
                    key={p}
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-sage-50 text-sage-700 dark:bg-sage-900 dark:text-sage-300"
                  >
                    {phaseInfo?.labelZh} {phaseInfo?.label}
                  </span>
                );
              })}
            </div>
          </div>
          <span className="shrink-0 text-stone-300 dark:text-stone-600 mt-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-100 dark:border-stone-800 pt-3 space-y-3">
          {/* Ingredients */}
          <div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Ingredients</p>
            <ul className="space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-xs text-stone-500 dark:text-stone-400 flex items-start gap-1.5">
                  <span className="text-sage-400 mt-0.5">•</span>
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Instructions</p>
            <ol className="space-y-1">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="text-xs text-stone-500 dark:text-stone-400 flex items-start gap-2">
                  <span className="text-sage-500 font-semibold shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
