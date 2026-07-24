"use client";

import { useEffect, useState } from "react";
import { getCategories, searchWallets } from "@/lib/api";
import type { Category, WalletBrowseRow } from "@/lib/types";
import { formatUsd, timeAgo, truncateAddr } from "@/lib/format";

type Active = "24h" | "7d" | "30d" | "all";
const ACTIVE_WINDOWS: Active[] = ["24h", "7d", "30d", "all"];

type Sort = "volume" | "trades" | "recent";
const SORTS: { value: Sort; label: string }[] = [
  { value: "volume", label: "top volume" },
  { value: "trades", label: "most trades" },
  { value: "recent", label: "most recent" },
];

export function WalletSearch({
  apiKey,
  onSelectWallet,
}: {
  apiKey: string;
  onSelectWallet: (address: string) => void;
}) {
  const [minVolume, setMinVolume] = useState("");
  const [maxVolume, setMaxVolume] = useState("");
  const [minTrades, setMinTrades] = useState("");
  const [maxTrades, setMaxTrades] = useState("");
  const [active, setActive] = useState<Active>("all");
  const [sort, setSort] = useState<Sort>("volume");
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [rows, setRows] = useState<WalletBrowseRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories(apiKey)
      .then((cats) => setCategories(cats.slice(0, 14)))
      .catch(() => setCategories([]));
  }, [apiKey]);

  const filterKey = `${minVolume}:${maxVolume}:${minTrades}:${maxTrades}:${active}:${sort}:${category ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    searchWallets(apiKey, {
      minVolume: minVolume ? Number(minVolume) : undefined,
      maxVolume: maxVolume ? Number(maxVolume) : undefined,
      minTrades: minTrades ? Number(minTrades) : undefined,
      maxTrades: maxTrades ? Number(maxTrades) : undefined,
      active,
      sort,
      category: category ?? undefined,
      limit: 30,
    })
      .then((page) => {
        if (cancelled) return;
        setRows(page.data);
        setNextCursor(page.next_cursor);
        setHasMore(page.has_more);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setHasMore(false);
        setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, filterKey]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await searchWallets(apiKey, {
        minVolume: minVolume ? Number(minVolume) : undefined,
        maxVolume: maxVolume ? Number(maxVolume) : undefined,
        minTrades: minTrades ? Number(minTrades) : undefined,
        maxTrades: maxTrades ? Number(maxTrades) : undefined,
        active,
        sort,
        category: category ?? undefined,
        limit: 30,
        cursor: nextCursor,
      });
      setRows((prev) => [...prev, ...page.data]);
      setNextCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display text-sm text-signal">Search wallets</h3>
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
              {ACTIVE_WINDOWS.map((w) => (
                <button
                  key={w}
                  onClick={() => setActive(w)}
                  className={`px-2.5 py-1 text-[11px] uppercase tracking-wide transition-colors ${
                    active === w ? "bg-amber text-graphite" : "bg-panel text-signal-dim hover:text-signal"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            value={minVolume}
            onChange={(e) => setMinVolume(e.target.value)}
            placeholder="Min volume"
            inputMode="numeric"
            className="rounded-md border border-line-strong bg-panel-raised px-2.5 py-1.5 text-xs text-signal placeholder:text-signal-dim focus:outline-none focus:ring-2 focus:ring-amber"
          />
          <input
            value={maxVolume}
            onChange={(e) => setMaxVolume(e.target.value)}
            placeholder="Max volume"
            inputMode="numeric"
            className="rounded-md border border-line-strong bg-panel-raised px-2.5 py-1.5 text-xs text-signal placeholder:text-signal-dim focus:outline-none focus:ring-2 focus:ring-amber"
          />
          <input
            value={minTrades}
            onChange={(e) => setMinTrades(e.target.value)}
            placeholder="Min trades"
            inputMode="numeric"
            className="rounded-md border border-line-strong bg-panel-raised px-2.5 py-1.5 text-xs text-signal placeholder:text-signal-dim focus:outline-none focus:ring-2 focus:ring-amber"
          />
          <input
            value={maxTrades}
            onChange={(e) => setMaxTrades(e.target.value)}
            placeholder="Max trades"
            inputMode="numeric"
            className="rounded-md border border-line-strong bg-panel-raised px-2.5 py-1.5 text-xs text-signal placeholder:text-signal-dim focus:outline-none focus:ring-2 focus:ring-amber"
          />
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
        {category && (
          <p className="text-[10px] text-signal-dim">
            &quot;{category}&quot; matches wallets that traded this category at some point —
            totals below still reflect each wallet&apos;s all-time activity, not just this
            category.
          </p>
        )}
      </div>

      {error && <p className="px-4 py-3 text-xs text-danger">{error}</p>}
      {loading && <p className="px-4 py-6 text-xs text-signal-dim text-center">Scanning…</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="px-4 py-6 text-xs text-signal-dim text-center">No wallets match these filters.</p>
      )}

      <div className="divide-y divide-line max-h-[32rem] overflow-y-auto">
        {rows.map((r) => (
          <button
            key={r.wallet}
            onClick={() => onSelectWallet(r.wallet)}
            className="w-full px-4 py-2.5 text-xs flex items-center gap-3 text-left hover:bg-panel-raised transition-colors"
          >
            <span className="font-mono text-signal shrink-0">{truncateAddr(r.wallet, 5)}</span>
            <span className="text-signal-dim truncate flex-1 text-right sm:text-left sm:flex-none">
              {r.market_count} mkts · {r.total_trades} trades
            </span>
            <span className="font-mono text-signal ml-auto">{formatUsd(r.total_volume)}</span>
            <span className="text-signal-dim hidden sm:inline">{timeAgo(r.last_seen)}</span>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="px-4 py-3 border-t border-line">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full rounded-md border border-line-strong text-xs text-signal-dim hover:text-signal py-2 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
