// ── Feed / meds reminder timers ──────────────────────────────────────────────
// Device-local settings (not synced) for the "next due" countdowns on the
// newborn tracker. Each timer derives its due time from the last logged event
// of that type, so logging an event automatically restarts the countdown.

export interface ReminderSettings {
  feedEnabled: boolean;
  // Feeds use a window: the timer opens at min hours and is "overdue" past max.
  feedMinHours: number;
  feedMaxHours: number;
  medEnabled: boolean;
  medHours: number;
  soundEnabled: boolean;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  feedEnabled: true,
  feedMinHours: 1.5,
  feedMaxHours: 3,
  medEnabled: true,
  medHours: 4,
  soundEnabled: true,
};

// Feeds within this gap are treated as one session (e.g. left then right
// breast); the next feed window is anchored to the FIRST feed of that cluster.
export const FEED_CLUSTER_GAP_MS = 30 * 60 * 1000;

/**
 * Anchor time for the next feed window: the timestamp of the earliest feed in
 * the most recent contiguous cluster (feeds spaced <= FEED_CLUSTER_GAP_MS).
 * `feedTimesDesc` must be feed timestamps (ms) sorted newest-first.
 */
export function feedAnchorMs(feedTimesDesc: number[]): number | null {
  if (feedTimesDesc.length === 0) return null;
  let anchor = feedTimesDesc[0];
  for (let i = 1; i < feedTimesDesc.length; i++) {
    if (anchor - feedTimesDesc[i] <= FEED_CLUSTER_GAP_MS) {
      anchor = feedTimesDesc[i]; // extend the cluster further back
    } else {
      break;
    }
  }
  return anchor;
}

/**
 * Count feeding sessions: feeds spaced <= FEED_CLUSTER_GAP_MS collapse into one
 * session (e.g. left then right breast in a single nursing). Formula/bottle feeds
 * that stand alone each count as their own session. `feedTimesMs` may be unsorted.
 */
export function countFeedSessions(feedTimesMs: number[]): number {
  if (feedTimesMs.length === 0) return 0;
  const sorted = [...feedTimesMs].sort((a, b) => a - b);
  let sessions = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > FEED_CLUSTER_GAP_MS) sessions++;
  }
  return sessions;
}

const SETTINGS_KEY = "nb-reminder-settings";

export function loadReminderSettings(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT_REMINDER_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveReminderSettings(s: ReminderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}

// ── Alert sound ──────────────────────────────────────────────────────────────
// Uses the Web Audio API so no audio asset is needed. iOS requires the
// AudioContext to be created/resumed inside a user gesture before it can make
// sound from a timer callback, so call unlockAudio() on user taps.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Prime/resume the audio context within a user gesture so later beeps work. */
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

/** Play a short triple beep to signal a timer is due. */
export function playAlertSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  // Three rising beeps
  [0, 0.18, 0.36].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660 + i * 220;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.16);
  });
}
