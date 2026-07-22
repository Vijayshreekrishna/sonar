"use client";

import { useEffect, useState } from "react";
import { getMarketTrades, getOrderbook } from "@/lib/api";
import { useMarketStream } from "@/lib/useMarketStream";
import type { OrderbookSnapshot, TradeRow } from "@/lib/types";
import { formatUsd, timeAgo } from "@/lib/format";

const DEPTH_LEVELS = 8;
const TRADE_LIMIT = 30;

export function MarketOrderbook({ apiKey, marketId }: { apiKey: string; marketId: string }) {
  const [bookResult, setBookResult] = useState<{
    marketId: string;
    snap: OrderbookSnapshot | null;
    error: string | null;
  } | null>(null);
  const [tradesResult, setTradesResult] = useState<{
    marketId: string;
    rows: TradeRow[];
    error: string | null;
  } | null>(null);

  const { orderbook: liveBook, liveTrades, connected } = useMarketStream(apiKey, marketId);

  useEffect(() => {
    let cancelled = false;

    getOrderbook(apiKey, marketId)
      .then((snap) => {
        if (!cancelled) setBookResult({ marketId, snap, error: null });
      })
      .catch((err) => {
        if (!cancelled) setBookResult({ marketId, snap: null, error: (err as Error).message });
      });

    getMarketTrades(apiKey, marketId, TRADE_LIMIT)
      .then((rows) => {
        if (!cancelled) setTradesResult({ marketId, rows: Array.isArray(rows) ? rows : [], error: null });
      })
      .catch((err) => {
        if (!cancelled) setTradesResult({ marketId, rows: [], error: (err as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, marketId]);

  const book = bookResult?.marketId === marketId ? bookResult : null;
  const restTrades = tradesResult?.marketId === marketId ? tradesResult : null;

  // Prefer the live WS snapshot once one arrives; fall back to the initial REST fetch
  // (covers the gap before the first live update, and quiet markets with no live feed).
  const activeSnap = liveBook ?? book?.snap ?? null;
  const bids = activeSnap?.bids.slice(0, DEPTH_LEVELS) ?? [];
  const asks = activeSnap?.asks.slice(0, DEPTH_LEVELS) ?? [];

  // Live trades arrive newest-first; append the REST history behind them, deduped by
  // trade_id so a trade that arrives live isn't also shown from the initial snapshot.
  const seen = new Set<string>();
  const trades: TradeRow[] = [];
  for (const t of [...liveTrades, ...(restTrades?.rows ?? [])]) {
    if (seen.has(t.trade_id)) continue;
    seen.add(t.trade_id);
    trades.push(t);
    if (trades.length >= TRADE_LIMIT) break;
  }

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-signal-dim">Order book</span>
          {connected && (
            <span className="flex items-center gap-1 text-[10px] text-cool">
              <span className="h-1.5 w-1.5 rounded-full bg-cool" />
              live
            </span>
          )}
        </div>
        {!book && !liveBook && <p className="mt-2 text-xs text-signal-dim">Scanning…</p>}
        {book && book.snap === null && !liveBook && (
          <p className="mt-2 text-xs text-signal-dim">
            No live order book for this market — likely quiet for 2h+ (the snapshot expires) or
            never captured one.
          </p>
        )}
        {activeSnap && bids.length === 0 && asks.length === 0 && (
          <p className="mt-2 text-xs text-signal-dim">Order book snapshot is empty.</p>
        )}
        {activeSnap && (bids.length > 0 || asks.length > 0) && (
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <div className="text-cool text-[10px] uppercase tracking-wide mb-1">Bids</div>
              <div className="flex flex-col gap-0.5">
                {bids.map((b, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-cool">{Number(b.price).toFixed(3)}</span>
                    <span className="text-signal-dim">{Number(b.size).toFixed(1)}</span>
                  </div>
                ))}
                {bids.length === 0 && <span className="text-signal-dim">—</span>}
              </div>
            </div>
            <div>
              <div className="text-danger text-[10px] uppercase tracking-wide mb-1">Asks</div>
              <div className="flex flex-col gap-0.5">
                {asks.map((a, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-danger">{Number(a.price).toFixed(3)}</span>
                    <span className="text-signal-dim">{Number(a.size).toFixed(1)}</span>
                  </div>
                ))}
                {asks.length === 0 && <span className="text-signal-dim">—</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-signal-dim">Recent trades</span>
          {connected && (
            <span className="flex items-center gap-1 text-[10px] text-cool">
              <span className="h-1.5 w-1.5 rounded-full bg-cool" />
              live
            </span>
          )}
        </div>
        {!restTrades && trades.length === 0 && <p className="mt-2 text-xs text-signal-dim">Scanning…</p>}
        {restTrades && trades.length === 0 && (
          <p className="mt-2 text-xs text-signal-dim">No recent trades for this market.</p>
        )}
        {trades.length > 0 && (
          <div className="mt-2 divide-y divide-line max-h-56 overflow-y-auto">
            {trades.map((t) => (
              <div
                key={t.trade_id}
                className="py-1.5 flex items-center justify-between text-xs font-mono"
              >
                <span className={t.side === "buy" ? "text-cool" : "text-danger"}>
                  {t.side?.toUpperCase()}
                </span>
                <span className="text-signal">{t.price.toFixed(3)}</span>
                <span className="text-signal-dim">{formatUsd(t.size * t.price)}</span>
                <span className="text-signal-dim">{timeAgo(new Date(t.timestamp).toISOString())}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
