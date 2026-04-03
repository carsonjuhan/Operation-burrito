"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  GraduationCap,
  BookOpen,
  Heart,
  StickyNote,
  Settings,
  Github,
} from "lucide-react";
import clsx from "clsx";
import { getPAT, getGistId, getLastSynced } from "@/lib/gistSync";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/items", label: "Baby Items", icon: ShoppingCart },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/materials", label: "Materials", icon: BookOpen },
  { href: "/birth-plan", label: "Birth Plan", icon: Heart },
  { href: "/notes", label: "Notes", icon: StickyNote },
];

export function Sidebar() {
  const pathname = usePathname();
  const [syncState, setSyncState] = useState<{ connected: boolean; lastSynced: string }>({
    connected: false,
    lastSynced: "",
  });

  useEffect(() => {
    setSyncState({
      connected: !!(getPAT() && getGistId()),
      lastSynced: getLastSynced(),
    });
  }, [pathname]); // refresh on navigation so Settings changes reflect immediately

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-stone-200 flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌯</span>
          <div>
            <h1 className="text-base font-bold text-stone-800 leading-tight">Operation Burrito</h1>
            <p className="text-xs text-stone-400">Baby Prep Tracker</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sage-100 text-sage-700"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-stone-100 pt-3 space-y-1">
        {/* Settings link */}
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-sage-100 text-sage-700"
              : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
          )}
        >
          <Settings size={18} />
          Settings
        </Link>

        {/* Sync status */}
        <div className="px-3 py-2 flex items-center gap-2">
          <Github size={13} className={syncState.connected ? "text-emerald-500" : "text-stone-300"} />
          {syncState.connected ? (
            <div className="min-w-0">
              <p className="text-xs text-emerald-600 font-medium">GitHub connected</p>
              {syncState.lastSynced && (
                <p className="text-xs text-stone-400 truncate">
                  {new Date(syncState.lastSynced).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-stone-300">Not synced to GitHub</p>
          )}
        </div>
      </div>
    </aside>
  );
}
