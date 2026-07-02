"use client";

import { PageTransition } from "@/components/PageTransition";
import { SleepTrainingPanel } from "@/components/SleepTrainingPanel";

export default function SleepTrainingPage() {
  return (
    <PageTransition className="max-w-xl mx-auto pb-8">
      <SleepTrainingPanel />
    </PageTransition>
  );
}
