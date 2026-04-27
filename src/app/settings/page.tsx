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
  fetchGistUpdatedAt,
} from "@/lib/gistSync";
import {
  hasLocalChanges,
  hasRemoteChanges,
  formatTimestamp,
  getLastModifiedAt,
  type ConflictInfo,
} from "@/lib/conflictDetection";
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
  ShoppingBag,
  HardDrive,
  AlertTriangle,
  RotateCcw,
  FileDown,
  FileUp,
} from "lucide-react";
import {
  savePrePullSnapshot,
  getPrePullSnapshot,
  clearPrePullSnapshot,
  hasPrePullSnapshot,
} from "@/lib/syncValidation";
import { STORAGE_LIMIT_BYTES } from "@/lib/storageMonitor";
import { exportStoreAsJSON, parseImportFile } from "@/lib/dataImportExport";
import { PageTransition } from "@/components/PageTransition";
import { ReminderSettings } from "@/components/ReminderSettings";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ActionHistory } from "@/components/ActionHistory";
import { useActionHistory } from "@/hooks/useActionHistory";

type SyncStatus = "idle" | "loading" | "success" | "error";

export default function SettingsPage() {
  const { store, loadFromExternal, updateRegistryUrl, storageInfo } = useStoreContext();
  const { history, revertTo, clearHistory: clearActionHistory } = useActionHistory(loadFromExternal);

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
  const [registryInput, setRegistryInput] = useState(store.registryUrl ?? "");
  const [hasSnapshot, setHasSnapshot] = useState(false);

  // Conflict detection state (S-008)
  const [pullConflict, setPullConflict] = useState<ConflictInfo | null>(null);
  const [pushConflict, setPushConflict] = useState<ConflictInfo | null>(null);

  // Import/export state
  const [importStatus, setImportStatus] = useState<"idle" | "confirm" | "success" | "error">("idle");
  const [importErrorMsg, setImportErrorMsg] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<import("@/types").AppStore | null>(null);
  const [exportDone, setExportDone] = useState(false);

  // Check for existing snapshot on mount
  useEffect(() => {
    setHasSnapshot(hasPrePullSnapshot());
  }, []);

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
    // If a conflict dialog is already showing, the user clicked "Proceed" — skip the check
    if (!pushConflict) {
      // Check for remote changes before pushing
      const savedGistId = getGistId();
      const savedLastSynced = getLastSynced();
      if (savedGistId && savedLastSynced) {
        setPushStatus("loading");
        setErrorMsg("");
        try {
          const remoteUpdatedAt = await fetchGistUpdatedAt(getPAT(), savedGistId);
          if (hasRemoteChanges(remoteUpdatedAt, savedLastSynced)) {
            setPushStatus("idle");
            setPushConflict({
              type: "remote-changes-on-push",
              localModifiedAt: getLastModifiedAt(),
              remoteUpdatedAt,
              lastSynced: savedLastSynced,
            });
            return;
          }
        } catch (e) {
          // If we can't check remote, proceed with push anyway
          console.warn("Could not check remote Gist timestamp:", (e as Error).message);
        }
      }
    }

    setPushConflict(null);
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

  function handlePushCancel() {
    setPushConflict(null);
  }

  // ── Pull ─────────────────────────────────────────────────────────────────

  async function handlePull() {
    // Step 1: Check for local changes before pulling (conflict detection)
    if (!pullConflict && !confirmPull) {
      const savedLastSynced = getLastSynced();
      const localModified = getLastModifiedAt();
      if (hasLocalChanges(savedLastSynced, localModified)) {
        setPullConflict({
          type: "local-changes-on-pull",
          localModifiedAt: localModified,
          remoteUpdatedAt: "",
          lastSynced: savedLastSynced,
        });
        return;
      }
      // No conflict — show the standard overwrite confirmation
      setConfirmPull(true);
      return;
    }

    // Step 2: If conflict dialog was shown and user proceeded, show standard confirm
    if (pullConflict && !confirmPull) {
      setPullConflict(null);
      setConfirmPull(true);
      return;
    }

    // Step 3: User confirmed — execute the pull
    setPullStatus("loading");
    setErrorMsg("");
    setConfirmPull(false);
    setPullConflict(null);
    try {
      // Save a pre-pull snapshot for recovery
      savePrePullSnapshot(store);
      setHasSnapshot(true);

      const remoteStore = await pullFromGist(getPAT());
      loadFromExternal(remoteStore);
      setLastSyncedState(new Date().toISOString());
      setPullStatus("success");
      // Clear snapshot on successful pull after a delay
      setTimeout(() => {
        setPullStatus("idle");
        clearPrePullSnapshot();
        setHasSnapshot(false);
      }, 5000);
    } catch (e) {
      setErrorMsg((e as Error).message);
      setPullStatus("error");
      // Snapshot is preserved so user can restore
    }
  }

  function handlePullConflictCancel() {
    setPullConflict(null);
    setConfirmPull(false);
  }

  function handleRestoreSnapshot() {
    const snapshot = getPrePullSnapshot();
    if (snapshot) {
      loadFromExternal(snapshot);
      clearPrePullSnapshot();
      setHasSnapshot(false);
      setPullStatus("idle");
      setErrorMsg("");
    }
  }

  // ── Manual Gist ID entry ──────────────────────────────────────────────────

  function handleSaveGistId() {
    setGistId(gistId.trim());
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function handleExport() {
    exportStoreAsJSON(store);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  }

  // ── Import ────────────────────────────────────────────────────────────────

  async function handleImportFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected
    e.target.value = "";

    setImportStatus("idle");
    setImportErrorMsg("");
    setImportWarnings([]);
    setPendingImport(null);

    const result = await parseImportFile(file);

    if (!result.valid || !result.store) {
      setImportStatus("error");
      setImportErrorMsg(result.errors.join(" "));
      return;
    }

    // Show confirmation dialog
    setPendingImport(result.store);
    setImportWarnings(result.warnings);
    setImportStatus("confirm");
  }

  function handleImportConfirm() {
    if (!pendingImport) return;
    loadFromExternal(pendingImport);
    setPendingImport(null);
    setImportStatus("success");
    setTimeout(() => setImportStatus("idle"), 5000);
  }

  function handleImportCancel() {
    setPendingImport(null);
    setImportStatus("idle");
    setImportWarnings([]);
  }

  return (
    <PageTransition className="max-w-2xl mx-auto">
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

          {/* Conflict: local changes on pull (S-008) */}
          {pullConflict && !confirmPull && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="text-sm text-amber-800 font-medium flex items-center gap-1">
                <AlertTriangle size={14} /> Local changes detected
              </p>
              <p className="text-xs text-amber-700">
                You have unsaved local changes made since your last sync. Pulling will overwrite these changes with the remote version.
              </p>
              <div className="text-xs text-stone-500 space-y-0.5">
                <p>Last synced: <span className="font-medium">{formatTimestamp(pullConflict.lastSynced)}</span></p>
                <p>Local changes: <span className="font-medium">{formatTimestamp(pullConflict.localModifiedAt)}</span></p>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handlePull} className="btn-danger text-xs">
                  Proceed with pull
                </button>
                <button onClick={handlePullConflictCancel} className="btn-secondary text-xs">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Conflict: remote changes on push (S-008) */}
          {pushConflict && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="text-sm text-amber-800 font-medium flex items-center gap-1">
                <AlertTriangle size={14} /> Remote changes detected
              </p>
              <p className="text-xs text-amber-700">
                The remote Gist has been updated since your last sync (possibly from another device). Pushing will overwrite those remote changes.
              </p>
              <div className="text-xs text-stone-500 space-y-0.5">
                <p>Last synced: <span className="font-medium">{formatTimestamp(pushConflict.lastSynced)}</span></p>
                <p>Remote updated: <span className="font-medium">{formatTimestamp(pushConflict.remoteUpdatedAt)}</span></p>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handlePush} className="btn-danger text-xs">
                  Proceed with push
                </button>
                <button onClick={handlePushCancel} className="btn-secondary text-xs">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {confirmPull && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle size={13} /> This will replace all local data with the version on GitHub. Click again to confirm.
            </p>
          )}

          {(pushStatus === "error" || pullStatus === "error") && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={13} /> {errorMsg}
              </p>
              {pullStatus === "error" && hasSnapshot && (
                <button
                  onClick={handleRestoreSnapshot}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  <RotateCcw size={13} /> Restore previous data
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-stone-400 mt-3">
            <strong>Push</strong> — saves current app data to GitHub (creates a new Gist on first use, updates it after).
            <br />
            <strong>Pull</strong> — loads data from GitHub and replaces local data. Use this on a new device.
          </p>
        </div>
      )}

      {/* Language */}
      <div className="card p-5 mb-4">
        <LanguageSelector />
      </div>

      {/* Appointment Reminders */}
      <ReminderSettings />

      {/* Amazon Baby Registry */}
      <div className="card p-5 mb-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={18} className="text-stone-600" />
          <h2 className="text-sm font-semibold text-stone-700">Amazon Baby Registry</h2>
        </div>
        <p className="text-xs text-stone-400 mb-3">
          Save your registry URL so it appears as a quick link on the Items page and Dashboard.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1 text-xs"
            type="url"
            placeholder="https://www.amazon.ca/baby-reg/..."
            value={registryInput}
            onChange={(e) => setRegistryInput(e.target.value)}
          />
          <button
            onClick={() => updateRegistryUrl(registryInput.trim())}
            className="btn-primary shrink-0"
            disabled={registryInput.trim() === (store.registryUrl ?? "")}
          >
            Save
          </button>
        </div>
        {store.registryUrl && (
          <a
            href={store.registryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1 mt-2"
          >
            View registry <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Data Storage */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive size={18} className="text-stone-600" />
          <h2 className="text-sm font-semibold text-stone-700">Data Storage</h2>
        </div>
        <p className="text-xs text-stone-400 mb-3">
          All app data is stored in your browser&apos;s localStorage (~5 MB limit).
        </p>

        {/* Progress bar */}
        <div className="w-full bg-stone-100 rounded-full h-2.5 mb-2">
          <div
            className={`h-2.5 rounded-full transition-all ${
              storageInfo.percent >= 80
                ? "bg-red-500"
                : storageInfo.percent >= 60
                ? "bg-amber-500"
                : "bg-sage-500"
            }`}
            style={{ width: `${Math.max(storageInfo.percent, 1)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-600">
            <span className="font-semibold">{storageInfo.formatted}</span>
            {" "}of ~{(STORAGE_LIMIT_BYTES / (1024 * 1024)).toFixed(0)} MB used
          </p>
          <p className="text-xs text-stone-400">{storageInfo.percent}%</p>
        </div>

        {storageInfo.warning && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700">
              <p className="font-medium">Storage is running low</p>
              <p className="mt-0.5">
                Consider enabling GitHub Gist sync (above) to back up your data and prevent loss
                if the browser storage limit is reached.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Data Import & Export */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FileDown size={18} className="text-stone-600" />
          <h2 className="text-sm font-semibold text-stone-700">Data Import &amp; Export</h2>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          Export your data as a JSON backup file, or import a previously exported file to restore your data.
        </p>

        <div className="flex gap-3 mb-3">
          {/* Export button */}
          <button
            onClick={handleExport}
            className="btn-primary flex-1 justify-center"
          >
            {exportDone ? (
              <><CheckCircle2 size={16} /> Exported!</>
            ) : (
              <><FileDown size={16} /> Export Data</>
            )}
          </button>

          {/* Import button */}
          <label className="btn-secondary flex-1 justify-center cursor-pointer">
            <FileUp size={16} /> Import Data
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFileSelected}
            />
          </label>
        </div>

        {/* Import confirmation */}
        {importStatus === "confirm" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <p className="text-sm text-amber-800 font-medium flex items-center gap-1">
              <AlertTriangle size={14} /> Replace all local data?
            </p>
            <p className="text-xs text-amber-700">
              Importing will replace all your current data with the contents of the file. This cannot be undone.
            </p>
            {importWarnings.length > 0 && (
              <div className="text-xs text-amber-600 space-y-0.5">
                <p className="font-medium">Notes:</p>
                {importWarnings.map((w, i) => (
                  <p key={i}>- {w}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={handleImportConfirm} className="btn-danger text-xs">
                Yes, replace my data
              </button>
              <button onClick={handleImportCancel} className="btn-secondary text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Import success */}
        {importStatus === "success" && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={13} /> Data imported successfully.
          </p>
        )}

        {/* Import error */}
        {importStatus === "error" && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={13} /> {importErrorMsg}
          </p>
        )}
      </div>

      {/* Action History (S-051) */}
      <ActionHistory
        history={history}
        revertTo={revertTo}
        clearHistory={clearActionHistory}
      />

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
    </PageTransition>
  );
}
