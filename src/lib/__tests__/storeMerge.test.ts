import { describe, it, expect } from "vitest";
import { mergeStores, mergeNewbornEvents } from "@/lib/storeMerge";
import { DEFAULT_STORE } from "@/hooks/useStore";
import type { AppStore, Note, FeedEvent } from "@/types";

function makeStore(overrides: Partial<AppStore> = {}): AppStore {
  return { ...DEFAULT_STORE, hospitalBag: [], ...overrides };
}

function makeNote(id: string, title = "n"): Note {
  return { id, title, content: "", category: "General", pinned: false, createdAt: "2026-06-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z" };
}

describe("mergeStores tombstones", () => {
  it("propagates deletes — tombstoned items do not resurrect from remote", () => {
    const local = makeStore({ deletedIds: { "n1": new Date().toISOString() } });
    const remote = makeStore({ notes: [makeNote("n1")] });
    const merged = mergeStores(local, remote);
    expect(merged.notes.find((n) => n.id === "n1")).toBeUndefined();
    expect(merged.deletedIds?.["n1"]).toBeDefined();
  });

  it("unions tombstones from both sides", () => {
    const now = new Date().toISOString();
    const local = makeStore({ deletedIds: { a: now } });
    const remote = makeStore({ deletedIds: { b: now } });
    const merged = mergeStores(local, remote);
    expect(merged.deletedIds?.a).toBeDefined();
    expect(merged.deletedIds?.b).toBeDefined();
  });

  it("purges tombstones older than 30 days", () => {
    const old = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
    const local = makeStore({ deletedIds: { stale: old } });
    const merged = mergeStores(local, makeStore());
    expect(merged.deletedIds?.stale).toBeUndefined();
  });

  it("still unions additions from both sides", () => {
    const local = makeStore({ notes: [makeNote("a")] });
    const remote = makeStore({ notes: [makeNote("b")] });
    const merged = mergeStores(local, remote);
    expect(merged.notes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });
});

describe("mergeStores birth plan", () => {
  it("newest updatedAt wins", () => {
    const local = makeStore();
    local.birthPlan = { ...local.birthPlan, updatedAt: "2026-06-01T00:00:00Z", notes: "old local" };
    const remote = makeStore();
    remote.birthPlan = { ...remote.birthPlan, updatedAt: "2026-06-10T00:00:00Z", notes: "newer remote" };
    expect(mergeStores(local, remote).birthPlan.notes).toBe("newer remote");
    expect(mergeStores(remote, local).birthPlan.notes).toBe("newer remote");
  });
});

describe("mergeStores reminder settings", () => {
  it("newest updatedAt wins (e.g. med interval changed on one phone)", () => {
    const local = makeStore({
      reminderSettings: { feedEnabled: true, feedMinHours: 1.5, feedMaxHours: 3, medEnabled: true, medHours: 4, soundEnabled: true, nursingMaxMinutes: 60, sleepMaxHours: 3.5, updatedAt: "2026-06-01T00:00:00Z" },
    });
    const remote = makeStore({
      reminderSettings: { feedEnabled: true, feedMinHours: 1.5, feedMaxHours: 3, medEnabled: true, medHours: 6, soundEnabled: true, nursingMaxMinutes: 60, sleepMaxHours: 3.5, updatedAt: "2026-06-10T00:00:00Z" },
    });
    expect(mergeStores(local, remote).reminderSettings?.medHours).toBe(6);
    expect(mergeStores(remote, local).reminderSettings?.medHours).toBe(6);
  });

  it("keeps local when remote has no reminderSettings yet", () => {
    const local = makeStore({
      reminderSettings: { feedEnabled: true, feedMinHours: 1.5, feedMaxHours: 3, medEnabled: true, medHours: 6, soundEnabled: true, nursingMaxMinutes: 60, sleepMaxHours: 3.5, updatedAt: "2026-06-01T00:00:00Z" },
    });
    const remote = makeStore();
    expect(mergeStores(local, remote).reminderSettings?.medHours).toBe(6);
  });
});

describe("mergeStores newborn tracker", () => {
  const feed = (id: string, ts: string): FeedEvent => ({ id, type: "feed", timestamp: ts, feedType: "bottle" });

  it("unions newborn events from both devices", () => {
    const local = makeStore({ newbornEvents: [feed("f1", "2026-06-10T03:00:00Z")] });
    const remote = makeStore({ newbornEvents: [feed("f2", "2026-06-10T06:00:00Z")] });
    const merged = mergeStores(local, remote);
    expect(merged.newbornEvents?.map((e) => e.id).sort()).toEqual(["f1", "f2"]);
  });

  it("respects tombstones for deleted tracker events", () => {
    const local = makeStore({ deletedIds: { f1: new Date().toISOString() } });
    const remote = makeStore({ newbornEvents: [feed("f1", "2026-06-10T03:00:00Z")] });
    expect(mergeStores(local, remote).newbornEvents).toHaveLength(0);
  });

  it("prefers a real baby name over the default", () => {
    const local = makeStore({ newbornBabyName: "Baby" });
    const remote = makeStore({ newbornBabyName: "Luna" });
    expect(mergeStores(local, remote).newbornBabyName).toBe("Luna");
    expect(mergeStores(remote, local).newbornBabyName).toBe("Luna");
  });
});

describe("mergeStores birth date", () => {
  it("newer remote timestamp wins", () => {
    const local = makeStore({
      newbornBabyBirthDate: "2026-06-01",
      newbornBabyBirthDateUpdatedAt: "2026-06-01T00:00:00Z",
    });
    const remote = makeStore({
      newbornBabyBirthDate: "2026-06-02",
      newbornBabyBirthDateUpdatedAt: "2026-06-05T00:00:00Z",
    });
    const merged = mergeStores(local, remote);
    expect(merged.newbornBabyBirthDate).toBe("2026-06-02");
    expect(merged.newbornBabyBirthDateUpdatedAt).toBe("2026-06-05T00:00:00Z");
  });

  it("newer local timestamp wins", () => {
    const local = makeStore({
      newbornBabyBirthDate: "2026-06-02",
      newbornBabyBirthDateUpdatedAt: "2026-06-05T00:00:00Z",
    });
    const remote = makeStore({
      newbornBabyBirthDate: "2026-06-01",
      newbornBabyBirthDateUpdatedAt: "2026-06-01T00:00:00Z",
    });
    const merged = mergeStores(local, remote);
    expect(merged.newbornBabyBirthDate).toBe("2026-06-02");
    expect(merged.newbornBabyBirthDateUpdatedAt).toBe("2026-06-05T00:00:00Z");
  });

  it("timestamp tie (both missing) prefers the side that has a value set", () => {
    const local = makeStore(); // no birth date, no timestamp
    const remote = makeStore({ newbornBabyBirthDate: "2026-06-02" }); // value set, no timestamp
    const merged = mergeStores(local, remote);
    expect(merged.newbornBabyBirthDate).toBe("2026-06-02");
  });

  it("timestamp tie (equal) prefers the side that has a value set", () => {
    const local = makeStore({ newbornBabyBirthDateUpdatedAt: "2026-06-01T00:00:00Z" }); // no value, timestamp set
    const remote = makeStore({
      newbornBabyBirthDate: "2026-06-02",
      newbornBabyBirthDateUpdatedAt: "2026-06-01T00:00:00Z",
    });
    const merged = mergeStores(local, remote);
    expect(merged.newbornBabyBirthDate).toBe("2026-06-02");
  });

  it("tie with both set keeps local", () => {
    const local = makeStore({
      newbornBabyBirthDate: "2026-06-01",
      newbornBabyBirthDateUpdatedAt: "2026-06-01T00:00:00Z",
    });
    const remote = makeStore({
      newbornBabyBirthDate: "2026-06-09",
      newbornBabyBirthDateUpdatedAt: "2026-06-01T00:00:00Z",
    });
    const merged = mergeStores(local, remote);
    expect(merged.newbornBabyBirthDate).toBe("2026-06-01");
  });
});

describe("mergeNewbornEvents", () => {
  it("dedupes by id with local priority and sorts newest first", () => {
    const a: FeedEvent = { id: "x", type: "feed", timestamp: "2026-06-10T03:00:00Z", feedType: "bottle", amountMl: 90 };
    const aRemote: FeedEvent = { ...a, amountMl: 60 };
    const b: FeedEvent = { id: "y", type: "feed", timestamp: "2026-06-10T06:00:00Z", feedType: "formula" };
    const merged = mergeNewbornEvents([a], [aRemote, b]);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe("y"); // newest first
    expect((merged.find((e) => e.id === "x") as FeedEvent).amountMl).toBe(90); // local wins
  });

  it("prefers the newer updatedAt when both sides have one (remote ended a sleep session)", () => {
    const local: FeedEvent = { id: "s1", type: "feed", timestamp: "2026-06-10T03:00:00Z", feedType: "bottle", updatedAt: "2026-06-10T03:00:00Z" };
    const remote: FeedEvent = { ...local, amountMl: 90, updatedAt: "2026-06-10T04:00:00Z" };
    const merged = mergeNewbornEvents([local], [remote]);
    expect((merged.find((e) => e.id === "s1") as FeedEvent).amountMl).toBe(90); // stale local no longer wins
  });
});
