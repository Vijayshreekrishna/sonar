"use client";

import { useEffect, useState } from "react";
import { listClusters } from "@/lib/api";
import type { ClusterEntry } from "@/lib/types";
import { truncateAddr } from "@/lib/format";

export function WalletClusters({
  apiKey,
  onSelectWallet,
}: {
  apiKey: string;
  onSelectWallet: (address: string) => void;
}) {
  const [rows, setRows] = useState<ClusterEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listClusters(apiKey, { limit: 20 })
      .then((page) => {
        if (cancelled) return;
        setRows(page.data);
        setNextCursor(page.next_cursor);
        setHasMore(page.has_more);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listClusters(apiKey, { limit: 20, cursor: nextCursor });
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
      <div className="px-4 py-3 border-b border-line">
        <h3 className="font-display text-sm text-signal mb-1">Funding-source clusters</h3>
        <p className="text-[11px] text-signal-dim">
          Wallets sharing the same first-observed on-chain USDC funding source — a
          Sybil/multi-account signal. No historical backfill: only wallets funded since
          2026-07-23 can appear here, so coverage grows over time.
        </p>
      </div>

      {error && <p className="px-4 py-3 text-xs text-danger">{error}</p>}
      {loading && <p className="px-4 py-6 text-xs text-signal-dim text-center">Scanning…</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="px-4 py-6 text-xs text-signal-dim text-center">No clusters found yet.</p>
      )}

      <div className="divide-y divide-line max-h-[32rem] overflow-y-auto">
        {rows.map((c) => (
          <div key={c.funding_source} className="px-4 py-2.5 text-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-signal-dim truncate">
                {truncateAddr(c.funding_source, 6)}
              </span>
              <span className="text-signal-dim shrink-0">
                {c.cluster_size} wallet{c.cluster_size === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {c.members.map((m) => (
                <button
                  key={m}
                  onClick={() => onSelectWallet(m)}
                  className="font-mono text-[11px] text-signal px-2 py-1 rounded-full border border-line hover:border-line-strong hover:bg-panel-raised transition-colors"
                >
                  {truncateAddr(m, 4)}
                </button>
              ))}
            </div>
          </div>
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
