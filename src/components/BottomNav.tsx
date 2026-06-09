"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Baby, StickyNote, GraduationCap } from "lucide-react";
import clsx from "clsx";

const TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/newborn", label: "Tracker", icon: Baby },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/classes", label: "Classes", icon: GraduationCap },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-stone-200/60 dark:border-stone-700/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch h-14">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95",
                active
                  ? "text-sage-600 dark:text-sage-400"
                  : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className={clsx("text-[10px] font-medium", active ? "text-sage-600 dark:text-sage-400" : "")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
