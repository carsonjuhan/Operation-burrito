import { BabyItem, ItemCategory, ItemPriority } from "@/types";

// ── RFC 4180 CSV parser ───────────────────────────────────────────────────────

export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ",") {
          fields.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
    }
    fields.push(cur);
    return fields;
  }

  // Find first non-empty line as header
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = splitLine(nonEmpty[0]).map((h) => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const values = splitLine(nonEmpty[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    // Skip completely empty rows
    if (Object.values(row).some((v) => v.length > 0)) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

// ── Column auto-mapping ───────────────────────────────────────────────────────

export type ColumnMap = {
  name: string;
  category: string;
  estimatedCost: string;
  actualCost: string;
  priority: string;
  purchased: string;
  notes: string;
  link: string;
};

const FIELD_ALIASES: Record<keyof ColumnMap, string[]> = {
  name: ["name", "item", "product", "description", "title", "item name", "product name"],
  category: ["category", "cat", "type", "section", "group"],
  estimatedCost: ["estimated cost", "estimate", "est cost", "price", "est. cost", "msrp", "retail"],
  actualCost: ["actual cost", "actual", "paid", "spent", "cost paid", "purchase price"],
  priority: ["priority", "importance", "urgency", "level", "rank"],
  purchased: ["purchased", "bought", "status", "done", "complete", "have", "got"],
  notes: ["notes", "note", "comments", "comment", "details", "info"],
  link: ["link", "url", "website", "href", "product link"],
};

export function autoMapColumns(headers: string[]): Partial<ColumnMap> {
  const mapping: Partial<ColumnMap> = {};
  const normalised = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof ColumnMap, string[]][]) {
    for (const alias of aliases) {
      const idx = normalised.findIndex((h) => h === alias || h.includes(alias));
      if (idx !== -1) {
        mapping[field] = headers[idx];
        break;
      }
    }
  }

  return mapping;
}

// ── Value normalisation ───────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, ItemCategory> = {
  nursery: "Nursery",
  "baby gear": "Nursery",
  furniture: "Nursery",
  room: "Nursery",
  clothing: "Clothing",
  clothes: "Clothing",
  apparel: "Clothing",
  outfit: "Clothing",
  feeding: "Feeding",
  breastfeeding: "Feeding",
  formula: "Feeding",
  safety: "Safety",
  "baby proofing": "Safety",
  travel: "Travel",
  stroller: "Travel",
  car: "Travel",
  "car seat": "Travel",
  health: "Health & Hygiene",
  hygiene: "Health & Hygiene",
  medical: "Health & Hygiene",
  "health & hygiene": "Health & Hygiene",
  toys: "Toys & Gear",
  gear: "Toys & Gear",
  play: "Toys & Gear",
  postpartum: "Postpartum",
  recovery: "Postpartum",
  mom: "Postpartum",
};

export function normalizeCategory(raw: string): ItemCategory {
  const key = raw.toLowerCase().trim();
  return CATEGORY_MAP[key] ?? "Other";
}

const PRIORITY_HIGH = ["must have", "must-have", "critical", "essential", "high", "required", "h", "1"];
const PRIORITY_MID = ["nice to have", "nice-to-have", "important", "medium", "recommended", "m", "2"];
const PRIORITY_LOW = ["optional", "low", "extra", "bonus", "l", "3"];

export function normalizePriority(raw: string): ItemPriority {
  const key = raw.toLowerCase().trim();
  if (PRIORITY_HIGH.includes(key)) return "Must Have";
  if (PRIORITY_MID.includes(key)) return "Nice to Have";
  if (PRIORITY_LOW.includes(key)) return "Optional";
  return "Nice to Have"; // default
}

const PURCHASED_TRUE = ["yes", "y", "true", "1", "purchased", "bought", "done", "✓", "x", "have", "got", "complete", "completed"];

export function normalizePurchased(raw: string): boolean {
  return PURCHASED_TRUE.includes(raw.toLowerCase().trim());
}

export function normalizePrice(raw: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? undefined : val;
}

// ── Row → BabyItem ────────────────────────────────────────────────────────────

export function mapRowToItem(
  row: Record<string, string>,
  mapping: Partial<ColumnMap>
): Omit<BabyItem, "id" | "createdAt"> | null {
  const name = mapping.name ? row[mapping.name]?.trim() : "";
  if (!name) return null;

  return {
    name,
    category: mapping.category ? normalizeCategory(row[mapping.category] ?? "") : "Other",
    priority: mapping.priority ? normalizePriority(row[mapping.priority] ?? "") : "Nice to Have",
    purchased: mapping.purchased ? normalizePurchased(row[mapping.purchased] ?? "") : false,
    notes: mapping.notes ? (row[mapping.notes] ?? "").trim() : "",
    link: mapping.link ? (row[mapping.link] ?? "").trim() || undefined : undefined,
    estimatedCost: mapping.estimatedCost ? normalizePrice(row[mapping.estimatedCost] ?? "") : undefined,
    actualCost: mapping.actualCost ? normalizePrice(row[mapping.actualCost] ?? "") : undefined,
  };
}

// ── Google Sheets URL → CSV export URL ───────────────────────────────────────

export function toGoogleSheetsCsvUrl(url: string): string | null {
  // Match spreadsheet ID from various Google Sheets URL patterns
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id = match[1];
  // Try to extract gid (sheet tab)
  const gidMatch = url.match(/[#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

export async function fetchGoogleSheetCsv(url: string): Promise<string> {
  const csvUrl = toGoogleSheetsCsvUrl(url);
  if (!csvUrl) throw new Error("Not a valid Google Sheets URL");
  const res = await fetch(csvUrl);
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      throw new Error(
        "Sheet is private. Open your Google Sheet → Share → change to 'Anyone with the link can view', then try again."
      );
    }
    throw new Error(`Failed to fetch sheet (${res.status})`);
  }
  return res.text();
}
