"use client";

import { useEffect, useState } from "react";
import { getWalletCalibration } from "@/lib/api";
import type { WalletCalibration as WalletCalibrationData } from "@/lib/types";
import { formatPrice, formatUsd } from "@/lib/format";

export function WalletCalibration({ apiKey, address }: { apiKey: string; address: string }) {
  const [data, setData] = useState<WalletCalibrationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    getWalletCalibration(apiKey, address)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, address]);

  if (error) return <p className="text-xs text-danger">{error}</p>;
  if (!data) return <p className="text-xs text-signal-dim">Loading calibration…</p>;

  const { resolved, open } = data;

  return (
    <div className="flex flex-col gap-3">
      {/* Track record - a real Brier score from resolved positions. Never render this
          alongside `open` as one blended number - they measure different things. */}
      <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
        <h3 className="text-xs uppercase tracking-wide text-signal-dim mb-2">Track record</h3>
        {resolved.brier_score == null ? (
          <p className="text-xs text-signal-dim">
            Not enough resolved positions yet to score ({resolved.positions_scored} scored).
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-panel-raised px-2.5 py-2">
              <div className="text-signal-dim text-[9px] uppercase tracking-wide">Brier score</div>
              <div className="font-mono mt-0.5 text-signal">{formatPrice(resolved.brier_score)}</div>
            </div>
            <div className="rounded-md bg-panel-raised px-2.5 py-2">
              <div className="text-signal-dim text-[9px] uppercase tracking-wide">Positions scored</div>
              <div className="font-mono mt-0.5 text-signal">{resolved.positions_scored}</div>
            </div>
          </div>
        )}
        <p className="mt-2 text-[11px] text-signal-dim">
          Lower is better (0 = perfectly calibrated). Computed only from resolved markets this
          wallet actually traded.
        </p>
      </div>

      {/* Unrealized edge - explicitly NOT a calibration score, since the outcome isn't known
          yet. Rendered as a visually separate card with the API's own disclaimer verbatim. */}
      <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
        <h3 className="text-xs uppercase tracking-wide text-signal-dim mb-2">
          Unrealized edge (not yet scored)
        </h3>
        <p className="text-[11px] text-signal-dim mb-2">{open.disclaimer}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-panel-raised px-2.5 py-2">
            <div className="text-signal-dim text-[9px] uppercase tracking-wide">Open positions</div>
            <div className="font-mono mt-0.5 text-signal">
              {open.position_count}
              {open.truncated ? " (showing top)" : ""}
            </div>
          </div>
          <div className="rounded-md bg-panel-raised px-2.5 py-2">
            <div className="text-signal-dim text-[9px] uppercase tracking-wide">Total unrealized</div>
            <div
              className={`font-mono mt-0.5 ${open.total_unrealized_pnl >= 0 ? "text-cool" : "text-danger"}`}
            >
              {formatUsd(open.total_unrealized_pnl)}
            </div>
          </div>
        </div>
        {open.positions.length > 0 && (
          <div className="mt-2.5 divide-y divide-line rounded-md border border-line overflow-hidden max-h-48 overflow-y-auto">
            {open.positions.map((p, i) => (
              <div
                key={`${p.market_id}-${i}`}
                className="px-2.5 py-2 text-[11px] flex items-center justify-between gap-2"
              >
                <span className="text-signal-dim truncate">
                  {p.market_id || "unresolved market"} · {p.outcome || "—"}
                </span>
                <span
                  className={`font-mono shrink-0 ${p.unrealized_pnl >= 0 ? "text-cool" : "text-danger"}`}
                >
                  {formatUsd(p.unrealized_pnl)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
