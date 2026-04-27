"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  AppStore, BabyItem, BabyClass, Material, BirthPlan, Note,
  BagItem, Appointment, Contact, Contraction,
} from "@/types";
import { getPAT, getGistId, pushToGist } from "@/lib/gistSync";
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
    currentMedications: "G6PD - please note reduced blood procedures if needed",
    allergies: "",
  },
  labour: {
    birthPartner: "Juhan",
    doula: "",
    otherSupportPeople: "",
    labourGoal: "Natural birth",
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
  registryUrl: "",
  checklistSkipped: [],
  checklistAlreadyHave: [],
  hospitalChecklistPacked: [],
  hospitalChecklistSkipped: [],
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
    const birthPlan =
      storedPlan && typeof storedPlan === "object" && !("sections" in (storedPlan as object))
        ? (storedPlan as AppStore["birthPlan"])
        : DEFAULT_STORE.birthPlan;
    // Migrate checklist state from separate localStorage keys if not yet in store
    const migrateList = (storeVal: string[] | undefined, lsKey: string): string[] => {
      if (storeVal && storeVal.length > 0) return storeVal;
      try {
        const raw = localStorage.getItem(lsKey);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
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
      registryUrl: parsed.registryUrl ?? "",
      checklistSkipped: migrateList(parsed.checklistSkipped, "checklist-skipped"),
      checklistAlreadyHave: migrateList(parsed.checklistAlreadyHave, "checklist-already-have"),
      hospitalChecklistPacked: migrateList(parsed.hospitalChecklistPacked, "hospital-checklist-packed"),
      hospitalChecklistSkipped: migrateList(parsed.hospitalChecklistSkipped, "hospital-checklist-skipped"),
    };
  } catch {
    return DEFAULT_STORE;
  }
}

function saveStore(store: AppStore): boolean {
  if (typeof window === "undefined") return true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
  clearContractions: () => void;
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
  updateChecklistState: (key: "checklistSkipped" | "checklistAlreadyHave" | "hospitalChecklistPacked" | "hospitalChecklistSkipped", ids: string[]) => void;
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

  const triggerAutoSync = useCallback((nextStore: AppStore) => {
    const pat = getPAT();
    const gistId = getGistId();
    if (!pat || !gistId) return;
    // Skip if auto-sync is paused due to repeated failures
    if (syncFailureRef.current.isPaused) return;
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(async () => {
      setAutoSyncing(true);
      try {
        await pushToGist(pat, nextStore);
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
    }, 5000); // debounce 5 seconds
  }, []);

  const update = useCallback((updater: (prev: AppStore) => AppStore, description?: string) => {
    setStore((prev) => {
      if (description) {
        recordAction(description, prev);
      }
      const now = new Date().toISOString();
      const next = { ...updater(prev), lastModifiedAt: now };
      saveStore(next);
      setLastModifiedAt(now);
      triggerAutoSync(next);
      refreshStorageInfo();
      storeRef.current = next;
      return next;
    });
  }, [triggerAutoSync, refreshStorageInfo]);

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

  const clearContractions = useCallback(() => {
    update((s) => ({ ...s, contractions: [] }));
  }, [update]);

  // ── Registry URL ──────────────────────────────────────────────────────────

  const updateRegistryUrl = useCallback((url: string) => {
    update((s) => ({ ...s, registryUrl: url }));
  }, [update]);

  const updateChecklistState = useCallback((
    key: "checklistSkipped" | "checklistAlreadyHave" | "hospitalChecklistPacked" | "hospitalChecklistSkipped",
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
    setStore(incoming);
    saveStore(incoming);
    refreshStorageInfo();
  }, [refreshStorageInfo]);

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
    addContraction, clearContractions,
  }), [store.contractions, addContraction, clearContractions]);

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
    loadFromExternal,
  }), [
    store, loaded, autoSyncing, storageInfo,
    syncFailureState, retrySyncNow, dismissSyncError,
    setSyncErrorCallback, setSyncSuccessCallback,
    updateRegistryUrl,
    updateChecklistState,
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
    addContraction, clearContractions,
    updateRegistryUrl,
    updateChecklistState,
    loadFromExternal,
  };
}
