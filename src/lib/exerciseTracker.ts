import type { ExerciseRoutine, ExerciseSession, ExerciseTrackerData } from "@/types";

const STORAGE_KEY = "newborn_exercises";

export function loadExerciseData(): ExerciseTrackerData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveExerciseData(data: ExerciseTrackerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const ROUTINE_INFO: Record<ExerciseRoutine, { label: string; emoji: string; ageGuidance: string; description: string }> = {
  "tummy-time": {
    label: "Tummy Time",
    emoji: "🐸",
    ageGuidance: "From birth",
    description: "Start with 2–3 sessions/day, 3–5 min each in weeks 0–2. Build up gradually to 20+ minutes total per day by 3 months.",
  },
  "high-contrast": {
    label: "High-Contrast Cards",
    emoji: "⚫",
    ageGuidance: "From birth",
    description: "Newborn vision is blurry and best at black/white/red high-contrast patterns held 8–12 inches from their face.",
  },
  reading: {
    label: "Reading",
    emoji: "📖",
    ageGuidance: "From birth",
    description: "Read aloud daily — babies respond to the rhythm and tone of your voice long before they understand words.",
  },
  "grasp-reach": {
    label: "Grasp & Reach",
    emoji: "✋",
    ageGuidance: "From ~2 months",
    description: "Offer a rattle or finger to grasp, and dangle toys just out of reach to encourage swiping and reaching.",
  },
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Sessions logged in the 7 days ending today (inclusive), most recent first.
export function sessionsThisWeek(sessions: ExerciseSession[], now: Date = new Date()): ExerciseSession[] {
  const cutoff = new Date(now); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - 6);
  return sessions
    .filter(s => new Date(s.date + "T00:00:00") >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function totalMinutes(sessions: ExerciseSession[]): number {
  return sessions.reduce((acc, s) => acc + s.durationMin, 0);
}

export function minutesByRoutine(sessions: ExerciseSession[]): Record<ExerciseRoutine, number> {
  const totals = { "tummy-time": 0, "high-contrast": 0, reading: 0, "grasp-reach": 0 } as Record<ExerciseRoutine, number>;
  for (const s of sessions) totals[s.routine] += s.durationMin;
  return totals;
}

// Consecutive days (ending today) with at least one session logged.
export function currentStreakDays(sessions: ExerciseSession[], now: Date = new Date()): number {
  const days = new Set(sessions.map(s => s.date));
  let streak = 0;
  const cursor = new Date(now); cursor.setHours(0, 0, 0, 0);
  while (days.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export { todayKey as exerciseTodayKey };
