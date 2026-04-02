// ── Shopping / Baby Items ──────────────────────────────────────────────────

export type ItemCategory =
  | "Nursery"
  | "Clothing"
  | "Feeding"
  | "Safety"
  | "Travel"
  | "Health & Hygiene"
  | "Toys & Gear"
  | "Postpartum"
  | "Other";

export type ItemPriority = "Must Have" | "Nice to Have" | "Optional";

export interface BabyItem {
  id: string;
  name: string;
  category: ItemCategory;
  priority: ItemPriority;
  purchased: boolean;
  notes: string;
  link?: string;
  estimatedCost?: number;
  createdAt: string;
}

// ── Classes ────────────────────────────────────────────────────────────────

export type ClassType =
  | "Childbirth"
  | "Breastfeeding"
  | "Newborn Care"
  | "CPR / First Aid"
  | "Parenting"
  | "Prenatal Fitness"
  | "Other";

export interface BabyClass {
  id: string;
  name: string;
  type: ClassType;
  provider: string;
  date: string;
  completed: boolean;
  notes: string;
  location?: string;
  cost?: number;
  createdAt: string;
}

// ── Materials ──────────────────────────────────────────────────────────────

export type MaterialType =
  | "PDF / Document"
  | "Video"
  | "Article"
  | "Book"
  | "App"
  | "Other";

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  topic: string;
  url?: string;
  filePath?: string;
  notes: string;
  savedAt: string;
  createdAt: string;
}

// ── Birth Plan ─────────────────────────────────────────────────────────────

export interface BirthPlanSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface BirthPlan {
  updatedAt: string;
  sections: BirthPlanSection[];
}

// ── Notes / General Tracking ───────────────────────────────────────────────

export type NoteCategory =
  | "Appointment"
  | "Milestone"
  | "Question for Doctor"
  | "Hospital Bag"
  | "Postpartum Plan"
  | "General";

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── App Store (full persisted state) ──────────────────────────────────────

export interface AppStore {
  items: BabyItem[];
  classes: BabyClass[];
  materials: Material[];
  birthPlan: BirthPlan;
  notes: Note[];
}
