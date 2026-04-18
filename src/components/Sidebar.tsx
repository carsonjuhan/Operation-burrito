"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, GraduationCap, BookOpen,
  Heart, StickyNote, Settings, Github, Briefcase, Calendar,
  Phone, Timer, Search, X, Menu, PiggyBank,
} from "lucide-react";
import clsx from "clsx";
import { getPAT, getGistId, getLastSynced } from "@/lib/gistSync";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/items", label: "Baby Items", icon: ShoppingCart },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/hospital-bag", label: "Hospital Bag", icon: Briefcase },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/contacts", label: "Contacts", icon: Phone },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/materials", label: "Materials", icon: BookOpen },
  { href: "/birth-plan", label: "Birth Plan", icon: Heart },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/timer", label: "Contraction Timer", icon: Timer },
  { href: "/search", label: "Search", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [syncState, setSyncState] = useState({ connected: false, lastSynced: "" });

  useEffect(() => {
    setSyncState({ connected: !!(getPAT() && getGistId()), lastSynced: getLastSynced() });
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const navContent = (
    <>
      {/* Header */}
      <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌯</span>
          <div>
            <h1 className="text-base font-bold text-stone-800 leading-tight">Operation Burrito</h1>
            <p className="text-xs text-stone-400">Baby Prep Tracker</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden p-1 text-stone-400">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-sage-100 text-sage-700" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-stone-100 pt-3 space-y-0.5">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings" ? "bg-sage-100 text-sage-700" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
          )}
        >
          <Settings size={18} /> Settings
        </Link>
        <div className="px-3 py-2 flex items-center gap-2">
          <Github size={13} className={syncState.connected ? "text-emerald-500" : "text-stone-300"} />
          {syncState.connected ? (
            <div className="min-w-0">
              <p className="text-xs text-emerald-600 font-medium">GitHub connected</p>
              {syncState.lastSynced && (
                <p className="text-xs text-stone-400 truncate">
                  {new Date(syncState.lastSynced).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-stone-300">Not synced to GitHub</p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg border border-stone-200 shadow-sm"
      >
        <Menu size={20} className="text-stone-600" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — slide in on mobile, fixed on desktop */}
      <aside
        className={clsx(
          "fixed left-0 top-0 h-screen w-64 bg-white border-r border-stone-200 flex flex-col z-50 transition-transform duration-200",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
