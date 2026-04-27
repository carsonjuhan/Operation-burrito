import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import {
  MILESTONE_NOTIFICATIONS,
  getMilestoneNotificationDate,
  getShownMilestones,
  markMilestoneShown,
  checkMilestoneNotifications,
} from '../milestoneNotifications';

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
  vi.restoreAllMocks();
});

// ── Tests ───────────────────────────────────────────────────────────────

describe('getMilestoneNotificationDate', () => {
  it('calculates milestone dates correctly relative to due date', () => {
    const dueDate = '2026-07-01';

    // 12 weeks before = 84 days before
    const date12w = getMilestoneNotificationDate(dueDate, 12);
    expect(date12w.getFullYear()).toBe(2026);
    expect(date12w.getMonth()).toBe(3); // April (0-indexed)
    expect(date12w.getDate()).toBe(8); // July 1 - 84 days = April 8

    // 0 weeks before = due date itself
    const dateDue = getMilestoneNotificationDate(dueDate, 0);
    expect(dateDue.getFullYear()).toBe(2026);
    expect(dateDue.getMonth()).toBe(6); // July
    expect(dateDue.getDate()).toBe(1);
  });

  it('handles each milestone week value', () => {
    const dueDate = '2026-08-15';
    const dueDateObj = new Date(2026, 7, 15);

    for (const milestone of MILESTONE_NOTIFICATIONS) {
      const date = getMilestoneNotificationDate(dueDate, milestone.weeksBefore);
      const expectedMs = dueDateObj.getTime() - milestone.weeksBefore * 7 * 24 * 60 * 60 * 1000;
      const expected = new Date(expectedMs);
      expected.setHours(0, 0, 0, 0);
      expect(date.getTime()).toBe(expected.getTime());
    }
  });
});

describe('getShownMilestones / markMilestoneShown', () => {
  it('returns empty set when nothing stored', () => {
    expect(getShownMilestones().size).toBe(0);
  });

  it('tracks shown milestones', () => {
    markMilestoneShown('milestone-12w');
    const shown = getShownMilestones();
    expect(shown.has('milestone-12w')).toBe(true);
    expect(shown.has('milestone-8w')).toBe(false);
  });

  it('persists across calls', () => {
    markMilestoneShown('milestone-12w');
    markMilestoneShown('milestone-8w');
    const shown = getShownMilestones();
    expect(shown.size).toBe(2);
    expect(shown.has('milestone-12w')).toBe(true);
    expect(shown.has('milestone-8w')).toBe(true);
  });
});

describe('checkMilestoneNotifications', () => {
  it('fires notification when today >= milestone date', () => {
    // Due date 4 weeks from today — the 12w and 8w milestones are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 28); // 4 weeks away
    const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    const fired = checkMilestoneNotifications(dueDateStr);

    // 12w, 8w, and 4w milestones should have passed (today >= milestone date)
    expect(fired).toBeGreaterThanOrEqual(2);
    expect(NotificationMock).toHaveBeenCalled();
  });

  it('does not fire notification for future milestones', () => {
    // Due date 52 weeks from now — all milestones are far in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 364);
    const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    const fired = checkMilestoneNotifications(dueDateStr);

    expect(fired).toBe(0);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('does not re-fire already-shown milestones', () => {
    // Due date is today — all milestones are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const fired1 = checkMilestoneNotifications(dueDateStr);
    expect(fired1).toBe(MILESTONE_NOTIFICATIONS.length);

    NotificationMock.mockClear();

    // Second call should not fire any
    const fired2 = checkMilestoneNotifications(dueDateStr);
    expect(fired2).toBe(0);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('returns 0 when due date is empty', () => {
    expect(checkMilestoneNotifications('')).toBe(0);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('returns 0 when due date is invalid format', () => {
    expect(checkMilestoneNotifications('not-a-date')).toBe(0);
    expect(checkMilestoneNotifications('2026/07/01')).toBe(0);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it('fires due-date milestone on the exact due date', () => {
    // Set all milestones except due-date as already shown
    for (const m of MILESTONE_NOTIFICATIONS) {
      if (m.id !== 'milestone-due') {
        markMilestoneShown(m.id);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const fired = checkMilestoneNotifications(dueDateStr);
    expect(fired).toBe(1);
    expect(NotificationMock).toHaveBeenCalledWith(
      'Baby Prep Milestone',
      expect.objectContaining({
        body: 'Today is your due date! Wishing you all the best.',
      })
    );
  });
});

describe('MILESTONE_NOTIFICATIONS', () => {
  it('contains the expected week values', () => {
    const weeks = MILESTONE_NOTIFICATIONS.map((m) => m.weeksBefore);
    expect(weeks).toEqual([12, 8, 4, 2, 1, 0]);
  });

  it('each milestone has a non-empty message and href', () => {
    for (const m of MILESTONE_NOTIFICATIONS) {
      expect(m.message.length).toBeGreaterThan(0);
      expect(m.href).toMatch(/^\//);
    }
  });
});
