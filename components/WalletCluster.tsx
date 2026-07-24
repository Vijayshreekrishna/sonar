"use client";

import { useEffect, useState } from "react";
import { getWalletCluster } from "@/lib/api";
import type { WalletCluster as WalletClusterData } from "@/lib/types";
import { timeAgo, truncateAddr } from "@/lib/format";

export function WalletCluster({
  apiKey,
  address,
  onSelectWallet,
}: {
  apiKey: string;
  address: string;
  onSelectWallet: (address: string) => void;
}) {
  const [data, setData] = useState<WalletClusterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    getWalletCluster(apiKey, address)
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
  if (!data) return <p className="text-xs text-signal-dim">Loading cluster data…</p>;

  return (
    <div className="flex flex-col gap-3">
      {/* Tier 2 - shared on-chain funding source. A hard fact, not a heuristic. */}
      <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
        <h3 className="text-xs uppercase tracking-wide text-signal-dim mb-2">
          Funding-source cluster
        </h3>
        {data.funding_source ? (
          <>
            <p className="text-[11px] text-signal-dim mb-2">
              Funded from{" "}
              <span className="font-mono text-signal">{truncateAddr(data.funding_source, 6)}</span>{" "}
              — shared by {data.cluster_size} wallet{data.cluster_size === 1 ? "" : "s"}.
            </p>
            {data.members.length > 0 && (
              <div className="divide-y divide-line rounded-md border border-line overflow-hidden">
                {data.members.map((m) => (
                  <button
                    key={m}
                    onClick={() => onSelectWallet(m)}
                    className="w-full px-2.5 py-2 text-[11px] font-mono text-signal text-left hover:bg-panel-raised transition-colors"
                  >
                    {truncateAddr(m, 6)}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-signal-dim">{data.note}</p>
        )}
      </div>

      {/* Tier 1 - behavioral/lockstep-trading correlation. Noisier, NOT proof of common
          control - kept visually and textually separate from the funding-source cluster. */}
      <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
        <h3 className="text-xs uppercase tracking-wide text-signal-dim mb-2">
          Behavioral cluster (lockstep trading)
        </h3>
        <p className="text-[11px] text-signal-dim mb-2">{data.behavioral_note}</p>
        {data.behavioral.length === 0 ? (
          <p className="text-xs text-signal-dim">No lockstep-trading wallets found.</p>
        ) : (
          <div className="divide-y divide-line rounded-md border border-line overflow-hidden">
            {data.behavioral.map((b) => (
              <button
                key={b.wallet}
                onClick={() => onSelectWallet(b.wallet)}
                className="w-full px-2.5 py-2 text-[11px] flex items-center justify-between gap-2 text-left hover:bg-panel-raised transition-colors"
              >
                <span className="font-mono text-signal truncate">{truncateAddr(b.wallet, 6)}</span>
                <span className="text-signal-dim shrink-0">
                  {b.co_occurrences}× · {timeAgo(b.last_co_occurred)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
