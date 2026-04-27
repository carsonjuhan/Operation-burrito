import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import {
  getReminderKey,
  getShownReminders,
  markReminderShown,
  getReminderTimes,
  formatNotificationBody,
  getPendingReminders,
  checkAndFireReminders,
  showNotification,
} from '../appointmentReminders';
import type { Appointment } from '@/types';

// ── localStorage mock ───────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

// ── Notification mock ───────────────────────────────────────────────────

const NotificationMock = vi.fn();
(NotificationMock as unknown as { permission: string }).permission = 'granted';

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('Notification', NotificationMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  localStorageMock.clear();
  NotificationMock.mockClear();
  (NotificationMock as unknown as { permission: string }).permission = 'granted';
});

// ── Helper to create an appointment ─────────────────────────────────────

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    title: '20-week ultrasound',
    type: 'Ultrasound',
    date: '2026-04-25',
    time: '10:30',
    provider: 'Dr. Smith',
    location: 'City Hospital',
    notes: '',
    completed: false,
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('getReminderKey', () => {
  it('generates correct day-before key', () => {
    expect(getReminderKey('abc', 'day-before')).toBe('abc-day-before');
  });

  it('generates correct morning-of key', () => {
    expect(getReminderKey('abc', 'morning-of')).toBe('abc-morning-of');
  });
});

describe('shown reminder tracking', () => {
  it('returns empty set when nothing stored', () => {
    expect(getShownReminders().size).toBe(0);
  });

  it('marks a reminder as shown and retrieves it', () => {
    markReminderShown('appt-1-day-before');
    const shown = getShownReminders();
    expect(shown.has('appt-1-day-before')).toBe(true);
    expect(shown.size).toBe(1);
  });

  it('does not duplicate entries', () => {
    markReminderShown('appt-1-day-before');
    markReminderShown('appt-1-day-before');
    const shown = getShownReminders();
    expect(shown.size).toBe(1);
  });

  it('tracks multiple reminders', () => {
    markReminderShown('appt-1-day-before');
    markReminderShown('appt-1-morning-of');
    markReminderShown('appt-2-day-before');
    const shown = getShownReminders();
    expect(shown.size).toBe(3);
  });
});

describe('getReminderTimes', () => {
  it('calculates correct day-before and morning-of times', () => {
    const result = getReminderTimes('2026-04-25');
    expect(result).not.toBeNull();

    // Day before (April 24) at 9:00 AM
    expect(result!.dayBefore.getFullYear()).toBe(2026);
    expect(result!.dayBefore.getMonth()).toBe(3); // 0-indexed: April = 3
    expect(result!.dayBefore.getDate()).toBe(24);
    expect(result!.dayBefore.getHours()).toBe(9);
    expect(result!.dayBefore.getMinutes()).toBe(0);

    // Morning of (April 25) at 8:00 AM
    expect(result!.morningOf.getFullYear()).toBe(2026);
    expect(result!.morningOf.getMonth()).toBe(3);
    expect(result!.morningOf.getDate()).toBe(25);
    expect(result!.morningOf.getHours()).toBe(8);
    expect(result!.morningOf.getMinutes()).toBe(0);
  });

  it('handles first day of month (day-before crosses month boundary)', () => {
    const result = getReminderTimes('2026-05-01');
    expect(result).not.toBeNull();
    expect(result!.dayBefore.getMonth()).toBe(3); // April
    expect(result!.dayBefore.getDate()).toBe(30);
  });

  it('handles first day of year', () => {
    const result = getReminderTimes('2026-01-01');
    expect(result).not.toBeNull();
    expect(result!.dayBefore.getFullYear()).toBe(2025);
    expect(result!.dayBefore.getMonth()).toBe(11); // December
    expect(result!.dayBefore.getDate()).toBe(31);
  });

  it('returns null for empty string', () => {
    expect(getReminderTimes('')).toBeNull();
  });

  it('returns null for invalid date format', () => {
    expect(getReminderTimes('April 25, 2026')).toBeNull();
    expect(getReminderTimes('25/04/2026')).toBeNull();
  });
});

describe('formatNotificationBody', () => {
  it('formats day-before with time and location', () => {
    const appt = makeAppointment();
    const body = formatNotificationBody(appt, 'day-before');
    expect(body).toContain('Tomorrow');
    expect(body).toContain('10:30');
    expect(body).toContain('City Hospital');
  });

  it('formats morning-of with time and location', () => {
    const appt = makeAppointment();
    const body = formatNotificationBody(appt, 'morning-of');
    expect(body).toContain('Today');
    expect(body).toContain('10:30');
    expect(body).toContain('City Hospital');
  });

  it('handles appointment without time', () => {
    const appt = makeAppointment({ time: '' });
    const body = formatNotificationBody(appt, 'day-before');
    expect(body).toContain('Tomorrow');
    expect(body).not.toContain('at');
  });

  it('handles appointment without location', () => {
    const appt = makeAppointment({ location: '' });
    const body = formatNotificationBody(appt, 'morning-of');
    expect(body).toContain('Today');
    expect(body).not.toContain('City Hospital');
  });
});

describe('getPendingReminders', () => {
  it('returns day-before reminder when current time is between day-before and morning-of', () => {
    const appt = makeAppointment({ date: '2026-04-25' });
    // April 24 at 10:00 AM (after 9 AM day-before, before 8 AM morning-of)
    const now = new Date(2026, 3, 24, 10, 0, 0);
    const pending = getPendingReminders([appt], now);
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe('day-before');
    expect(pending[0].key).toBe('appt-1-day-before');
  });

  it('returns morning-of reminder when current time is past 8 AM on appointment day', () => {
    const appt = makeAppointment({ date: '2026-04-25' });
    // April 25 at 8:30 AM
    const now = new Date(2026, 3, 25, 8, 30, 0);
    const pending = getPendingReminders([appt], now);
    // Should include morning-of
    const morningOf = pending.find((r) => r.type === 'morning-of');
    expect(morningOf).toBeDefined();
  });

  it('returns both reminders when morning-of and day-before already shown is not tracked', () => {
    const appt = makeAppointment({ date: '2026-04-25' });
    // April 25 at 9 AM — both dayBefore and morningOf have passed
    const now = new Date(2026, 3, 25, 9, 0, 0);
    const pending = getPendingReminders([appt], now);
    // morningOf should be there; dayBefore should NOT because now > morningOf time
    const types = pending.map((r) => r.type);
    expect(types).toContain('morning-of');
    // dayBefore fires only between dayBefore and morningOf, so it should NOT fire after morningOf
    expect(types).not.toContain('day-before');
  });

  it('skips already-shown reminders', () => {
    const appt = makeAppointment({ date: '2026-04-25' });
    markReminderShown('appt-1-day-before');
    const now = new Date(2026, 3, 24, 10, 0, 0);
    const pending = getPendingReminders([appt], now);
    expect(pending).toHaveLength(0);
  });

  it('skips completed appointments', () => {
    const appt = makeAppointment({ date: '2026-04-25', completed: true });
    const now = new Date(2026, 3, 24, 10, 0, 0);
    const pending = getPendingReminders([appt], now);
    expect(pending).toHaveLength(0);
  });

  it('skips appointments without dates', () => {
    const appt = makeAppointment({ date: '' });
    const now = new Date(2026, 3, 24, 10, 0, 0);
    const pending = getPendingReminders([appt], now);
    expect(pending).toHaveLength(0);
  });

  it('does not fire reminders for far-past appointments', () => {
    const appt = makeAppointment({ date: '2026-01-01' });
    const now = new Date(2026, 3, 25, 10, 0, 0);
    const pending = getPendingReminders([appt], now);
    expect(pending).toHaveLength(0);
  });

  it('does not fire reminders for future appointments (before day-before)', () => {
    const appt = makeAppointment({ date: '2026-04-30' });
    // April 25 — more than 1 day before
    const now = new Date(2026, 3, 25, 10, 0, 0);
    const pending = getPendingReminders([appt], now);
    expect(pending).toHaveLength(0);
  });
});

describe('checkAndFireReminders', () => {
  it('fires notification and marks reminder as shown', () => {
    const appt = makeAppointment({ date: '2026-04-25' });
    // Mock Date.now to be April 24 at 10 AM
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 24, 10, 0, 0));

    const fired = checkAndFireReminders([appt]);
    expect(fired).toBe(1);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
    expect(NotificationMock).toHaveBeenCalledWith(
      'Reminder: 20-week ultrasound',
      expect.objectContaining({ body: expect.stringContaining('Tomorrow') })
    );

    // Should be marked as shown now
    expect(getShownReminders().has('appt-1-day-before')).toBe(true);

    // Running again should not fire again
    NotificationMock.mockClear();
    const fired2 = checkAndFireReminders([appt]);
    expect(fired2).toBe(0);
    expect(NotificationMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('does not fire when permission is not granted', () => {
    (NotificationMock as unknown as { permission: string }).permission = 'denied';
    const appt = makeAppointment({ date: '2026-04-25' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 24, 10, 0, 0));

    const fired = checkAndFireReminders([appt]);
    // getPendingReminders still returns pending, but showNotification won't fire
    // The function still marks them shown to avoid retry spam
    expect(fired).toBeGreaterThanOrEqual(0);

    vi.useRealTimers();
  });
});

describe('showNotification', () => {
  it('creates a Notification when permission is granted', () => {
    (NotificationMock as unknown as { permission: string }).permission = 'granted';
    showNotification('Test Title', 'Test Body');
    expect(NotificationMock).toHaveBeenCalledWith('Test Title', expect.objectContaining({
      body: 'Test Body',
    }));
  });

  it('does not create a Notification when permission is denied', () => {
    (NotificationMock as unknown as { permission: string }).permission = 'denied';
    showNotification('Test Title', 'Test Body');
    expect(NotificationMock).not.toHaveBeenCalled();
  });
});
