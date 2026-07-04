import { describe, it, expect } from "vitest";
import {
  sessionsThisWeek,
  totalMinutes,
  minutesByRoutine,
  currentStreakDays,
} from "@/lib/exerciseTracker";
import type { ExerciseSession } from "@/types";

function session(overrides: Partial<ExerciseSession>): ExerciseSession {
  return {
    id: overrides.id ?? Math.random().toString(),
    routine: overrides.routine ?? "tummy-time",
    date: overrides.date ?? "2026-07-04",
    durationMin: overrides.durationMin ?? 5,
    notes: overrides.notes,
  };
}

describe("sessionsThisWeek", () => {
  it("keeps sessions within the last 7 days (inclusive) and drops older ones", () => {
    const now = new Date(2026, 6, 4); // Jul 4, 2026
    const sessions = [
      session({ id: "a", date: "2026-07-04" }), // today
      session({ id: "b", date: "2026-06-28" }), // exactly 6 days ago -> included
      session({ id: "c", date: "2026-06-27" }), // 7 days ago -> excluded
    ];
    const result = sessionsThisWeek(sessions, now);
    expect(result.map(s => s.id)).toEqual(["a", "b"]);
  });

  it("sorts most recent first", () => {
    const now = new Date(2026, 6, 4);
    const sessions = [
      session({ id: "old", date: "2026-07-01" }),
      session({ id: "new", date: "2026-07-03" }),
    ];
    const result = sessionsThisWeek(sessions, now);
    expect(result.map(s => s.id)).toEqual(["new", "old"]);
  });
});

describe("totalMinutes", () => {
  it("sums durations", () => {
    const sessions = [session({ durationMin: 5 }), session({ durationMin: 10 })];
    expect(totalMinutes(sessions)).toBe(15);
  });

  it("returns 0 for an empty list", () => {
    expect(totalMinutes([])).toBe(0);
  });
});

describe("minutesByRoutine", () => {
  it("buckets minutes per routine, defaulting missing routines to 0", () => {
    const sessions = [
      session({ routine: "tummy-time", durationMin: 5 }),
      session({ routine: "tummy-time", durationMin: 3 }),
      session({ routine: "reading", durationMin: 10 }),
    ];
    const result = minutesByRoutine(sessions);
    expect(result["tummy-time"]).toBe(8);
    expect(result.reading).toBe(10);
    expect(result["high-contrast"]).toBe(0);
    expect(result["grasp-reach"]).toBe(0);
  });
});

describe("currentStreakDays", () => {
  it("counts consecutive days ending today", () => {
    const now = new Date(2026, 6, 4);
    const sessions = [
      session({ date: "2026-07-04" }),
      session({ date: "2026-07-03" }),
      session({ date: "2026-07-02" }),
      session({ date: "2026-06-30" }), // gap — breaks the streak before this
    ];
    expect(currentStreakDays(sessions, now)).toBe(3);
  });

  it("is 0 when nothing logged today", () => {
    const now = new Date(2026, 6, 4);
    const sessions = [session({ date: "2026-07-03" })];
    expect(currentStreakDays(sessions, now)).toBe(0);
  });

  it("is 0 for no sessions", () => {
    expect(currentStreakDays([], new Date(2026, 6, 4))).toBe(0);
  });
});
