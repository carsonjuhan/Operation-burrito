// ── Newborn tracker actions ──────────────────────────────────────────────────
// Pure functions over NewbornTrackerData. No localStorage access, no React —
// callers (page components / QuickLogSheet) load/save via newbornTracker.ts
// and pass in `nowISO` so results are deterministic and testable.
//
// Every function returns a NEW data object (or a wrapper containing one);
// the input `data` is never mutated.

import type {
  DiaperEvent,
  DiaperType,
  FeedEvent,
  FeedType,
  MedEvent,
  NewbornLogEvent,
  NewbornTrackerData,
  SleepEvent,
} from "@/types";

/** Newest sleep event with no endTime, or undefined if none is running. */
export function getActiveSleep(events: NewbornLogEvent[]): SleepEvent | undefined {
  const sleeps = events.filter((e): e is SleepEvent => e.type === "sleep" && !e.endTime);
  sleeps.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  return sleeps[0];
}

/** Opposite breast side from the newest breast feed, or null if no nursing history. */
export function suggestedNextSide(events: NewbornLogEvent[]): FeedType | null {
  const feeds = events.filter(
    (e): e is FeedEvent => e.type === "feed" && (e.feedType === "breast-left" || e.feedType === "breast-right")
  );
  feeds.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const last = feeds[0];
  if (!last) return null;
  return last.feedType === "breast-left" ? "breast-right" : "breast-left";
}

/**
 * If an active sleep exists, end it at `nowISO` and return the ORIGINAL
 * (pre-end) event alongside the updated data, so callers can restore it on
 * undo. No-op (data returned as-is) when nothing is active.
 */
function endActiveSleep(
  data: NewbornTrackerData,
  nowISO: string
): { data: NewbornTrackerData; endedSleep?: SleepEvent } {
  const active = getActiveSleep(data.events);
  if (!active) return { data, endedSleep: undefined };
  return {
    data: {
      ...data,
      events: data.events.map(e =>
        e.id === active.id ? { ...e, endTime: nowISO, updatedAt: nowISO } : e
      ),
    },
    endedSleep: active,
  };
}

/**
 * Start a nursing timer for `feedType`. Feeding wakes the baby, so any
 * active sleep is auto-ended.
 */
export function startNursing(
  data: NewbornTrackerData,
  feedType: FeedType,
  nowISO: string
): { data: NewbornTrackerData; endedSleep?: SleepEvent } {
  const { data: woken, endedSleep } = endActiveSleep(data, nowISO);
  return {
    data: {
      ...woken,
      activeNursing: { feedType, startTime: nowISO },
      activeNursingUpdatedAt: nowISO,
    },
    endedSleep,
  };
}

/** Generate a unique-enough string id, offset from Date.now() by `offset` ms. */
function makeId(nowISO: string, offset = 0): string {
  return (new Date(nowISO).getTime() + offset).toString();
}

/** Finish the running nursing timer and append its FeedEvent. No-op if no timer is running. */
export function finishNursing(
  data: NewbornTrackerData,
  nowISO: string
): { data: NewbornTrackerData; event?: FeedEvent } {
  const nursing = data.activeNursing;
  if (!nursing) return { data };
  const durationMin = Math.max(
    1,
    Math.round((new Date(nowISO).getTime() - new Date(nursing.startTime).getTime()) / 60000)
  );
  const event: FeedEvent = {
    id: makeId(nowISO),
    type: "feed",
    timestamp: nursing.startTime,
    feedType: nursing.feedType,
    durationMin,
    updatedAt: nowISO,
  };
  return {
    data: {
      ...data,
      activeNursing: undefined,
      activeNursingUpdatedAt: nowISO,
      events: [...data.events, event],
    },
    event,
  };
}

/** Cancel the running nursing timer without logging a feed. Returns what was cancelled (for undo). */
export function cancelNursing(
  data: NewbornTrackerData,
  nowISO: string
): { data: NewbornTrackerData; cancelled?: { feedType: FeedType; startTime: string } } {
  const nursing = data.activeNursing;
  if (!nursing) return { data };
  return {
    data: { ...data, activeNursing: undefined, activeNursingUpdatedAt: nowISO },
    cancelled: { feedType: nursing.feedType, startTime: nursing.startTime },
  };
}

/** Undo of cancelNursing: re-set the active nursing timer. */
export function restoreNursing(
  data: NewbornTrackerData,
  nursing: { feedType: FeedType; startTime: string },
  nowISO: string
): { data: NewbornTrackerData } {
  return {
    data: { ...data, activeNursing: { ...nursing }, activeNursingUpdatedAt: nowISO },
  };
}

/** Log an instant (non-timed) feed — bottle/formula. Also wakes the baby if sleeping. */
export function logInstantFeed(
  data: NewbornTrackerData,
  feedType: FeedType,
  nowISO: string
): { data: NewbornTrackerData; event: FeedEvent; endedSleep?: SleepEvent } {
  const { data: woken, endedSleep } = endActiveSleep(data, nowISO);
  const event: FeedEvent = {
    id: makeId(nowISO),
    type: "feed",
    timestamp: nowISO,
    feedType,
    updatedAt: nowISO,
  };
  return { data: { ...woken, events: [...woken.events, event] }, event, endedSleep };
}

/** Start a sleep session. No conflict resolution — callers gate on activeNursing with a confirm UI. */
export function startSleep(
  data: NewbornTrackerData,
  nowISO: string
): { data: NewbornTrackerData; event: SleepEvent } {
  const event: SleepEvent = {
    id: makeId(nowISO),
    type: "sleep",
    startTime: nowISO,
    updatedAt: nowISO,
  };
  return { data: { ...data, events: [...data.events, event] }, event };
}

/** End a specific sleep event by id. No-op result (endedSleep undefined) if not found or already ended. */
export function endSleep(
  data: NewbornTrackerData,
  sleepId: string,
  nowISO: string
): { data: NewbornTrackerData; endedSleep?: SleepEvent } {
  const target = data.events.find(
    (e): e is SleepEvent => e.type === "sleep" && e.id === sleepId && !e.endTime
  );
  if (!target) return { data };
  return {
    data: {
      ...data,
      events: data.events.map(e => (e.id === sleepId ? { ...e, endTime: nowISO, updatedAt: nowISO } : e)),
    },
    endedSleep: target,
  };
}

/**
 * Confirmed path when a user starts sleep while nursing is active: finish the
 * nursing timer (if any) then start a new sleep session. Ids are guaranteed
 * unique even though both derive from the same `nowISO`.
 */
export function finishNursingAndStartSleep(
  data: NewbornTrackerData,
  nowISO: string
): { data: NewbornTrackerData; feedEvent?: FeedEvent; sleepEvent: SleepEvent } {
  const { data: afterFeed, event: feedEvent } = finishNursing(data, nowISO);
  const sleepEvent: SleepEvent = {
    id: makeId(nowISO, 1),
    type: "sleep",
    startTime: nowISO,
    updatedAt: nowISO,
  };
  return {
    data: { ...afterFeed, events: [...afterFeed.events, sleepEvent] },
    feedEvent,
    sleepEvent,
  };
}

/** Log a diaper change. */
export function logDiaper(
  data: NewbornTrackerData,
  diaperType: DiaperType,
  nowISO: string
): { data: NewbornTrackerData; event: DiaperEvent } {
  const event: DiaperEvent = {
    id: makeId(nowISO),
    type: "diaper",
    timestamp: nowISO,
    diaperType,
    updatedAt: nowISO,
  };
  return { data: { ...data, events: [...data.events, event] }, event };
}

/** Log a medication dose. */
export function logMed(
  data: NewbornTrackerData,
  nowISO: string
): { data: NewbornTrackerData; event: MedEvent } {
  const event: MedEvent = {
    id: makeId(nowISO),
    type: "med",
    timestamp: nowISO,
    updatedAt: nowISO,
  };
  return { data: { ...data, events: [...data.events, event] }, event };
}

/** Epoch ms when the running nursing timer crosses the "overdue" threshold, or null if no timer. */
export function nursingOverdueAt(
  activeNursing: { feedType: FeedType; startTime: string } | undefined,
  nursingMaxMinutes: number
): number | null {
  if (!activeNursing) return null;
  return new Date(activeNursing.startTime).getTime() + nursingMaxMinutes * 60_000;
}

/** Epoch ms when the running sleep session crosses the "overdue" threshold, or null if none active. */
export function sleepOverdueAt(
  activeSleep: SleepEvent | undefined,
  sleepMaxHours: number
): number | null {
  if (!activeSleep) return null;
  return new Date(activeSleep.startTime).getTime() + sleepMaxHours * 3600_000;
}
