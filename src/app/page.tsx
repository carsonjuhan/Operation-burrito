"use client";

import Link from "next/link";
import { useStoreContext } from "@/contexts/StoreContext";
import { ShoppingCart, GraduationCap, BookOpen, Heart, StickyNote, CheckCircle2, Circle } from "lucide-react";

export default function DashboardPage() {
  const { store, loaded } = useStoreContext();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  const { items, classes, materials, birthPlan, notes } = store;

  const itemsPurchased = items.filter((i) => i.purchased).length;
  const itemsTotal = items.length;
  const itemsPercent = itemsTotal > 0 ? Math.round((itemsPurchased / itemsTotal) * 100) : 0;

  const classesDone = classes.filter((c) => c.completed).length;
  const classesTotal = classes.length;

  // Count filled fields across the structured birth plan (strings + booleans)
  const countBirthPlanFilled = () => {
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
  };
  const birthPlanFilled = countBirthPlanFilled();
  const birthPlanTotal = 20; // approximate total checkable fields

  const mustHaveItems = items.filter((i) => i.priority === "Must Have" && !i.purchased);

  const upcomingClasses = classes
    .filter((c) => !c.completed)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 3);

  const pinnedNotes = notes.filter((n) => n.pinned);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
        <p className="text-sm text-stone-400 mt-1">Welcome to Operation Burrito — your baby prep command center.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          href="/items"
          icon={<ShoppingCart size={20} className="text-emerald-600" />}
          bg="bg-emerald-50"
          label="Items Purchased"
          value={`${itemsPurchased} / ${itemsTotal}`}
          sub={`${itemsPercent}% done`}
          percent={itemsPercent}
          color="bg-emerald-400"
        />
        <StatCard
          href="/classes"
          icon={<GraduationCap size={20} className="text-violet-600" />}
          bg="bg-violet-50"
          label="Classes Completed"
          value={`${classesDone} / ${classesTotal}`}
          sub={classesTotal === 0 ? "No classes added" : `${classesTotal - classesDone} remaining`}
          percent={classesTotal > 0 ? Math.round((classesDone / classesTotal) * 100) : 0}
          color="bg-violet-400"
        />
        <StatCard
          href="/materials"
          icon={<BookOpen size={20} className="text-sky-600" />}
          bg="bg-sky-50"
          label="Materials Saved"
          value={`${materials.length}`}
          sub="resources"
          percent={null}
          color="bg-sky-400"
        />
        <StatCard
          href="/birth-plan"
          icon={<Heart size={20} className="text-rose-600" />}
          bg="bg-rose-50"
          label="Birth Plan"
          value={`${birthPlanFilled} / ${birthPlanTotal}`}
          sub="sections filled"
          percent={Math.round((birthPlanFilled / birthPlanTotal) * 100)}
          color="bg-rose-400"
        />
      </div>

      {/* Lower grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Must-have items remaining */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700">Must-Have Items Still Needed</h2>
            <Link href="/items" className="text-xs text-sage-600 hover:underline">View all</Link>
          </div>
          {mustHaveItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-stone-400">All must-have items purchased!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {mustHaveItems.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50">
                  <Circle size={16} className="text-stone-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{item.name}</p>
                    <p className="text-xs text-stone-400">{item.category}</p>
                  </div>
                  {item.estimatedCost != null && (
                    <span className="text-xs text-stone-400 shrink-0">${item.estimatedCost}</span>
                  )}
                </li>
              ))}
              {mustHaveItems.length > 6 && (
                <p className="text-xs text-stone-400 text-center pt-1">
                  +{mustHaveItems.length - 6} more
                </p>
              )}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming classes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700">Upcoming Classes</h2>
              <Link href="/classes" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            {upcomingClasses.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No upcoming classes</p>
            ) : (
              <ul className="space-y-2">
                {upcomingClasses.map((cls) => (
                  <li key={cls.id} className="flex items-start gap-2">
                    <GraduationCap size={14} className="text-violet-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-700 truncate">{cls.name}</p>
                      {cls.date && (
                        <p className="text-xs text-stone-400">{new Date(cls.date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pinned notes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700">Pinned Notes</h2>
              <Link href="/notes" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            {pinnedNotes.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No pinned notes</p>
            ) : (
              <ul className="space-y-2">
                {pinnedNotes.slice(0, 3).map((note) => (
                  <li key={note.id} className="flex items-start gap-2">
                    <StickyNote size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-700 truncate">{note.title}</p>
                      <p className="text-xs text-stone-400 truncate">{note.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  href: string;
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
  percent: number | null;
  color: string;
}

function StatCard({ href, icon, bg, label, value, sub, percent, color }: StatCardProps) {
  return (
    <Link href={href} className="card p-5 hover:shadow-md transition-shadow block">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-xl font-bold text-stone-800">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
      {percent !== null && (
        <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </Link>
  );
}
