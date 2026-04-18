"use client";

import Link from "next/link";
import { useStoreContext } from "@/contexts/StoreContext";
import {
  ShoppingCart, GraduationCap, BookOpen, Heart, StickyNote,
  CheckCircle2, Circle, Calendar, Briefcase, Baby, ExternalLink,
} from "lucide-react";

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

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  const { items, classes, materials, birthPlan, notes, hospitalBag, appointments, registryUrl } = store;

  // ── Stats ────────────────────────────────────────────────────────────────
  const itemsPurchased = items.filter((i) => i.purchased).length;
  const itemsTotal = items.length;
  const itemsPercent = itemsTotal > 0 ? Math.round((itemsPurchased / itemsTotal) * 100) : 0;

  const classesDone = classes.filter((c) => c.completed).length;
  const classesTotal = classes.length;

  const bagPacked = hospitalBag.filter((b) => b.packed).length;
  const bagTotal = hospitalBag.length;

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
  const birthPlanTotal = 20;

  // ── Budget ───────────────────────────────────────────────────────────────
  const estimatedTotal = items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);
  const actualSpent = items
    .filter((i) => i.purchased)
    .reduce((sum, i) => sum + (i.actualCost ?? i.estimatedCost ?? 0), 0);
  const remaining = items
    .filter((i) => !i.purchased)
    .reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);

  // ── Due date countdown ───────────────────────────────────────────────────
  const dueDate = birthPlan.personalInfo?.dueDate;
  const daysLeft = getDaysUntil(dueDate);
  const weeksLeft = daysLeft != null ? Math.floor(daysLeft / 7) : null;
  const extraDays = daysLeft != null ? daysLeft % 7 : null;

  // ── Lists ────────────────────────────────────────────────────────────────
  const mustHaveItems = items.filter((i) => i.priority === "Must Have" && !i.purchased);
  const upcomingAppointments = appointments
    .filter((a) => !a.completed && a.date)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 3);
  const pinnedNotes = notes.filter((n) => n.pinned);

  return (
    <div className="max-w-5xl mx-auto pt-10 md:pt-0">
      {/* Due date banner */}
      {daysLeft != null && (
        <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${daysLeft <= 14 ? "bg-rose-50 border border-rose-200" : daysLeft <= 42 ? "bg-amber-50 border border-amber-200" : "bg-sage-50 border border-sage-200"}`}>
          <Baby size={32} className={daysLeft <= 14 ? "text-rose-400" : daysLeft <= 42 ? "text-amber-500" : "text-sage-500"} />
          <div>
            {daysLeft < 0 ? (
              <>
                <p className="text-lg font-bold text-stone-800">Baby has arrived! 🎉</p>
                <p className="text-sm text-stone-500">{Math.abs(daysLeft)} days ago</p>
              </>
            ) : daysLeft === 0 ? (
              <p className="text-lg font-bold text-stone-800">Due date is today! 🌯</p>
            ) : (
              <>
                <p className="text-lg font-bold text-stone-800">
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

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
        <p className="text-sm text-stone-400 mt-1">Your baby prep command center.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard href="/items" icon={<ShoppingCart size={20} className="text-emerald-600" />} bg="bg-emerald-50"
          label="Items Purchased" value={`${itemsPurchased} / ${itemsTotal}`}
          sub={`${itemsPercent}% done`} percent={itemsPercent} color="bg-emerald-400" />
        <StatCard href="/hospital-bag" icon={<Briefcase size={20} className="text-orange-500" />} bg="bg-orange-50"
          label="Bag Packed" value={`${bagPacked} / ${bagTotal}`}
          sub={`${bagTotal > 0 ? Math.round((bagPacked / bagTotal) * 100) : 0}% packed`}
          percent={bagTotal > 0 ? Math.round((bagPacked / bagTotal) * 100) : 0} color="bg-orange-400" />
        <StatCard href="/birth-plan" icon={<Heart size={20} className="text-rose-600" />} bg="bg-rose-50"
          label="Birth Plan" value={`${birthPlanFilled} / ${birthPlanTotal}`}
          sub="fields filled" percent={Math.round((birthPlanFilled / birthPlanTotal) * 100)} color="bg-rose-400" />
        <StatCard href="/classes" icon={<GraduationCap size={20} className="text-violet-600" />} bg="bg-violet-50"
          label="Classes" value={`${classesDone} / ${classesTotal}`}
          sub={classesTotal === 0 ? "None added" : `${classesTotal - classesDone} left`}
          percent={classesTotal > 0 ? Math.round((classesDone / classesTotal) * 100) : 0} color="bg-violet-400" />
      </div>

      {/* Budget strip */}
      {estimatedTotal > 0 && (
        <Link href="/budget" className="card p-4 mb-6 grid grid-cols-3 divide-x divide-stone-100 hover:bg-stone-50 transition-colors">
          <div className="px-4 first:pl-0">
            <p className="text-xs text-stone-400">Estimated Total</p>
            <p className="text-lg font-bold text-stone-800">${estimatedTotal.toFixed(0)}</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-stone-400">Spent So Far</p>
            <p className="text-lg font-bold text-emerald-700">${actualSpent.toFixed(0)}</p>
          </div>
          <div className="px-4">
            <p className="text-xs text-stone-400">Still Needed</p>
            <p className="text-lg font-bold text-amber-700">${remaining.toFixed(0)}</p>
          </div>
        </Link>
      )}

      {/* Lower grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Must-have items */}
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
                <p className="text-xs text-stone-400 text-center pt-1">+{mustHaveItems.length - 6} more</p>
              )}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Upcoming appointments */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-700">Upcoming Appointments</h2>
              <Link href="/appointments" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No upcoming appointments</p>
            ) : (
              <ul className="space-y-2">
                {upcomingAppointments.map((appt) => (
                  <li key={appt.id} className="flex items-start gap-2">
                    <Calendar size={14} className="text-sky-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-700 truncate">{appt.title}</p>
                      <p className="text-xs text-stone-400">
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
              <h2 className="text-sm font-semibold text-stone-700">Pinned Notes</h2>
              <Link href="/notes" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            {pinnedNotes.length === 0 ? (
              <p className="text-xs text-stone-400 py-2 text-center">No pinned notes</p>
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

          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-stone-700">Materials</h2>
              <Link href="/materials" className="text-xs text-sage-600 hover:underline">View all</Link>
            </div>
            <p className="text-2xl font-bold text-stone-800">{materials.length}</p>
            <p className="text-xs text-stone-400">saved resources</p>
          </div>

          {/* Registry link */}
          {registryUrl && (
            <a
              href={registryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-5 flex items-center gap-3 hover:bg-sage-50 transition-colors"
            >
              <span className="text-2xl">🛍️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-700">Amazon Baby Registry</p>
                <p className="text-xs text-stone-400 truncate">{registryUrl}</p>
              </div>
              <ExternalLink size={14} className="text-stone-300 shrink-0" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  href: string; icon: React.ReactNode; bg: string;
  label: string; value: string; sub: string;
  percent: number | null; color: string;
}

function StatCard({ href, icon, bg, label, value, sub, percent, color }: StatCardProps) {
  return (
    <Link href={href} className="card p-4 hover:shadow-md transition-shadow block">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-stone-800">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
      {percent !== null && (
        <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
      )}
    </Link>
  );
}
