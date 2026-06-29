import { AppStore } from "@/types";
import { validateAppStore } from "@/lib/syncValidation";
import { clearLastModifiedAt } from "@/lib/conflictDetection";
import { mergeStores } from "@/lib/storeMerge";

const GIST_FILENAME = "operation-burrito.json";
const PAT_KEY = "ob-github-pat";
const GIST_ID_KEY = "ob-gist-id";
const LAST_SYNCED_KEY = "ob-last-synced";
const DEVICE_ID_KEY = "ob-device-id";

/**
 * Stable per-device id. Each device pushes to its own gist file
 * (device-<id>.json) so two phones can never overwrite each other's push.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID().slice(0, 8);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function deviceFilename(): string {
  return `device-${getDeviceId()}.json`;
}

/**
 * Generate a fresh device id for this device. Use when two devices have ended
 * up sharing the same id (e.g. cloned storage) so they stop overwriting one
 * another's file. The next push creates a new device-<id>.json.
 */
export function resetDeviceId(): string {
  const id = crypto.randomUUID().slice(0, 8);
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

/**
 * List the data file names present in the gist (device-*.json plus any legacy
 * combined file). Lets the UI show how many devices are actively syncing.
 */
export async function listDeviceFiles(pat: string, gistId: string): Promise<string[]> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: headers(pat),
  });
  if (!res.ok) throw new Error(`Failed to list Gist files: ${res.status}`);
  const data = await res.json();
  const files = (data.files ?? {}) as Record<string, unknown>;
  return Object.keys(files).filter(
    (n) => n === GIST_FILENAME || /^device-.*\.json$/.test(n)
  );
}

// ── Local config ───────────────────────────────────────────────────────────

export function getPAT(): string {
  return localStorage.getItem(PAT_KEY) ?? "";
}
export function setPAT(pat: string) {
  localStorage.setItem(PAT_KEY, pat);
}
export function getGistId(): string {
  return localStorage.getItem(GIST_ID_KEY) ?? "";
}
export function setGistId(id: string) {
  localStorage.setItem(GIST_ID_KEY, id);
}
export function getLastSynced(): string {
  return localStorage.getItem(LAST_SYNCED_KEY) ?? "";
}
function setLastSynced() {
  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
}
export function clearGistConfig() {
  localStorage.removeItem(PAT_KEY);
  localStorage.removeItem(GIST_ID_KEY);
  localStorage.removeItem(LAST_SYNCED_KEY);
  clearLastModifiedAt();
}

// ── GitHub API helpers ─────────────────────────────────────────────────────

function headers(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

export async function verifyPAT(pat: string): Promise<string> {
  // Returns the GitHub username if valid, throws on failure
  const res = await fetch("https://api.github.com/user", {
    headers: headers(pat),
  });
  if (!res.ok) throw new Error("Invalid token — check scopes and try again.");
  const data = await res.json();
  return data.login as string;
}

// ── Gist CRUD ──────────────────────────────────────────────────────────────

/**
 * Files written on every push: this device's own file (race-free — the other
 * phone never writes it) plus the legacy combined file for compatibility.
 */
function pushFiles(store: AppStore) {
  const content = JSON.stringify(store, null, 2);
  return {
    [deviceFilename()]: { content },
    [GIST_FILENAME]: { content },
  };
}

export async function createGist(pat: string, store: AppStore): Promise<string> {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: headers(pat),
    body: JSON.stringify({
      description: "Operation Burrito — Baby Prep Data",
      public: false,
      files: pushFiles(store),
    }),
  });
  if (!res.ok) throw new Error(`Failed to create Gist: ${res.status}`);
  const data = await res.json();
  setLastSynced();
  return data.id as string;
}

export async function updateGist(pat: string, gistId: string, store: AppStore): Promise<void> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: headers(pat),
    body: JSON.stringify({ files: pushFiles(store) }),
  });
  if (!res.ok) throw new Error(`Failed to update Gist: ${res.status}`);
  setLastSynced();
}

interface GistFile {
  filename?: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

async function fileContent(file: GistFile): Promise<string | null> {
  if (file.truncated && file.raw_url) {
    const res = await fetch(file.raw_url);
    return res.ok ? res.text() : null;
  }
  return file.content ?? null;
}

function parseStore(raw: string): AppStore | null {
  try {
    const validation = validateAppStore(JSON.parse(raw));
    return validation.valid ? validation.store : null;
  } catch {
    return null;
  }
}

/**
 * Load and merge all data files in the gist: every device-*.json plus the
 * legacy combined file. Invalid/corrupt files are skipped rather than failing
 * the whole pull.
 */
export async function loadGist(pat: string, gistId: string): Promise<AppStore> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: headers(pat),
  });
  if (!res.ok) throw new Error(`Failed to load Gist: ${res.status}`);
  const data = await res.json();
  const files = (data.files ?? {}) as Record<string, GistFile>;

  const names = Object.keys(files).filter(
    (n) => n === GIST_FILENAME || /^device-.*\.json$/.test(n)
  );
  if (names.length === 0) throw new Error("Gist found but no data file inside.");

  const stores: AppStore[] = [];
  for (const name of names) {
    const raw = await fileContent(files[name]);
    if (!raw) continue;
    const store = parseStore(raw);
    if (store) stores.push(store);
  }

  if (stores.length === 0) {
    throw new Error("Gist data failed validation. The data may be corrupted.");
  }

  // Fold all device snapshots together
  let merged = stores[0];
  for (let i = 1; i < stores.length; i++) {
    merged = mergeStores(merged, stores[i]);
  }

  setLastSynced();
  return merged;
}

// ── Gist metadata ─────────────────────────────────────────────────────────

/**
 * Fetch the Gist's updated_at timestamp without downloading the full content.
 * Used for conflict detection before push.
 */
export async function fetchGistUpdatedAt(pat: string, gistId: string): Promise<string> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: headers(pat),
  });
  if (!res.ok) throw new Error(`Failed to fetch Gist metadata: ${res.status}`);
  const data = await res.json();
  return (data.updated_at as string) ?? "";
}

// ── Combined push / pull ───────────────────────────────────────────────────

export async function pushToGist(pat: string, store: AppStore): Promise<string> {
  const existing = getGistId();
  if (existing) {
    await updateGist(pat, existing, store);
    return existing;
  } else {
    const id = await createGist(pat, store);
    setGistId(id);
    return id;
  }
}

export async function pullFromGist(pat: string): Promise<AppStore> {
  const gistId = getGistId();
  if (!gistId) throw new Error("No Gist ID saved. Push your data first.");
  return loadGist(pat, gistId);
}
