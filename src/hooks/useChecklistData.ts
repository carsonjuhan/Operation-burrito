import { useState, useEffect, useRef } from "react";
import type { ChecklistItem, ItemTiming } from "@/types";

export interface ChecklistData {
  CHECKLIST_ITEMS: ChecklistItem[];
  TIMING_OPTIONS: ItemTiming[];
  AMAZON_PURCHASED_ITEMS: any[];
  MATCHED_CHECKLIST_IDS: Set<string>;
  UNIQUE_INVENTORY_ITEMS: any[];
  MATCH_LOG: Array<{ inventory: string; checklist: string; matched: boolean }>;
}

// Module-level cache so data persists across component mounts / navigations
let cachedData: ChecklistData | null = null;

export function useChecklistData(): { data: ChecklistData | null; loading: boolean } {
  const [data, setData] = useState<ChecklistData | null>(cachedData);
  const [loading, setLoading] = useState<boolean>(cachedData === null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (cachedData) {
      // Already cached, nothing to do
      setData(cachedData);
      setLoading(false);
      return;
    }

    let cancelled = false;

    import("@/lib/checklistData").then((mod) => {
      if (cancelled || !mountedRef.current) return;

      const loaded: ChecklistData = {
        CHECKLIST_ITEMS: mod.CHECKLIST_ITEMS,
        TIMING_OPTIONS: mod.TIMING_OPTIONS,
        AMAZON_PURCHASED_ITEMS: mod.AMAZON_PURCHASED_ITEMS,
        MATCHED_CHECKLIST_IDS: mod.MATCHED_CHECKLIST_IDS,
        UNIQUE_INVENTORY_ITEMS: mod.UNIQUE_INVENTORY_ITEMS,
        MATCH_LOG: mod.MATCH_LOG,
      };

      cachedData = loaded;
      setData(loaded);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  return { data, loading };
}

// Exported for testing: reset the module-level cache
export function _resetCache(): void {
  cachedData = null;
}
