import { describe, it, expect } from "vitest";
import {
  getActiveSleep,
  suggestedNextSide,
  startNursing,
  finishNursing,
  cancelNursing,
  restoreNursing,
  logInstantFeed,
  startSleep,
  endSleep,
  finishNursingAndStartSleep,
  logDiaper,
  logMed,
  nursingOverdueAt,
  sleepOverdueAt,
} from "@/lib/newbornActions";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/reminderTimers";
import type { NewbornTrackerData, SleepEvent, FeedEvent } from "@/types";

function makeData(overrides: Partial<NewbornTrackerData> = {}): NewbornTrackerData {
  return { events: [], babyName: "Baby", ...overrides };
}

const T0 = "2026-07-02T10:00:00.000Z";
const T1 = "2026-07-02T10:30:00.000Z";

describe("newbornActions", () => {
  it("startNursing sets the timer and ends any active sleep", () => {
    const sleepEvent: SleepEvent = { id: "s1", type: "sleep", startTime: T0, updatedAt: T0 };
    const data = makeData({ events: [sleepEvent] });
    const { data: next, endedSleep } = startNursing(data, "breast-left", T1);

    expect(next.activeNursing).toEqual({ feedType: "breast-left", startTime: T1 });
    expect(next.activeNursingUpdatedAt).toBe(T1);
    // endedSleep is the ORIGINAL (pre-end) event
    expect(endedSleep).toEqual(sleepEvent);
    expect(endedSleep?.endTime).toBeUndefined();
    // resulting data has endTime set on that event
    const updated = next.events.find(e => e.id === "s1") as SleepEvent;
    expect(updated.endTime).toBe(T1);
    expect(updated.updatedAt).toBe(T1);
    // original untouched
    expect(sleepEvent.endTime).toBeUndefined();
  });

  it("startNursing with no active sleep leaves endedSleep undefined", () => {
    const data = makeData();
    const { endedSleep } = startNursing(data, "bottle", T0);
    expect(endedSleep).toBeUndefined();
  });

  it("logInstantFeed appends correct FeedEvent shape and ends active sleep", () => {
    const sleepEvent: SleepEvent = { id: "s1", type: "sleep", startTime: T0, updatedAt: T0 };
    const data = makeData({ events: [sleepEvent] });
    const { data: next, event, endedSleep } = logInstantFeed(data, "bottle", T1);

    expect(event).toMatchObject({ type: "feed", timestamp: T1, feedType: "bottle", updatedAt: T1 });
    expect(event.durationMin).toBeUndefined();
    expect(next.events).toContainEqual(event);
    expect(endedSleep).toEqual(sleepEvent);
    const updated = next.events.find(e => e.id === "s1") as SleepEvent;
    expect(updated.endTime).toBe(T1);
  });

  it("logInstantFeed with no active sleep returns endedSleep undefined", () => {
    const data = makeData();
    const { endedSleep } = logInstantFeed(data, "formula", T0);
    expect(endedSleep).toBeUndefined();
  });

  it("finishNursing: timestamp = timer startTime, durationMin >= 1, timer cleared and stamped", () => {
    const data = makeData({ activeNursing: { feedType: "breast-right", startTime: T0 } });
    const { data: next, event } = finishNursing(data, T1); // 30 min later

    expect(event).toBeDefined();
    expect(event!.timestamp).toBe(T0);
    expect(event!.feedType).toBe("breast-right");
    expect(event!.durationMin).toBe(30);
    expect(event!.durationMin).toBeGreaterThanOrEqual(1);
    expect(next.activeNursing).toBeUndefined();
    expect(next.activeNursingUpdatedAt).toBe(T1);
    expect(next.events).toContainEqual(event);
  });

  it("finishNursing with no active timer is a no-op", () => {
    const data = makeData();
    const { data: next, event } = finishNursing(data, T0);
    expect(event).toBeUndefined();
    expect(next).toBe(data);
  });

  it("finishNursingAndStartSleep appends both events with unique ids and clears the timer", () => {
    const data = makeData({ activeNursing: { feedType: "breast-left", startTime: T0 } });
    const { data: next, feedEvent, sleepEvent } = finishNursingAndStartSleep(data, T1);

    expect(feedEvent).toBeDefined();
    expect(feedEvent!.timestamp).toBe(T0);
    expect(sleepEvent.startTime).toBe(T1);
    expect(feedEvent!.id).not.toBe(sleepEvent.id);
    expect(next.activeNursing).toBeUndefined();
    expect(next.events).toContainEqual(feedEvent);
    expect(next.events).toContainEqual(sleepEvent);
  });

  it("finishNursingAndStartSleep with no active nursing still starts sleep", () => {
    const data = makeData();
    const { feedEvent, sleepEvent, data: next } = finishNursingAndStartSleep(data, T0);
    expect(feedEvent).toBeUndefined();
    expect(sleepEvent).toBeDefined();
    expect(next.events).toContainEqual(sleepEvent);
  });

  it("cancelNursing/restoreNursing round-trip", () => {
    const data = makeData({ activeNursing: { feedType: "both", startTime: T0 } });
    const { data: cancelled, cancelled: what } = cancelNursing(data, T1);
    expect(cancelled.activeNursing).toBeUndefined();
    expect(what).toEqual({ feedType: "both", startTime: T0 });

    const { data: restored } = restoreNursing(cancelled, what!, T1);
    expect(restored.activeNursing).toEqual({ feedType: "both", startTime: T0 });
    expect(restored.activeNursingUpdatedAt).toBe(T1);
  });

  it("cancelNursing with no active timer is a no-op", () => {
    const data = makeData();
    const { data: next, cancelled } = cancelNursing(data, T0);
    expect(cancelled).toBeUndefined();
    expect(next).toBe(data);
  });

  it("getActiveSleep picks the newest open sleep", () => {
    const older: SleepEvent = { id: "a", type: "sleep", startTime: T0, updatedAt: T0 };
    const newer: SleepEvent = { id: "b", type: "sleep", startTime: T1, updatedAt: T1 };
    const ended: SleepEvent = { id: "c", type: "sleep", startTime: "2026-07-02T11:00:00.000Z", endTime: "2026-07-02T11:10:00.000Z" };
    const events = [older, ended, newer];
    expect(getActiveSleep(events)?.id).toBe("b");
  });

  it("getActiveSleep returns undefined when nothing active", () => {
    const ended: SleepEvent = { id: "c", type: "sleep", startTime: T0, endTime: T1 };
    expect(getActiveSleep([ended])).toBeUndefined();
  });

  it("suggestedNextSide alternates and returns null with no nursing history", () => {
    expect(suggestedNextSide([])).toBeNull();
    const left: FeedEvent = { id: "1", type: "feed", timestamp: T0, feedType: "breast-left" };
    expect(suggestedNextSide([left])).toBe("breast-right");
    const right: FeedEvent = { id: "2", type: "feed", timestamp: T1, feedType: "breast-right" };
    expect(suggestedNextSide([left, right])).toBe("breast-left");
    // non-breast feeds don't affect the suggestion
    const bottle: FeedEvent = { id: "3", type: "feed", timestamp: "2026-07-02T11:00:00.000Z", feedType: "bottle" };
    expect(suggestedNextSide([left, right, bottle])).toBe("breast-left");
  });

  it("logDiaper and logMed produce expected shapes and append events", () => {
    const data = makeData();
    const { data: afterDiaper, event: diaperEvent } = logDiaper(data, "wet", T0);
    expect(diaperEvent).toMatchObject({ type: "diaper", timestamp: T0, diaperType: "wet", updatedAt: T0 });
    expect(afterDiaper.events).toContainEqual(diaperEvent);

    const { data: afterMed, event: medEvent } = logMed(afterDiaper, T1);
    expect(medEvent).toMatchObject({ type: "med", timestamp: T1, updatedAt: T1 });
    expect(afterMed.events).toContainEqual(medEvent);
    expect(afterMed.events).toHaveLength(2);
  });

  it("startSleep and endSleep round-trip", () => {
    const data = makeData();
    const { data: started, event } = startSleep(data, T0);
    expect(event).toMatchObject({ type: "sleep", startTime: T0, updatedAt: T0 });
    expect(event.endTime).toBeUndefined();

    const { data: ended, endedSleep } = endSleep(started, event.id, T1);
    expect(endedSleep).toEqual(event);
    const finalEvent = ended.events.find(e => e.id === event.id) as SleepEvent;
    expect(finalEvent.endTime).toBe(T1);
    expect(finalEvent.updatedAt).toBe(T1);
  });

  it("endSleep on unknown/already-ended id is a no-op", () => {
    const data = makeData();
    const { data: next, endedSleep } = endSleep(data, "missing", T0);
    expect(endedSleep).toBeUndefined();
    expect(next).toBe(data);
  });

  it("nursingOverdueAt computes threshold and returns null when no timer", () => {
    expect(nursingOverdueAt(undefined, 60)).toBeNull();
    const overdueAt = nursingOverdueAt({ feedType: "breast-left", startTime: T0 }, 60);
    expect(overdueAt).toBe(new Date(T0).getTime() + 60 * 60_000);
  });

  it("sleepOverdueAt computes threshold and returns null when no active sleep", () => {
    expect(sleepOverdueAt(undefined, 3.5)).toBeNull();
    const sleep: SleepEvent = { id: "s", type: "sleep", startTime: T0 };
    const overdueAt = sleepOverdueAt(sleep, 3.5);
    expect(overdueAt).toBe(new Date(T0).getTime() + 3.5 * 3600_000);
  });

  it("ReminderSettings defaults include nursing/sleep thresholds", () => {
    expect(DEFAULT_REMINDER_SETTINGS.nursingMaxMinutes).toBe(60);
    expect(DEFAULT_REMINDER_SETTINGS.sleepMaxHours).toBe(3.5);
  });

  it("input data is never mutated", () => {
    const sleepEvent: SleepEvent = { id: "s1", type: "sleep", startTime: T0, updatedAt: T0 };
    const data = makeData({ events: [sleepEvent], activeNursing: { feedType: "breast-left", startTime: T0 } });
    const snapshot = JSON.parse(JSON.stringify(data));

    startNursing(data, "breast-right", T1);
    finishNursing(data, T1);
    cancelNursing(data, T1);
    logInstantFeed(data, "bottle", T1);
    logDiaper(data, "wet", T1);
    logMed(data, T1);
    startSleep(data, T1);
    endSleep(data, "s1", T1);
    finishNursingAndStartSleep(data, T1);

    expect(data).toEqual(snapshot);
  });
});
