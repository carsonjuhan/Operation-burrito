import type { ReminderSettings } from "@/lib/reminderTimers";

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

export type ItemTiming =
  | "Pregnancy"
  | "Hospital (Pre-birth)"
  | "Newborn (0-3 months)"
  | "1-6 months"
  | "Special occasions"
  | "Other";

export interface BabyItem {
  id: string;
  name: string;
  category: ItemCategory;
  priority: ItemPriority;
  purchased: boolean;
  notes: string;
  link?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  timing?: ItemTiming;
  photos?: string[];
}

// ── Checklist Items (from metadata) ────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  name: string;
  nameOriginal?: string;
  category: ItemCategory;
  categoryOriginal?: string;
  categoryEn?: string;
  timing: ItemTiming;
  source?: string;
  list?: string;
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

export interface BirthPlanPersonalInfo {
  legalName: string;
  preferredName: string;
  dueDate: string;
  careProvider: string;
  birthLocation: string;
  previousBirths: string;
  preferredLanguage: string;
  interpreterNeeded: boolean;
  currentMedications: string;
  allergies: string;
}

export interface BirthPlanLabour {
  birthPartner: string;
  doula: string;
  otherSupportPeople: string;
  labourGoal: string;
  atmosphereNotes: string;
  comfortMeasures: {
    walking: boolean;
    labourBall: boolean;
    tub: boolean;
    shower: boolean;
    heat: boolean;
    ice: boolean;
    massage: boolean;
    tens: boolean;
    aromatherapy: boolean;
    breathingTechniques: boolean;
    acupressure: boolean;
    hypnobirthing: boolean;
    sterileWaterInjections: boolean;
    other: string;
  };
  pushingPreferences: {
    varietyOfPositions: boolean;
    helpWithPushing: boolean;
    selfDirected: boolean;
    handsAndKnees: boolean;
    squatting: boolean;
    sideLying: boolean;
    supportedSquat: boolean;
    waterBirth: boolean;
    perinealWarmCompress: boolean;
    perinealMassage: boolean;
    perinealNoTouch: boolean;
    noEpisiotomy: boolean;
    other: string;
  };
  painMedication: {
    onlyIfAsked: boolean;
    offerIfNotCoping: boolean;
    offerAsSoonAsPossible: boolean;
    nitrous: boolean;
    morphineFentanyl: boolean;
    epidural: boolean;
    other: string;
  };
  labourInterventions: {
    preferNoIV: boolean;
    preferHepLock: boolean;
    fetalMonitoring: "intermittent" | "continuous" | "";
    preferNoAmniotomy: boolean;
    preferNoOxytocin: boolean;
  };
  photographyNotes: string;
  personalTouches: string;
  cordBloodBankDonation: boolean;
  cordBloodTissueBankingNotes: string;
  otherRequests: string;
}

export interface BirthPlanAfterBirth {
  skinToSkin: boolean;
  partnerSkinToSkinIfUnable: boolean;
  cordCuttingPerson: string;
  cordClampingDuration: "untilPulsationStops" | "timed" | "";
  thirdStageManagement: "active" | "physiological" | "";
  feedingPlan: "breastfeed" | "formula" | "combination" | "other";
  feedingNotes: string;
  pacifierPreference: "offer" | "doNotOffer" | "";
  newbornTreatments: {
    antibioticEyeOintment: boolean;
    vitaminKInjection: boolean;
    hearingScreening: boolean;
    pkuBloodSpot: boolean;
    hepatitisBVaccine: boolean;
    other: string;
  };
  placentaPreferences: string;
  circumcisionPreferences: string;
  visitorsPreference: string;
}

export interface BirthPlanInterventions {
  unexpectedEvents: {
    includeInAllDecisions: boolean;
    partnerIncluded: boolean;
    other: string;
  };
  continuousMonitoring: {
    preferMobile: boolean;
    useShowerBath: boolean;
  };
  prolongedLabour: {
    tryNaturalMethods: boolean;
    offerMedication: boolean;
  };
  assistedBirthPreference: string;
  caesarianWishes: string;
  specialCareForBaby: {
    skinToSkinIfPossible: boolean;
    helpExpressing: boolean;
    involvedInCare: boolean;
    other: string;
  };
  bloodTransfusionPreferences: string;
  studentsObservers: boolean;
}

export interface BirthPlan {
  updatedAt: string;
  personalInfo: BirthPlanPersonalInfo;
  labour: BirthPlanLabour;
  afterBirth: BirthPlanAfterBirth;
  interventions: BirthPlanInterventions;
  notes: string;
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
  photos?: string[];
}

// ── Hospital Bag ───────────────────────────────────────────────────────────

export type BagCategory =
  | "Clothing — Mom"
  | "Clothing — Baby"
  | "Documents"
  | "Toiletries"
  | "Comfort & Labour"
  | "Feeding"
  | "Electronics"
  | "Snacks"
  | "Other";

export interface BagItem {
  id: string;
  name: string;
  category: BagCategory;
  packed: boolean;
  notes: string;
  quantity?: number;
}

// ── Appointments ───────────────────────────────────────────────────────────

export type AppointmentType =
  | "OB / Midwife"
  | "Ultrasound"
  | "Blood Work"
  | "Hospital Tour"
  | "Dentist"
  | "Specialist"
  | "Well-Baby Visit"
  | "Admin / Legal"
  | "Other";

export interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  date: string;
  time: string;
  provider: string;
  location: string;
  notes: string;
  completed: boolean;
  createdAt: string;
}

// ── Contacts ───────────────────────────────────────────────────────────────

export type ContactRole =
  | "OB / Doctor"
  | "Midwife"
  | "Doula"
  | "Hospital"
  | "Pediatrician"
  | "Partner"
  | "Family"
  | "Other";

export interface Contact {
  id: string;
  name: string;
  role: ContactRole;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

// ── Contraction Timer ──────────────────────────────────────────────────────

export interface Contraction {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;   // seconds
  interval: number;   // seconds since last contraction started
}

// ── App Store (full persisted state) ──────────────────────────────────────

export interface AppStore {
  items: BabyItem[];
  classes: BabyClass[];
  materials: Material[];
  birthPlan: BirthPlan;
  notes: Note[];
  hospitalBag: BagItem[];
  appointments: Appointment[];
  contacts: Contact[];
  contractions: Contraction[];
  registryUrl: string;
  lastModifiedAt?: string;
  // Checklist state (previously in separate localStorage keys)
  checklistSkipped?: string[];
  checklistAlreadyHave?: string[];
  hospitalChecklistPacked?: string[];
  hospitalChecklistSkipped?: string[];
  postBirthChecked?: string[];
  // Newborn tracker (synced across devices)
  newbornEvents?: NewbornLogEvent[];
  newbornBabyName?: string;
  reminderSettings?: ReminderSettings;
  // Tombstones: id → deletedAt ISO. Lets deletes propagate across devices
  // instead of resurrecting on merge. Purged after 30 days.
  deletedIds?: Record<string, string>;
}

// ── Postpartum Recipes ────────────────────────────────────────────────────

export type RecipeCuisine = "chinese" | "japanese";
export type RecipeProtein = "chicken" | "pork" | "fish" | "beef" | "tofu" | "egg" | "other";
export type RecipePhase = "rest" | "warm" | "major" | "maintenance";

export interface PostpartumRecipe {
  id: string;
  name_en: string;
  name_zh?: string;
  name_ja?: string;
  cuisine: RecipeCuisine;
  protein: RecipeProtein;
  phase: RecipePhase[];
  prepTime: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tags?: string[];
  source?: string;
}

// ── Newborn Tracker ──────────────────────────────────────────────────────────

export type FeedType = "breast-left" | "breast-right" | "both" | "bottle" | "formula";
export type DiaperType = "wet" | "dirty" | "both";

export interface FeedEvent {
  id: string;
  type: "feed";
  timestamp: string;
  feedType: FeedType;
  durationMin?: number;
  amountMl?: number;
  notes?: string;
  updatedAt?: string;
}

export interface SleepEvent {
  id: string;
  type: "sleep";
  startTime: string;
  endTime?: string;
  notes?: string;
  updatedAt?: string;
}

export interface DiaperEvent {
  id: string;
  type: "diaper";
  timestamp: string;
  diaperType: DiaperType;
  notes?: string;
  updatedAt?: string;
}

export interface MedEvent {
  id: string;
  type: "med";
  timestamp: string;
  medName?: string;
  notes?: string;
  updatedAt?: string;
}

export type NewbornLogEvent = FeedEvent | SleepEvent | DiaperEvent | MedEvent;

export interface NewbornTrackerData {
  events: NewbornLogEvent[];
  babyName: string;
  // Live nursing timer (transient, device-local — not synced)
  activeNursing?: { feedType: FeedType; startTime: string };
}

// ── Guides (Feeding / Sleeping) ───────────────────────────────────────────────

export type GuideCategory = "environment" | "routine" | "troubleshooting";

export interface GuideSection {
  id: string;
  title: string;
  category: GuideCategory;
  summary: string;
  tips: string[];
  warnings?: string[];
  whenToCall?: string[];
}

// ── Soothe Techniques ────────────────────────────────────────────────────────

export type SootheDifficulty = "easy" | "medium" | "takes practice";

export interface SootheTechnique {
  id: string;
  name: string;
  emoji: string;
  whenToUse: string;
  difficulty: SootheDifficulty;
  steps: string[];
  tips?: string[];
}

// ── Symptom Checker ──────────────────────────────────────────────────────────

export interface Symptom {
  id: string;
  name: string;
  emoji: string;
  description: string;
  normalRange: string;
  callDoctorIf: string[];
  goERIf?: string[];
  ageNote?: string;
}

// ── Sleep Training ───────────────────────────────────────────────────────────

export type SleepTrainingMethod = "ferber" | "cio" | "fading" | "no-cry";

export interface SleepTrainingNight {
  id: string;
  date: string;        // YYYY-MM-DD
  bedtime: string;     // HH:MM
  minutesToSettle: number;
  wakeUps: number;
  totalCryMins: number;
  rating: 1 | 2 | 3;  // 1=rough, 2=ok, 3=good
  notes?: string;
}

export interface SleepTrainingData {
  method: SleepTrainingMethod;
  startDate: string;   // ISO date string, when training began
  babyBirthDate?: string;
  nights: SleepTrainingNight[];
}

// ── Growth Tracker ───────────────────────────────────────────────────────────

export interface GrowthEntry {
  id: string;
  date: string;
  weightKg?: number;
  lengthCm?: number;
  headCm?: number;
  notes?: string;
}

// ── Development Milestones ───────────────────────────────────────────────────

export type MilestoneCategory = "Motor" | "Social" | "Communication" | "Vision & Hearing";

export interface MilestoneEntry {
  id: string;
  label: string;
  ageRangeWeeks: [number, number];
  category: MilestoneCategory;
  achievedAt?: string;
}
