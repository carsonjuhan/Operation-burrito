"use client";

import { useState, useEffect, ReactNode } from "react";

const AUTH_KEY = "ob-authed";
const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD ?? "burrito";

export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(AUTH_KEY) === "1");
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  }

  // Still checking localStorage
  if (authed === null) return null;

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🌯</span>
          <h1 className="text-xl font-bold text-stone-800 mt-4">Operation Burrito</h1>
          <p className="text-sm text-stone-400 mt-1">Enter the password to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`card p-6 space-y-4 ${shake ? "animate-shake" : ""}`}
        >
          <div>
            <label className="label">Password</label>
            <input
              className={`input ${error ? "border-red-300 focus:ring-red-300" : ""}`}
              type="password"
              autoFocus
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
      </div>
    </div>
  );
}
