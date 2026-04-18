"use client";

interface CategoryRow {
  name: string;
  estimated: number;
  actual: number;
  count: number;
  purchased: number;
}

interface Props {
  rows: CategoryRow[];
}

export function BudgetChart({ rows }: Props) {
  const maxValue = Math.max(...rows.map((r) => Math.max(r.estimated, r.actual)), 1);

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const estimatedPct = Math.min((row.estimated / maxValue) * 100, 100);
        const actualPct = Math.min((row.actual / maxValue) * 100, 100);

        return (
          <div key={row.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-700">{row.name}</span>
                <span className="text-xs text-stone-400">
                  {row.purchased}/{row.count} purchased
                </span>
              </div>
              <div className="text-xs text-stone-500 text-right">
                {row.actual > 0 && (
                  <span className="text-sage-700 font-medium">${row.actual.toFixed(0)} spent</span>
                )}
                {row.estimated > 0 && row.actual > 0 && (
                  <span className="text-stone-300 mx-1">·</span>
                )}
                {row.estimated > 0 && (
                  <span className="text-stone-400">${row.estimated.toFixed(0)} est.</span>
                )}
              </div>
            </div>

            {/* Bar track */}
            <div className="relative h-5 bg-stone-100 rounded-full overflow-hidden">
              {/* Estimated (background) */}
              {row.estimated > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-stone-200 rounded-full transition-all duration-500"
                  style={{ width: `${estimatedPct}%` }}
                />
              )}
              {/* Actual (foreground) */}
              {row.actual > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-sage-400 rounded-full transition-all duration-500"
                  style={{ width: `${actualPct}%` }}
                />
              )}
              {/* No data */}
              {row.estimated === 0 && row.actual === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-stone-300">no cost data</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-sage-400" />
          <span className="text-xs text-stone-500">Actual spent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-stone-200" />
          <span className="text-xs text-stone-500">Estimated</span>
        </div>
      </div>
    </div>
  );
}
