"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCategories,
  getCategoryMarkets,
  getTopMarkets,
  getTrendingMarkets,
  searchMarkets,
} from "@/lib/api";
import type { Category, MarketSummary } from "@/lib/types";
import { MarketCard } from "./MarketCard";

type Mode = "top" | "trending";

export function MarketExplorer({
  apiKey,
  onSelectMarket,
}: {
  apiKey: string;
  onSelectMarket: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mode, setMode] = useState<Mode>("top");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<{ key: string; markets: MarketSummary[]; error: string | null } | null>(
    null
  );

  useEffect(() => {
    getCategories(apiKey)
      .then((cats) => setCategories(cats.slice(0, 14)))
      .catch(() => setCategories([]));
  }, [apiKey]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const searching = debouncedQuery.length >= 2;
  const requestKey = `${searching}:${debouncedQuery}:${activeCategory}:${mode}`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (searching) return searchMarkets(apiKey, debouncedQuery, 24);
      if (activeCategory) return (await getCategoryMarkets(apiKey, activeCategory, { limit: 24 })).data;
      if (mode === "trending") return getTrendingMarkets(apiKey, 24);
      return getTopMarkets(apiKey, { by: "volume", period: "24h", limit: 24 });
    };

    load()
      .then((markets) => {
        if (!cancelled) setResult({ key: requestKey, markets, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, markets: [], error: (err as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, searching, debouncedQuery, activeCategory, mode, requestKey]);

  const current = result?.key === requestKey ? result : null;
  const loading = !current;
  const markets = current?.markets ?? [];
  const error = current?.error ?? null;

  const heading = useMemo(() => {
    if (searching) return `Results for "${debouncedQuery}"`;
    if (activeCategory) return activeCategory;
    return mode === "trending" ? "Trending" : "Top by volume (24h)";
  }, [searching, debouncedQuery, activeCategory, mode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets by title or question…"
          className="w-full rounded-md border border-line-strong bg-panel px-3.5 py-2.5 text-sm text-signal placeholder:text-signal-dim focus:outline-none focus:ring-2 focus:ring-amber"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-line overflow-hidden shrink-0">
            {(["top", "trending"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setActiveCategory(null);
                }}
                className={`px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                  !activeCategory && !searching && mode === m
                    ? "bg-amber text-graphite"
                    : "bg-panel text-signal-dim hover:text-signal"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => setActiveCategory(activeCategory === c.category ? null : c.category)}
                className={`text-[11px] uppercase tracking-wide px-2 py-1 rounded-full border transition-colors ${
                  activeCategory === c.category
                    ? "border-amber bg-amber-dim text-amber"
                    : "border-line text-signal-dim hover:border-line-strong hover:text-signal"
                }`}
              >
                {c.category}
                <span className="ml-1 opacity-60">{c.market_count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm text-signal-dim">{heading}</h2>
        <span className="text-xs text-signal-dim font-mono">{markets.length}</span>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {!loading && !error && markets.length === 0 && <RadarIdle label={searching ? "No matches" : "No markets found"} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {markets.map((m) => (
          <MarketCard key={m.market_id} market={m} onSelect={onSelectMarket} />
        ))}
      </div>
    </div>
  );
}

function RadarIdle({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative h-28 w-28 rounded-full border border-line overflow-hidden">
        <div
          className="radar-sweep absolute inset-0 origin-center"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,176,0,0.35), transparent 60deg, transparent 360deg)",
          }}
        />
        <div className="absolute inset-3 rounded-full border border-line" />
        <div className="absolute inset-8 rounded-full border border-line" />
        <div className="radar-blip absolute left-[38%] top-[30%] h-1.5 w-1.5 rounded-full bg-amber" />
        <div className="radar-blip absolute left-[62%] top-[58%] h-1.5 w-1.5 rounded-full bg-amber" style={{ animationDelay: "1.1s" }} />
      </div>
      <p className="text-xs text-signal-dim">{label}</p>
    </div>
  );
}
