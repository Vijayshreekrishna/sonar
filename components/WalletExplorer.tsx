"use client";

import { useState, type FormEvent } from "react";
import {
  getWalletActivity,
  getWalletMarkets,
  getWalletOpenPositions,
  getWalletPnL,
  getWalletSummary,
} from "@/lib/api";
import type {
  WalletActivityRow,
  WalletMarketRow,
  WalletOpenPosition,
  WalletPnL,
  WalletSummary,
} from "@/lib/types";
import { formatUsd, timeAgo, truncateAddr } from "@/lib/format";

type Profile = {
  address: string;
  summary?: WalletSummary;
  pnl?: WalletPnL;
  markets?: WalletMarketRow[];
  openPositions?: WalletOpenPosition[];
  activity?: WalletActivityRow[];
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const address = input.trim().toLowerCase();
    if (!address) return;
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
      setProfile({
        address,
        summary,
        pnl,
        markets: markets.data,
        openPositions: openPositions.data,
        activity: activity.data,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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

      {!profile && !loading && !error && (
        <p className="text-xs text-signal-dim text-center py-12">
          Paste any wallet address to see its trading history, PnL, and open positions.
        </p>
      )}

      {profile && (
        <div className="flex flex-col gap-4 fade-up">
          <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
            <span className="font-mono text-sm text-signal">{truncateAddr(profile.address, 6)}</span>
            {profile.summary && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <Stat label="Trades" value={String(profile.summary.total_trades)} />
                <Stat label="Volume" value={formatUsd(profile.summary.total_volume)} />
                <Stat label="Markets" value={String(profile.summary.market_count)} />
                <Stat label="Last seen" value={profile.summary.last_seen ? timeAgo(profile.summary.last_seen) : "—"} />
              </div>
            )}
          </div>

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
              {profile.activity.map((a) => (
                <button
                  key={a.tx_hash}
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
