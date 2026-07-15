"use client";

import { useState, type FormEvent } from "react";

const STORAGE_KEY = "sonar:api_key";

export function loadStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function ApiKeyGate({ onSubmit }: { onSubmit: (key: string) => void }) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    window.localStorage.setItem(STORAGE_KEY, key);
    onSubmit(key);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm fade-up">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl tracking-tight text-signal">Sonar</h1>
          <p className="mt-2 text-sm text-signal-dim">
            Find markets and wallets across PMAxis.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-panel p-6 flex flex-col gap-4"
        >
          <div>
            <label htmlFor="key" className="block text-xs uppercase tracking-wider text-signal-dim mb-2">
              PMAxis API key
            </label>
            <input
              id="key"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="pmx_live_..."
              className="w-full rounded-md border border-line-strong bg-graphite px-3 py-2 font-mono text-sm text-signal placeholder:text-signal-dim focus:outline-none focus:ring-2 focus:ring-amber"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-signal text-graphite text-sm font-medium py-2 transition-transform active:scale-[0.98] hover:bg-white"
          >
            Start scanning
          </button>
          <p className="text-xs text-signal-dim text-center">
            No key?{" "}
            <a
              href="https://api.pmaxis.trade/register"
              target="_blank"
              rel="noreferrer"
              className="text-amber hover:underline"
            >
              Get a free one
            </a>
            . Stored only in your browser.
          </p>
        </form>
      </div>
    </div>
  );
}
