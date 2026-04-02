"use client";

import { useState, useEffect, useCallback } from "react";
import { AppStore, BabyItem, BabyClass, Material, BirthPlan, Note } from "@/types";

const DEFAULT_BIRTH_PLAN_SECTIONS = [
  {
    id: "1",
    title: "Labor Environment",
    content: "",
    order: 1,
  },
  {
    id: "2",
    title: "Pain Management",
    content: "",
    order: 2,
  },
  {
    id: "3",
    title: "Labor & Delivery Preferences",
    content: "",
    order: 3,
  },
  {
    id: "4",
    title: "Immediately After Birth",
    content: "",
    order: 4,
  },
  {
    id: "5",
    title: "Newborn Care",
    content: "",
    order: 5,
  },
  {
    id: "6",
    title: "Feeding Preferences",
    content: "",
    order: 6,
  },
  {
    id: "7",
    title: "Support People",
    content: "",
    order: 7,
  },
  {
    id: "8",
    title: "Special Circumstances / Other Wishes",
    content: "",
    order: 8,
  },
];

const DEFAULT_STORE: AppStore = {
  items: [],
  classes: [],
  materials: [],
  birthPlan: {
    updatedAt: new Date().toISOString(),
    sections: DEFAULT_BIRTH_PLAN_SECTIONS,
  },
  notes: [],
};

const STORAGE_KEY = "operation-burrito-store";

function loadStore(): AppStore {
  if (typeof window === "undefined") return DEFAULT_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    return {
      items: parsed.items ?? [],
      classes: parsed.classes ?? [],
      materials: parsed.materials ?? [],
      birthPlan: parsed.birthPlan ?? DEFAULT_STORE.birthPlan,
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
  };
}
