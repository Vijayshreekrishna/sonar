"use client";

import { useEffect, useState } from "react";
import { getCategories, getLeaderboard } from "@/lib/api";
import type { Category, LeaderboardEntry } from "@/lib/types";
import { formatUsd, timeAgo, truncateAddr } from "@/lib/format";

type Window = "24h" | "7d" | "30d" | "all";
const WINDOWS: Window[] = ["24h", "7d", "30d", "all"];

type Sort = "volume" | "recent";
const SORTS: { value: Sort; label: string }[] = [
  { value: "volume", label: "top volume" },
  { value: "recent", label: "most recent" },
];

export function WalletLeaderboard({
  apiKey,
  onSelectWallet,
}: {
  apiKey: string;
  onSelectWallet: (address: string) => void;
}) {
  const [window, setWindowFilter] = useState<Window>("7d");
  const [sort, setSort] = useState<Sort>("volume");
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<{
    key: string;
    entries: LeaderboardEntry[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    getCategories(apiKey)
      .then((cats) => setCategories(cats.slice(0, 14)))
      .catch(() => setCategories([]));
  }, [apiKey]);

  const requestKey = `${window}:${sort}:${category ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    getLeaderboard(apiKey, { window, sort, category: category ?? undefined, limit: 25 })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, entries: data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, entries: [], error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, window, sort, category, requestKey]);

  const current = result?.key === requestKey ? result : null;
  const loading = !current;
  const entries = current?.entries ?? [];
  const error = current?.error ?? null;

  return (
    <div className="rounded-lg border border-line bg-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display text-sm text-signal">Wallet leaderboard</h3>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-line overflow-hidden shrink-0">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSort(s.value)}
                  className={`px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors ${
                    sort === s.value ? "bg-amber text-graphite" : "bg-panel text-signal-dim hover:text-signal"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-md border border-line overflow-hidden shrink-0">
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWindowFilter(w)}
                  className={`px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors ${
                    window === w ? "bg-amber text-graphite" : "bg-panel text-signal-dim hover:text-signal"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCategory(null)}
            className={`text-[11px] uppercase tracking-wide px-2 py-1 rounded-full border transition-colors ${
              category === null
                ? "border-amber bg-amber-dim text-amber"
                : "border-line text-signal-dim hover:border-line-strong hover:text-signal"
            }`}
          >
            all
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              onClick={() => setCategory(category === c.category ? null : c.category)}
              className={`text-[11px] uppercase tracking-wide px-2 py-1 rounded-full border transition-colors ${
                category === c.category
                  ? "border-amber bg-amber-dim text-amber"
                  : "border-line text-signal-dim hover:border-line-strong hover:text-signal"
              }`}
            >
              {c.category}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-4 py-3 text-xs text-danger">{error}</p>}
      {loading && <p className="px-4 py-6 text-xs text-signal-dim text-center">Scanning…</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="px-4 py-6 text-xs text-signal-dim text-center">
          No wallet activity in this window{category ? ` for ${category}` : ""}.
        </p>
      )}

      <div className="divide-y divide-line max-h-[32rem] overflow-y-auto">
        {entries.map((e) => (
          <button
            key={e.wallet}
            onClick={() => onSelectWallet(e.wallet)}
            className="w-full px-4 py-2.5 text-xs flex items-center gap-3 text-left hover:bg-panel-raised transition-colors"
          >
            <span className="text-signal-dim font-mono w-6 shrink-0">{e.rank}</span>
            <span className="font-mono text-signal shrink-0">{truncateAddr(e.wallet, 5)}</span>
            <span className="text-signal-dim truncate flex-1 text-right sm:text-left sm:flex-none">
              {e.market_count} mkts
            </span>
            <span className="font-mono text-signal ml-auto">{formatUsd(e.total_volume)}</span>
            <span className="text-signal-dim hidden sm:inline">{timeAgo(e.last_seen)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
