import type { MarketSummary } from "@/lib/types";
import { formatPrice, formatUsd } from "@/lib/format";

export function MarketCard({
  market,
  onSelect,
}: {
  market: MarketSummary;
  onSelect: (id: string) => void;
}) {
  const title = market.title || market.question || "Untitled market";
  const volume = market.volume_period ?? market.volume_24h ?? market.volume;

  return (
    <button
      onClick={() => onSelect(market.market_id)}
      className="w-full text-left rounded-lg border border-line bg-panel px-4 py-3.5 flex flex-col gap-2.5 hover:border-line-strong hover:bg-panel-raised transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-sm leading-snug text-signal line-clamp-2">{title}</h3>
        {market.status && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-panel-raised text-signal-dim">
            {market.status}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {market.category && (
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-dim text-amber">
            {market.category}
          </span>
        )}
        {market.stale && (
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-panel-raised text-signal-dim">
            last known
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 border-t border-line">
        <Stat label="Price" value={formatPrice(market.price)} />
        <Stat label="Bid / Ask" value={`${formatPrice(market.best_bid)} / ${formatPrice(market.best_ask)}`} />
        <Stat label="Volume" value={volume != null ? formatUsd(volume) : "—"} />
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pt-1.5">
      <div className="text-signal-dim text-[9px] uppercase tracking-wide">{label}</div>
      <div className="text-signal mt-0.5">{value}</div>
    </div>
  );
}
