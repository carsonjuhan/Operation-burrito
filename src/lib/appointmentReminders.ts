import type { Appointment } from '@/types';

const SHOWN_REMINDERS_KEY = 'reminders-shown';

// ── Reminder key generation ──────────────────────────────────────────────

/**
 * Generate a unique key for a reminder to track whether it has been shown.
 * Format: `{appointmentId}-{type}` where type is "day-before" or "morning-of".
 */
export function getReminderKey(appointmentId: string, type: 'day-before' | 'morning-of'): string {
  return `${appointmentId}-${type}`;
}

// ── Shown reminder tracking (localStorage) ──────────────────────────────

export function getShownReminders(): Set<string> {
  try {
    const stored = localStorage.getItem(SHOWN_REMINDERS_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

export function markReminderShown(key: string): void {
  const shown = getShownReminders();
  shown.add(key);
  try {
    localStorage.setItem(SHOWN_REMINDERS_KEY, JSON.stringify([...shown]));
  } catch {
    // localStorage full — silent fail
  }
}

/**
 * Clean up old reminder keys for appointments that are more than 7 days in the past.
 * Prevents unbounded growth of the shown-reminders set.
 */
export function cleanupOldReminders(appointments: Appointment[]): void {
  const shown = getShownReminders();
  if (shown.size === 0) return;

  const appointmentIds = new Set(appointments.map((a) => a.id));
  const toRemove: string[] = [];

  shown.forEach((key) => {
    const apptId = key.replace(/-day-before$/, '').replace(/-morning-of$/, '');
    if (!appointmentIds.has(apptId)) {
      toRemove.push(key);
    }
  });

  if (toRemove.length > 0) {
    toRemove.forEach((k) => shown.delete(k));
    try {
      localStorage.setItem(SHOWN_REMINDERS_KEY, JSON.stringify([...shown]));
    } catch {
      // silent
    }
  }
}

// ── Reminder time calculations ──────────────────────────────────────────

export interface PendingReminder {
  key: string;
  appointmentId: string;
  type: 'day-before' | 'morning-of';
  fireAt: Date;
  title: string;
  body: string;
}

/**
 * Compute the "day before at 9am" and "morning of at 8am" reminder times
 * for a given appointment date string (YYYY-MM-DD).
 */
export function getReminderTimes(dateStr: string): { dayBefore: Date; morningOf: Date } | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const [year, month, day] = dateStr.split('-').map(Number);

  // Day before at 9:00 AM local time
  const dayBefore = new Date(year, month - 1, day - 1, 9, 0, 0, 0);

  // Morning of at 8:00 AM local time
  const morningOf = new Date(year, month - 1, day, 8, 0, 0, 0);

  return { dayBefore, morningOf };
}

/**
 * Format appointment details into a notification body string.
 */
export function formatNotificationBody(appt: Appointment, type: 'day-before' | 'morning-of'): string {
  const parts: string[] = [];

  if (type === 'day-before') {
    parts.push('Tomorrow');
  } else {
    parts.push('Today');
  }

  if (appt.time) {
    try {
      const formatted = new Date(`1970-01-01T${appt.time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      parts[0] += ` at ${formatted}`;
    } catch {
      parts[0] += ` at ${appt.time}`;
    }
  }

  if (appt.location) {
    parts.push(appt.location);
  }

  return parts.join(' · ');
}

/**
 * Given a list of appointments, compute all pending reminders that should fire
 * and have not yet been shown.
 */
export function getPendingReminders(appointments: Appointment[], now: Date = new Date()): PendingReminder[] {
  const shown = getShownReminders();
  const pending: PendingReminder[] = [];

  for (const appt of appointments) {
    // Skip completed appointments or those without dates
    if (appt.completed || !appt.date) continue;

    const times = getReminderTimes(appt.date);
    if (!times) continue;

    // Day-before reminder
    const dayBeforeKey = getReminderKey(appt.id, 'day-before');
    if (!shown.has(dayBeforeKey) && times.dayBefore.getTime() <= now.getTime() && times.morningOf.getTime() > now.getTime()) {
      // Only show day-before if we're between dayBefore time and morningOf time
      pending.push({
        key: dayBeforeKey,
        appointmentId: appt.id,
        type: 'day-before',
        fireAt: times.dayBefore,
        title: `Reminder: ${appt.title}`,
        body: formatNotificationBody(appt, 'day-before'),
      });
    }

    // Morning-of reminder
    const morningOfKey = getReminderKey(appt.id, 'morning-of');
    if (!shown.has(morningOfKey) && times.morningOf.getTime() <= now.getTime()) {
      // Show morning-of if we're past 8am on the day of the appointment
      // But don't show if the appointment date is more than 1 day in the past
      const oneDayAfter = new Date(times.morningOf.getTime() + 24 * 60 * 60 * 1000);
      if (now.getTime() < oneDayAfter.getTime()) {
        pending.push({
          key: morningOfKey,
          appointmentId: appt.id,
          type: 'morning-of',
          fireAt: times.morningOf,
          title: `Reminder: ${appt.title}`,
          body: formatNotificationBody(appt, 'morning-of'),
        });
      }
    }
  }

  return pending;
}

// ── Show notification ───────────────────────────────────────────────────

export function showNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-180.svg',
      tag: title, // prevents duplicate notifications with same title
    });
  } catch {
    // Notification constructor may fail in some contexts (e.g. service worker required on Android)
    // Silent fail — this is a best-effort feature
  }
}

// ── Main check function ─────────────────────────────────────────────────

/**
 * Check all appointments for pending reminders and fire them.
 * Returns the number of reminders fired.
 */
export function checkAndFireReminders(appointments: Appointment[]): number {
  const pending = getPendingReminders(appointments);
  let fired = 0;

  for (const reminder of pending) {
    showNotification(reminder.title, reminder.body);
    markReminderShown(reminder.key);
    fired++;
  }

  return fired;
}
