"use client";

import { useMarket } from "@/lib/useMarket";
import { formatPrice, formatUsd } from "@/lib/format";

export function MarketDetail({
  apiKey,
  marketId,
  onClose,
}: {
  apiKey: string;
  marketId: string | null;
  onClose: () => void;
}) {
  const { market, loading, error } = useMarket(apiKey, marketId ?? "");

  if (!marketId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close market info" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-sm h-full bg-panel border-l border-line-strong p-5 overflow-y-auto fade-up">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wider text-signal-dim font-mono">{marketId}</span>
          <button onClick={onClose} className="text-signal-dim hover:text-signal text-sm">
            close
          </button>
        </div>

        {loading && <p className="text-xs text-signal-dim">Scanning…</p>}
        {error && <p className="text-xs text-danger">{error}</p>}

        {market && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl leading-snug text-signal">
              {(market.title as string) || (market.question as string) || "Untitled market"}
            </h2>

            <div className="flex flex-wrap gap-2">
              {market.category != null && market.category !== "" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-dim text-amber">
                  {market.category as string}
                </span>
              )}
              {market.status != null && market.status !== "" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-panel-raised text-signal">
                  {market.status as string}
                </span>
              )}
              {market.stale === true && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-panel-raised text-signal-dim">
                  last known values
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Price" value={formatPrice(market.price as number)} />
              <Stat
                label="24h volume"
                value={market.volume_24h != null ? formatUsd(market.volume_24h as number) : "—"}
              />
              <Stat label="Best bid" value={formatPrice(market.best_bid as number)} />
              <Stat label="Best ask" value={formatPrice(market.best_ask as number)} />
            </div>

            {market.end_time != null && market.end_time !== "" && (
              <p className="text-xs text-signal-dim">
                Resolves {new Date(market.end_time as string).toLocaleString()}
              </p>
            )}

            {Array.isArray(market.outcomes) && market.outcomes.length > 0 && (
              <div className="border-t border-line pt-4">
                <span className="text-xs uppercase tracking-wider text-signal-dim">Outcomes</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(market.outcomes as string[]).map((o) => (
                    <span key={o} className="text-xs px-2 py-0.5 rounded-md bg-panel-raised text-signal font-mono">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-panel-raised px-3 py-2">
      <div className="text-signal-dim text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-signal font-mono text-sm">{value}</div>
    </div>
  );
}
