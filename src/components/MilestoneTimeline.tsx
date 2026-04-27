"use client";

import Link from "next/link";
import {
  GraduationCap,
  Briefcase,
  Car,
  Package,
  FileText,
  ClipboardCheck,
  Baby,
  Check,
} from "lucide-react";

export interface MilestoneDefinition {
  id: string;
  label: string;
  weeksBefore: number;
  href: string;
  icon: React.ReactNode;
}

export const MILESTONES: MilestoneDefinition[] = [
  {
    id: "register-classes",
    label: "Register for classes",
    weeksBefore: 12,
    href: "/classes",
    icon: <GraduationCap size={14} />,
  },
  {
    id: "draft-birth-plan",
    label: "Draft birth plan",
    weeksBefore: 10,
    href: "/birth-plan",
    icon: <FileText size={14} />,
  },
  {
    id: "start-hospital-bag",
    label: "Start hospital bag",
    weeksBefore: 8,
    href: "/hospital-bag",
    icon: <Briefcase size={14} />,
  },
  {
    id: "review-birth-plan",
    label: "Review plan with midwife",
    weeksBefore: 6,
    href: "/birth-plan",
    icon: <FileText size={14} />,
  },
  {
    id: "install-car-seat",
    label: "Install car seat",
    weeksBefore: 5,
    href: "/items",
    icon: <Car size={14} />,
  },
  {
    id: "finalize-birth-plan",
    label: "Finalize birth plan",
    weeksBefore: 4,
    href: "/birth-plan",
    icon: <FileText size={14} />,
  },
  {
    id: "pack-hospital-bag",
    label: "Pack hospital bag",
    weeksBefore: 3,
    href: "/hospital-bag",
    icon: <Package size={14} />,
  },
  {
    id: "birth-plan-packed",
    label: "Birth plan copies packed",
    weeksBefore: 2,
    href: "/hospital-bag",
    icon: <ClipboardCheck size={14} />,
  },
  {
    id: "final-check",
    label: "Final check",
    weeksBefore: 1,
    href: "/items",
    icon: <ClipboardCheck size={14} />,
  },
  {
    id: "due-date",
    label: "Due date",
    weeksBefore: 0,
    href: "/birth-plan",
    icon: <Baby size={14} />,
  },
];

/** Calculate the calendar date for a milestone given the due date string. */
export function getMilestoneDate(
  dueDateStr: string,
  weeksBefore: number
): Date {
  // Parse as local date (YYYY-MM-DD) to avoid timezone offset issues
  const [y, m, d] = dueDateStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  due.setDate(due.getDate() - weeksBefore * 7);
  return due;
}

export interface MilestoneCompletionData {
  classesTotal: number;
  classesDone: number;
  bagTotal: number;
  bagPacked: number;
  birthPlanFilled: number;
  birthPlanTotal: number;
  carSeatPurchased: boolean;
  mustHaveRemaining: number;
}

/** Determine whether a milestone should be considered complete based on store data. */
export function isMilestoneComplete(
  milestone: MilestoneDefinition,
  data: MilestoneCompletionData,
  today: Date,
  dueDate: Date
): boolean {
  switch (milestone.id) {
    case "register-classes":
      return data.classesTotal > 0;
    case "draft-birth-plan":
      // Started if at least 25% of fields filled
      return data.birthPlanFilled >= data.birthPlanTotal * 0.25;
    case "start-hospital-bag":
      return data.bagTotal > 0;
    case "review-birth-plan":
      // Reviewed if at least 50% filled (had enough to discuss with midwife)
      return data.birthPlanFilled >= data.birthPlanTotal * 0.5;
    case "install-car-seat":
      return data.carSeatPurchased;
    case "finalize-birth-plan":
      // Finalized if at least 80% filled
      return data.birthPlanFilled >= data.birthPlanTotal * 0.8;
    case "pack-hospital-bag":
      return data.bagTotal > 0 && data.bagPacked === data.bagTotal;
    case "birth-plan-packed":
      // Consider packed if birth plan is finalized and bag is being packed
      return data.birthPlanFilled >= data.birthPlanTotal * 0.8 && data.bagPacked > 0;
    case "final-check":
      return data.mustHaveRemaining === 0 && data.bagPacked === data.bagTotal;
    case "due-date":
      return today >= dueDate;
    default:
      return false;
  }
}

/** Determine the status of a milestone for styling purposes. */
function getMilestoneStatus(
  milestoneDate: Date,
  today: Date,
  isComplete: boolean
): "complete" | "imminent" | "upcoming" | "past-due" {
  if (isComplete) return "complete";
  const daysUntil = Math.round(
    (milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil < 0) return "past-due";
  if (daysUntil <= 7) return "imminent";
  return "upcoming";
}

interface MilestoneTimelineProps {
  dueDate: string;
  completionData: MilestoneCompletionData;
}

export function MilestoneTimeline({
  dueDate,
  completionData,
}: MilestoneTimelineProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateObj = new Date(dueDate);
  dueDateObj.setHours(0, 0, 0, 0);

  const milestonesWithDates = MILESTONES.map((m) => {
    const date = getMilestoneDate(dueDate, m.weeksBefore);
    const complete = isMilestoneComplete(m, completionData, today, dueDateObj);
    const status = getMilestoneStatus(date, today, complete);
    return { ...m, date, complete, status };
  });

  // Find the index of the current position (first milestone not yet passed or the last one)
  const currentIndex = milestonesWithDates.findIndex(
    (m) => m.date > today && !m.complete
  );

  const statusStyles = {
    complete: {
      dot: "bg-sage-500 border-sage-300",
      text: "text-sage-700",
      sub: "text-sage-500",
      line: "bg-sage-300",
    },
    imminent: {
      dot: "bg-amber-500 border-amber-300 ring-2 ring-amber-200",
      text: "text-amber-700",
      sub: "text-amber-500",
      line: "bg-stone-200",
    },
    "past-due": {
      dot: "bg-rose-500 border-rose-300 ring-2 ring-rose-200",
      text: "text-rose-700",
      sub: "text-rose-500",
      line: "bg-stone-200",
    },
    upcoming: {
      dot: "bg-stone-200 border-stone-300",
      text: "text-stone-600",
      sub: "text-stone-400",
      line: "bg-stone-200",
    },
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="card p-5 mb-6">
      <h2 className="text-sm font-semibold text-stone-700 mb-4">
        Preparation Timeline
      </h2>

      {/* Desktop: horizontal layout */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {/* Connecting line */}
          <div className="absolute top-3 left-3 right-3 h-0.5 bg-stone-200" />
          {/* Completed portion of the line */}
          {currentIndex > 0 && (
            <div
              className="absolute top-3 left-3 h-0.5 bg-sage-300"
              style={{
                width: `${((currentIndex > -1 ? currentIndex : milestonesWithDates.length) / (milestonesWithDates.length - 1)) * 100}%`,
                maxWidth: "calc(100% - 24px)",
              }}
            />
          )}

          {milestonesWithDates.map((m, i) => {
            const styles = statusStyles[m.status];
            return (
              <Link
                key={m.id}
                href={m.href}
                className="relative flex flex-col items-center group z-10"
                style={{ width: `${100 / milestonesWithDates.length}%` }}
              >
                {/* Dot */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${styles.dot}`}
                >
                  {m.complete ? (
                    <Check size={12} className="text-white" />
                  ) : (
                    <span className={`${m.status === "upcoming" ? "text-stone-400" : "text-white"}`}>
                      {m.icon}
                    </span>
                  )}
                </div>
                {/* Label */}
                <p
                  className={`text-xs font-medium mt-2 text-center leading-tight ${styles.text}`}
                >
                  {m.label}
                </p>
                {/* Date */}
                <p className={`text-xs mt-0.5 ${styles.sub}`}>
                  {formatDate(m.date)}
                </p>
                {/* Week indicator */}
                {m.weeksBefore > 0 && (
                  <p className="text-xs text-stone-300 mt-0.5">
                    -{m.weeksBefore}w
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical layout */}
      <div className="md:hidden">
        <div className="relative pl-6">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-stone-200" />
          {/* Completed portion */}
          {currentIndex > 0 && (
            <div
              className="absolute left-[11px] top-0 w-0.5 bg-sage-300"
              style={{
                height: `${((currentIndex > -1 ? currentIndex : milestonesWithDates.length) / milestonesWithDates.length) * 100}%`,
              }}
            />
          )}

          <ul className="space-y-4">
            {milestonesWithDates.map((m) => {
              const styles = statusStyles[m.status];
              return (
                <li key={m.id}>
                  <Link
                    href={m.href}
                    className="flex items-start gap-3 group"
                  >
                    {/* Dot */}
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 -ml-6 transition-transform group-hover:scale-110 ${styles.dot}`}
                    >
                      {m.complete ? (
                        <Check size={12} className="text-white" />
                      ) : (
                        <span className={`${m.status === "upcoming" ? "text-stone-400" : "text-white"}`}>
                          {m.icon}
                        </span>
                      )}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 pt-0.5">
                      <p
                        className={`text-sm font-medium leading-tight ${styles.text}`}
                      >
                        {m.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${styles.sub}`}>
                        {formatDate(m.date)}
                        {m.weeksBefore > 0 && (
                          <span className="text-stone-300 ml-1.5">
                            -{m.weeksBefore}w
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
