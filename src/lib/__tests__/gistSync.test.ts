import {
  getPAT,
  setPAT,
  getGistId,
  setGistId,
  getLastSynced,
  clearGistConfig,
  verifyPAT,
  createGist,
  updateGist,
  loadGist,
  pushToGist,
  pullFromGist,
} from '@/lib/gistSync';
import type { AppStore } from '@/types';

// ── Setup ───────────────────────────────────────────────────────────────────

const mockStore: AppStore = {
  items: [],
  classes: [],
  materials: [],
  birthPlan: {
    updatedAt: '',
    personalInfo: { legalName: '', preferredName: '', dueDate: '', currentMedications: '', allergies: '' },
    labour: {
      birthPartner: '', doula: '', otherSupportPeople: '', labourGoal: '', atmosphereNotes: '',
      comfortMeasures: { walking: false, labourBall: false, tub: false, shower: false, heat: false, ice: false, massage: false, tens: false, other: '' },
      pushingPreferences: { varietyOfPositions: false, helpWithPushing: false, selfDirected: false, other: '' },
      painMedication: { onlyIfAsked: false, offerIfNotCoping: false, offerAsSoonAsPossible: false, nitrous: false, morphineFentanyl: false, epidural: false, other: '' },
      photographyNotes: '', personalTouches: '', cordBloodBankDonation: false, cordBloodTissueBankingNotes: '', otherRequests: '',
    },
    afterBirth: {
      skinToSkin: false, cordCuttingPerson: '', feedingPlan: 'breastfeed', feedingNotes: '',
      newbornTreatments: { antibioticEyeOintment: false, vitaminKInjection: false, other: '' },
      placentaPreferences: '', circumcisionPreferences: '', visitorsPreference: '',
    },
    interventions: {
      unexpectedEvents: { includeInAllDecisions: false, partnerIncluded: false, other: '' },
      continuousMonitoring: { preferMobile: false, useShowerBath: false },
      prolongedLabour: { tryNaturalMethods: false, offerMedication: false },
      assistedBirthPreference: '', caesarianWishes: '',
      specialCareForBaby: { skinToSkinIfPossible: false, helpExpressing: false, involvedInCare: false, other: '' },
    },
    notes: '',
  },
  notes: [],
  hospitalBag: [],
  appointments: [],
  contacts: [],
  contractions: [],
  registryUrl: '',
};

// Create a proper localStorage mock
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
  vi.stubGlobal('localStorage', localStorageMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
  // Re-stub fetch after restoreAllMocks clears it
});

// ── PAT / Gist ID helpers ───────────────────────────────────────────────────

describe('PAT and config helpers', () => {
  it('getPAT returns empty string when not set', () => {
    expect(getPAT()).toBe('');
  });

  it('setPAT and getPAT round-trip correctly', () => {
    setPAT('ghp_test123');
    expect(getPAT()).toBe('ghp_test123');
  });

  it('getGistId returns empty string when not set', () => {
    expect(getGistId()).toBe('');
  });

  it('setGistId and getGistId round-trip correctly', () => {
    setGistId('abc123');
    expect(getGistId()).toBe('abc123');
  });

  it('getLastSynced returns empty string when not set', () => {
    expect(getLastSynced()).toBe('');
  });

  it('clearGistConfig removes all config keys', () => {
    setPAT('ghp_test');
    setGistId('gist123');
    clearGistConfig();
    expect(getPAT()).toBe('');
    expect(getGistId()).toBe('');
    expect(getLastSynced()).toBe('');
  });
});

// ── verifyPAT ───────────────────────────────────────────────────────────────

describe('verifyPAT', () => {
  it('returns username on successful verification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'testuser' }),
    }));

    const username = await verifyPAT('ghp_valid');
    expect(username).toBe('testuser');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer ghp_valid' }),
      }),
    );
  });

  it('throws on invalid token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(verifyPAT('bad_token')).rejects.toThrow('Invalid token');
  });
});

// ── createGist ──────────────────────────────────────────────────────────────

describe('createGist', () => {
  it('creates a gist and returns the ID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-gist-id' }),
    }));

    const id = await createGist('ghp_test', mockStore);
    expect(id).toBe('new-gist-id');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/gists',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(createGist('bad', mockStore)).rejects.toThrow('Failed to create Gist');
  });
});

// ── updateGist ──────────────────────────────────────────────────────────────

describe('updateGist', () => {
  it('updates an existing gist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    await updateGist('ghp_test', 'gist123', mockStore);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/gists/gist123',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('throws on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(updateGist('ghp_test', 'bad', mockStore)).rejects.toThrow('Failed to update Gist');
  });
});

// ── loadGist ────────────────────────────────────────────────────────────────

describe('loadGist', () => {
  it('loads and parses gist data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        files: {
          'operation-burrito.json': { content: JSON.stringify(mockStore) },
        },
      }),
    }));

    const result = await loadGist('ghp_test', 'gist123');
    expect(result.items).toEqual([]);
    expect(result.registryUrl).toBe('');
  });

  it('throws when data file is missing in gist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: {} }),
    }));

    await expect(loadGist('ghp_test', 'gist123')).rejects.toThrow('no data file');
  });

  it('throws on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadGist('ghp_test', 'bad')).rejects.toThrow('Failed to load Gist');
  });
});

// ── pushToGist ──────────────────────────────────────────────────────────────

describe('pushToGist', () => {
  it('creates a new gist when no existing ID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-id' }),
    }));

    const id = await pushToGist('ghp_test', mockStore);
    expect(id).toBe('new-id');
    // Should have saved the gist ID
    expect(getGistId()).toBe('new-id');
  });

  it('updates existing gist when ID is present', async () => {
    setGistId('existing-id');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const id = await pushToGist('ghp_test', mockStore);
    expect(id).toBe('existing-id');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/gists/existing-id',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

// ── pullFromGist ────────────────────────────────────────────────────────────

describe('pullFromGist', () => {
  it('throws when no gist ID is saved', async () => {
    await expect(pullFromGist('ghp_test')).rejects.toThrow('No Gist ID saved');
  });

  it('loads data when gist ID is present', async () => {
    setGistId('gist123');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        files: {
          'operation-burrito.json': { content: JSON.stringify(mockStore) },
        },
      }),
    }));

    const result = await pullFromGist('ghp_test');
    expect(result.items).toEqual([]);
  });
});
