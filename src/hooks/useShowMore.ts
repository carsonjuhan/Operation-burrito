"use client";

import { useState, useCallback, useMemo } from "react";

const DEFAULT_PAGE_SIZE = 50;

export function useShowMore(totalCount: number, pageSize: number = DEFAULT_PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const effectiveVisible = Math.min(visibleCount, totalCount);
  const hasMore = effectiveVisible < totalCount;
  const remaining = totalCount - effectiveVisible;

  const showMore = useCallback(() => {
    setVisibleCount((prev) => prev + pageSize);
  }, [pageSize]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  return useMemo(
    () => ({ visibleCount: effectiveVisible, showMore, hasMore, remaining, reset }),
    [effectiveVisible, showMore, hasMore, remaining, reset]
  );
}
