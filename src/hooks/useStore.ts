"use client";

import { useState, useEffect, useCallback } from "react";
import { AppStore, BabyItem, BabyClass, Material, BirthPlan, Note } from "@/types";

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
    comfortMeasures: {
      walking: false,
      labourBall: false,
      tub: false,
      shower: false,
      heat: false,
      ice: false,
      massage: false,
      tens: false,
      other: "",
    },
    pushingPreferences: {
      varietyOfPositions: false,
      helpWithPushing: false,
      selfDirected: false,
      other: "",
    },
    painMedication: {
      onlyIfAsked: false,
      offerIfNotCoping: false,
      offerAsSoonAsPossible: false,
      nitrous: false,
      morphineFentanyl: false,
      epidural: false,
      other: "",
    },
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
    newbornTreatments: {
      antibioticEyeOintment: false,
      vitaminKInjection: false,
      other: "",
    },
    placentaPreferences: "",
    circumcisionPreferences: "",
    visitorsPreference: "",
  },
  interventions: {
    unexpectedEvents: {
      includeInAllDecisions: false,
      partnerIncluded: false,
      other: "",
    },
    continuousMonitoring: {
      preferMobile: false,
      useShowerBath: false,
    },
    prolongedLabour: {
      tryNaturalMethods: false,
      offerMedication: false,
    },
    assistedBirthPreference: "",
    caesarianWishes: "",
    specialCareForBaby: {
      skinToSkinIfPossible: false,
      helpExpressing: false,
      involvedInCare: false,
      other: "",
    },
  },
  notes: "",
};

const DEFAULT_STORE: AppStore = {
  items: [],
  classes: [],
  materials: [],
  birthPlan: DEFAULT_BIRTH_PLAN,
  notes: [],
};

const STORAGE_KEY = "operation-burrito-store";

function loadStore(): AppStore {
  if (typeof window === "undefined") return DEFAULT_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    // Migrate old birth plan format (sections array) to new structured format
    const storedPlan = parsed.birthPlan as unknown;
    const birthPlan =
      storedPlan &&
      typeof storedPlan === "object" &&
      !("sections" in (storedPlan as object))
        ? (storedPlan as AppStore["birthPlan"])
        : DEFAULT_STORE.birthPlan;
    return {
      items: parsed.items ?? [],
      classes: parsed.classes ?? [],
      materials: parsed.materials ?? [],
      birthPlan,
      notes: parsed.notes ?? [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

function saveStore(store: AppStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useStore() {
  const [store, setStore] = useState<AppStore>(DEFAULT_STORE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setLoaded(true);
  }, []);

  const update = useCallback((updater: (prev: AppStore) => AppStore) => {
    setStore((prev) => {
      const next = updater(prev);
      saveStore(next);
      return next;
    });
  }, []);

  // ── Items ────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    (item: Omit<BabyItem, "id" | "createdAt">) => {
      update((s) => ({
        ...s,
        items: [
          ...s.items,
          { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [update]
  );

  const updateItem = useCallback(
    (id: string, changes: Partial<BabyItem>) => {
      update((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === id ? { ...i, ...changes } : i)),
      }));
    },
    [update]
  );

  const deleteItem = useCallback(
    (id: string) => {
      update((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
    },
    [update]
  );

  // ── Classes ──────────────────────────────────────────────────────────────

  const addClass = useCallback(
    (cls: Omit<BabyClass, "id" | "createdAt">) => {
      update((s) => ({
        ...s,
        classes: [
          ...s.classes,
          { ...cls, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [update]
  );

  const updateClass = useCallback(
    (id: string, changes: Partial<BabyClass>) => {
      update((s) => ({
        ...s,
        classes: s.classes.map((c) => (c.id === id ? { ...c, ...changes } : c)),
      }));
    },
    [update]
  );

  const deleteClass = useCallback(
    (id: string) => {
      update((s) => ({ ...s, classes: s.classes.filter((c) => c.id !== id) }));
    },
    [update]
  );

  // ── Materials ────────────────────────────────────────────────────────────

  const addMaterial = useCallback(
    (mat: Omit<Material, "id" | "createdAt">) => {
      update((s) => ({
        ...s,
        materials: [
          ...s.materials,
          { ...mat, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [update]
  );

  const updateMaterial = useCallback(
    (id: string, changes: Partial<Material>) => {
      update((s) => ({
        ...s,
        materials: s.materials.map((m) => (m.id === id ? { ...m, ...changes } : m)),
      }));
    },
    [update]
  );

  const deleteMaterial = useCallback(
    (id: string) => {
      update((s) => ({ ...s, materials: s.materials.filter((m) => m.id !== id) }));
    },
    [update]
  );

  // ── Birth Plan ───────────────────────────────────────────────────────────

  const updateBirthPlan = useCallback(
    (plan: BirthPlan) => {
      update((s) => ({ ...s, birthPlan: { ...plan, updatedAt: new Date().toISOString() } }));
    },
    [update]
  );

  // ── Notes ────────────────────────────────────────────────────────────────

  const addNote = useCallback(
    (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      update((s) => ({
        ...s,
        notes: [
          ...s.notes,
          { ...note, id: crypto.randomUUID(), createdAt: now, updatedAt: now },
        ],
      }));
    },
    [update]
  );

  const updateNote = useCallback(
    (id: string, changes: Partial<Note>) => {
      update((s) => ({
        ...s,
        notes: s.notes.map((n) =>
          n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n
        ),
      }));
    },
    [update]
  );

  const deleteNote = useCallback(
    (id: string) => {
      update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
    },
    [update]
  );

  // ── External load (GitHub Gist pull) ─────────────────────────────────────

  const loadFromExternal = useCallback((incoming: AppStore) => {
    setStore(incoming);
    saveStore(incoming);
  }, []);

  return {
    store,
    loaded,
    // items
    addItem,
    updateItem,
    deleteItem,
    // classes
    addClass,
    updateClass,
    deleteClass,
    // materials
    addMaterial,
    updateMaterial,
    deleteMaterial,
    // birth plan
    updateBirthPlan,
    // notes
    addNote,
    updateNote,
    deleteNote,
    // external sync
    loadFromExternal,
  };
}
