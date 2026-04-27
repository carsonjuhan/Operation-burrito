import { showNotification } from '@/lib/appointmentReminders';

const SHOWN_KEY = 'milestone-notifications-shown';

// ── Milestone definitions ──────────────────────────────────────────────

export interface MilestoneNotification {
  id: string;
  weeksBefore: number;
  message: string;
  href: string;
}

export const MILESTONE_NOTIFICATIONS: MilestoneNotification[] = [
  {
    id: 'milestone-12w',
    weeksBefore: 12,
    message: '12 weeks to go! Time to register for prenatal classes.',
    href: '/classes',
  },
  {
    id: 'milestone-8w',
    weeksBefore: 8,
    message: '8 weeks to go! Time to start your hospital bag.',
    href: '/hospital-bag',
  },
  {
    id: 'milestone-4w',
    weeksBefore: 4,
    message: '4 weeks to go! Make sure your hospital bag is packed.',
    href: '/hospital-bag',
  },
  {
    id: 'milestone-2w',
    weeksBefore: 2,
    message: '2 weeks to go! Finalize your birth plan.',
    href: '/birth-plan',
  },
  {
    id: 'milestone-1w',
    weeksBefore: 1,
    message: '1 week to go! Do a final check on all your preparations.',
    href: '/items',
  },
  {
    id: 'milestone-due',
    weeksBefore: 0,
    message: 'Today is your due date! Wishing you all the best.',
    href: '/birth-plan',
  },
];

// ── Shown tracking (localStorage) ─────────────────────────────────────

export function getShownMilestones(): Set<string> {
  try {
    const stored = localStorage.getItem(SHOWN_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

export function markMilestoneShown(id: string): void {
  const shown = getShownMilestones();
  shown.add(id);
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown]));
  } catch {
    // localStorage full — silent fail
  }
}

// ── Date calculation ──────────────────────────────────────────────────

/**
 * Calculate the calendar date when a milestone triggers, given
 * a due date string (YYYY-MM-DD) and weeks-before value.
 */
export function getMilestoneNotificationDate(dueDateStr: string, weeksBefore: number): Date {
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - weeksBefore * 7);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ── Main check function ───────────────────────────────────────────────

/**
 * Check if any milestone notifications should fire based on the current date
 * relative to the due date. A milestone fires when:
 *   - today >= milestone date
 *   - it hasn't already been shown
 *
 * @param dueDate - Due date string in YYYY-MM-DD format
 * @returns Number of notifications fired
 */
export function checkMilestoneNotifications(dueDate: string): number {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 0;

  const shown = getShownMilestones();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let fired = 0;

  for (const milestone of MILESTONE_NOTIFICATIONS) {
    if (shown.has(milestone.id)) continue;

    const milestoneDate = getMilestoneNotificationDate(dueDate, milestone.weeksBefore);

    if (today >= milestoneDate) {
      showNotification('Baby Prep Milestone', milestone.message);
      markMilestoneShown(milestone.id);
      fired++;
    }
  }

  return fired;
}
