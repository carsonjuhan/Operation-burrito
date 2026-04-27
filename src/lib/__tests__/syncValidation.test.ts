import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  validateAppStore,
  savePrePullSnapshot,
  getPrePullSnapshot,
  clearPrePullSnapshot,
  hasPrePullSnapshot,
  SNAPSHOT_KEY,
} from "@/lib/syncValidation";
import { DEFAULT_STORE } from "@/hooks/useStore";
import type { AppStore } from "@/types";

// ── localStorage mock ─────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

beforeAll(() => {
  vi.stubGlobal("localStorage", localStorageMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ── Helpers ───────────────────────────────────────────────────────────────

const validStore: AppStore = {
  items: [
    {
      id: "i1",
      name: "Crib",
      category: "Nursery",
      priority: "Must Have",
      purchased: false,
      notes: "",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
  classes: [],
  materials: [],
  birthPlan: {
    updatedAt: "2026-01-01T00:00:00Z",
    personalInfo: {
      legalName: "Jane",
      preferredName: "Jane",
      dueDate: "2026-06-01",
      currentMedications: "",
      allergies: "",
    },
    labour: {
      birthPartner: "John",
      doula: "",
      otherSupportPeople: "",
      labourGoal: "Natural",
      atmosphereNotes: "",
      comfortMeasures: {
        walking: false, labourBall: false, tub: false, shower: false,
        heat: false, ice: false, massage: false, tens: false, other: "",
      },
      pushingPreferences: {
        varietyOfPositions: false, helpWithPushing: false, selfDirected: false, other: "",
      },
      painMedication: {
        onlyIfAsked: false, offerIfNotCoping: false, offerAsSoonAsPossible: false,
        nitrous: false, morphineFentanyl: false, epidural: false, other: "",
      },
      photographyNotes: "",
      personalTouches: "",
      cordBloodBankDonation: false,
      cordBloodTissueBankingNotes: "",
      otherRequests: "",
    },
    afterBirth: {
      skinToSkin: true,
      cordCuttingPerson: "John",
      feedingPlan: "breastfeed",
      feedingNotes: "",
      newbornTreatments: { antibioticEyeOintment: false, vitaminKInjection: true, other: "" },
      placentaPreferences: "",
      circumcisionPreferences: "",
      visitorsPreference: "",
    },
    interventions: {
      unexpectedEvents: { includeInAllDecisions: true, partnerIncluded: true, other: "" },
      continuousMonitoring: { preferMobile: false, useShowerBath: false },
      prolongedLabour: { tryNaturalMethods: true, offerMedication: false },
      assistedBirthPreference: "",
      caesarianWishes: "",
      specialCareForBaby: {
        skinToSkinIfPossible: true, helpExpressing: false, involvedInCare: true, other: "",
      },
    },
    notes: "",
  },
  notes: [],
  hospitalBag: [],
  appointments: [],
  contacts: [],
  contractions: [],
  registryUrl: "https://amazon.ca/registry/123",
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe("validateAppStore", () => {
  it("accepts a complete valid AppStore", () => {
    const result = validateAppStore(validStore);
    expect(result.valid).toBe(true);
    expect(result.store).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.store!.items).toHaveLength(1);
    expect(result.store!.registryUrl).toBe("https://amazon.ca/registry/123");
  });

  it("rejects null", () => {
    const result = validateAppStore(null);
    expect(result.valid).toBe(false);
    expect(result.store).toBeNull();
    expect(result.errors[0]).toContain("null");
  });

  it("rejects undefined", () => {
    const result = validateAppStore(undefined);
    expect(result.valid).toBe(false);
    expect(result.store).toBeNull();
  });

  it("rejects a string", () => {
    const result = validateAppStore("hello");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("string");
  });

  it("rejects a number", () => {
    const result = validateAppStore(42);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("number");
  });

  it("rejects an array", () => {
    const result = validateAppStore([1, 2, 3]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("array");
  });

  it("fills missing array fields with defaults", () => {
    const partial = { birthPlan: validStore.birthPlan, registryUrl: "" };
    const result = validateAppStore(partial);
    expect(result.valid).toBe(true);
    expect(result.store).not.toBeNull();
    expect(result.store!.items).toEqual([]);
    expect(result.store!.classes).toEqual([]);
    expect(result.store!.notes).toEqual([]);
    expect(result.store!.hospitalBag.length).toBeGreaterThan(0); // default bag items
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("items"))).toBe(true);
  });

  it("fills missing birthPlan with default", () => {
    const partial = { items: [], classes: [], materials: [], notes: [], hospitalBag: [], appointments: [], contacts: [], contractions: [] };
    const result = validateAppStore(partial);
    expect(result.valid).toBe(true);
    expect(result.store!.birthPlan).toBeDefined();
    expect(result.store!.birthPlan.personalInfo).toBeDefined();
    expect(result.warnings.some((w) => w.includes("birthPlan"))).toBe(true);
  });

  it("fills missing registryUrl with empty string", () => {
    const partial = {
      items: [], classes: [], materials: [], notes: [],
      hospitalBag: [], appointments: [], contacts: [], contractions: [],
      birthPlan: validStore.birthPlan,
    };
    const result = validateAppStore(partial);
    expect(result.valid).toBe(true);
    expect(result.store!.registryUrl).toBe("");
  });

  it("converts non-string registryUrl", () => {
    const data = {
      ...validStore,
      registryUrl: 123,
    };
    const result = validateAppStore(data);
    expect(result.valid).toBe(true);
    expect(result.store!.registryUrl).toBe("123");
    expect(result.warnings.some((w) => w.includes("registryUrl"))).toBe(true);
  });

  it("errors when an array field has wrong type", () => {
    const data = { ...validStore, items: "not-an-array" };
    const result = validateAppStore(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("items"))).toBe(true);
  });

  it("errors when birthPlan is an array", () => {
    const data = { ...validStore, birthPlan: [1, 2] };
    const result = validateAppStore(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("birthPlan"))).toBe(true);
  });

  it("preserves extra unknown fields for forward compatibility", () => {
    const data = { ...validStore, futureField: "hello", anotherField: 42 };
    const result = validateAppStore(data);
    expect(result.valid).toBe(true);
    const raw = result.store as unknown as Record<string, unknown>;
    expect(raw.futureField).toBe("hello");
    expect(raw.anotherField).toBe(42);
  });

  it("deep-fills missing birthPlan sub-fields", () => {
    const data = {
      ...validStore,
      birthPlan: {
        updatedAt: "2026-01-01T00:00:00Z",
        personalInfo: { legalName: "Custom" },
        // Missing labour, afterBirth, interventions, notes
      },
    };
    const result = validateAppStore(data);
    expect(result.valid).toBe(true);
    expect(result.store!.birthPlan.personalInfo.legalName).toBe("Custom");
    expect(result.store!.birthPlan.labour).toBeDefined();
    expect(result.store!.birthPlan.afterBirth).toBeDefined();
    expect(result.store!.birthPlan.interventions).toBeDefined();
  });

  it("accepts an empty object and fills all defaults", () => {
    const result = validateAppStore({});
    expect(result.valid).toBe(true);
    expect(result.store).not.toBeNull();
    expect(result.store!.items).toEqual([]);
    expect(result.store!.birthPlan).toBeDefined();
    expect(result.store!.registryUrl).toBe("");
    expect(result.warnings.length).toBeGreaterThan(5);
  });
});

// ── Snapshot tests ────────────────────────────────────────────────────────

describe("Pre-pull snapshot management", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("saves and retrieves a snapshot", () => {
    savePrePullSnapshot(validStore);
    const snapshot = getPrePullSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.items).toHaveLength(1);
    expect(snapshot!.registryUrl).toBe("https://amazon.ca/registry/123");
  });

  it("returns null when no snapshot exists", () => {
    expect(getPrePullSnapshot()).toBeNull();
  });

  it("clears the snapshot", () => {
    savePrePullSnapshot(validStore);
    expect(hasPrePullSnapshot()).toBe(true);
    clearPrePullSnapshot();
    expect(hasPrePullSnapshot()).toBe(false);
    expect(getPrePullSnapshot()).toBeNull();
  });

  it("hasPrePullSnapshot returns correct boolean", () => {
    expect(hasPrePullSnapshot()).toBe(false);
    savePrePullSnapshot(validStore);
    expect(hasPrePullSnapshot()).toBe(true);
  });

  it("uses the correct localStorage key", () => {
    savePrePullSnapshot(validStore);
    expect(localStorage.getItem(SNAPSHOT_KEY)).not.toBeNull();
  });
});
