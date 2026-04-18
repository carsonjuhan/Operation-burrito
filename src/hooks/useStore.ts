"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AppStore, BabyItem, BabyClass, Material, BirthPlan, Note,
  BagItem, Appointment, Contact, Contraction,
} from "@/types";
import { getPAT, getGistId, pushToGist } from "@/lib/gistSync";

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_BIRTH_PLAN: AppStore["birthPlan"] = {
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

const DEFAULT_BAG_ITEMS: BagItem[] = [
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

const DEFAULT_STORE: AppStore = {
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
    };
  } catch {
    return DEFAULT_STORE;
  }
}

function saveStore(store: AppStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useStore() {
  const [store, setStore] = useState<AppStore>(DEFAULT_STORE);
  const [loaded, setLoaded] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStore(loadStore());
    setLoaded(true);
  }, []);

  const triggerAutoSync = useCallback((nextStore: AppStore) => {
    const pat = getPAT();
    const gistId = getGistId();
    if (!pat || !gistId) return;
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(async () => {
      setAutoSyncing(true);
      try { await pushToGist(pat, nextStore); } catch { /* silent */ }
      setAutoSyncing(false);
    }, 5000); // debounce 5 seconds
  }, []);

  const update = useCallback((updater: (prev: AppStore) => AppStore) => {
    setStore((prev) => {
      const next = updater(prev);
      saveStore(next);
      triggerAutoSync(next);
      return next;
    });
  }, [triggerAutoSync]);

  // ── Items ────────────────────────────────────────────────────────────────

  const addItem = useCallback((item: Omit<BabyItem, "id" | "createdAt">) => {
    update((s) => ({ ...s, items: [...s.items, { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }));
  }, [update]);

  const updateItem = useCallback((id: string, changes: Partial<BabyItem>) => {
    update((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }));
  }, [update]);

  const deleteItem = useCallback((id: string) => {
    update((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  }, [update]);

  // ── Classes ──────────────────────────────────────────────────────────────

  const addClass = useCallback((cls: Omit<BabyClass, "id" | "createdAt">) => {
    update((s) => ({ ...s, classes: [...s.classes, { ...cls, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }));
  }, [update]);

  const updateClass = useCallback((id: string, changes: Partial<BabyClass>) => {
    update((s) => ({ ...s, classes: s.classes.map((c) => (c.id === id ? { ...c, ...changes } : c)) }));
  }, [update]);

  const deleteClass = useCallback((id: string) => {
    update((s) => ({ ...s, classes: s.classes.filter((c) => c.id !== id) }));
  }, [update]);

  // ── Materials ────────────────────────────────────────────────────────────

  const addMaterial = useCallback((mat: Omit<Material, "id" | "createdAt">) => {
    update((s) => ({ ...s, materials: [...s.materials, { ...mat, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }));
  }, [update]);

  const updateMaterial = useCallback((id: string, changes: Partial<Material>) => {
    update((s) => ({ ...s, materials: s.materials.map((m) => (m.id === id ? { ...m, ...changes } : m)) }));
  }, [update]);

  const deleteMaterial = useCallback((id: string) => {
    update((s) => ({ ...s, materials: s.materials.filter((m) => m.id !== id) }));
  }, [update]);

  // ── Birth Plan ───────────────────────────────────────────────────────────

  const updateBirthPlan = useCallback((plan: BirthPlan) => {
    update((s) => ({ ...s, birthPlan: { ...plan, updatedAt: new Date().toISOString() } }));
  }, [update]);

  // ── Notes ────────────────────────────────────────────────────────────────

  const addNote = useCallback((note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    update((s) => ({ ...s, notes: [...s.notes, { ...note, id: crypto.randomUUID(), createdAt: now, updatedAt: now }] }));
  }, [update]);

  const updateNote = useCallback((id: string, changes: Partial<Note>) => {
    update((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n)) }));
  }, [update]);

  const deleteNote = useCallback((id: string) => {
    update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
  }, [update]);

  // ── Hospital Bag ─────────────────────────────────────────────────────────

  const updateBagItem = useCallback((id: string, changes: Partial<BagItem>) => {
    update((s) => ({ ...s, hospitalBag: s.hospitalBag.map((b) => (b.id === id ? { ...b, ...changes } : b)) }));
  }, [update]);

  const addBagItem = useCallback((item: Omit<BagItem, "id">) => {
    update((s) => ({ ...s, hospitalBag: [...s.hospitalBag, { ...item, id: crypto.randomUUID() }] }));
  }, [update]);

  const deleteBagItem = useCallback((id: string) => {
    update((s) => ({ ...s, hospitalBag: s.hospitalBag.filter((b) => b.id !== id) }));
  }, [update]);

  // ── Appointments ─────────────────────────────────────────────────────────

  const addAppointment = useCallback((appt: Omit<Appointment, "id" | "createdAt">) => {
    update((s) => ({ ...s, appointments: [...s.appointments, { ...appt, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }));
  }, [update]);

  const updateAppointment = useCallback((id: string, changes: Partial<Appointment>) => {
    update((s) => ({ ...s, appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...changes } : a)) }));
  }, [update]);

  const deleteAppointment = useCallback((id: string) => {
    update((s) => ({ ...s, appointments: s.appointments.filter((a) => a.id !== id) }));
  }, [update]);

  // ── Contacts ─────────────────────────────────────────────────────────────

  const addContact = useCallback((contact: Omit<Contact, "id" | "createdAt">) => {
    update((s) => ({ ...s, contacts: [...s.contacts, { ...contact, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] }));
  }, [update]);

  const updateContact = useCallback((id: string, changes: Partial<Contact>) => {
    update((s) => ({ ...s, contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...changes } : c)) }));
  }, [update]);

  const deleteContact = useCallback((id: string) => {
    update((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) }));
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

  // ── External load ─────────────────────────────────────────────────────────

  const loadFromExternal = useCallback((incoming: AppStore) => {
    setStore(incoming);
    saveStore(incoming);
  }, []);

  return {
    store, loaded, autoSyncing,
    addItem, updateItem, deleteItem,
    addClass, updateClass, deleteClass,
    addMaterial, updateMaterial, deleteMaterial,
    updateBirthPlan,
    addNote, updateNote, deleteNote,
    updateBagItem, addBagItem, deleteBagItem,
    addAppointment, updateAppointment, deleteAppointment,
    addContact, updateContact, deleteContact,
    addContraction, clearContractions,
    updateRegistryUrl,
    loadFromExternal,
  };
}
