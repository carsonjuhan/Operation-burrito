import { AppStore } from "@/types";

const GIST_FILENAME = "operation-burrito.json";
const PAT_KEY = "ob-github-pat";
const GIST_ID_KEY = "ob-gist-id";
const LAST_SYNCED_KEY = "ob-last-synced";

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

export async function createGist(pat: string, store: AppStore): Promise<string> {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: headers(pat),
    body: JSON.stringify({
      description: "Operation Burrito — Baby Prep Data",
      public: false,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(store, null, 2) },
      },
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
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(store, null, 2) },
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to update Gist: ${res.status}`);
  setLastSynced();
}

export async function loadGist(pat: string, gistId: string): Promise<AppStore> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: headers(pat),
  });
  if (!res.ok) throw new Error(`Failed to load Gist: ${res.status}`);
  const data = await res.json();
  const raw = data.files?.[GIST_FILENAME]?.content;
  if (!raw) throw new Error("Gist found but no data file inside.");
  setLastSynced();
  return JSON.parse(raw) as AppStore;
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
