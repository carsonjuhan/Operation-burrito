"use client";

import { PageErrorFallback } from "@/components/PageErrorFallback";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageErrorFallback error={error} reset={reset} />;
}
