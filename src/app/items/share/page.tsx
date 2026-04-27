"use client";

import { useState, useEffect, useMemo } from "react";
import { BabyItem, ItemCategory, ItemPriority } from "@/types";
import { decodeRegistry } from "@/lib/registryShare";
import { ShoppingBag, AlertCircle, Eye, CheckCircle2, Circle } from "lucide-react";

const PRIORITY_COLORS: Record<ItemPriority, string> = {
  "Must Have": "bg-rose-100 text-rose-700",
  "Nice to Have": "bg-amber-100 text-amber-700",
  "Optional": "bg-stone-100 text-stone-500",
};

export default function SharedRegistryPage() {
  const [items, setItems] = useState<BabyItem[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setError(true);
      setLoading(false);
      return;
    }
    const decoded = decodeRegistry(hash);
    if (decoded) {
      setItems(decoded);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  const grouped = useMemo(() => {
    if (!items) return {} as Record<ItemCategory, BabyItem[]>;
    const groups: Partial<Record<ItemCategory, BabyItem[]>> = {};
    for (const item of items) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, [items]);

  const stats = useMemo(() => {
    if (!items) return { total: 0, purchased: 0, needed: 0, totalCost: 0 };
    const purchased = items.filter((i) => i.purchased).length;
    const totalCost = items
      .filter((i) => !i.purchased && i.estimatedCost)
      .reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);
    return { total: items.length, purchased, needed: items.length - purchased, totalCost };
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading registry...</div>
      </div>
    );
  }

  if (error || !items) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertCircle size={48} className="text-stone-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-stone-800 mb-2">Invalid or Expired Link</h1>
          <p className="text-sm text-stone-500">
            This registry link is invalid or has been revoked. Please ask the owner to share a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={20} className="text-sage-600" />
            <h1 className="text-2xl font-bold text-stone-800">Baby Registry</h1>
          </div>

          {/* Read-only banner */}
          <div className="card p-3 mb-4 flex items-center gap-2 bg-blue-50 border-blue-100">
            <Eye size={14} className="text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700">This is a read-only view of a shared baby registry.</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-stone-500">
              {stats.total} items total
            </span>
            <span className="text-emerald-600 font-medium">
              {stats.purchased} purchased
            </span>
            <span className="text-amber-600 font-medium">
              {stats.needed} still needed
            </span>
            {stats.totalCost > 0 && (
              <span className="text-stone-500">
                ~${stats.totalCost.toFixed(0)} remaining budget
              </span>
            )}
          </div>
        </div>

        {/* Category groups */}
        <div className="space-y-4">
          {(Object.keys(grouped) as ItemCategory[]).map((cat) => {
            const catItems = grouped[cat]!;
            const purchasedInCat = catItems.filter((i) => i.purchased).length;
            const progress = Math.round((purchasedInCat / catItems.length) * 100);

            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                {/* Category header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-stone-700">{cat}</h2>
                    <span className="badge bg-stone-100 text-stone-500 text-xs">
                      {catItems.length} items
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400">
                      {purchasedInCat}/{catItems.length}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-stone-100">
                  {catItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        item.purchased ? "opacity-60" : ""
                      }`}
                    >
                      {/* Status icon */}
                      <div className="shrink-0">
                        {item.purchased ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : (
                          <Circle size={20} className="text-stone-300" />
                        )}
                      </div>

                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium ${
                              item.purchased
                                ? "line-through text-stone-400"
                                : "text-stone-800"
                            }`}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`badge text-xs ${PRIORITY_COLORS[item.priority]}`}
                          >
                            {item.priority}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-stone-400 mt-0.5 truncate">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Cost */}
                      {item.estimatedCost != null && (
                        <span className="text-xs text-stone-400 shrink-0">
                          ${item.estimatedCost}
                        </span>
                      )}

                      {/* Link */}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sage-600 hover:text-sage-700 underline shrink-0"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 text-center">
          <p className="text-xs text-stone-400">Shared via Operation Burrito</p>
        </div>
      </div>
    </div>
  );
}
