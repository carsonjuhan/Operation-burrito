"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  LayoutDashboard, ShoppingCart, GraduationCap, BookOpen,
  Heart, StickyNote, Settings, Github, Briefcase, Calendar,
  Phone, Timer, Search, X, Menu, PiggyBank, AlertTriangle,
  RefreshCw, XCircle, WifiOff, UtensilsCrossed, ChevronRight, Baby,
  Moon, Stethoscope, TrendingUp, Star, ClipboardList, Wind,
} from "lucide-react";
import clsx from "clsx";
import { getPAT, getGistId, getLastSynced } from "@/lib/gistSync";
import { isStorageWarning } from "@/lib/storageMonitor";
import { useStoreContext } from "@/contexts/StoreContext";
import { useToast } from "@/contexts/ToastContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Preparation",
    items: [
      { href: "/items", label: "Baby Items & Checklist", icon: ShoppingCart },
      { href: "/budget", label: "Budget", icon: PiggyBank },
      { href: "/hospital-bag", label: "Hospital Bag & Prep", icon: Briefcase },
      { href: "/birth-plan", label: "Birth Plan", icon: Heart },
    ],
  },
  {
    heading: "Schedule",
    items: [
      { href: "/appointments", label: "Appointments", icon: Calendar },
      { href: "/contacts", label: "Contacts", icon: Phone },
      { href: "/classes", label: "Classes", icon: GraduationCap },
    ],
  },
  {
    heading: "Resources",
    items: [
      { href: "/recipes", label: "Postpartum Recipes", icon: UtensilsCrossed },
      { href: "/guides/recovery", label: "Recovery Guide", icon: Wind },
      { href: "/materials", label: "Materials", icon: BookOpen },
      { href: "/notes", label: "Notes", icon: StickyNote },
    ],
  },
  {
    heading: "Baby Care",
    items: [
      { href: "/postbirth", label: "Post-Birth Tasks", icon: ClipboardList },
      { href: "/newborn", label: "Newborn Tracker", icon: Baby },
      { href: "/guides/feeding", label: "Feeding Guide", icon: Heart },
      { href: "/guides/sleeping", label: "Sleeping Guide", icon: Moon },
      { href: "/soothe", label: "Soothe Techniques", icon: Baby },
      { href: "/symptoms", label: "Symptom Checker", icon: Stethoscope },
      { href: "/growth", label: "Growth Tracker", icon: TrendingUp },
      { href: "/milestones", label: "Milestones", icon: Star },
    ],
  },
  {
    heading: "Tools",
    items: [
      { href: "/timer", label: "Contraction Timer", icon: Timer },
      { href: "/search", label: "Search", icon: Search },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(true);

  // Slim top bar: hide on scroll down, reveal on scroll up or near top
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 24) setBarVisible(true);
      else if (y > lastY + 4) setBarVisible(false);
      else if (y < lastY - 4) setBarVisible(true);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(NAV_SECTIONS.filter(s => s.heading).map(s => s.heading!))
  );
  const [syncState, setSyncState] = useState({ connected: false, lastSynced: "" });
  const [storageWarning, setStorageWarning] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const {
    syncFailureState,
    autoSyncing,
    retrySyncNow,
    dismissSyncError,
    setSyncErrorCallback,
    setSyncSuccessCallback,
  } = useStoreContext();
  const { addToast } = useToast();
  const { isOnline } = useOnlineStatus();

  // Wire up toast notifications for sync errors
  useEffect(() => {
    setSyncErrorCallback((state) => {
      if (state.isPaused) {
        addToast(
          `Auto-sync paused after ${state.consecutiveFailures} failures. ${state.lastErrorMessage}`,
          "error"
        );
      } else {
        addToast(state.lastErrorMessage, "warning");
      }
    });
    setSyncSuccessCallback(() => {
      addToast("Sync recovered successfully.", "success");
    });
  }, [setSyncErrorCallback, setSyncSuccessCallback, addToast]);

  useEffect(() => {
    setSyncState({ connected: !!(getPAT() && getGistId()), lastSynced: getLastSynced() });
    setStorageWarning(isStorageWarning());
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Focus trap for mobile sidebar
  const handleSidebarKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open || !sidebarRef.current) return;

    if (e.key === "Escape") {
      setOpen(false);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      return;
    }

    if (e.key === "Tab") {
      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      window.addEventListener("keydown", handleSidebarKeyDown);
      // Focus the close button when sidebar opens
      requestAnimationFrame(() => {
        if (sidebarRef.current) {
          const closeBtn = sidebarRef.current.querySelector<HTMLElement>('[aria-label="Close navigation menu"]');
          if (closeBtn) closeBtn.focus();
        }
      });
    } else {
      window.removeEventListener("keydown", handleSidebarKeyDown);
    }
    return () => window.removeEventListener("keydown", handleSidebarKeyDown);
  }, [open, handleSidebarKeyDown]);

  const navContent = (
    <>
      {/* Header */}
      <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-sage-50/50 to-transparent dark:from-sage-900/30 dark:to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center shadow-sm shadow-sage-500/20">
            <span className="text-lg" aria-hidden="true">🌯</span>
          </div>
          <div>
            <h1 className="text-base font-display font-bold text-stone-800 dark:text-stone-100 leading-tight">Operation Burrito</h1>
            <p className="text-xs text-stone-400 dark:text-stone-500">Baby Prep Tracker</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 dark:text-stone-400"
          aria-label="Close navigation menu"
          data-sidebar-close
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto" aria-label="Main navigation" data-sidebar-nav>
        {NAV_SECTIONS.map((section, si) => {
          const hasHeading = !!section.heading;
          const sectionActive = section.items.some((item) => pathname === item.href);
          const isCollapsed = hasHeading && collapsedSections.has(section.heading!) && !sectionActive;

          const toggleCollapse = () => {
            if (!hasHeading) return;
            setCollapsedSections((prev) => {
              const next = new Set(prev);
              if (next.has(section.heading!)) next.delete(section.heading!);
              else next.add(section.heading!);
              return next;
            });
          };

          return (
            <div key={si} className={si > 0 ? "mt-3" : ""}>
              {hasHeading && (
                <button
                  onClick={toggleCollapse}
                  className="w-full flex items-center gap-1.5 px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                  aria-expanded={!isCollapsed}
                >
                  <ChevronRight
                    size={12}
                    className={clsx("transition-transform duration-200", !isCollapsed && "rotate-90")}
                    aria-hidden="true"
                  />
                  {section.heading}
                </button>
              )}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        data-nav-item
                        className={clsx(
                          "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200",
                          active ? "bg-sage-100/80 text-sage-700 dark:bg-sage-900/60 dark:text-sage-300 shadow-sm nav-active-pill" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700 hover:translate-x-0.5 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon size={18} aria-hidden="true" />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-stone-100 dark:border-stone-800 pt-3 space-y-0.5">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings" ? "bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-300" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          )}
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <Settings size={18} aria-hidden="true" />
          Settings
          {storageWarning && (
            <span className="ml-auto flex items-center gap-1 text-amber-500" title="Storage usage high" aria-label="Storage usage warning">
              <AlertTriangle size={14} />
            </span>
          )}
        </Link>
        <div className="px-3 py-2">
          <ThemeToggle />
        </div>
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <WifiOff size={13} aria-hidden="true" className="text-amber-500" />
            ) : (
              <Github
                size={13}
                aria-hidden="true"
                className={
                  syncFailureState.isPaused
                    ? "text-red-500"
                    : syncFailureState.consecutiveFailures > 0
                    ? "text-amber-500"
                    : syncState.connected
                    ? "text-emerald-500"
                    : "text-stone-300"
                }
              />
            )}
            {!isOnline ? (
              <div className="min-w-0 flex-1">
                <p className="text-xs text-amber-600 font-medium">Offline</p>
                <p className="text-xs text-stone-500">Changes will sync when online</p>
              </div>
            ) : syncState.connected ? (
              <div className="min-w-0 flex-1">
                {syncFailureState.isPaused ? (
                  <p className="text-xs text-red-600 font-medium">Sync paused</p>
                ) : syncFailureState.consecutiveFailures > 0 ? (
                  <p className="text-xs text-amber-600 font-medium">Sync issue</p>
                ) : autoSyncing ? (
                  <p className="text-xs text-sage-600 font-medium">Syncing...</p>
                ) : (
                  <p className="text-xs text-emerald-600 font-medium">GitHub connected</p>
                )}
                {!syncFailureState.isPaused && syncState.lastSynced && (
                  <p className="text-xs text-stone-500 truncate">
                    {new Date(syncState.lastSynced).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500">Not synced to GitHub</p>
            )}
          </div>

          {/* Sync failure warning with retry/dismiss */}
          {syncFailureState.isPaused && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
              <p className="text-xs text-red-700 mb-1.5">
                {syncFailureState.lastErrorMessage}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={retrySyncNow}
                  disabled={autoSyncing}
                  className="flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 min-h-[44px] rounded transition-colors"
                  aria-label="Retry sync"
                >
                  <RefreshCw size={11} className={autoSyncing ? "animate-spin" : ""} aria-hidden="true" />
                  Retry
                </button>
                <button
                  onClick={dismissSyncError}
                  className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 py-1 min-h-[44px] rounded transition-colors"
                  aria-label="Dismiss sync error"
                >
                  <XCircle size={11} aria-hidden="true" />
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Non-paused failure indicator */}
          {!syncFailureState.isPaused && syncFailureState.consecutiveFailures > 0 && (
            <p className="text-xs text-amber-600 mt-1" role="status">
              {syncFailureState.consecutiveFailures} sync failure{syncFailureState.consecutiveFailures > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile slim top bar — hides on scroll down, reveals on scroll up */}
      <header
        className={clsx(
          "md:hidden fixed top-0 inset-x-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-700/60 transition-transform duration-200",
          !barVisible && "-translate-y-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-12 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🌯</span>
            <span className="text-sm font-display font-bold text-stone-800 dark:text-stone-100">Operation Burrito</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-600 dark:text-stone-300"
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="sidebar-nav"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar -- slide in on mobile, fixed on desktop */}
      <aside
        ref={sidebarRef}
        id="sidebar-nav"
        className={clsx(
          "fixed left-0 top-0 h-screen w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col z-50 transition-transform duration-200",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Application navigation"
      >
        {navContent}
      </aside>
    </>
  );
}
