"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Baby, NotebookPen, BookOpen, Timer, Plus } from "lucide-react";
import clsx from "clsx";
import { useStoreContext } from "@/contexts/StoreContext";
import { QuickLogSheet } from "@/components/QuickLogSheet";
import { NEWBORN_UPDATED_EVENT, loadNewbornData } from "@/lib/newbornTracker";

interface Tab {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Extra paths that should also mark this tab active (e.g. merged/redirected routes) */
  match?: string[];
}

const LEFT_TABS: Tab[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/newborn", label: "Tracker", icon: Baby },
];

const RIGHT_TABS: Tab[] = [
  { href: "/notes", label: "Planner", icon: NotebookPen, match: ["/appointments"] },
  { href: "/guides", label: "Guides", icon: BookOpen },
];

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function BottomNav() {
  const pathname = usePathname();
  const { store } = useStoreContext();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasEvents, setHasEvents] = useState(false);

  // Baby is considered here once the due date passes or tracking has begun
  useEffect(() => {
    const check = () => setHasEvents(loadNewbornData().events.length > 0);
    check();
    window.addEventListener(NEWBORN_UPDATED_EVENT, check);
    return () => window.removeEventListener(NEWBORN_UPDATED_EVENT, check);
  }, []);

  const daysLeft = daysUntil(store.birthPlan?.personalInfo?.dueDate ?? "");
  const babyHere = (daysLeft != null && daysLeft < 0) || hasEvents;

  const renderTab = ({ href, label, icon: Icon, match }: Tab) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href)) || (match?.some(m => pathname.startsWith(m)) ?? false);
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          "flex-1 flex items-center justify-center transition-colors active:scale-95",
          active
            ? "text-sage-600 dark:text-sage-400"
            : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
        )}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        title={label}
      >
        <Icon size={23} strokeWidth={active ? 2.5 : 1.75} />
      </Link>
    );
  };

  const fabCls =
    "w-14 h-14 -mt-5 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 text-white shadow-lg shadow-sage-600/30 " +
    "flex items-center justify-center active:scale-95 transition-transform border-4 border-stone-50 dark:border-stone-900";

  return (
    <>
      <QuickLogSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-stone-200/60 dark:border-stone-700/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Bottom navigation"
      >
        <div className="flex items-stretch h-14">
          {LEFT_TABS.map(renderTab)}

          {/* Center action: contraction timer pre-birth, quick log once baby is here */}
          <div className="flex-1 flex items-start justify-center">
            {babyHere ? (
              <button onClick={() => setSheetOpen(true)} className={fabCls} aria-label="Quick log feed, sleep or diaper" title="Quick log">
                <Plus size={26} strokeWidth={2.5} />
              </button>
            ) : (
              <Link href="/timer" className={fabCls} aria-label="Contraction timer" title="Contraction timer">
                <Timer size={24} strokeWidth={2.25} />
              </Link>
            )}
          </div>

          {RIGHT_TABS.map(renderTab)}
        </div>
      </nav>
    </>
  );
}
