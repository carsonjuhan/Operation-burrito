"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  GraduationCap,
  BookOpen,
  Heart,
  StickyNote,
} from "lucide-react";
import clsx from "clsx";

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
      <div className="px-6 py-4 border-t border-stone-100">
        <p className="text-xs text-stone-300">All data stored locally</p>
      </div>
    </aside>
  );
}
