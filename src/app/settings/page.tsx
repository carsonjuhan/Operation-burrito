"use client";

import { useState, useEffect } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import {
  verifyPAT,
  pushToGist,
  pullFromGist,
  getPAT,
  setPAT,
  getGistId,
  setGistId,
  getLastSynced,
  clearGistConfig,
} from "@/lib/gistSync";
import {
  Github,
  CheckCircle2,
  AlertCircle,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";

type SyncStatus = "idle" | "loading" | "success" | "error";

export default function SettingsPage() {
  const { store, loadFromExternal } = useStoreContext();

  const [pat, setPATState] = useState("");
  const [gistId, setGistIdState] = useState("");
  const [username, setUsername] = useState("");
  const [lastSynced, setLastSyncedState] = useState("");
  const [connected, setConnected] = useState(false);

  const [verifyStatus, setVerifyStatus] = useState<SyncStatus>("idle");
  const [pushStatus, setPushStatus] = useState<SyncStatus>("idle");
  const [pullStatus, setPullStatus] = useState<SyncStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmPull, setConfirmPull] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    const savedPAT = getPAT();
    const savedGistId = getGistId();
    const savedSynced = getLastSynced();
    if (savedPAT) {
      setPATState(savedPAT);
      setConnected(true);
    }
    if (savedGistId) setGistIdState(savedGistId);
    if (savedSynced) setLastSyncedState(savedSynced);
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────

  async function handleConnect() {
    if (!pat.trim()) return;
    setVerifyStatus("loading");
    setErrorMsg("");
    try {
      const login = await verifyPAT(pat.trim());
      setPAT(pat.trim());
      setUsername(login);
      setConnected(true);
      setVerifyStatus("success");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setVerifyStatus("error");
    }
  }

  function handleDisconnect() {
    clearGistConfig();
    setPATState("");
    setGistIdState("");
    setUsername("");
    setLastSyncedState("");
    setConnected(false);
    setVerifyStatus("idle");
    setConfirmDisconnect(false);
  }

  // ── Push ─────────────────────────────────────────────────────────────────

  async function handlePush() {
    setPushStatus("loading");
    setErrorMsg("");
    try {
      const id = await pushToGist(getPAT(), store);
      setGistIdState(id);
      setLastSyncedState(new Date().toISOString());
      setPushStatus("success");
      setTimeout(() => setPushStatus("idle"), 3000);
    } catch (e) {
      setErrorMsg((e as Error).message);
      setPushStatus("error");
    }
  }

  // ── Pull ─────────────────────────────────────────────────────────────────

  async function handlePull() {
    if (!confirmPull) {
      setConfirmPull(true);
      return;
    }
    setPullStatus("loading");
    setErrorMsg("");
    setConfirmPull(false);
    try {
      const remoteStore = await pullFromGist(getPAT());
      loadFromExternal(remoteStore);
      setLastSyncedState(new Date().toISOString());
      setPullStatus("success");
      setTimeout(() => setPullStatus("idle"), 3000);
    } catch (e) {
      setErrorMsg((e as Error).message);
      setPullStatus("error");
    }
  }

  // ── Manual Gist ID entry ──────────────────────────────────────────────────

  function handleSaveGistId() {
    setGistId(gistId.trim());
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">Settings</h1>
        <p className="text-sm text-stone-400 mt-1">Manage data backup and sync via GitHub Gist.</p>
      </div>

      {/* How it works */}
      <div className="card p-4 mb-6 flex items-start gap-3 bg-sky-50 border-sky-100">
        <Info size={16} className="text-sky-500 mt-0.5 shrink-0" />
        <div className="text-sm text-sky-700 space-y-1">
          <p className="font-medium">How GitHub Gist sync works</p>
          <p>Your data is saved as a private secret Gist on your GitHub account — only you can see it. Push saves your current data to GitHub. Pull loads it back (e.g. on a new device).</p>
          <p>You need a GitHub Personal Access Token with <code className="bg-sky-100 px-1 rounded text-xs">gist</code> scope.</p>
        </div>
      </div>

      {/* Step 1 — Token */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Github size={18} className="text-stone-600" />
          <h2 className="text-sm font-semibold text-stone-700">
            {connected ? "GitHub Connected" : "Step 1 — Connect GitHub"}
          </h2>
          {connected && <CheckCircle2 size={16} className="text-emerald-500" />}
        </div>

        {!connected ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-500">
              Create a token at{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=gist&description=Operation+Burrito"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:underline inline-flex items-center gap-1"
              >
                github.com/settings/tokens <ExternalLink size={11} />
              </a>{" "}
              — select only the <strong>gist</strong> scope, then paste it below.
            </p>
            <div className="flex gap-2">
              <input
                className="input flex-1 font-mono text-xs"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={pat}
                onChange={(e) => { setPATState(e.target.value); setVerifyStatus("idle"); }}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
              <button
                onClick={handleConnect}
                disabled={verifyStatus === "loading" || !pat.trim()}
                className="btn-primary shrink-0"
              >
                {verifyStatus === "loading" ? <Loader2 size={16} className="animate-spin" /> : "Connect"}
              </button>
            </div>
            {verifyStatus === "error" && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={13} /> {errorMsg}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-700">
                Signed in as <span className="font-semibold">@{username || "GitHub user"}</span>
              </p>
              {lastSynced && (
                <p className="text-xs text-stone-400 mt-0.5">
                  Last synced {new Date(lastSynced).toLocaleString()}
                </p>
              )}
            </div>
            {confirmDisconnect ? (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-stone-500">Are you sure?</span>
                <button onClick={handleDisconnect} className="btn-danger text-xs">Yes, disconnect</button>
                <button onClick={() => setConfirmDisconnect(false)} className="btn-secondary text-xs">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDisconnect(true)} className="btn-secondary text-xs">
                <Trash2 size={13} /> Disconnect
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step 2 — Sync */}
      {connected && (
        <div className="card p-5 mb-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Step 2 — Sync Data</h2>

          {gistId && (
            <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
              <p className="text-xs text-stone-400 mb-1">Gist ID</p>
              <p className="text-xs font-mono text-stone-600 break-all">{gistId}</p>
              <a
                href={`https://gist.github.com/${gistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1 mt-1"
              >
                View on GitHub <ExternalLink size={11} />
              </a>
            </div>
          )}

          <div className="flex gap-3">
            {/* Push */}
            <button
              onClick={handlePush}
              disabled={pushStatus === "loading"}
              className="btn-primary flex-1 justify-center"
            >
              {pushStatus === "loading" ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : pushStatus === "success" ? (
                <><CheckCircle2 size={16} /> Saved!</>
              ) : (
                <><Upload size={16} /> Push to GitHub</>
              )}
            </button>

            {/* Pull */}
            <button
              onClick={handlePull}
              disabled={pullStatus === "loading" || !gistId}
              className={`flex-1 justify-center ${confirmPull ? "btn-danger" : "btn-secondary"}`}
            >
              {pullStatus === "loading" ? (
                <><Loader2 size={16} className="animate-spin" /> Loading…</>
              ) : pullStatus === "success" ? (
                <><CheckCircle2 size={16} /> Loaded!</>
              ) : confirmPull ? (
                <><Download size={16} /> Confirm — overwrites local data</>
              ) : (
                <><Download size={16} /> Pull from GitHub</>
              )}
            </button>
          </div>

          {confirmPull && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle size={13} /> This will replace all local data with the version on GitHub. Click again to confirm.
            </p>
          )}

          {(pushStatus === "error" || pullStatus === "error") && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle size={13} /> {errorMsg}
            </p>
          )}

          <p className="text-xs text-stone-400 mt-3">
            <strong>Push</strong> — saves current app data to GitHub (creates a new Gist on first use, updates it after).
            <br />
            <strong>Pull</strong> — loads data from GitHub and replaces local data. Use this on a new device.
          </p>
        </div>
      )}

      {/* Step 2b — Existing Gist ID (new device flow) */}
      {connected && !gistId && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">Already have a Gist?</h2>
          <p className="text-xs text-stone-400 mb-3">
            If you pushed from another device, enter the Gist ID to load that data.
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono text-xs"
              placeholder="e.g. a1b2c3d4e5f6..."
              value={gistId}
              onChange={(e) => setGistIdState(e.target.value)}
            />
            <button onClick={handleSaveGistId} className="btn-secondary shrink-0" disabled={!gistId.trim()}>
              Save ID
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
