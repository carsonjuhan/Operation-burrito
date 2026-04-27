"use client";

import { PageErrorFallback } from "@/components/PageErrorFallback";

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageErrorFallback error={error} reset={reset} />;
}
