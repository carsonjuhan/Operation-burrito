"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useStoreContext } from "@/contexts/StoreContext";
import {
  BabyItem,
  Note,
  Material,
  BabyClass,
  Appointment,
  Contact,
  BagItem,
} from "@/types";
import {
  ShoppingCart,
  StickyNote,
  BookOpen,
  GraduationCap,
  Calendar,
  Phone,
  Briefcase,
  Search,
} from "lucide-react";
import clsx from "clsx";

// ── Types ──────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  sectionKey: SectionKey;
  title: string;
  subtitle: string;
  href: string;
}

type SectionKey =
  | "items"
  | "notes"
  | "materials"
  | "classes"
  | "appointments"
  | "contacts"
  | "hospitalBag";

// ── Section config ─────────────────────────────────────────────────────────

interface SectionMeta {
  label: string;
  href: string;
  Icon: React.ElementType;
  iconColor: string;
  bgColor: string;
}

const SECTION_CONFIG: Record<SectionKey, SectionMeta> = {
  items: {
    label: "Baby Items",
    href: "/items",
    Icon: ShoppingCart,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  notes: {
    label: "Notes",
    href: "/notes",
    Icon: StickyNote,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  materials: {
    label: "Materials",
    href: "/materials",
    Icon: BookOpen,
    iconColor: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  classes: {
    label: "Classes",
    href: "/classes",
    Icon: GraduationCap,
    iconColor: "text-sky-600",
    bgColor: "bg-sky-50",
  },
  appointments: {
    label: "Appointments",
    href: "/appointments",
    Icon: Calendar,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  contacts: {
    label: "Contacts",
    href: "/contacts",
    Icon: Phone,
    iconColor: "text-teal-600",
    bgColor: "bg-teal-50",
  },
  hospitalBag: {
    label: "Hospital Bag",
    href: "/hospital-bag",
    Icon: Briefcase,
    iconColor: "text-orange-600",
    bgColor: "bg-orange-50",
  },
};

const SECTION_ORDER: SectionKey[] = [
  "items",
  "notes",
  "materials",
  "classes",
  "appointments",
  "contacts",
  "hospitalBag",
];

// ── Highlight helper ───────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <strong key={i} className="font-semibold text-stone-900">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── Search logic ───────────────────────────────────────────────────────────

function matchesQuery(text: string | undefined | null, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

function buildResults(
  store: ReturnType<typeof useStoreContext>["store"],
  query: string
): Record<SectionKey, SearchResult[]> {
  const q = query.trim();
  const out: Record<SectionKey, SearchResult[]> = {
    items: [],
    notes: [],
    materials: [],
    classes: [],
    appointments: [],
    contacts: [],
    hospitalBag: [],
  };

  if (!q) return out;

  // Baby Items
  for (const item of store.items as BabyItem[]) {
    if (matchesQuery(item.name, q) || matchesQuery(item.notes, q)) {
      out.items.push({
        id: item.id,
        sectionKey: "items",
        title: item.name,
        subtitle: `${item.category} · ${item.priority}`,
        href: "/items",
      });
    }
  }

  // Notes
  for (const note of store.notes as Note[]) {
    if (matchesQuery(note.title, q) || matchesQuery(note.content, q)) {
      out.notes.push({
        id: note.id,
        sectionKey: "notes",
        title: note.title,
        subtitle: note.category,
        href: "/notes",
      });
    }
  }

  // Materials
  for (const mat of store.materials as Material[]) {
    if (
      matchesQuery(mat.title, q) ||
      matchesQuery(mat.notes, q) ||
      matchesQuery(mat.topic, q)
    ) {
      out.materials.push({
        id: mat.id,
        sectionKey: "materials",
        title: mat.title,
        subtitle: `${mat.type} · ${mat.topic}`,
        href: "/materials",
      });
    }
  }

  // Classes
  for (const cls of store.classes as BabyClass[]) {
    if (
      matchesQuery(cls.name, q) ||
      matchesQuery(cls.notes, q) ||
      matchesQuery(cls.provider, q)
    ) {
      out.classes.push({
        id: cls.id,
        sectionKey: "classes",
        title: cls.name,
        subtitle: `${cls.type}${cls.provider ? ` · ${cls.provider}` : ""}`,
        href: "/classes",
      });
    }
  }

  // Appointments
  for (const appt of store.appointments as Appointment[]) {
    if (
      matchesQuery(appt.title, q) ||
      matchesQuery(appt.notes, q) ||
      matchesQuery(appt.provider, q) ||
      matchesQuery(appt.location, q)
    ) {
      out.appointments.push({
        id: appt.id,
        sectionKey: "appointments",
        title: appt.title,
        subtitle: `${appt.type}${appt.provider ? ` · ${appt.provider}` : ""}`,
        href: "/appointments",
      });
    }
  }

  // Contacts
  for (const contact of store.contacts as Contact[]) {
    if (
      matchesQuery(contact.name, q) ||
      matchesQuery(contact.notes, q) ||
      matchesQuery(contact.phone, q) ||
      matchesQuery(contact.email, q)
    ) {
      out.contacts.push({
        id: contact.id,
        sectionKey: "contacts",
        title: contact.name,
        subtitle: contact.role,
        href: "/contacts",
      });
    }
  }

  // Hospital Bag
  for (const bagItem of store.hospitalBag as BagItem[]) {
    if (matchesQuery(bagItem.name, q) || matchesQuery(bagItem.notes, q)) {
      out.hospitalBag.push({
        id: bagItem.id,
        sectionKey: "hospitalBag",
        title: bagItem.name,
        subtitle: bagItem.category,
        href: "/hospital-bag",
      });
    }
  }

  return out;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const { store, loaded } = useStoreContext();
  const [query, setQuery] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => buildResults(store, query), [store, query]);

  const totalCount = useMemo(
    () => SECTION_ORDER.reduce((sum, key) => sum + results[key].length, 0),
    [results]
  );

  const hasQuery = query.trim().length > 0;

  if (!loaded) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Search size={20} className="text-sage-600" />
          <h1 className="text-2xl font-bold text-stone-800">Search</h1>
        </div>
        <p className="text-sm text-stone-400">
          Search across all sections of Operation Burrito
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-3">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          autoFocus
          type="text"
          className="input pl-10 py-3 text-base"
          placeholder="Search items, notes, contacts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
        {hasQuery && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors text-xl leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Result count */}
      {hasQuery && totalCount > 0 && (
        <p className="text-xs text-stone-400 mb-5">
          {totalCount} result{totalCount !== 1 ? "s" : ""}
        </p>
      )}

      {/* Empty state — no query */}
      {!hasQuery && (
        <div className="text-center py-16 text-stone-400">
          <Search size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Type to search across all sections</p>
        </div>
      )}

      {/* Empty state — no results */}
      {hasQuery && totalCount === 0 && (
        <div className="text-center py-16 text-stone-400">
          <Search size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            No results for{" "}
            <span className="font-medium text-stone-500">&ldquo;{query}&rdquo;</span>
          </p>
        </div>
      )}

      {/* Grouped results */}
      {hasQuery && totalCount > 0 && (
        <div className="space-y-6">
          {SECTION_ORDER.filter((key) => results[key].length > 0).map((key) => {
            const { label, Icon, iconColor, bgColor } = SECTION_CONFIG[key];
            return (
              <div key={key}>
                {/* Section heading */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span
                    className={clsx(
                      "inline-flex items-center justify-center w-5 h-5 rounded",
                      bgColor
                    )}
                  >
                    <Icon size={12} className={iconColor} />
                  </span>
                  <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                    {label}
                  </h2>
                  <span className="badge bg-stone-100 text-stone-400">
                    {results[key].length}
                  </span>
                </div>

                {/* Result rows */}
                <div className="card divide-y divide-stone-50">
                  {results[key].map((result) => (
                    <ResultRow
                      key={result.id}
                      result={result}
                      query={query}
                      Icon={Icon}
                      iconColor={iconColor}
                      bgColor={bgColor}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Result Row ─────────────────────────────────────────────────────────────

function ResultRow({
  result,
  query,
  Icon,
  iconColor,
  bgColor,
}: {
  result: SearchResult;
  query: string;
  Icon: React.ElementType;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <Link
      href={result.href}
      className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors group"
    >
      {/* Icon */}
      <span
        className={clsx(
          "shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg",
          bgColor
        )}
      >
        <Icon size={16} className={iconColor} />
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-700 truncate group-hover:text-stone-900 transition-colors">
          <Highlight text={result.title} query={query} />
        </p>
        {result.subtitle && (
          <p className="text-xs text-stone-400 truncate mt-0.5">
            <Highlight text={result.subtitle} query={query} />
          </p>
        )}
      </div>

      {/* Arrow */}
      <span className="shrink-0 text-stone-200 group-hover:text-stone-400 transition-colors text-lg leading-none">
        →
      </span>
    </Link>
  );
}
