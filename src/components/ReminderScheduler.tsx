'use client';

import { useEffect, useRef } from 'react';
import { useAppointmentsContext, useBirthPlanContext } from '@/contexts/StoreContext';
import { checkAndFireReminders, cleanupOldReminders } from '@/lib/appointmentReminders';
import { checkMilestoneNotifications } from '@/lib/milestoneNotifications';
import { getRemindersEnabled } from '@/components/ReminderSettings';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Side-effect component that polls appointments every 5 minutes
 * and fires browser notifications for upcoming reminders.
 * Only active when reminders are enabled AND permission is granted.
 * Renders nothing to the DOM.
 */
export function ReminderScheduler() {
  const { appointments } = useAppointmentsContext();
  const { birthPlan } = useBirthPlanContext();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dueDate = birthPlan.personalInfo.dueDate;

  useEffect(() => {
    function check() {
      // Re-check enabled status and permission each poll
      if (!getRemindersEnabled()) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      checkAndFireReminders(appointments);

      // Check milestone notifications if due date is set
      if (dueDate) {
        checkMilestoneNotifications(dueDate);
      }
    }

    // Run once immediately
    check();

    // Clean up old shown-reminder keys periodically
    cleanupOldReminders(appointments);

    // Set up polling interval
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [appointments, dueDate]);

  return null;
}
