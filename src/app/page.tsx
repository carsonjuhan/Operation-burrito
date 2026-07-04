"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { useStoreContext } from "@/contexts/StoreContext";
import { useChecklistData } from "@/hooks/useChecklistData";
import {
  ShoppingCart, GraduationCap, BookOpen, Heart, StickyNote,
  CheckCircle2, Circle, Calendar, Briefcase, Baby, ExternalLink, ClipboardCheck,
  Timer, PhoneCall, ChevronDown, ChevronUp, Archive,
} from "lucide-react";
import { NEWBORN_UPDATED_EVENT, loadNewbornData } from "@/lib/newbornTracker";
import { PageTransition } from "@/components/PageTransition";
import { MilestoneTimeline, type MilestoneCompletionData } from "@/components/MilestoneTimeline";

function getDaysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  // Parse "YYYY-MM-DD" as local midnight, not UTC — new Date(dateStr) treats
  // it as UTC, which rolls the date back a day in timezones behind UTC.
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { store, loaded, updateChecklistState } = useStoreContext();
  const { data: checklistData } = useChecklistData();

  const { items, classes, materials, birthPlan, notes, hospitalBag, appointments, contacts, registryUrl } = store;

  // ── Newborn tracker summary (today) ─────────────────────────────────────
  const [tracker, setTracker] = useState({ babyName: "Baby", feeds: 0, diapers: 0, sleepMins: 0, hasEvents: false, birthDate: undefined as string | undefined });
  const [showPrepArchive, setShowPrepArchive] = useState(false);

  useEffect(() => {
    const compute = () => {
      const d = loadNewbornData();
      const isToday = (iso: string) => {
        const x = new Date(iso);
        const t = new Date();
        return x.getFullYear() === t.getFullYear() && x.getMonth() === t.getMonth() && x.getDate() === t.getDate();
      };
      let feeds = 0, diapers = 0, sleepMins = 0;
      for (const e of d.events) {
        if (e.type === "feed" && isToday(e.timestamp)) feeds++;
        else if (e.type === "diaper" && isToday(e.timestamp)) diapers++;
        else if (e.type === "sleep" && isToday(e.startTime)) {
          const end = e.endTime ? new Date(e.endTime).getTime() : Date.now();
          sleepMins += (end - new Date(e.startTime).getTime()) / 60000;
        }
      }
      setTracker({ babyName: d.babyName, feeds, diapers, sleepMins, hasEvents: d.events.length > 0, birthDate: d.babyBirthDate });
    };
    compute();
    window.addEventListener(NEWBORN_UPDATED_EVENT, compute);
    return () => window.removeEventListener(NEWBORN_UPDATED_EVENT, compute);
  }, []);

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

  // ── Phase: baby is here once the due date passes or tracking has begun ──
  const babyArrived = (daysLeft != null && daysLeft < 0) || tracker.hasEvents;
  const laborWatch = !babyArrived && daysLeft != null && daysLeft >= 0 && daysLeft <= 14;

  const babyAgeStr = useMemo(() => {
    // Prefer the baby's actual birth date (set on the Newborn Tracker page)
    // over the due date — babies rarely arrive exactly on their due date.
    let ageDays: number;
    if (tracker.birthDate) {
      const daysSinceBirth = getDaysUntil(tracker.birthDate);
      ageDays = daysSinceBirth == null ? 0 : Math.max(0, -daysSinceBirth);
    } else {
      if (daysLeft == null || daysLeft >= 0) return null;
      ageDays = Math.abs(daysLeft);
    }
    const w = Math.floor(ageDays / 7);
    const d = ageDays % 7;
    if (w === 0) return `${d} day${d !== 1 ? "s" : ""} old`;
    if (d === 0) return `${w} week${w !== 1 ? "s" : ""} old`;
    return `${w}w ${d}d old`;
  }, [daysLeft, tracker.birthDate]);

  const laborContact = useMemo(
    () => contacts.find((c) => (c.role === "Midwife" || c.role === "OB / Doctor" || c.role === "Hospital") && c.phone),
    [contacts]
  );

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

  // ── Post-birth checklist ──────────────────────────────────────────────────
  const postBirthChecked = useMemo(
    () => new Set(store.postBirthChecked ?? []),
    [store.postBirthChecked]
  );

  const togglePostBirth = useCallback((id: string) => {
    const current = store.postBirthChecked ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updateChecklistState("postBirthChecked", next);
  }, [store.postBirthChecked, updateChecklistState]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 dark:text-stone-500 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <PageTransition className="max-w-5xl mx-auto">
      {/* Hero: post-birth baby age, or pre-birth due date countdown */}
      {babyArrived ? (
        <div className="rounded-2xl p-6 mb-6 bg-gradient-to-br from-sage-50 via-white to-blush-50 dark:from-sage-900/40 dark:via-stone-900 dark:to-stone-900 border border-sage-200/60 dark:border-sage-800">
          <p className="text-[11px] uppercase tracking-[0.2em] text-sage-600 dark:text-sage-400 font-semibold mb-1">
            Welcome to the world
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-stone-800 dark:text-stone-100 leading-tight">
            {tracker.babyName}{babyAgeStr ? <span className="text-stone-400 dark:text-stone-500"> · </span> : " is here 🎉"}
            {babyAgeStr && <span>{babyAgeStr}</span>}
          </h2>

          {/* Today strip from the tracker */}
          <Link
            href="/newborn"
            className="mt-4 flex items-center gap-4 rounded-xl bg-white/70 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 px-4 py-3 hover:border-sage-300 dark:hover:border-sage-700 transition-colors"
          >
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tabular-nums">🤱 {tracker.feeds} <span className="font-normal text-stone-400 text-xs">feeds</span></span>
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tabular-nums">💧 {tracker.diapers} <span className="font-normal text-stone-400 text-xs">diapers</span></span>
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tabular-nums">😴 {(tracker.sleepMins / 60).toFixed(1)}h <span className="font-normal text-stone-400 text-xs">sleep</span></span>
            <span className="ml-auto text-xs text-sage-600 dark:text-sage-400 font-medium shrink-0">today →</span>
          </Link>

          {/* Care quick links */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { href: "/soothe", label: "🫂 Soothe" },
              { href: "/symptoms", label: "🩺 Symptoms" },
              { href: "/sleep-training", label: "🌙 Sleep Training" },
              { href: "/growth", label: "📈 Growth" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-sage-300 dark:hover:border-sage-700 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      ) : daysLeft != null && (
        <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${daysLeft <= 14 ? "bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800" : daysLeft <= 42 ? "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800" : "bg-sage-50 dark:bg-sage-900 border border-sage-200 dark:border-sage-800"}`}>
          <Baby size={32} className={daysLeft <= 14 ? "text-rose-400" : daysLeft <= 42 ? "text-amber-500" : "text-sage-500"} />
          <div>
            {daysLeft === 0 ? (
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

      {/* Labor watch — final two weeks */}
      {laborWatch && (
        <div className="card p-5 mb-6 border-rose-200/70 dark:border-rose-800/60">
          <div className="flex items-center gap-2 mb-3">
            <Timer size={16} className="text-rose-500" />
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Labor Watch</h2>
            <span className="text-xs text-stone-400 ml-auto">{daysLeft === 0 ? "due today" : `${daysLeft}d to go`}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href="/timer"
              className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-sm font-semibold transition-colors"
            >
              <Timer size={15} /> Contraction Timer
            </Link>
            <Link
              href="/hospital-bag"
              className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-600 dark:text-stone-300 hover:border-stone-300 transition-colors"
            >
              <Briefcase size={14} className="text-orange-500" /> Bag {stats.bagPacked}/{stats.bagTotal} packed
            </Link>
            {laborContact ? (
              <a
                href={`tel:${laborContact.phone}`}
                className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-600 dark:text-stone-300 hover:border-stone-300 transition-colors"
              >
                <PhoneCall size={14} className="text-emerald-500" /> Call {laborContact.name.split(" ")[0]}
              </a>
            ) : (
              <Link
                href="/contacts"
                className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-600 dark:text-stone-300 hover:border-stone-300 transition-colors"
              >
                <PhoneCall size={14} className="text-emerald-500" /> Contacts
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Milestone timeline — pregnancy only */}
      {!babyArrived && dueDate && (
        <MilestoneTimeline dueDate={dueDate} completionData={milestoneData} />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-stone-100">Dashboard</h1>
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
          {babyArrived ? "Your newborn command center." : "Your baby prep command center."}
        </p>
      </div>

      {/* Post-birth: prep content folds into a collapsible archive */}
      {babyArrived && (
        <div className="card p-4 mb-6">
          <button
            onClick={() => setShowPrepArchive(s => !s)}
            className="w-full flex items-center justify-between"
            aria-expanded={showPrepArchive}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300">
              <Archive size={15} className="text-stone-400" /> Pregnancy Prep Archive
            </span>
            {showPrepArchive ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </button>
        </div>
      )}

      {(!babyArrived || showPrepArchive) && <>
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
        <Link href="/budget" className="card p-5 mb-6 grid grid-cols-3 divide-x divide-stone-100 dark:divide-stone-700 group">
          <div className="px-4 first:pl-0">
            <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">Estimated Total</p>
            <p className="text-xl font-bold text-stone-800 dark:text-stone-100 mt-0.5">${budget.estimatedTotal.toFixed(0)}</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">Spent So Far</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">${budget.actualSpent.toFixed(0)}</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">Still Needed</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">${budget.remaining.toFixed(0)}</p>
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

      </>}

      {/* Post-birth checklist */}
      <PostBirthChecklist checked={postBirthChecked} onToggle={togglePostBirth} />

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
  const glowClass = color.includes("emerald") ? "stat-card-emerald" :
    color.includes("orange") ? "stat-card-orange" :
    color.includes("rose") ? "stat-card-rose" : "stat-card-violet";
  const progressClass = color.includes("emerald") ? "progress-gradient-emerald" :
    color.includes("orange") ? "progress-gradient-orange" :
    color.includes("rose") ? "progress-gradient-rose" : "progress-gradient-violet";

  return (
    <Link href={href} className={`card p-4 block animate-stagger-item ${glowClass}`} style={{ "--stagger-index": staggerIndex ?? 0 } as React.CSSProperties}>
      <div className={`inline-flex p-2.5 rounded-xl ${bg} dark:bg-opacity-20 mb-3`}>{icon}</div>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-0.5 font-medium">{label}</p>
      <p className="text-lg font-bold text-stone-800 dark:text-stone-100">{value}</p>
      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{sub}</p>
      {percent !== null && (
        <div className="mt-3 h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ease-out ${progressClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
      )}
    </Link>
  );
}

// ── Post-Birth Checklist ──────────────────────────────────────────────────

const POST_BIRTH_ITEMS = [
  { id: "pb-1", label: "Register the Birth", note: "Usually done online before you leave the hospital or soon after." },
  { id: "pb-2", label: "Apply for Baby Health Card", note: "So doctor visits are covered." },
  { id: "pb-3", label: "Get the Birth Certificate", note: "You'll need this for passport, school and other required documents." },
  { id: "pb-4", label: "Apply for Baby's SIN", note: "Social Insurance Number — needed for RESP." },
  { id: "pb-5", label: "Apply for Canada Child Benefit (CCB)", note: "Monthly money from the government." },
  { id: "pb-6", label: "Open RESP", note: "Start saving for your child's education early." },
  { id: "pb-7", label: "Apply for Passport", note: "Only if you are planning to travel with baby." },
  { id: "pb-8", label: "Book Baby's First Doctor Visit", note: "Usually within 1–3 days after leaving the hospital." },
  { id: "pb-9", label: "Add Baby to Private Insurance", note: "If you have workplace or personal insurance." },
];

function PostBirthChecklist({ checked, onToggle }: { checked: Set<string>; onToggle: (id: string) => void }) {
  const doneCount = POST_BIRTH_ITEMS.filter((i) => checked.has(i.id)).length;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-sky-600" />
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            After Birth Checklist
            <span className="text-stone-400 font-normal ml-1">({doneCount}/{POST_BIRTH_ITEMS.length})</span>
          </h2>
        </div>
        {doneCount === POST_BIRTH_ITEMS.length && (
          <span className="text-xs text-emerald-600 font-medium">All done!</span>
        )}
      </div>
      <div className="mb-3 h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out progress-gradient-sky"
          style={{ width: `${POST_BIRTH_ITEMS.length > 0 ? Math.round((doneCount / POST_BIRTH_ITEMS.length) * 100) : 0}%` }}
        />
      </div>
      <ul className="space-y-1">
        {POST_BIRTH_ITEMS.map((item) => {
          const done = checked.has(item.id);
          return (
            <li key={item.id}>
              <button
                onClick={() => onToggle(item.id)}
                className="w-full flex items-start gap-3 p-2 rounded-lg text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                {done ? (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle size={16} className="text-stone-300 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${done ? "text-stone-400 line-through" : "text-stone-700 dark:text-stone-200"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{item.note}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
