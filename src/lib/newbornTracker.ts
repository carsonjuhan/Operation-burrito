import type { FeedType, NewbornTrackerData } from "@/types";

export const NEWBORN_STORAGE_KEY = "newborn_tracker";

// Fired on window whenever tracker data is written outside the tracker page
// (e.g. the Quick Log sheet), so open views can reload from localStorage.
export const NEWBORN_UPDATED_EVENT = "newborn-tracker-updated";

export function loadNewbornData(): NewbornTrackerData {
  if (typeof window === "undefined") return { events: [], babyName: "Baby" };
  try {
    const raw = localStorage.getItem(NEWBORN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { events: [], babyName: "Baby" };
  } catch {
    return { events: [], babyName: "Baby" };
  }
}

export function saveNewbornData(data: NewbornTrackerData) {
  localStorage.setItem(NEWBORN_STORAGE_KEY, JSON.stringify(data));
  // Notify listeners (tracker page, dashboard, store sync bridge) on the next
  // microtask — saves often happen inside React state updaters.
  queueMicrotask(notifyNewbornUpdate);
}

export function notifyNewbornUpdate() {
  window.dispatchEvent(new Event(NEWBORN_UPDATED_EVENT));
}

export const FEED_LABELS: Record<FeedType, string> = {
  "breast-left": "Left Breast",
  "breast-right": "Right Breast",
  "both": "Both Breasts",
  "bottle": "Bottle (Pumped)",
  "formula": "Formula",
};

export const FEED_ICON: Record<FeedType, string> = {
  "breast-left": "🤱",
  "breast-right": "🤱",
  "both": "🤱",
  "bottle": "🍼",
  "formula": "🍼",
};

export function durationStr(startIso: string, endIso?: string): string {
  const ms = (endIso ? new Date(endIso).getTime() : Date.now()) - new Date(startIso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// Light tap confirmation on devices that support it (Android; iOS ignores it)
export function vibrate() {
  try { navigator.vibrate?.(15); } catch { /* unsupported */ }
}
