import React, { ReactNode } from "react";
import { AppStore, BabyItem, BirthPlan, BagItem, Appointment, Note, Contraction } from "@/types";

// ── Default mock birth plan ──────────────────────────────────────────────────

const DEFAULT_MOCK_BIRTH_PLAN: BirthPlan = {
  updatedAt: new Date().toISOString(),
  personalInfo: {
    legalName: "",
    preferredName: "",
    dueDate: "",
    currentMedications: "",
    allergies: "",
  },
  labour: {
    birthPartner: "",
    doula: "",
    otherSupportPeople: "",
    labourGoal: "",
    atmosphereNotes: "",
    comfortMeasures: { walking: false, labourBall: false, tub: false, shower: false, heat: false, ice: false, massage: false, tens: false, other: "" },
    pushingPreferences: { varietyOfPositions: false, helpWithPushing: false, selfDirected: false, other: "" },
    painMedication: { onlyIfAsked: false, offerIfNotCoping: false, offerAsSoonAsPossible: false, nitrous: false, morphineFentanyl: false, epidural: false, other: "" },
    photographyNotes: "",
    personalTouches: "",
    cordBloodBankDonation: false,
    cordBloodTissueBankingNotes: "",
    otherRequests: "",
  },
  afterBirth: {
    skinToSkin: false,
    cordCuttingPerson: "",
    feedingPlan: "breastfeed",
    feedingNotes: "",
    newbornTreatments: { antibioticEyeOintment: false, vitaminKInjection: false, other: "" },
    placentaPreferences: "",
    circumcisionPreferences: "",
    visitorsPreference: "",
  },
  interventions: {
    unexpectedEvents: { includeInAllDecisions: false, partnerIncluded: false, other: "" },
    continuousMonitoring: { preferMobile: false, useShowerBath: false },
    prolongedLabour: { tryNaturalMethods: false, offerMedication: false },
    assistedBirthPreference: "",
    caesarianWishes: "",
    specialCareForBaby: { skinToSkinIfPossible: false, helpExpressing: false, involvedInCare: false, other: "" },
  },
  notes: "",
};

// ── Default mock store ────────────────────────────────────────────────────────

export const DEFAULT_MOCK_STORE: AppStore = {
  items: [],
  classes: [],
  materials: [],
  birthPlan: DEFAULT_MOCK_BIRTH_PLAN,
  notes: [],
  hospitalBag: [],
  appointments: [],
  contacts: [],
  contractions: [],
  registryUrl: "",
};

// ── Mock store actions type ──────────────────────────────────────────────────

export interface MockStoreActions {
  addItem: ReturnType<typeof vi.fn>;
  updateItem: ReturnType<typeof vi.fn>;
  deleteItem: ReturnType<typeof vi.fn>;
  restoreItem: ReturnType<typeof vi.fn>;
  addClass: ReturnType<typeof vi.fn>;
  updateClass: ReturnType<typeof vi.fn>;
  deleteClass: ReturnType<typeof vi.fn>;
  restoreClass: ReturnType<typeof vi.fn>;
  addMaterial: ReturnType<typeof vi.fn>;
  updateMaterial: ReturnType<typeof vi.fn>;
  deleteMaterial: ReturnType<typeof vi.fn>;
  restoreMaterial: ReturnType<typeof vi.fn>;
  updateBirthPlan: ReturnType<typeof vi.fn>;
  addNote: ReturnType<typeof vi.fn>;
  updateNote: ReturnType<typeof vi.fn>;
  deleteNote: ReturnType<typeof vi.fn>;
  restoreNote: ReturnType<typeof vi.fn>;
  updateBagItem: ReturnType<typeof vi.fn>;
  addBagItem: ReturnType<typeof vi.fn>;
  deleteBagItem: ReturnType<typeof vi.fn>;
  restoreBagItem: ReturnType<typeof vi.fn>;
  addAppointment: ReturnType<typeof vi.fn>;
  updateAppointment: ReturnType<typeof vi.fn>;
  deleteAppointment: ReturnType<typeof vi.fn>;
  restoreAppointment: ReturnType<typeof vi.fn>;
  addContact: ReturnType<typeof vi.fn>;
  updateContact: ReturnType<typeof vi.fn>;
  deleteContact: ReturnType<typeof vi.fn>;
  restoreContact: ReturnType<typeof vi.fn>;
  addContraction: ReturnType<typeof vi.fn>;
  clearContractions: ReturnType<typeof vi.fn>;
  updateRegistryUrl: ReturnType<typeof vi.fn>;
  loadFromExternal: ReturnType<typeof vi.fn>;
}

export function createMockActions(): MockStoreActions {
  return {
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    restoreItem: vi.fn(),
    addClass: vi.fn(),
    updateClass: vi.fn(),
    deleteClass: vi.fn(),
    restoreClass: vi.fn(),
    addMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    restoreMaterial: vi.fn(),
    updateBirthPlan: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    restoreNote: vi.fn(),
    updateBagItem: vi.fn(),
    addBagItem: vi.fn(),
    deleteBagItem: vi.fn(),
    restoreBagItem: vi.fn(),
    addAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    deleteAppointment: vi.fn(),
    restoreAppointment: vi.fn(),
    addContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    restoreContact: vi.fn(),
    addContraction: vi.fn(),
    clearContractions: vi.fn(),
    updateRegistryUrl: vi.fn(),
    loadFromExternal: vi.fn(),
  };
}

// ── Mock StoreContext provider ────────────────────────────────────────────────

// We mock useStoreContext directly, but this helper creates the value shape
export function createMockStoreValue(
  storeOverrides?: Partial<AppStore>,
  actionOverrides?: Partial<MockStoreActions>,
  options?: { loaded?: boolean; autoSyncing?: boolean }
) {
  const actions = { ...createMockActions(), ...actionOverrides };
  const store = { ...DEFAULT_MOCK_STORE, ...storeOverrides };

  return {
    store,
    loaded: options?.loaded ?? true,
    autoSyncing: options?.autoSyncing ?? false,
    storageInfo: { bytes: 0, formatted: "0 B", percent: 0, warning: false },
    syncFailureState: { consecutiveFailures: 0, isPaused: false, lastErrorMessage: "" },
    retrySyncNow: vi.fn(),
    dismissSyncError: vi.fn(),
    setSyncErrorCallback: vi.fn(),
    setSyncSuccessCallback: vi.fn(),
    registryUrl: store.registryUrl,
    ...actions,
  };
}

// ── Factory helpers for mock data ────────────────────────────────────────────

let idCounter = 0;

export function createMockItem(overrides?: Partial<BabyItem>): BabyItem {
  idCounter++;
  return {
    id: `item-${idCounter}`,
    name: `Test Item ${idCounter}`,
    category: "Nursery",
    priority: "Must Have",
    purchased: false,
    notes: "",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockBagItem(overrides?: Partial<BagItem>): BagItem {
  idCounter++;
  return {
    id: `bag-${idCounter}`,
    name: `Bag Item ${idCounter}`,
    category: "Clothing \u2014 Mom" as BagItem["category"],
    packed: false,
    notes: "",
    ...overrides,
  };
}

export function createMockAppointment(overrides?: Partial<Appointment>): Appointment {
  idCounter++;
  return {
    id: `appt-${idCounter}`,
    title: `Appointment ${idCounter}`,
    type: "OB / Midwife",
    date: "2026-06-15",
    time: "10:00",
    provider: "Dr. Test",
    location: "Hospital",
    notes: "",
    completed: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockNote(overrides?: Partial<Note>): Note {
  idCounter++;
  return {
    id: `note-${idCounter}`,
    title: `Note ${idCounter}`,
    content: `Content for note ${idCounter}`,
    category: "General",
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockContraction(overrides?: Partial<Contraction>): Contraction {
  idCounter++;
  return {
    id: `contraction-${idCounter}`,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 60000).toISOString(),
    duration: 60,
    interval: 0,
    ...overrides,
  };
}
