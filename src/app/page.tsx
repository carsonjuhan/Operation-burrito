"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStoreContext } from "@/contexts/StoreContext";
import { useChecklistData } from "@/hooks/useChecklistData";
import {
  ShoppingCart, GraduationCap, BookOpen, Heart, StickyNote,
  CheckCircle2, Circle, Calendar, Briefcase, Baby, ExternalLink,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { MilestoneTimeline, type MilestoneCompletionData } from "@/components/MilestoneTimeline";

function getDaysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { store, loaded } = useStoreContext();
  const { data: checklistData } = useChecklistData();

  const { items, classes, materials, birthPlan, notes, hospitalBag, appointments, registryUrl } = store;

  // Read skipped items from store
  const skippedItems = useMemo(
    () => new Set(store.checklistSkipped ?? []),
    [store.checklistSkipped]
  );

  // ── Checklist stats ─────────────────────────────────────────────────────
  const checklistStats = useMemo(() => {
    if (!checklistData) return { have: 0, skipped: 0, needed: 0, total: 0, percent: 0 };

    const allItems = checklistData.CHECKLIST_ITEMS.filter(
      (ci) => ci.category !== "Postpartum"
    );
    const total = allItems.length;
    const matchedIds = checklistData.MATCHED_CHECKLIST_IDS;

    let have = 0;
    let skipped = 0;
    for (const ci of allItems) {
      if (matchedIds.has(ci.id)) have++;
      else if (skippedItems.has(ci.id)) skipped++;
    }

    const handled = have + skipped;
    const needed = total - handled;
    const percent = total > 0 ? Math.round((handled / total) * 100) : 0;

    return { have, skipped, needed, total, percent };
  }, [checklistData, skippedItems]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const classesDone = classes.filter((c) => c.completed).length;
    const classesTotal = classes.length;

    const bagPacked = hospitalBag.filter((b) => b.packed).length;
    const bagTotal = hospitalBag.length;

    return { classesDone, classesTotal, bagPacked, bagTotal };
  }, [classes, hospitalBag]);

  const birthPlanFilled = useMemo(() => {
    let n = 0;
    const s = (v: string) => { if (v?.trim()) n++; };
    const b = (v: boolean) => { if (v) n++; };
    s(birthPlan.personalInfo?.legalName); s(birthPlan.personalInfo?.dueDate);
    s(birthPlan.labour?.birthPartner); s(birthPlan.labour?.labourGoal);
    s(birthPlan.labour?.atmosphereNotes); s(birthPlan.labour?.otherRequests);
    const cm = birthPlan.labour?.comfortMeasures;
    if (cm) [cm.walking, cm.labourBall, cm.tub, cm.shower, cm.heat, cm.ice, cm.massage, cm.tens].forEach(b);
    const pm = birthPlan.labour?.painMedication;
    if (pm) [pm.onlyIfAsked, pm.offerIfNotCoping, pm.epidural, pm.nitrous].forEach(b);
    b(birthPlan.afterBirth?.skinToSkin);
    if (birthPlan.afterBirth?.feedingPlan) n++;
    s(birthPlan.afterBirth?.placentaPreferences);
    b(birthPlan.interventions?.unexpectedEvents?.includeInAllDecisions);
    s(birthPlan.interventions?.assistedBirthPreference);
    return n;
  }, [birthPlan]);
  const birthPlanTotal = 20;

  // ── Budget ───────────────────────────────────────────────────────────────
  const budget = useMemo(() => {
    const estimatedTotal = items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);
    const actualSpent = items
      .filter((i) => i.purchased)
      .reduce((sum, i) => sum + (i.actualCost ?? i.estimatedCost ?? 0), 0);
    const remaining = items
      .filter((i) => !i.purchased)
      .reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);
    return { estimatedTotal, actualSpent, remaining };
  }, [items]);

  // ── Due date countdown ───────────────────────────────────────────────────
  const dueDate = birthPlan.personalInfo?.dueDate;
  const daysLeft = getDaysUntil(dueDate);
  const weeksLeft = daysLeft != null ? Math.floor(daysLeft / 7) : null;
  const extraDays = daysLeft != null ? daysLeft % 7 : null;

  // ── Items you have (matched from inventory) ────────────────────────────
  const itemsYouHave = useMemo(() => {
    if (!checklistData) return [];
    const matchedIds = checklistData.MATCHED_CHECKLIST_IDS;
    return checklistData.CHECKLIST_ITEMS
      .filter((ci) => ci.category !== "Postpartum" && matchedIds.has(ci.id));
  }, [checklistData]);

  // ── Items still needed (from checklist, excluding matched/skipped) ──────
  const itemsStillNeeded = useMemo(() => {
    if (!checklistData) return [];
    const matchedIds = checklistData.MATCHED_CHECKLIST_IDS;
    return checklistData.CHECKLIST_ITEMS
      .filter((ci) => ci.category !== "Postpartum" && !matchedIds.has(ci.id) && !skippedItems.has(ci.id));
  }, [checklistData, skippedItems]);

  const upcomingAppointments = useMemo(
    () => appointments
      .filter((a) => !a.completed && a.date)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .slice(0, 3),
    [appointments]
  );

  const pinnedNotes = useMemo(
    () => notes.filter((n) => n.pinned),
    [notes]
  );

  // ── Milestone completion data ───────────────────────────────────────────
  const milestoneData: MilestoneCompletionData = useMemo(() => {
    // Check car seat from inventory matches or store items
    const carSeatFromStore = items.find(
      (i) => i.name.toLowerCase().includes("car seat") && i.purchased
    );
    const carSeatFromInventory = checklistData?.AMAZON_PURCHASED_ITEMS.some(
      (i: any) => i.name.toLowerCase().includes("car seat")
    );
    return {
      classesTotal: classes.length,
      classesDone: classes.filter((c) => c.completed).length,
      bagTotal: hospitalBag.length,
      bagPacked: hospitalBag.filter((b) => b.packed).length,
      birthPlanFilled,
      birthPlanTotal,
      carSeatPurchased: !!(carSeatFromStore || carSeatFromInventory),
      mustHaveRemaining: checklistStats.needed,
    };
  }, [items, classes, hospitalBag, birthPlanFilled, birthPlanTotal, checklistData, checklistStats.needed]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 dark:text-stone-500 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <PageTransition className="max-w-5xl mx-auto pt-10 md:pt-0">
      {/* Due date banner */}
      {daysLeft != null && (
        <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${daysLeft <= 14 ? "bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800" : daysLeft <= 42 ? "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800" : "bg-sage-50 dark:bg-sage-900 border border-sage-200 dark:border-sage-800"}`}>
          <Baby size={32} className={daysLeft <= 14 ? "text-rose-400" : daysLeft <= 42 ? "text-amber-500" : "text-sage-500"} />
          <div>
            {daysLeft < 0 ? (
              <>
                <p className="text-lg font-bold text-stone-800 dark:text-stone-100">Baby has arrived! 🎉</p>
                <p className="text-sm text-stone-500">{Math.abs(daysLeft)} days ago</p>
              </>
            ) : daysLeft === 0 ? (
              <p className="text-lg font-bold text-stone-800 dark:text-stone-100">Due date is today! 🌯</p>
            ) : (
              <>
                <p className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  {weeksLeft! > 0 ? `${weeksLeft}w ${extraDays}d` : `${daysLeft}d`} until due date
                </p>
                <p className="text-sm text-stone-500">
                  {new Date(dueDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Milestone timeline */}
      {dueDate && (
        <MilestoneTimeline dueDate={dueDate} completionData={milestoneData} />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Dashboard</h1>
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">Your baby prep command center.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard href="/items" icon={<ShoppingCart size={20} className="text-emerald-600" />} bg="bg-emerald-50"
          label="Checklist Progress" value={`${checklistStats.have + checklistStats.skipped} / ${checklistStats.total}`}
          sub={`${checklistStats.have} have, ${checklistStats.skipped} skipped, ${checklistStats.needed} needed`}
          percent={checklistStats.percent} color="bg-emerald-400" staggerIndex={0} />
        <StatCard href="/hospital-bag" icon={<Briefcase size={20} className="text-orange-500" />} bg="bg-orange-50"
          label="Bag Packed" value={`${stats.bagPacked} / ${stats.bagTotal}`}
          sub={`${stats.bagTotal > 0 ? Math.round((stats.bagPacked / stats.bagTotal) * 100) : 0}% packed`}
          percent={stats.bagTotal > 0 ? Math.round((stats.bagPacked / stats.bagTotal) * 100) : 0} color="bg-orange-400" staggerIndex={1} />
        <StatCard href="/birth-plan" icon={<Heart size={20} className="text-rose-600" />} bg="bg-rose-50"
          label="Birth Plan" value={`${birthPlanFilled} / ${birthPlanTotal}`}
          sub="fields filled" percent={Math.round((birthPlanFilled / birthPlanTotal) * 100)} color="bg-rose-400" staggerIndex={2} />
        <StatCard href="/classes" icon={<GraduationCap size={20} className="text-violet-600" />} bg="bg-violet-50"
          label="Classes" value={`${stats.classesDone} / ${stats.classesTotal}`}
          sub={stats.classesTotal === 0 ? "None added" : `${stats.classesTotal - stats.classesDone} left`}
          percent={stats.classesTotal > 0 ? Math.round((stats.classesDone / stats.classesTotal) * 100) : 0} color="bg-violet-400" staggerIndex={3} />
      </div>

      {/* Budget strip */}
      {budget.estimatedTotal > 0 && (
        <Link href="/budget" className="card p-4 mb-6 grid grid-cols-3 divide-x divide-stone-100 dark:divide-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
          <div className="px-4 first:pl-0">
            <p className="text-xs text-stone-400 dark:text-stone-500">Estimated Total</p>
            <p className="text-lg font-bold text-stone-800 dark:text-stone-100">${budget.estimatedTotal.toFixed(0)}</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-stone-400 dark:text-stone-500">Spent So Far</p>
            <p className="text-lg font-bold text-emerald-700">${budget.actualSpent.toFixed(0)}</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-stone-400 dark:text-stone-500">Still Needed</p>
            <p className="text-lg font-bold text-amber-700">${budget.remaining.toFixed(0)}</p>
          </div>
        </Link>
      )}

      {/* Items grid — what you have + what you need */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Items you have */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Items You Have <span className="text-stone-400 font-normal">({itemsYouHave.length})</span>
            </h2>
            <Link href="/items" className="text-xs text-sage-600 hover:underline">View all</Link>
          </div>
          {itemsYouHave.length === 0 ? (
            <p className="text-xs text-stone-400 dark:text-stone-500 py-4 text-center">No items matched yet</p>
          ) : (
            <ul className="space-y-1.5">
              {itemsYouHave.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{item.name}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{item.category}</p>
                  </div>
                </li>
              ))}
              {itemsYouHave.length > 8 && (
                <p className="text-xs text-stone-400 dark:text-stone-500 text-center pt-1">+{itemsYouHave.length - 8} more</p>
              )}
            </ul>
          )}
        </div>

        {/* Items still needed */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Items Still Needed <span className="text-stone-400 font-normal">({checklistStats.needed})</span>
            </h2>
            <Link href="/items" className="text-xs text-sage-600 hover:underline">View checklist</Link>
          </div>
          {itemsStillNeeded.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-stone-400 dark:text-stone-500">All checklist items covered!</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {itemsStillNeeded.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg">
                  <Circle size={15} className="text-stone-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 dark:text-stone-200 truncate">{item.name}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{item.category} · {item.timing}</p>
                  </div>
                </li>
              ))}
              {checklistStats.needed > 8 && (
                <p className="text-xs text-stone-400 dark:text-stone-500 text-center pt-1">+{checklistStats.needed - 8} more on checklist</p>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Lower grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Right column */}
        <div className="space-y-5">
          {/* Upcoming appointments */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Upcoming Appointments</h2>
              <Link href="/appointments" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <p className="text-xs text-stone-400 dark:text-stone-500 py-4 text-center">No upcoming appointments</p>
            ) : (
              <ul className="space-y-2">
                {upcomingAppointments.map((appt) => (
                  <li key={appt.id} className="flex items-start gap-2">
                    <Calendar size={14} className="text-sky-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate">{appt.title}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        {new Date(appt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {appt.time && ` at ${appt.time}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Materials + pinned notes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Pinned Notes</h2>
              <Link href="/notes" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            {pinnedNotes.length === 0 ? (
              <p className="text-xs text-stone-400 dark:text-stone-500 py-2 text-center">No pinned notes</p>
            ) : (
              <ul className="space-y-2">
                {pinnedNotes.slice(0, 3).map((note) => (
                  <li key={note.id} className="flex items-start gap-2">
                    <StickyNote size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate">{note.title}</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{note.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Materials</h2>
              <Link href="/materials" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{materials.length}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">saved resources</p>
          </div>

          {/* Registry link */}
          {registryUrl && (
            <a
              href={registryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-5 flex items-center gap-3 hover:bg-sage-50 dark:hover:bg-sage-900 transition-colors"
            >
              <span className="text-2xl">🛍️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Amazon Baby Registry</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{registryUrl}</p>
              </div>
              <ExternalLink size={14} className="text-stone-300 shrink-0" />
            </a>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

interface StatCardProps {
  href: string; icon: React.ReactNode; bg: string;
  label: string; value: string; sub: string;
  percent: number | null; color: string;
  staggerIndex?: number;
}

function StatCard({ href, icon, bg, label, value, sub, percent, color, staggerIndex }: StatCardProps) {
  return (
    <Link href={href} className="card p-4 hover:shadow-md transition-shadow block animate-stagger-item" style={{ "--stagger-index": staggerIndex ?? 0 } as React.CSSProperties}>
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{value}</p>
      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>
      {percent !== null && (
        <div className="mt-3 h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
      )}
    </Link>
  );
}
