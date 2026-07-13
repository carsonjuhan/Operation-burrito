"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  AppStore, BabyItem, BabyClass, Material, BirthPlan, Note,
  BagItem, Appointment, Contact, Contraction, PostBirthTask, Medication,
} from "@/types";
import { getPAT, getGistId, pushToGist, loadGist } from "@/lib/gistSync";
import { mergeStores, mergeNewbornEvents } from "@/lib/storeMerge";
import { loadNewbornData, saveNewbornData, NEWBORN_UPDATED_EVENT } from "@/lib/newbornTracker";
import { DEFAULT_REMINDER_SETTINGS, loadReminderSettings, ReminderSettings } from "@/lib/reminderTimers";
import { recordAction } from "@/lib/actionHistory";
import { getStorageSize, getStoragePercent, isStorageWarning } from "@/lib/storageMonitor";
import { setLastModifiedAt } from "@/lib/conflictDetection";
import {
  SyncFailureState,
  INITIAL_SYNC_FAILURE_STATE,
  recordSyncFailure,
  recordSyncSuccess,
  dismissSyncWarning,
} from "@/lib/syncErrorHandler";

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_BIRTH_PLAN: AppStore["birthPlan"] = {
  updatedAt: new Date().toISOString(),
  personalInfo: {
    legalName: "",
    preferredName: "",
    dueDate: "",
    careProvider: "",
    birthLocation: "",
    previousBirths: "",
    preferredLanguage: "",
    interpreterNeeded: false,
    currentMedications: "G6PD - please note reduced blood procedures if needed",
    allergies: "",
  },
  labour: {
    birthPartner: "Juhan",
    doula: "",
    otherSupportPeople: "",
    labourGoal: "Natural birth",
    atmosphereNotes: "",
    comfortMeasures: { walking: false, labourBall: false, tub: false, shower: false, heat: false, ice: false, massage: false, tens: false, aromatherapy: false, breathingTechniques: false, acupressure: false, hypnobirthing: false, sterileWaterInjections: false, other: "" },
    pushingPreferences: { varietyOfPositions: false, helpWithPushing: false, selfDirected: false, handsAndKnees: false, squatting: false, sideLying: false, supportedSquat: false, waterBirth: false, perinealWarmCompress: false, perinealMassage: false, perinealNoTouch: false, noEpisiotomy: false, other: "" },
    painMedication: { onlyIfAsked: false, offerIfNotCoping: false, offerAsSoonAsPossible: false, nitrous: false, morphineFentanyl: false, epidural: false, other: "" },
    labourInterventions: { preferNoIV: false, preferHepLock: false, fetalMonitoring: "", preferNoAmniotomy: false, preferNoOxytocin: false },
    photographyNotes: "",
    personalTouches: "",
    cordBloodBankDonation: false,
    cordBloodTissueBankingNotes: "",
    otherRequests: "",
  },
  afterBirth: {
    skinToSkin: false,
    partnerSkinToSkinIfUnable: false,
    cordCuttingPerson: "",
    cordClampingDuration: "",
    thirdStageManagement: "",
    feedingPlan: "breastfeed",
    feedingNotes: "",
    pacifierPreference: "",
    newbornTreatments: { antibioticEyeOintment: false, vitaminKInjection: false, hearingScreening: false, pkuBloodSpot: false, hepatitisBVaccine: false, other: "" },
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
    bloodTransfusionPreferences: "",
    studentsObservers: false,
  },
  notes: "",
};

export const DEFAULT_BAG_ITEMS: BagItem[] = [
  // Clothing — Mom
  { id: "b1", name: "Comfortable loose outfit (x2)", category: "Clothing — Mom", packed: false, notes: "" },
  { id: "b2", name: "Nursing bra (x2)", category: "Clothing — Mom", packed: false, notes: "" },
  { id: "b3", name: "Comfortable underwear (x4)", category: "Clothing — Mom", packed: false, notes: "" },
  { id: "b4", name: "Non-slip socks or slippers", category: "Clothing — Mom", packed: false, notes: "" },
  { id: "b5", name: "Going-home outfit", category: "Clothing — Mom", packed: false, notes: "" },
  // Clothing — Baby
  { id: "b6", name: "Onesies (x3)", category: "Clothing — Baby", packed: false, notes: "" },
  { id: "b7", name: "Sleepers with feet (x2)", category: "Clothing — Baby", packed: false, notes: "" },
  { id: "b8", name: "Hat & mittens", category: "Clothing — Baby", packed: false, notes: "" },
  { id: "b9", name: "Receiving blanket", category: "Clothing — Baby", packed: false, notes: "" },
  { id: "b10", name: "Going-home outfit for baby", category: "Clothing — Baby", packed: false, notes: "" },
  // Documents
  { id: "b11", name: "Health card / ID", category: "Documents", packed: false, notes: "" },
  { id: "b12", name: "Hospital pre-registration papers", category: "Documents", packed: false, notes: "" },
  { id: "b13", name: "Birth plan (printed)", category: "Documents", packed: false, notes: "" },
  { id: "b14", name: "Insurance / MSP info", category: "Documents", packed: false, notes: "" },
  { id: "b15", name: "Cord blood banking consent form", category: "Documents", packed: false, notes: "" },
  // Toiletries
  { id: "b16", name: "Toothbrush & toothpaste", category: "Toiletries", packed: false, notes: "" },
  { id: "b17", name: "Shampoo & body wash", category: "Toiletries", packed: false, notes: "" },
  { id: "b18", name: "Lip balm", category: "Toiletries", packed: false, notes: "" },
  { id: "b19", name: "Hair ties", category: "Toiletries", packed: false, notes: "" },
  { id: "b20", name: "Maternity pads", category: "Toiletries", packed: false, notes: "" },
  // Comfort & Labour
  { id: "b21", name: "Massage oil / roller", category: "Comfort & Labour", packed: false, notes: "" },
  { id: "b22", name: "Focal point item / photos", category: "Comfort & Labour", packed: false, notes: "" },
  { id: "b23", name: "Pillow from home", category: "Comfort & Labour", packed: false, notes: "" },
  { id: "b24", name: "Music playlist ready", category: "Comfort & Labour", packed: false, notes: "" },
  // Feeding
  { id: "b25", name: "Nipple cream (lanolin)", category: "Feeding", packed: false, notes: "" },
  { id: "b26", name: "Nursing pads", category: "Feeding", packed: false, notes: "" },
  // Electronics
  { id: "b27", name: "Phone + charger", category: "Electronics", packed: false, notes: "" },
  { id: "b28", name: "Camera / extra battery", category: "Electronics", packed: false, notes: "" },
  { id: "b29", name: "Portable battery bank", category: "Electronics", packed: false, notes: "" },
  // Snacks
  { id: "b30", name: "Energy snacks for labour", category: "Snacks", packed: false, notes: "" },
  { id: "b31", name: "Drinks / electrolytes", category: "Snacks", packed: false, notes: "" },
  { id: "b32", name: "Snacks for partner", category: "Snacks", packed: false, notes: "" },
];

export const DEFAULT_STORE: AppStore = {
  items: [],
  classes: [],
  materials: [],
  birthPlan: DEFAULT_BIRTH_PLAN,
  notes: [],
  hospitalBag: DEFAULT_BAG_ITEMS,
  appointments: [],
  contacts: [],
  contractions: [],
  postBirthTasks: [],
  registryUrl: "",
  checklistSkipped: [],
  checklistAlreadyHave: [],
  hospitalChecklistPacked: [],
  hospitalChecklistSkipped: [],
  postBirthChecked: [],
  medications: [],
};

// ── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = "operation-burrito-store";

function loadStore(): AppStore {
  if (typeof window === "undefined") return DEFAULT_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    const storedPlan = parsed.birthPlan as unknown;
    const rawPlan = storedPlan && typeof storedPlan === "object" && !("sections" in (storedPlan as object))
      ? (storedPlan as AppStore["birthPlan"])
      : null;
    const def = DEFAULT_BIRTH_PLAN;
    const birthPlan: AppStore["birthPlan"] = rawPlan ? {
      ...def,
      ...rawPlan,
      personalInfo: { ...def.personalInfo, ...rawPlan.personalInfo },
      labour: {
        ...def.labour,
        ...rawPlan.labour,
        comfortMeasures: { ...def.labour.comfortMeasures, ...rawPlan.labour?.comfortMeasures },
        pushingPreferences: { ...def.labour.pushingPreferences, ...rawPlan.labour?.pushingPreferences },
        painMedication: { ...def.labour.painMedication, ...rawPlan.labour?.painMedication },
        labourInterventions: { ...def.labour.labourInterventions, ...rawPlan.labour?.labourInterventions },
      },
      afterBirth: {
        ...def.afterBirth,
        ...rawPlan.afterBirth,
        newbornTreatments: { ...def.afterBirth.newbornTreatments, ...rawPlan.afterBirth?.newbornTreatments },
      },
      interventions: {
        ...def.interventions,
        ...rawPlan.interventions,
        unexpectedEvents: { ...def.interventions.unexpectedEvents, ...rawPlan.interventions?.unexpectedEvents },
        continuousMonitoring: { ...def.interventions.continuousMonitoring, ...rawPlan.interventions?.continuousMonitoring },
        prolongedLabour: { ...def.interventions.prolongedLabour, ...rawPlan.interventions?.prolongedLabour },
        specialCareForBaby: { ...def.interventions.specialCareForBaby, ...rawPlan.interventions?.specialCareForBaby },
      },
    } : def;
    // Migrate checklist state from separate localStorage keys if not yet in store
    const migrateList = (storeVal: string[] | undefined, lsKey: string): string[] => {
      if (storeVal && storeVal.length > 0) return storeVal;
      try {
        const raw = localStorage.getItem(lsKey);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    };

    // Migrate newborn tracker from its own localStorage key
    const migrateNewborn = () => {
      if (parsed.newbornEvents && parsed.newbornEvents.length > 0) {
        return { events: parsed.newbornEvents, name: parsed.newbornBabyName ?? "Baby", birthDate: parsed.newbornBabyBirthDate };
      }
      try {
        const nb = localStorage.getItem("newborn_tracker");
        if (nb) { const d = JSON.parse(nb); return { events: d.events ?? [], name: d.babyName ?? "Baby", birthDate: d.babyBirthDate }; }
      } catch { /* */ }
      return { events: [], name: "Baby", birthDate: undefined };
    };
    const nb = migrateNewborn();

    // Migrate reminder settings from their own localStorage key if not yet in store
    const migrateReminderSettings = (): ReminderSettings => {
      if (parsed.reminderSettings) return parsed.reminderSettings;
      return loadReminderSettings();
    };

    // Migrate the single global med interval (pre-multi-medication era) into
    // one Medication entry, so upgrading doesn't silently drop an existing
    // reminder. Only runs once: triggered by the presence of legacy
    // reminderSettings with no medications list saved yet.
    const migrateMedications = (): Medication[] => {
      if (parsed.medications) return parsed.medications;
      if (parsed.reminderSettings) {
        return [{
          id: "legacy-med",
          name: "Medication",
          minHours: parsed.reminderSettings.medHours ?? DEFAULT_REMINDER_SETTINGS.medHours,
          maxHours: parsed.reminderSettings.medHours ?? DEFAULT_REMINDER_SETTINGS.medHours,
          enabled: parsed.reminderSettings.medEnabled ?? DEFAULT_REMINDER_SETTINGS.medEnabled,
          updatedAt: parsed.reminderSettings.updatedAt,
        }];
      }
      return [];
    };

    return {
      items: parsed.items ?? [],
      classes: parsed.classes ?? [],
      materials: parsed.materials ?? [],
      birthPlan,
      notes: parsed.notes ?? [],
      hospitalBag: parsed.hospitalBag ?? DEFAULT_BAG_ITEMS,
      appointments: parsed.appointments ?? [],
      contacts: parsed.contacts ?? [],
      contractions: parsed.contractions ?? [],
      postBirthTasks: parsed.postBirthTasks ?? [],
      registryUrl: parsed.registryUrl ?? "",
      checklistSkipped: migrateList(parsed.checklistSkipped, "checklist-skipped"),
      checklistAlreadyHave: migrateList(parsed.checklistAlreadyHave, "checklist-already-have"),
      hospitalChecklistPacked: migrateList(parsed.hospitalChecklistPacked, "hospital-checklist-packed"),
      hospitalChecklistSkipped: migrateList(parsed.hospitalChecklistSkipped, "hospital-checklist-skipped"),
      newbornEvents: nb.events,
      newbornBabyName: nb.name,
      newbornBabyBirthDate: nb.birthDate,
      reminderSettings: migrateReminderSettings(),
      medications: migrateMedications(),
    };
  } catch {
    return DEFAULT_STORE;
  }
}

function saveStore(store: AppStore): boolean {
  if (typeof window === "undefined") return true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    // Keep the newborn tracker key in sync so the page can still read it directly.
    // Spread the existing blob first: fields the store doesn't own here (the live
    // activeNursing timer and its timestamp) must survive this rewrite — remote
    // updates to them flow through writeNewbornToLocal's LWW instead.
    if (store.newbornEvents !== undefined) {
      let existing: Record<string, unknown> = {};
      try { existing = JSON.parse(localStorage.getItem("newborn_tracker") ?? "{}"); } catch { /* corrupt blob */ }
      localStorage.setItem("newborn_tracker", JSON.stringify({
        ...existing,
        events: store.newbornEvents,
        babyName: store.newbornBabyName ?? "Baby",
        babyBirthDate: store.newbornBabyBirthDate,
        babyBirthDateUpdatedAt: store.newbornBabyBirthDateUpdatedAt ?? existing.babyBirthDateUpdatedAt,
      }));
    }
    return true;
  } catch {
    // QuotaExceededError — localStorage is full
    return false;
  }
}

// ── Domain value types ────────────────────────────────────────────────────

export interface ItemsContextValue {
  items: BabyItem[];
  addItem: (item: Omit<BabyItem, "id" | "createdAt">) => void;
  updateItem: (id: string, changes: Partial<BabyItem>) => void;
  deleteItem: (id: string) => void;
  restoreItem: (item: BabyItem) => void;
}

export interface ClassesContextValue {
  classes: BabyClass[];
  addClass: (cls: Omit<BabyClass, "id" | "createdAt">) => void;
  updateClass: (id: string, changes: Partial<BabyClass>) => void;
  deleteClass: (id: string) => void;
  restoreClass: (cls: BabyClass) => void;
}

export interface MaterialsContextValue {
  materials: Material[];
  addMaterial: (mat: Omit<Material, "id" | "createdAt">) => void;
  updateMaterial: (id: string, changes: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  restoreMaterial: (mat: Material) => void;
}

export interface BirthPlanContextValue {
  birthPlan: BirthPlan;
  updateBirthPlan: (plan: BirthPlan) => void;
}

export interface NotesContextValue {
  notes: Note[];
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, changes: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  restoreNote: (note: Note) => void;
}

export interface HospitalBagContextValue {
  hospitalBag: BagItem[];
  updateBagItem: (id: string, changes: Partial<BagItem>) => void;
  addBagItem: (item: Omit<BagItem, "id">) => void;
  deleteBagItem: (id: string) => void;
  restoreBagItem: (item: BagItem) => void;
}

export interface AppointmentsContextValue {
  appointments: Appointment[];
  addAppointment: (appt: Omit<Appointment, "id" | "createdAt">) => void;
  updateAppointment: (id: string, changes: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  restoreAppointment: (appt: Appointment) => void;
}

export interface ContactsContextValue {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, "id" | "createdAt">) => void;
  updateContact: (id: string, changes: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  restoreContact: (contact: Contact) => void;
}

export interface ContractionsContextValue {
  contractions: Contraction[];
  addContraction: (c: Contraction) => void;
  deleteContraction: (id: string) => void;
  clearContractions: () => void;
}

export interface PostBirthTasksContextValue {
  postBirthTasks: PostBirthTask[];
  addPostBirthTask: (task: Omit<PostBirthTask, "id">) => void;
  updatePostBirthTask: (id: string, changes: Partial<PostBirthTask>) => void;
  deletePostBirthTask: (id: string) => void;
  restorePostBirthTask: (task: PostBirthTask) => void;
  setPostBirthTasks: (tasks: PostBirthTask[]) => void;
}

export interface CoreContextValue {
  store: AppStore;
  loaded: boolean;
  autoSyncing: boolean;
  storageInfo: { bytes: number; formatted: string; percent: number; warning: boolean };
  syncFailureState: SyncFailureState;
  retrySyncNow: () => void;
  dismissSyncError: () => void;
  setSyncErrorCallback: (cb: (state: SyncFailureState) => void) => void;
  setSyncSuccessCallback: (cb: () => void) => void;
  registryUrl: string;
  updateRegistryUrl: (url: string) => void;
  updateChecklistState: (key: "checklistSkipped" | "checklistAlreadyHave" | "hospitalChecklistPacked" | "hospitalChecklistSkipped" | "postBirthChecked", ids: string[]) => void;
  updateReminderSettings: (patch: Partial<ReminderSettings>) => void;
  addMedication: (med: Omit<Medication, "id">) => void;
  updateMedication: (id: string, changes: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  loadFromExternal: (incoming: AppStore) => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useStore() {
  const [store, setStore] = useState<AppStore>(DEFAULT_STORE);
  const [loaded, setLoaded] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeRef = useRef<AppStore>(DEFAULT_STORE);

  // Sync failure tracking (S-011)
  const [syncFailureState, setSyncFailureState] = useState<SyncFailureState>(INITIAL_SYNC_FAILURE_STATE);
  const syncFailureRef = useRef<SyncFailureState>(INITIAL_SYNC_FAILURE_STATE);
  // Callback for toast notifications on sync failure — set by the context consumer
  const onSyncErrorRef = useRef<((state: SyncFailureState) => void) | null>(null);
  const onSyncSuccessAfterFailureRef = useRef<(() => void) | null>(null);

  // Storage monitoring
  const [storageInfo, setStorageInfo] = useState({ bytes: 0, formatted: "0 B", percent: 0, warning: false });

  const refreshStorageInfo = useCallback(() => {
    const size = getStorageSize();
    setStorageInfo({
      bytes: size.bytes,
      formatted: size.formatted,
      percent: getStoragePercent(size.bytes),
      warning: isStorageWarning(size.bytes),
    });
  }, []);

  useEffect(() => {
    const loaded_ = loadStore();
    setStore(loaded_);
    storeRef.current = loaded_;
    setLoaded(true);
    refreshStorageInfo();
  }, [refreshStorageInfo]);

  // ── Tombstone tracking ────────────────────────────────────────────────────
  // Diff ID-keyed arrays on every update: removed ids become tombstones so the
  // delete propagates on merge; re-added ids (undo) clear their tombstone.

  const TOMBSTONE_ARRAYS = useMemo(() => ([
    "items", "classes", "materials", "notes", "appointments", "contacts", "hospitalBag", "newbornEvents",
    "contractions", "postBirthTasks", "medications",
  ] as const), []);

  const trackDeletes = useCallback((prev: AppStore, next: AppStore): AppStore => {
    const tomb = { ...(next.deletedIds ?? prev.deletedIds ?? {}) };
    const now = new Date().toISOString();
    let changed = false;
    for (const key of TOMBSTONE_ARRAYS) {
      const prevArr = (prev[key] ?? []) as { id: string }[];
      const nextArr = (next[key] ?? []) as { id: string }[];
      const nextIds = new Set(nextArr.map((i) => i.id));
      for (const item of prevArr) {
        if (!nextIds.has(item.id)) { tomb[item.id] = now; changed = true; }
      }
      for (const id of Array.from(nextIds)) {
        if (tomb[id]) { delete tomb[id]; changed = true; }
      }
    }
    return changed || next.deletedIds !== tomb ? { ...next, deletedIds: tomb } : next;
  }, [TOMBSTONE_ARRAYS]);

  // ── Newborn tracker bridge ────────────────────────────────────────────────
  // Store → localStorage after merges (union, never drops local events).
  const writeNewbornToLocal = useCallback((s: AppStore) => {
    if (!s.newbornEvents) return;
    const local = loadNewbornData();
    const tomb = s.deletedIds ?? {};
    const events = mergeNewbornEvents(local.events, s.newbornEvents).filter((e) => !tomb[e.id]);
    const babyName = s.newbornBabyName && s.newbornBabyName !== "Baby" ? s.newbornBabyName : local.babyName;
    const localBirthDateTime = new Date(local.babyBirthDateUpdatedAt ?? 0).getTime() || 0;
    const remoteBirthDateTime = new Date(s.newbornBabyBirthDateUpdatedAt ?? 0).getTime() || 0;
    // On a tie, prefer whichever side has a value set (see storeMerge.ts).
    const birthDateRemoteWins = remoteBirthDateTime !== localBirthDateTime
      ? remoteBirthDateTime > localBirthDateTime
      : !local.babyBirthDate && !!s.newbornBabyBirthDate;
    const babyBirthDate = birthDateRemoteWins ? s.newbornBabyBirthDate : local.babyBirthDate;
    const babyBirthDateUpdatedAt = birthDateRemoteWins ? s.newbornBabyBirthDateUpdatedAt : local.babyBirthDateUpdatedAt;
    // Active nursing timer: newest updatedAt wins, same rule as the store merge.
    const localNursingTime = new Date(local.activeNursingUpdatedAt ?? 0).getTime() || 0;
    const remoteNursingTime = new Date(s.newbornActiveNursingUpdatedAt ?? 0).getTime() || 0;
    const nursingRemoteWins = remoteNursingTime > localNursingTime;
    const activeNursing = nursingRemoteWins ? (s.newbornActiveNursing ?? undefined) : local.activeNursing;
    const activeNursingUpdatedAt = nursingRemoteWins ? s.newbornActiveNursingUpdatedAt : local.activeNursingUpdatedAt;
    if (
      JSON.stringify(events) !== JSON.stringify(local.events) ||
      babyName !== local.babyName ||
      babyBirthDate !== local.babyBirthDate ||
      JSON.stringify(activeNursing ?? null) !== JSON.stringify(local.activeNursing ?? null)
    ) {
      saveNewbornData({ events, babyName, babyBirthDate, babyBirthDateUpdatedAt, activeNursing: activeNursing ?? undefined, activeNursingUpdatedAt });
    }
  }, []);

  const runAutoSync = useCallback(async (nextStore: AppStore) => {
    const pat = getPAT();
    const gistId = getGistId();
    if (!pat || !gistId) return;
    setAutoSyncing(true);
    try {
      // Fetch remote then merge before pushing — prevents 2-user overwrites.
      // Merge against the freshest local state, not the debounce-time snapshot.
      let storeToSync = storeRef.current ?? nextStore;
      try {
        const remote = await loadGist(pat, gistId);
        // Re-read storeRef.current: local edits (e.g. a newborn event logged
        // mid-flight) may have landed while loadGist's network round-trip was
        // pending. Merging the pre-await snapshot here would silently drop
        // them when saveStore/writeNewbornToLocal persist storeToSync below.
        storeToSync = mergeStores(storeRef.current ?? storeToSync, remote);
        // Persist merged result locally too
        saveStore(storeToSync);
        setStore(storeToSync);
        storeRef.current = storeToSync;
        // Partner's tracker events land in the local tracker store
        writeNewbornToLocal(storeToSync);
      } catch {
        // Network or parse error on fetch — fall back to pushing local state
      }
      await pushToGist(pat, storeToSync);
      // Success — reset failure state if there were prior failures
      if (syncFailureRef.current.consecutiveFailures > 0) {
        const newState = recordSyncSuccess();
        syncFailureRef.current = newState;
        setSyncFailureState(newState);
        onSyncSuccessAfterFailureRef.current?.();
      }
    } catch (err) {
      const newState = recordSyncFailure(syncFailureRef.current, err);
      syncFailureRef.current = newState;
      setSyncFailureState(newState);
      onSyncErrorRef.current?.(newState);
    }
    setAutoSyncing(false);
  }, [writeNewbornToLocal]);

  const triggerAutoSync = useCallback((nextStore: AppStore) => {
    const pat = getPAT();
    const gistId = getGistId();
    if (!pat || !gistId) return;
    // Skip if auto-sync is paused due to repeated failures
    if (syncFailureRef.current.isPaused) return;
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(() => {
      autoSyncTimer.current = null;
      runAutoSync(nextStore);
    }, 5000); // debounce 5 seconds
  }, [runAutoSync]);

  // Flush a pending debounced auto-sync immediately. On mobile the OS can
  // suspend JS execution moments after backgrounding a tab, so waiting out the
  // 5s debounce risks losing a local edit that was never pushed — the edit
  // stays trapped on that device until another local edit re-triggers sync.
  // Firing the pending sync right away (rather than the leftover setTimeout)
  // gives it the best chance to complete before suspension.
  const flushAutoSync = useCallback(() => {
    if (!autoSyncTimer.current) return;
    clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = null;
    if (syncFailureRef.current.isPaused) return;
    runAutoSync(storeRef.current);
  }, [runAutoSync]);

  const update = useCallback((updater: (prev: AppStore) => AppStore, description?: string) => {
    setStore((prev) => {
      if (description) {
        recordAction(description, prev);
      }
      const now = new Date().toISOString();
      const next = trackDeletes(prev, { ...updater(prev), lastModifiedAt: now });
      saveStore(next);
      setLastModifiedAt(now);
      triggerAutoSync(next);
      refreshStorageInfo();
      storeRef.current = next;
      return next;
    });
  }, [triggerAutoSync, refreshStorageInfo, trackDeletes]);

  // ── Pull-on-open / refocus ────────────────────────────────────────────────
  // Auto-sync only pushes after a *local* edit, so an idle device (e.g. the
  // other parent's phone that only views the log) never received remote
  // changes. Fetch-and-merge from the Gist when the app opens or regains focus
  // so both phones converge without requiring an edit. Throttled to avoid
  // hammering the API on rapid focus changes.
  const lastPullRef = useRef(0);
  const pullFromRemote = useCallback(async () => {
    const pat = getPAT();
    const gistId = getGistId();
    if (!pat || !gistId) return;
    if (syncFailureRef.current.isPaused) return;
    if (Date.now() - lastPullRef.current < 8000) return;
    lastPullRef.current = Date.now();
    setAutoSyncing(true);
    try {
      const remote = await loadGist(pat, gistId);
      const merged = mergeStores(storeRef.current, remote);
      saveStore(merged);
      setStore(merged);
      storeRef.current = merged;
      writeNewbornToLocal(merged);
      if (syncFailureRef.current.consecutiveFailures > 0) {
        const newState = recordSyncSuccess();
        syncFailureRef.current = newState;
        setSyncFailureState(newState);
        onSyncSuccessAfterFailureRef.current?.();
      }
    } catch (err) {
      const newState = recordSyncFailure(syncFailureRef.current, err);
      syncFailureRef.current = newState;
      setSyncFailureState(newState);
    }
    setAutoSyncing(false);
  }, [writeNewbornToLocal]);

  useEffect(() => {
    if (!loaded) return;
    pullFromRemote();
    const onFocus = () => pullFromRemote();
    const onVisible = () => {
      if (document.visibilityState === "visible") pullFromRemote();
      else flushAutoSync();
    };
    // pagehide fires when the tab/app is actually closed (not just backgrounded),
    // which visibilitychange doesn't reliably cover on every mobile browser.
    const onPageHide = () => flushAutoSync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onPageHide);
    // Background poll: focus/visibility events don't fire while the app sits
    // open and foregrounded, so an idle device never sees the other phone's
    // edits. Poll every 30s while visible (pullFromRemote is throttled to 8s
    // and no-ops when the tab is hidden, so this stays cheap).
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") pullFromRemote();
    }, 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(poll);
    };
  }, [loaded, pullFromRemote, flushAutoSync]);

  // ── Newborn tracker mirror (localStorage → store) ────────────────────────
  // The tracker UI writes to its own localStorage key; mirror those writes
  // into the synced store so both parents' phones share feed/sleep/diaper logs.
  useEffect(() => {
    if (!loaded) return;
    const mirror = () => {
      const d = loadNewbornData();
      const cur = storeRef.current;
      const sameEvents = JSON.stringify(cur.newbornEvents ?? []) === JSON.stringify(d.events);
      const sameName = (cur.newbornBabyName ?? "Baby") === d.babyName;
      const sameBirthDate = (cur.newbornBabyBirthDate ?? undefined) === (d.babyBirthDate ?? undefined);
      const sameNursing = JSON.stringify(cur.newbornActiveNursing ?? null) === JSON.stringify(d.activeNursing ?? null);
      if (!sameEvents || !sameName || !sameBirthDate || !sameNursing) {
        update((s) => ({
          ...s,
          newbornEvents: d.events,
          newbornBabyName: d.babyName,
          newbornBabyBirthDate: d.babyBirthDate,
          newbornBabyBirthDateUpdatedAt: d.babyBirthDateUpdatedAt ?? s.newbornBabyBirthDateUpdatedAt,
          newbornActiveNursing: d.activeNursing ?? null,
          newbornActiveNursingUpdatedAt: d.activeNursingUpdatedAt ?? s.newbornActiveNursingUpdatedAt,
        }));
      }
    };
    mirror(); // seed once on load
    window.addEventListener(NEWBORN_UPDATED_EVENT, mirror);
    return () => window.removeEventListener(NEWBORN_UPDATED_EVENT, mirror);
  }, [loaded, update]);

  // ── Items ────────────────────────────────────────────────────────────────

  const addItem = useCallback((item: Omit<BabyItem, "id" | "createdAt">) => {
    update((s) => ({ ...s, items: [...s.items, { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }), `Added item '${item.name}'`);
  }, [update]);

  const updateItem = useCallback((id: string, changes: Partial<BabyItem>) => {
    const name = storeRef.current.items.find((i) => i.id === id)?.name ?? id;
    update((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }), `Updated item '${name}'`);
  }, [update]);

  const deleteItem = useCallback((id: string) => {
    const name = storeRef.current.items.find((i) => i.id === id)?.name ?? id;
    update((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }), `Deleted item '${name}'`);
  }, [update]);

  const restoreItem = useCallback((item: BabyItem) => {
    update((s) => ({ ...s, items: [...s.items, item] }), `Restored item '${item.name}'`);
  }, [update]);

  // ── Classes ──────────────────────────────────────────────────────────────

  const addClass = useCallback((cls: Omit<BabyClass, "id" | "createdAt">) => {
    update((s) => ({ ...s, classes: [...s.classes, { ...cls, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }), `Added class '${cls.name}'`);
  }, [update]);

  const updateClass = useCallback((id: string, changes: Partial<BabyClass>) => {
    const name = storeRef.current.classes.find((c) => c.id === id)?.name ?? id;
    update((s) => ({ ...s, classes: s.classes.map((c) => (c.id === id ? { ...c, ...changes } : c)) }), `Updated class '${name}'`);
  }, [update]);

  const deleteClass = useCallback((id: string) => {
    const name = storeRef.current.classes.find((c) => c.id === id)?.name ?? id;
    update((s) => ({ ...s, classes: s.classes.filter((c) => c.id !== id) }), `Deleted class '${name}'`);
  }, [update]);

  const restoreClass = useCallback((cls: BabyClass) => {
    update((s) => ({ ...s, classes: [...s.classes, cls] }), `Restored class '${cls.name}'`);
  }, [update]);

  // ── Materials ────────────────────────────────────────────────────────────

  const addMaterial = useCallback((mat: Omit<Material, "id" | "createdAt">) => {
    update((s) => ({ ...s, materials: [...s.materials, { ...mat, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }), `Added material '${mat.title}'`);
  }, [update]);

  const updateMaterial = useCallback((id: string, changes: Partial<Material>) => {
    const title = storeRef.current.materials.find((m) => m.id === id)?.title ?? id;
    update((s) => ({ ...s, materials: s.materials.map((m) => (m.id === id ? { ...m, ...changes } : m)) }), `Updated material '${title}'`);
  }, [update]);

  const deleteMaterial = useCallback((id: string) => {
    const title = storeRef.current.materials.find((m) => m.id === id)?.title ?? id;
    update((s) => ({ ...s, materials: s.materials.filter((m) => m.id !== id) }), `Deleted material '${title}'`);
  }, [update]);

  const restoreMaterial = useCallback((mat: Material) => {
    update((s) => ({ ...s, materials: [...s.materials, mat] }), `Restored material '${mat.title}'`);
  }, [update]);

  // ── Birth Plan ───────────────────────────────────────────────────────────

  const updateBirthPlan = useCallback((plan: BirthPlan) => {
    update((s) => ({ ...s, birthPlan: { ...plan, updatedAt: new Date().toISOString() } }));
  }, [update]);

  // ── Notes ────────────────────────────────────────────────────────────────

  const addNote = useCallback((note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    update((s) => ({ ...s, notes: [...s.notes, { ...note, id: crypto.randomUUID(), createdAt: now, updatedAt: now }] }), `Added note '${note.title}'`);
  }, [update]);

  const updateNote = useCallback((id: string, changes: Partial<Note>) => {
    const title = storeRef.current.notes.find((n) => n.id === id)?.title ?? id;
    update((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n)) }), `Updated note '${title}'`);
  }, [update]);

  const deleteNote = useCallback((id: string) => {
    const title = storeRef.current.notes.find((n) => n.id === id)?.title ?? id;
    update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }), `Deleted note '${title}'`);
  }, [update]);

  const restoreNote = useCallback((note: Note) => {
    update((s) => ({ ...s, notes: [...s.notes, note] }), `Restored note '${note.title}'`);
  }, [update]);

  // ── Hospital Bag ─────────────────────────────────────────────────────────

  const updateBagItem = useCallback((id: string, changes: Partial<BagItem>) => {
    const name = storeRef.current.hospitalBag.find((b) => b.id === id)?.name ?? id;
    update((s) => ({ ...s, hospitalBag: s.hospitalBag.map((b) => (b.id === id ? { ...b, ...changes } : b)) }), `Updated bag item '${name}'`);
  }, [update]);

  const addBagItem = useCallback((item: Omit<BagItem, "id">) => {
    update((s) => ({ ...s, hospitalBag: [...s.hospitalBag, { ...item, id: crypto.randomUUID() }] }), `Added bag item '${item.name}'`);
  }, [update]);

  const deleteBagItem = useCallback((id: string) => {
    const name = storeRef.current.hospitalBag.find((b) => b.id === id)?.name ?? id;
    update((s) => ({ ...s, hospitalBag: s.hospitalBag.filter((b) => b.id !== id) }), `Deleted bag item '${name}'`);
  }, [update]);

  const restoreBagItem = useCallback((item: BagItem) => {
    update((s) => ({ ...s, hospitalBag: [...s.hospitalBag, item] }), `Restored bag item '${item.name}'`);
  }, [update]);

  // ── Appointments ─────────────────────────────────────────────────────────

  const addAppointment = useCallback((appt: Omit<Appointment, "id" | "createdAt">) => {
    update((s) => ({ ...s, appointments: [...s.appointments, { ...appt, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }), `Added appointment '${appt.title}'`);
  }, [update]);

  const updateAppointment = useCallback((id: string, changes: Partial<Appointment>) => {
    const title = storeRef.current.appointments.find((a) => a.id === id)?.title ?? id;
    update((s) => ({ ...s, appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...changes } : a)) }), `Updated appointment '${title}'`);
  }, [update]);

  const deleteAppointment = useCallback((id: string) => {
    const title = storeRef.current.appointments.find((a) => a.id === id)?.title ?? id;
    update((s) => ({ ...s, appointments: s.appointments.filter((a) => a.id !== id) }), `Deleted appointment '${title}'`);
  }, [update]);

  const restoreAppointment = useCallback((appt: Appointment) => {
    update((s) => ({ ...s, appointments: [...s.appointments, appt] }), `Restored appointment '${appt.title}'`);
  }, [update]);

  // ── Contacts ─────────────────────────────────────────────────────────────

  const addContact = useCallback((contact: Omit<Contact, "id" | "createdAt">) => {
    update((s) => ({ ...s, contacts: [...s.contacts, { ...contact, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }), `Added contact '${contact.name}'`);
  }, [update]);

  const updateContact = useCallback((id: string, changes: Partial<Contact>) => {
    const name = storeRef.current.contacts.find((c) => c.id === id)?.name ?? id;
    update((s) => ({ ...s, contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...changes } : c)) }), `Updated contact '${name}'`);
  }, [update]);

  const deleteContact = useCallback((id: string) => {
    const name = storeRef.current.contacts.find((c) => c.id === id)?.name ?? id;
    update((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) }), `Deleted contact '${name}'`);
  }, [update]);

  const restoreContact = useCallback((contact: Contact) => {
    update((s) => ({ ...s, contacts: [...s.contacts, contact] }), `Restored contact '${contact.name}'`);
  }, [update]);

  // ── Contractions ─────────────────────────────────────────────────────────

  const addContraction = useCallback((c: Contraction) => {
    update((s) => ({ ...s, contractions: [...s.contractions, c] }));
  }, [update]);

  // Remove one contraction and recompute intervals so the remaining timeline
  // stays consistent (each interval is measured from the prior contraction's start).
  const deleteContraction = useCallback((id: string) => {
    update((s) => {
      const remaining = s.contractions
        .filter((c) => c.id !== id)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      const recomputed = remaining.map((c, i) => ({
        ...c,
        interval: i === 0
          ? 0
          : Math.floor((new Date(c.startTime).getTime() - new Date(remaining[i - 1].startTime).getTime()) / 1000),
      }));
      return { ...s, contractions: recomputed };
    });
  }, [update]);

  const clearContractions = useCallback(() => {
    update((s) => ({ ...s, contractions: [] }));
  }, [update]);

  // ── Post-Birth Tasks ─────────────────────────────────────────────────────

  const addPostBirthTask = useCallback((task: Omit<PostBirthTask, "id">) => {
    update((s) => ({ ...s, postBirthTasks: [...s.postBirthTasks, { ...task, id: crypto.randomUUID() }] }), `Added task '${task.label}'`);
  }, [update]);

  const updatePostBirthTask = useCallback((id: string, changes: Partial<PostBirthTask>) => {
    update((s) => ({ ...s, postBirthTasks: s.postBirthTasks.map((t) => (t.id === id ? { ...t, ...changes } : t)) }));
  }, [update]);

  const deletePostBirthTask = useCallback((id: string) => {
    update((s) => ({ ...s, postBirthTasks: s.postBirthTasks.filter((t) => t.id !== id) }));
  }, [update]);

  const restorePostBirthTask = useCallback((task: PostBirthTask) => {
    update((s) => ({ ...s, postBirthTasks: [...s.postBirthTasks, task] }));
  }, [update]);

  // Bulk replace — used to seed/migrate from the pre-store localStorage blob
  // and to reset to the built-in default task list.
  const setPostBirthTasks = useCallback((tasks: PostBirthTask[]) => {
    update((s) => ({ ...s, postBirthTasks: tasks }));
  }, [update]);

  // ── Registry URL ──────────────────────────────────────────────────────────

  const updateRegistryUrl = useCallback((url: string) => {
    update((s) => ({ ...s, registryUrl: url }));
  }, [update]);

  const updateReminderSettings = useCallback((patch: Partial<ReminderSettings>) => {
    update((s) => ({
      ...s,
      reminderSettings: {
        ...DEFAULT_REMINDER_SETTINGS,
        ...s.reminderSettings,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, [update]);

  // ── Medications ──────────────────────────────────────────────────────────

  const addMedication = useCallback((med: Omit<Medication, "id">) => {
    update((s) => ({
      ...s,
      medications: [...(s.medications ?? []), { ...med, id: crypto.randomUUID(), updatedAt: new Date().toISOString() }],
    }), `Added medication '${med.name}'`);
  }, [update]);

  const updateMedication = useCallback((id: string, changes: Partial<Medication>) => {
    const name = storeRef.current.medications?.find((m) => m.id === id)?.name ?? id;
    update((s) => ({
      ...s,
      medications: (s.medications ?? []).map((m) => (m.id === id ? { ...m, ...changes, updatedAt: new Date().toISOString() } : m)),
    }), `Updated medication '${name}'`);
  }, [update]);

  const deleteMedication = useCallback((id: string) => {
    const name = storeRef.current.medications?.find((m) => m.id === id)?.name ?? id;
    update((s) => ({
      ...s,
      medications: (s.medications ?? []).filter((m) => m.id !== id),
    }), `Deleted medication '${name}'`);
  }, [update]);

  const updateChecklistState = useCallback((
    key: "checklistSkipped" | "checklistAlreadyHave" | "hospitalChecklistPacked" | "hospitalChecklistSkipped" | "postBirthChecked",
    ids: string[]
  ) => {
    update((s) => ({ ...s, [key]: ids }));
  }, [update]);

  // ── Sync error management (S-011) ────────────────────────────────────────

  const retrySyncNow = useCallback(() => {
    // Reset failure state and trigger an immediate sync with current store
    const resetState = recordSyncSuccess();
    syncFailureRef.current = resetState;
    setSyncFailureState(resetState);
    // Trigger immediate sync using ref for latest store
    const pat = getPAT();
    const gistId = getGistId();
    if (!pat || !gistId) return;
    setAutoSyncing(true);
    pushToGist(pat, storeRef.current).then(() => {
      const newState = recordSyncSuccess();
      syncFailureRef.current = newState;
      setSyncFailureState(newState);
      onSyncSuccessAfterFailureRef.current?.();
      setAutoSyncing(false);
    }).catch((err) => {
      const newState = recordSyncFailure(INITIAL_SYNC_FAILURE_STATE, err);
      syncFailureRef.current = newState;
      setSyncFailureState(newState);
      onSyncErrorRef.current?.(newState);
      setAutoSyncing(false);
    });
  }, []);

  const dismissSyncError = useCallback(() => {
    const newState = dismissSyncWarning();
    syncFailureRef.current = newState;
    setSyncFailureState(newState);
  }, []);

  const setSyncErrorCallback = useCallback((cb: (state: SyncFailureState) => void) => {
    onSyncErrorRef.current = cb;
  }, []);

  const setSyncSuccessCallback = useCallback((cb: () => void) => {
    onSyncSuccessAfterFailureRef.current = cb;
  }, []);

  // ── External load ─────────────────────────────────────────────────────────

  const loadFromExternal = useCallback((incoming: AppStore) => {
    const merged = mergeStores(storeRef.current, incoming);
    setStore(merged);
    saveStore(merged);
    storeRef.current = merged;
    writeNewbornToLocal(merged);
    refreshStorageInfo();
  }, [refreshStorageInfo, writeNewbornToLocal]);

  // ── Memoized domain values (S-033) ──────────────────────────────────────
  // Each domain value only gets a new reference when its specific data changes.
  // This prevents downstream context consumers from re-rendering on unrelated mutations.

  const itemsValue: ItemsContextValue = useMemo(() => ({
    items: store.items,
    addItem, updateItem, deleteItem, restoreItem,
  }), [store.items, addItem, updateItem, deleteItem, restoreItem]);

  const classesValue: ClassesContextValue = useMemo(() => ({
    classes: store.classes,
    addClass, updateClass, deleteClass, restoreClass,
  }), [store.classes, addClass, updateClass, deleteClass, restoreClass]);

  const materialsValue: MaterialsContextValue = useMemo(() => ({
    materials: store.materials,
    addMaterial, updateMaterial, deleteMaterial, restoreMaterial,
  }), [store.materials, addMaterial, updateMaterial, deleteMaterial, restoreMaterial]);

  const birthPlanValue: BirthPlanContextValue = useMemo(() => ({
    birthPlan: store.birthPlan,
    updateBirthPlan,
  }), [store.birthPlan, updateBirthPlan]);

  const notesValue: NotesContextValue = useMemo(() => ({
    notes: store.notes,
    addNote, updateNote, deleteNote, restoreNote,
  }), [store.notes, addNote, updateNote, deleteNote, restoreNote]);

  const hospitalBagValue: HospitalBagContextValue = useMemo(() => ({
    hospitalBag: store.hospitalBag,
    updateBagItem, addBagItem, deleteBagItem, restoreBagItem,
  }), [store.hospitalBag, updateBagItem, addBagItem, deleteBagItem, restoreBagItem]);

  const appointmentsValue: AppointmentsContextValue = useMemo(() => ({
    appointments: store.appointments,
    addAppointment, updateAppointment, deleteAppointment, restoreAppointment,
  }), [store.appointments, addAppointment, updateAppointment, deleteAppointment, restoreAppointment]);

  const contactsValue: ContactsContextValue = useMemo(() => ({
    contacts: store.contacts,
    addContact, updateContact, deleteContact, restoreContact,
  }), [store.contacts, addContact, updateContact, deleteContact, restoreContact]);

  const contractionsValue: ContractionsContextValue = useMemo(() => ({
    contractions: store.contractions,
    addContraction, deleteContraction, clearContractions,
  }), [store.contractions, addContraction, deleteContraction, clearContractions]);

  const postBirthTasksValue: PostBirthTasksContextValue = useMemo(() => ({
    postBirthTasks: store.postBirthTasks,
    addPostBirthTask, updatePostBirthTask, deletePostBirthTask, restorePostBirthTask, setPostBirthTasks,
  }), [store.postBirthTasks, addPostBirthTask, updatePostBirthTask, deletePostBirthTask, restorePostBirthTask, setPostBirthTasks]);

  // Note: `store` is intentionally included — coreValue consumers need the full store.
  // The domain-specific contexts (itemsValue, classesValue, etc.) provide the perf wins.
  // `retrySyncNow` uses storeRef internally so it doesn't need `store` as a dep.
  const coreValue: CoreContextValue = useMemo(() => ({
    store, loaded, autoSyncing, storageInfo,
    syncFailureState, retrySyncNow, dismissSyncError,
    setSyncErrorCallback, setSyncSuccessCallback,
    registryUrl: store.registryUrl,
    updateRegistryUrl,
    updateChecklistState,
    updateReminderSettings,
    addMedication, updateMedication, deleteMedication,
    loadFromExternal,
  }), [
    store, loaded, autoSyncing, storageInfo,
    syncFailureState, retrySyncNow, dismissSyncError,
    setSyncErrorCallback, setSyncSuccessCallback,
    updateRegistryUrl,
    updateChecklistState,
    updateReminderSettings,
    addMedication, updateMedication, deleteMedication,
    loadFromExternal,
  ]);

  return {
    // Domain-specific memoized values for split contexts
    itemsValue,
    classesValue,
    materialsValue,
    birthPlanValue,
    notesValue,
    hospitalBagValue,
    appointmentsValue,
    contactsValue,
    contractionsValue,
    postBirthTasksValue,
    coreValue,

    // Flat exports for backward compatibility (useStoreContext)
    store, loaded, autoSyncing, storageInfo,
    syncFailureState, retrySyncNow, dismissSyncError,
    setSyncErrorCallback, setSyncSuccessCallback,
    addItem, updateItem, deleteItem, restoreItem,
    addClass, updateClass, deleteClass, restoreClass,
    addMaterial, updateMaterial, deleteMaterial, restoreMaterial,
    updateBirthPlan,
    addNote, updateNote, deleteNote, restoreNote,
    updateBagItem, addBagItem, deleteBagItem, restoreBagItem,
    addAppointment, updateAppointment, deleteAppointment, restoreAppointment,
    addContact, updateContact, deleteContact, restoreContact,
    addContraction, deleteContraction, clearContractions,
    addPostBirthTask, updatePostBirthTask, deletePostBirthTask, restorePostBirthTask, setPostBirthTasks,
    updateRegistryUrl,
    updateChecklistState,
    updateReminderSettings,
    addMedication, updateMedication, deleteMedication,
    loadFromExternal,
  };
}
