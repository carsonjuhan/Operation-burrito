"use client";

import { useState, useEffect } from "react";
import { NotebookPen, Calendar } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import { NotesPanel } from "@/components/NotesPanel";
import { AppointmentsPanel } from "@/components/AppointmentsPanel";

type PlannerTab = "notes" | "appointments";

export default function PlannerPage() {
  const [tab, setTab] = useState<PlannerTab>("notes");

  // Sync the active sub-tab with the URL (?tab=appointments) so the bottom-nav
  // and the /appointments redirect can deep-link straight to the right panel.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "appointments") setTab("appointments");
  }, []);

  const selectTab = (next: PlannerTab) => {
    setTab(next);
    const url = next === "appointments" ? "?tab=appointments" : window.location.pathname;
    window.history.replaceState(null, "", url);
  };

  return (
    <PageTransition className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-stone-100">Planner</h1>
        <p className="text-sm text-stone-400 mt-1">Notes & appointments in one place.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/60 max-w-xs">
        {([
          { id: "notes", label: "Notes", icon: NotebookPen },
          { id: "appointments", label: "Appointments", icon: Calendar },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => selectTab(id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors",
              tab === id
                ? "bg-white dark:bg-stone-700 text-sage-700 dark:text-sage-300 shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            )}
            aria-current={tab === id ? "true" : undefined}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "notes" ? <NotesPanel /> : <AppointmentsPanel />}
    </PageTransition>
  );
}
