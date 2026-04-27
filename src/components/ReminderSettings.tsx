'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

const REMINDERS_ENABLED_KEY = 'reminders-enabled';

export function getRemindersEnabled(): boolean {
  try {
    return localStorage.getItem(REMINDERS_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setRemindersEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(REMINDERS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // silent
  }
}

export function ReminderSettings() {
  const { supported, permission, requestPermission } = useNotifications();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getRemindersEnabled());
  }, []);

  async function handleToggle() {
    if (!enabled) {
      // Enabling: request permission if needed
      if (permission === 'default') {
        const result = await requestPermission();
        if (result !== 'granted') return; // Don't enable if permission not granted
      } else if (permission === 'denied') {
        return; // Can't enable if denied
      }
      setEnabled(true);
      setRemindersEnabled(true);
    } else {
      setEnabled(false);
      setRemindersEnabled(false);
    }
  }

  async function handleRequestPermission() {
    await requestPermission();
  }

  if (!supported) {
    return (
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BellOff size={18} className="text-stone-400 dark:text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Appointment Reminders
          </h2>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Browser notifications are not supported in this browser. Try using a modern desktop browser like Chrome or Firefox.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={18} className="text-stone-600 dark:text-stone-300" />
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          Appointment Reminders
        </h2>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">
        Get browser notifications the day before (9 AM) and morning of (8 AM) your appointments.
      </p>

      {/* Enable/Disable toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-stone-600 dark:text-stone-300">
          {enabled ? 'Reminders enabled' : 'Reminders disabled'}
        </span>
        <button
          onClick={handleToggle}
          disabled={permission === 'denied' && !enabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sage-400 focus:ring-offset-2 dark:focus:ring-offset-stone-800 ${
            enabled
              ? 'bg-sage-500'
              : 'bg-stone-300 dark:bg-stone-600'
          } ${permission === 'denied' && !enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle appointment reminders"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Permission status */}
      <div className="mt-3 space-y-2">
        {permission === 'granted' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={13} /> Notification permission granted
          </p>
        )}

        {permission === 'default' && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <AlertCircle size={13} /> Permission not yet requested
            </p>
            <button
              onClick={handleRequestPermission}
              className="btn-secondary text-xs"
            >
              Allow Notifications
            </button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <ShieldAlert size={13} /> Notification permission was denied
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              To enable reminders, allow notifications for this site in your browser settings, then reload the page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
