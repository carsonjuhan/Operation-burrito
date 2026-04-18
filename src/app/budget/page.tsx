"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStoreContext } from "@/contexts/StoreContext";
import { BudgetChart } from "@/components/BudgetChart";
import { ItemCategory, ItemPriority } from "@/types";
import { ExternalLink, ShoppingBag, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

const CATEGORIES: ItemCategory[] = [
  "Nursery", "Clothing", "Feeding", "Safety", "Travel",
  "Health & Hygiene", "Toys & Gear", "Postpartum", "Other",
];

const PRIORITY_COLORS: Record<ItemPriority, string> = {
  "Must Have": "bg-rose-100 text-rose-700",
  "Nice to Have": "bg-amber-100 text-amber-700",
  "Optional": "bg-stone-100 text-stone-500",
};

export default function BudgetPage() {
  const { store, loaded, updateItem } = useStoreContext();

  const categoryData = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const catItems = store.items.filter((i) => i.category === cat);
      const estimated = catItems.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
      const actual = catItems
        .filter((i) => i.purchased)
        .reduce((s, i) => s + (i.actualCost ?? i.estimatedCost ?? 0), 0);
      return {
        name: cat,
        estimated,
        actual,
        count: catItems.length,
        purchased: catItems.filter((i) => i.purchased).length,
      };
    }).filter((r) => r.count > 0);
  }, [store.items]);

  const totals = useMemo(() => {
    const allEstimated = store.items.reduce((s, i) => s + (i.estimatedCost ?? 0), 0);
    const allActual = store.items
      .filter((i) => i.purchased)
      .reduce((s, i) => s + (i.actualCost ?? i.estimatedCost ?? 0), 0);
    const remaining = store.items
      .filter((i) => !i.purchased)
      .reduce((s, i) => s + (i.estimatedCost ?? 0), 0);

    const thisMonth = (() => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return store.items
        .filter((i) => i.purchased && i.createdAt >= monthStart)
        .reduce((s, i) => s + (i.actualCost ?? i.estimatedCost ?? 0), 0);
    })();

    return { allEstimated, allActual, remaining, thisMonth };
  }, [store.items]);

  const mustHaveNeeded = useMemo(
    () =>
      store.items
        .filter((i) => i.priority === "Must Have" && !i.purchased)
        .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0)),
    [store.items]
  );

  if (!loaded) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Budget & Analytics</h1>
        <p className="text-sm text-stone-400 mt-1">
          {store.items.length} items tracked ·{" "}
          {store.items.filter((i) => i.purchased).length} purchased
        </p>
      </div>

      {/* Running Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TotalCard
          label="Estimated Total"
          value={totals.allEstimated}
          icon={<TrendingUp size={16} />}
          color="text-stone-700"
          bg="bg-stone-50"
        />
        <TotalCard
          label="Actual Spent"
          value={totals.allActual}
          icon={<CheckCircle2 size={16} />}
          color="text-sage-700"
          bg="bg-sage-50"
        />
        <TotalCard
          label="Still Needed"
          value={totals.remaining}
          icon={<ShoppingBag size={16} />}
          color="text-amber-700"
          bg="bg-amber-50"
        />
        <TotalCard
          label="This Month"
          value={totals.thisMonth}
          icon={<TrendingUp size={16} />}
          color="text-sky-700"
          bg="bg-sky-50"
        />
      </div>

      {/* Spending by Category */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Spending by Category</h2>
        {categoryData.length === 0 ? (
          <p className="text-sm text-stone-400">
            No items yet.{" "}
            <Link href="/items" className="text-sage-600 hover:underline">
              Add items
            </Link>{" "}
            with estimated costs to see the breakdown.
          </p>
        ) : (
          <BudgetChart rows={categoryData} />
        )}
      </div>

      {/* Missing Critical Items */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle
            size={16}
            className={mustHaveNeeded.length > 0 ? "text-rose-500" : "text-stone-300"}
          />
          <h2 className="text-sm font-semibold text-stone-700">
            Must-Have Items Still Needed
          </h2>
          {mustHaveNeeded.length > 0 && (
            <span className="badge bg-rose-100 text-rose-700 ml-auto">
              {mustHaveNeeded.length} remaining ·{" "}
              ~$
              {mustHaveNeeded
                .reduce((s, i) => s + (i.estimatedCost ?? 0), 0)
                .toFixed(0)}
            </span>
          )}
        </div>

        {mustHaveNeeded.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle2 size={16} />
            All must-have items purchased!
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {mustHaveNeeded.map((item) => (
              <div key={item.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-700">{item.name}</span>
                    <span className={clsx("badge", PRIORITY_COLORS[item.priority])}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-stone-400">{item.category}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.estimatedCost != null && (
                    <span className="text-sm font-medium text-stone-600">
                      ${item.estimatedCost}
                    </span>
                  )}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-300 hover:text-sage-600 transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => updateItem(item.id, { purchased: true })}
                    className="text-xs btn-secondary py-1"
                  >
                    Mark purchased
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registry Reference */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">Registry Reference</h2>
        {store.registryUrl ? (
          <div className="space-y-2">
            <p className="text-sm text-stone-500">
              Cross-reference your purchases against your Amazon baby registry. Items
              imported via receipt scanner can be matched to registry items.
            </p>
            <a
              href={store.registryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex"
            >
              <ShoppingBag size={15} />
              Open Amazon Registry
              <ExternalLink size={13} />
            </a>
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            No registry saved yet.{" "}
            <Link href="/settings" className="text-sage-600 hover:underline">
              Add your Amazon registry URL in Settings →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function TotalCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div className={clsx("card p-4", bg)}>
      <div className={clsx("flex items-center gap-1.5 mb-2", color)}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={clsx("text-xl font-bold", color)}>
        {value > 0 ? `$${value.toFixed(0)}` : "—"}
      </p>
    </div>
  );
}
