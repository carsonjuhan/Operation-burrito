"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Eye, Shirt, CalendarClock, TrendingDown } from "lucide-react";
import clsx from "clsx";

// ── Source data transcribed from reference infographics ─────────────────────────

const WAKE_WINDOWS: { age: string; naps: string; window: string }[] = [
  { age: "0–4 weeks", naps: "Multiple", window: "30–60 min" },
  { age: "1 month", naps: "Multiple", window: "1 hour" },
  { age: "2 months", naps: "4 naps", window: "60–75 min" },
  { age: "3 months", naps: "4 naps", window: "60–90 min" },
  { age: "4–6 months", naps: "3 naps", window: "1 hr 45 min" },
  { age: "6–9 months", naps: "2–3 naps", window: "2–3 hours" },
  { age: "9–12 months", naps: "2 naps", window: "2–3 hours" },
  { age: "1 year", naps: "1–2 naps", window: "3–4 hours" },
  { age: "18 months", naps: "1 nap", window: "6 hours" },
];

const REGRESSIONS: { age: string; cause: string }[] = [
  { age: "Newborn · ~2 wks", cause: "The end of the “honeymoon phase”" },
  { age: "4 months", cause: "Changes in sleep cycles · increased awareness & fussiness (the big one)" },
  { age: "6 months", cause: "Motor skill development" },
  { age: "9 months", cause: "Separation anxiety · drops to 2 naps" },
  { age: "12 months", cause: "Language development" },
  { age: "15 months", cause: "Drops to 1 nap" },
  { age: "18 months", cause: "Teething eruptions" },
  { age: "2 years", cause: "No one really knows — they do whatever they want 😅" },
];

const SLEEPY_CUES: { stage: string; color: string; cues: string[] }[] = [
  { stage: "I'm Tired", color: "text-emerald-600 dark:text-emerald-400", cues: ["The stare", "Flushed brows", "Looks away"] },
  { stage: "Ready for a Nap", color: "text-amber-600 dark:text-amber-400", cues: ["Fussiness", "Big yawns", "Rubs eyes"] },
  { stage: "Overtired", color: "text-rose-600 dark:text-rose-400", cues: ["Frantic crying", "Rigid body", "Pushes away"] },
];

const DRESS_BANDS: { temp: string; clothing: string }[] = [
  { temp: "Under 63.5°F · <17°C", clothing: "Footed sleeper + long-sleeve bodysuit + warmest sack (≈3.5 TOG)" },
  { temp: "64–68°F · 18–20°C", clothing: "Footed sleeper + bodysuit + warm sack (≈2.5 TOG)" },
  { temp: "69–70°F · 20–21°C", clothing: "Footed sleeper + light sack (≈1.5–2.5 TOG)" },
  { temp: "71–74°F · 22–23°C", clothing: "Short-sleeve bodysuit + light sack (≈1.0 TOG)" },
  { temp: "75–77°F · 24–25°C", clothing: "Short-sleeve bodysuit + thin sack (≈0.5 TOG)" },
  { temp: "78°F+ · 26°C+", clothing: "Just a bodysuit / diaper + thinnest sack (≈0.5 TOG)" },
];

const DRESS_NOTES = [
  "Always follow the ABCs of safe sleep (Alone, on the Back, in a Crib).",
  "It's no longer safe to swaddle once baby shows signs of rolling — stop by ~8 weeks (AAP).",
  "Hats and mittens are unsafe for sleep. Socks are at parental discretion.",
  "TOG measures thermal insulation — the higher the number, the warmer it is. Confirm exact TOG on your sack's own label.",
];

const PERFECT_DAY: { time: string; activity: string }[] = [
  { time: "7:00 am", activity: "Awake & Eat" },
  { time: "7:30 am", activity: "Play" },
  { time: "8:00–10:00 am", activity: "Nap (2 hours)" },
  { time: "10:00 am", activity: "Eat" },
  { time: "10:30 am", activity: "Play" },
  { time: "11:00 am–1:00 pm", activity: "Nap (2 hours)" },
  { time: "1:00 pm", activity: "Eat" },
  { time: "1:30 pm", activity: "Play" },
  { time: "2:00–4:00 pm", activity: "Nap (2 hours)" },
  { time: "4:00 pm", activity: "Eat" },
  { time: "4:30 pm", activity: "Play" },
  { time: "5:00–7:00 pm", activity: "Nap (2 hours)" },
  { time: "7:00 pm", activity: "Eat" },
  { time: "7:30 pm", activity: "Play" },
  { time: "8:00 pm", activity: "Bedtime" },
  { time: "10:00 pm", activity: "Dream feed" },
];

// ── Collapsible card shell ──────────────────────────────────────────────────────

function RefCard({
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Clock;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card p-4">
      <button className="w-full flex items-center gap-3" onClick={() => setOpen(o => !o)}>
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl shrink-0">
          <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</p>
          {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
        </div>
        {open ? <ChevronUp size={16} className="text-stone-400 shrink-0" /> : <ChevronDown size={16} className="text-stone-400 shrink-0" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function SleepReference() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Quick Reference</p>

      {/* Wake windows */}
      <RefCard title="Wake Windows" subtitle="Awake time between sleeps by age" icon={Clock} defaultOpen>
        <div className="overflow-hidden rounded-xl border border-stone-100 dark:border-stone-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 text-[10px] uppercase tracking-wide text-stone-400">
                <th className="text-left font-semibold px-3 py-2">Age</th>
                <th className="text-left font-semibold px-3 py-2"># Naps</th>
                <th className="text-right font-semibold px-3 py-2">Wake Window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
              {WAKE_WINDOWS.map(row => (
                <tr key={row.age}>
                  <td className="px-3 py-2 font-medium text-stone-700 dark:text-stone-200">{row.age}</td>
                  <td className="px-3 py-2 text-stone-500 dark:text-stone-400">{row.naps}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-indigo-600 dark:text-indigo-400 font-medium">{row.window}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RefCard>

      {/* Common sleep regressions */}
      <RefCard title="Common Sleep Regressions" subtitle="When & why sleep tends to wobble" icon={TrendingDown}>
        <ol className="relative ml-1.5 border-l-2 border-indigo-100 dark:border-indigo-900/50 space-y-3 py-1">
          {REGRESSIONS.map(r => (
            <li key={r.age} className="relative pl-4">
              <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-indigo-400 dark:bg-indigo-500 border-2 border-white dark:border-stone-900" />
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">{r.age}</p>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-snug">{r.cause}</p>
            </li>
          ))}
        </ol>
        <p className="text-[10px] text-stone-400 mt-2">Regressions are temporary (≈2–4 weeks) and line up with developmental leaps. Keeping the routine helps baby return to baseline faster.</p>
      </RefCard>

      {/* Sleepy cues */}
      <RefCard title="Sleepy Cues" subtitle="Catch the nap before overtired" icon={Eye}>
        <div className="grid grid-cols-3 gap-2">
          {SLEEPY_CUES.map(col => (
            <div key={col.stage} className="rounded-xl bg-stone-50 dark:bg-stone-800/60 p-3">
              <p className={clsx("text-xs font-semibold mb-2", col.color)}>{col.stage}</p>
              <ul className="space-y-1.5">
                {col.cues.map(c => (
                  <li key={c} className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </RefCard>

      {/* Dress for sleep */}
      <RefCard title="Dressing for Sleep" subtitle="Layers by room temperature (TOG)" icon={Shirt}>
        <div className="space-y-1.5">
          {DRESS_BANDS.map(band => (
            <div key={band.temp} className="flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 px-3 py-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 w-32 shrink-0 tabular-nums">{band.temp}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 leading-snug">{band.clothing}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {DRESS_NOTES.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-rose-400 text-xs mt-0.5 shrink-0">•</span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">{n}</p>
            </div>
          ))}
        </div>
      </RefCard>

      {/* Perfect day schedule */}
      <RefCard title='Newborn "Perfect Day"' subtitle="Sample eat–play–sleep schedule" icon={CalendarClock}>
        <div className="overflow-hidden rounded-xl border border-stone-100 dark:border-stone-700/60 divide-y divide-stone-50 dark:divide-stone-800">
          {PERFECT_DAY.map(row => {
            const isSleep = /nap|bedtime|dream/i.test(row.activity);
            return (
              <div key={row.time} className={clsx("flex items-center gap-3 px-3 py-1.5", isSleep && "bg-indigo-50/50 dark:bg-indigo-900/10")}>
                <span className="text-xs tabular-nums text-stone-400 w-28 shrink-0">{row.time}</span>
                <span className={clsx("text-xs", isSleep ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-stone-600 dark:text-stone-300")}>{row.activity}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-stone-400 mt-2">A flexible template — follow baby&apos;s cues, not the clock. Inspired by Taking Cara Babies.</p>
      </RefCard>
    </div>
  );
}
