"use client";

import { useState } from "react";
import Link from "next/link";
import { Baby, Moon, Wind, ChevronRight, BookOpen, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

const TRADITIONS: { title: string; detail: string }[] = [
  { title: "A special goodnight phrase", detail: "The same words every night — a little ritual they'll never outgrow." },
  { title: 'A weekly "just us" ritual', detail: "Saturday pancakes, Friday walks — it's all about doing things together." },
  { title: "The birthday interview", detail: "Ask the same questions every year and watch their answers change as they grow." },
  { title: "Celebrating small wins", detail: "Lost a tooth? Tried something brave? Ordinary moments become celebrations." },
  { title: "Story time about YOU", detail: "Tell them about your childhood. Your stories become part of theirs." },
  { title: 'The "yes breakfast" tradition', detail: "Once a month they choose the food, music & seats. Kids never forget feeling heard." },
  { title: "The family memory jar", detail: "Write down one favourite moment each week. Open it together at the end of the year." },
  { title: 'The "best part of today?" ritual', detail: "Ask it every night. Big conversations start with one question." },
];

const GUIDES = [
  {
    href: "/guides/feeding",
    title: "Feeding Guide",
    description: "Breast, bottle & formula — latch, amounts, troubleshooting.",
    icon: Baby,
    color: "text-sage-600 dark:text-sage-400",
    bg: "bg-sage-100 dark:bg-sage-900/30",
  },
  {
    href: "/guides/sleeping",
    title: "Sleeping Guide",
    description: "Safe sleep, schedules, naps & night wakings.",
    icon: Moon,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  {
    href: "/guides/recovery",
    title: "Postpartum Recovery Guide",
    description: "360° breathing, pelvic floor & realignment for the birthing parent.",
    icon: Wind,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-900/30",
  },
];

export default function GuidesPage() {
  const [traditionsOpen, setTraditionsOpen] = useState(false);
  return (
    <PageTransition className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={20} className="text-sage-600" />
          <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-stone-100">Guides</h1>
        </div>
        <p className="text-sm text-stone-400">Reference guides for the newborn months.</p>
      </div>

      <div className="space-y-3">
        {GUIDES.map(({ href, title, description, icon: Icon, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="card p-4 flex items-center gap-3 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</p>
              <p className="text-xs text-stone-400 mt-0.5">{description}</p>
            </div>
            <ChevronRight size={16} className="text-stone-300 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Keepsake — traditions to start */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Keepsake</p>
        <div className="card p-4">
          <button className="w-full flex items-center gap-3" onClick={() => setTraditionsOpen(o => !o)}>
            <div className="p-2.5 rounded-xl shrink-0 bg-rose-100 dark:bg-rose-900/30">
              <Heart size={20} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">8 tiny traditions</p>
              <p className="text-xs text-stone-400 mt-0.5">Small rituals your child will remember forever.</p>
            </div>
            {traditionsOpen ? <ChevronUp size={16} className="text-stone-400 shrink-0" /> : <ChevronDown size={16} className="text-stone-400 shrink-0" />}
          </button>
          {traditionsOpen && (
            <ol className="mt-3 space-y-2.5">
              {TRADITIONS.map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20 text-[11px] font-bold text-rose-500 dark:text-rose-400">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-200">{t.title}</p>
                    <p className="text-xs text-stone-400 leading-snug">{t.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
