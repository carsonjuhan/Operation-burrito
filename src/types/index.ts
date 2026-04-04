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
  actualCost?: number;
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

export interface BirthPlanPersonalInfo {
  legalName: string;
  preferredName: string;
  dueDate: string;
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
    other: string;
  };
  pushingPreferences: {
    varietyOfPositions: boolean;
    helpWithPushing: boolean;
    selfDirected: boolean;
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
  photographyNotes: string;
  personalTouches: string;
  cordBloodBankDonation: boolean;
  cordBloodTissueBankingNotes: string;
  otherRequests: string;
}

export interface BirthPlanAfterBirth {
  skinToSkin: boolean;
  cordCuttingPerson: string;
  feedingPlan: "breastfeed" | "formula" | "other";
  feedingNotes: string;
  newbornTreatments: {
    antibioticEyeOintment: boolean;
    vitaminKInjection: boolean;
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
}
