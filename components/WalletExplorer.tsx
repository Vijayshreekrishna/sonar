"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getWalletActivity,
  getWalletMarkets,
  getWalletOnchain,
  getWalletOpenPositions,
  getWalletPnL,
  getWalletPositions,
  getWalletSummary,
  getWatchedWallets,
} from "@/lib/api";
import type {
  OnchainTx,
  WalletActivityRow,
  WalletMarketRow,
  WalletOpenPosition,
  WalletPnL,
  WalletSummary,
} from "@/lib/types";
import { formatUsd, timeAgo, truncateAddr } from "@/lib/format";
import { WalletLeaderboard } from "./WalletLeaderboard";
import { WalletSearch } from "./WalletSearch";
import { WalletClusters } from "./WalletClusters";
import { WalletCalibration } from "./WalletCalibration";
import { WalletCluster } from "./WalletCluster";
import { WalletWatchToggle } from "./WalletWatchToggle";

type SubTab = "leaderboard" | "search" | "clusters";
const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: "leaderboard", label: "Leaderboard" },
  { value: "search", label: "Search" },
  { value: "clusters", label: "Clusters" },
];

type Profile = {
  address: string;
  summary?: WalletSummary;
  pnl?: WalletPnL;
  markets?: WalletMarketRow[];
  openPositions?: WalletOpenPosition[];
  activity?: WalletActivityRow[];
  onchain?: OnchainTx[];
  verifiedPositions?: unknown[];
};

export function WalletExplorer({
  apiKey,
  onSelectMarket,
}: {
  apiKey: string;
  onSelectMarket: (id: string) => void;
}) {
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [subTab, setSubTab] = useState<SubTab>("leaderboard");

  // Fetched once and shared by the watch toggle and the empty-section hints below, so
  // neither has to make its own duplicate call to check membership.
  useEffect(() => {
    getWatchedWallets(apiKey)
      .then((res) => setWatchedSet(new Set(res.wallets)))
      .catch(() => {});
  }, [apiKey]);

  function setWatching(address: string, watching: boolean) {
    setWatchedSet((prev) => {
      const next = new Set(prev);
      if (watching) next.add(address);
      else next.delete(address);
      return next;
    });
  }

  async function lookup(rawAddress: string) {
    const address = rawAddress.trim().toLowerCase();
    if (!address) return;
    setInput(address);
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const [summary, pnl, markets, openPositions, activity] = await Promise.all([
        getWalletSummary(apiKey, address),
        getWalletPnL(apiKey, address),
        getWalletMarkets(apiKey, address, 20),
        getWalletOpenPositions(apiKey, address),
        getWalletActivity(apiKey, address, 15),
      ]);

      // Best-effort supplementary data: getWalletOnchain can be slow for whale wallets
      // (unindexed ClickHouse scan) and getWalletPositions proxies a third-party API that
      // may reject unregistered addresses - neither should blank the whole profile if
      // the core data above already loaded fine.
      const [onchainResult, positionsResult] = await Promise.allSettled([
        getWalletOnchain(apiKey, address, 25),
        getWalletPositions(apiKey, address),
      ]);

      setProfile({
        address,
        summary,
        pnl,
        markets: markets.data,
        openPositions: openPositions.data,
        activity: activity.data,
        onchain: onchainResult.status === "fulfilled" ? onchainResult.value : undefined,
        verifiedPositions: positionsResult.status === "fulfilled" ? positionsResult.value : undefined,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    lookup(input);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x wallet address"
          className="flex-1 min-w-0 rounded-md border border-line-strong bg-panel px-3.5 py-2.5 font-mono text-sm text-signal placeholder:text-signal-dim focus:outline-none focus:ring-2 focus:ring-amber"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-signal text-graphite text-sm font-medium px-4 py-2.5 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Look up"}
        </button>
      </form>

      {error && <p className="text-xs text-danger">{error}</p>}

      {loading && !profile && <p className="text-xs text-signal-dim text-center py-6">Scanning…</p>}

      {!profile && !loading && (
        <div className="flex flex-col gap-4">
          <div className="flex rounded-md border border-line overflow-hidden self-start shrink-0">
            {SUB_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setSubTab(t.value)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                  subTab === t.value ? "bg-amber text-graphite" : "bg-panel text-signal-dim hover:text-signal"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {subTab === "leaderboard" && <WalletLeaderboard apiKey={apiKey} onSelectWallet={lookup} />}
          {subTab === "search" && <WalletSearch apiKey={apiKey} onSelectWallet={lookup} />}
          {subTab === "clusters" && <WalletClusters apiKey={apiKey} onSelectWallet={lookup} />}
        </div>
      )}

      {profile && (
        <div className="flex flex-col gap-4 fade-up">
          <button
            onClick={() => setProfile(null)}
            className="self-start text-xs text-signal-dim hover:text-signal transition-colors"
          >
            ← back
          </button>
          <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-signal">{truncateAddr(profile.address, 6)}</span>
              <WalletWatchToggle
                apiKey={apiKey}
                address={profile.address}
                watching={watchedSet.has(profile.address)}
                onChange={(w) => setWatching(profile.address, w)}
              />
            </div>
            {profile.summary && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Stat label="Trades" value={String(profile.summary.total_trades)} />
                <Stat label="Volume" value={formatUsd(profile.summary.total_volume)} />
                <Stat label="Markets" value={String(profile.summary.market_count)} />
                <Stat label="Last seen" value={profile.summary.last_seen ? timeAgo(profile.summary.last_seen) : "—"} />
              </div>
            )}
          </div>

          {!watchedSet.has(profile.address) &&
            (profile.openPositions?.length ?? 0) === 0 &&
            (profile.activity?.length ?? 0) === 0 &&
            (profile.markets?.length ?? 0) === 0 && (
              <div className="rounded-lg border border-amber/30 bg-amber-dim px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] text-amber">
                  No activity, markets, or open positions found — this wallet isn&apos;t
                  watched yet, so its trading history may not be indexed even if it&apos;s
                  actively trading. Watch it to start tracking going forward.
                </p>
                <WalletWatchToggle
                  apiKey={apiKey}
                  address={profile.address}
                  watching={false}
                  onChange={(w) => setWatching(profile.address, w)}
                />
              </div>
            )}

          {profile.pnl && (
            <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
              <h3 className="text-xs uppercase tracking-wide text-signal-dim mb-2">P&L</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Stat
                  label="Total"
                  value={formatUsd(profile.pnl.total_pnl)}
                  tone={profile.pnl.total_pnl >= 0 ? "cool" : "danger"}
                />
                <Stat label="Realized" value={formatUsd(profile.pnl.total_realized_pnl)} />
                <Stat label="Unrealized" value={formatUsd(profile.pnl.total_unrealized_pnl)} />
              </div>
              {profile.pnl.note && <p className="mt-2 text-[11px] text-signal-dim">{profile.pnl.note}</p>}
            </div>
          )}

          <WalletCalibration apiKey={apiKey} address={profile.address} />
          <WalletCluster apiKey={apiKey} address={profile.address} onSelectWallet={lookup} />

          {profile.openPositions && profile.openPositions.length > 0 && (
            <Section title="Open positions">
              {profile.openPositions.map((p) => (
                <button
                  key={p.market_id}
                  onClick={() => onSelectMarket(p.market_id)}
                  className="w-full px-4 py-2.5 text-xs flex items-center justify-between gap-2 text-left hover:bg-panel-raised transition-colors"
                >
                  <span className="text-signal truncate">{p.title || `mkt ${p.market_id}`}</span>
                  <span className="font-mono text-cool shrink-0">{formatUsd(p.net_position)}</span>
                </button>
              ))}
            </Section>
          )}

          {profile.activity && profile.activity.length > 0 && (
            <Section title="Recent activity">
              {profile.activity.map((a, i) => (
                <button
                  key={`${a.tx_hash}-${a.side}-${i}`}
                  onClick={() => onSelectMarket(a.market_id)}
                  className="w-full px-4 py-2.5 text-xs flex items-center justify-between gap-2 text-left hover:bg-panel-raised transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={a.side === "buy" ? "text-cool" : "text-danger"}>
                      {a.side?.toUpperCase()}
                    </span>
                    <span className="text-signal-dim truncate">{a.title || `mkt ${a.market_id}`}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-signal">{formatUsd(a.amount)}</span>
                    <span className="text-signal-dim">{timeAgo(a.timestamp)}</span>
                  </div>
                </button>
              ))}
            </Section>
          )}

          {profile.markets && profile.markets.length > 0 && (
            <Section title="Markets traded">
              {profile.markets.map((m) => (
                <button
                  key={m.market_id}
                  onClick={() => onSelectMarket(m.market_id)}
                  className="w-full px-4 py-2.5 text-xs flex items-center justify-between gap-2 text-left hover:bg-panel-raised transition-colors"
                >
                  <span className="text-signal truncate">{m.title || `mkt ${m.market_id}`}</span>
                  <span className="text-signal-dim font-mono shrink-0">{m.trades} trades</span>
                </button>
              ))}
            </Section>
          )}

          {profile.onchain && profile.onchain.length > 0 && (
            <Section title="On-chain history">
              {profile.onchain.map((tx, i) => (
                <div key={`${tx.tx_hash}-${i}`} className="px-4 py-2.5 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={tx.side === "buy" ? "text-cool" : "text-danger"}>
                      {tx.side?.toUpperCase()}
                    </span>
                    <span className="text-signal-dim font-mono truncate">{truncateAddr(tx.tx_hash, 6)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-signal">{formatUsd(Number(tx.amount) / 1_000_000)}</span>
                    <span className="text-signal-dim">{timeAgo(tx.timestamp)}</span>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {profile.verifiedPositions && (
            <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
              <h3 className="text-xs uppercase tracking-wide text-signal-dim mb-1">
                Verified positions
              </h3>
              <p className="text-[11px] text-signal-dim mb-2">
                Proxied directly from Polymarket&apos;s Data API — exact, not the
                activity-derived approximation above. Empty if this address isn&apos;t a
                registered Polymarket proxy wallet.
              </p>
              <p className="text-xs font-mono text-signal">
                {profile.verifiedPositions.length} position{profile.verifiedPositions.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line">
        <h3 className="text-xs uppercase tracking-wide text-signal-dim">{title}</h3>
      </div>
      <div className="divide-y divide-line max-h-72 overflow-y-auto">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "cool" | "danger" }) {
  const color = tone === "cool" ? "text-cool" : tone === "danger" ? "text-danger" : "text-signal";
  return (
    <div className="rounded-md bg-panel-raised px-2.5 py-2">
      <div className="text-signal-dim text-[9px] uppercase tracking-wide">{label}</div>
      <div className={`font-mono mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
