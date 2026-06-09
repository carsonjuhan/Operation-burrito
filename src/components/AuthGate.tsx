"use client";

import { useState, useEffect, ReactNode } from "react";

const AUTH_KEY = "ob-authed";
const WEBAUTHN_CRED_KEY = "ob-webauthn-cred";
const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "burrito";

const PUBLIC_ROUTES = ["/birth-plan/view", "/items/share"];

// Fixed challenge bytes (no server — we just verify the browser/device authenticated the user)
const CHALLENGE = Uint8Array.from("operation-burrito-auth-challenge-v1", c => c.charCodeAt(0));

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlToUint8(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function isWebAuthnAvailable(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

function getSavedCredId(): ArrayBuffer | null {
  try {
    const raw = localStorage.getItem(WEBAUTHN_CRED_KEY);
    if (!raw) return null;
    return b64urlToUint8(raw);
  } catch {
    return null;
  }
}

async function registerBiometric(): Promise<boolean> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: CHALLENGE,
        rp: { name: "Operation Burrito", id: window.location.hostname },
        user: {
          id: Uint8Array.from("ob-user", c => c.charCodeAt(0)),
          name: "family",
          displayName: "Family",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(WEBAUTHN_CRED_KEY, b64url(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

async function authenticateBiometric(): Promise<boolean> {
  const credId = getSavedCredId();
  if (!credId) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: CHALLENGE,
        rpId: window.location.hostname,
        allowCredentials: [{ type: "public-key", id: credId }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showSetupBiometric, setShowSetupBiometric] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const normalizedPath = path.replace(/^\/Operation-burrito/, "");
    const isPublic = PUBLIC_ROUTES.some((route) => normalizedPath.startsWith(route));
    if (isPublic) {
      setAuthed(true);
      return;
    }

    const alreadyAuthed = sessionStorage.getItem(AUTH_KEY) === "1";
    if (alreadyAuthed) {
      setAuthed(true);
      return;
    }

    const available = isWebAuthnAvailable();
    setBiometricAvailable(available);
    const credId = getSavedCredId();
    setBiometricRegistered(!!credId);

    // Auto-trigger biometric if registered
    if (available && credId) {
      setBiometricLoading(true);
      authenticateBiometric().then(ok => {
        setBiometricLoading(false);
        if (ok) {
          sessionStorage.setItem(AUTH_KEY, "1");
          setAuthed(true);
        } else {
          setAuthed(false);
        }
      });
    } else {
      setAuthed(false);
    }
  }, []);

  async function handleBiometricAuth() {
    setBiometricLoading(true);
    const ok = await authenticateBiometric();
    setBiometricLoading(false);
    if (ok) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
    }
  }

  async function handleSetupBiometric() {
    setBiometricLoading(true);
    const ok = await registerBiometric();
    setBiometricLoading(false);
    if (ok) {
      setBiometricRegistered(true);
      setShowSetupBiometric(false);
    }
  }

  function removeBiometric() {
    localStorage.removeItem(WEBAUTHN_CRED_KEY);
    setBiometricRegistered(false);
    setShowSetupBiometric(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
      // Offer biometric setup if available and not yet registered
      if (biometricAvailable && !biometricRegistered) {
        setShowSetupBiometric(true);
      }
    } else {
      setError(true);
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  }

  if (authed === null || biometricLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-5xl">🌯</span>
          {biometricLoading && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-stone-400">Verifying identity…</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (authed && showSetupBiometric) {
    return (
      <>
        {children}
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-stone-800 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <span className="text-4xl">🔐</span>
              <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mt-3">Enable Face ID?</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Sign in with Face ID or biometrics next time — no password needed.
              </p>
            </div>
            <button
              onClick={handleSetupBiometric}
              className="w-full py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-medium transition-colors"
            >
              Set up Face ID
            </button>
            <button
              onClick={() => setShowSetupBiometric(false)}
              className="w-full py-2 text-stone-400 text-sm"
            >
              Not now
            </button>
          </div>
        </div>
      </>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🌯</span>
          <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mt-4">Operation Burrito</h1>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            {biometricRegistered ? "Use Face ID or enter your password" : "Enter the password to continue"}
          </p>
        </div>

        {/* Biometric button when registered */}
        {biometricAvailable && biometricRegistered && (
          <div className="mb-4">
            <button
              onClick={handleBiometricAuth}
              disabled={biometricLoading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-stone-800 dark:bg-stone-700 hover:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-2xl font-medium transition-colors"
            >
              <span className="text-2xl">🔐</span>
              <span>Sign in with Face ID</span>
            </button>
            <p className="text-center text-xs text-stone-400 mt-3">or use your password below</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`card p-6 space-y-4 ${shake ? "animate-shake" : ""}`}
        >
          <div>
            <label className="label">Password</label>
            <input
              className={`input ${error ? "border-red-300 focus:ring-red-300" : ""}`}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(false);
              }}
            />
            {error && (
              <p className="text-xs text-red-500 mt-1">Incorrect password. Try again.</p>
            )}
          </div>
          <button type="submit" className="btn-primary w-full justify-center">
            Unlock
          </button>
        </form>

        {/* Manage biometric */}
        {biometricAvailable && biometricRegistered && (
          <button
            onClick={removeBiometric}
            className="w-full mt-3 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Remove Face ID
          </button>
        )}
      </div>
    </div>
  );
}
