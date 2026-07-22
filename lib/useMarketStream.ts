"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderbookSnapshot, TradeRow } from "./types";

const STREAM_URL = process.env.NEXT_PUBLIC_PMAXIS_WS_URL ?? "wss://api.pmaxis.trade/stream";
const TRADE_LIMIT = 30;

type Envelope = { type: string; data: unknown; timestamp: string };

// Raw shape of a "trade" envelope over the WS - distinct from TradeRow (the REST shape)
// mainly in that `timestamp` arrives as an ISO string here, not epoch millis.
type WsTradeEvent = {
  trade_id: string;
  market_id: string;
  token: string;
  price: number;
  size: number;
  side: string;
  timestamp: string;
};

// Scoped, per-market live feed for the market detail panel - subscribes to just one
// market_id via the hub's subscribe mechanism (not the unscoped firehose Breach uses),
// so this stays cheap regardless of how many markets exist on the platform.
export function useMarketStream(apiKey: string, marketId: string | null) {
  const [orderbookState, setOrderbookState] = useState<{ marketId: string; snap: OrderbookSnapshot } | null>(
    null
  );
  const [tradesState, setTradesState] = useState<{ marketId: string; rows: TradeRow[] } | null>(null);
  const [connectedState, setConnectedState] = useState<{ marketId: string; connected: boolean } | null>(
    null
  );
  const seqRef = useRef(0);

  useEffect(() => {
    if (!marketId) return;

    let cancelled = false;
    const ws = new WebSocket(`${STREAM_URL}?api_key=${encodeURIComponent(apiKey)}`);

    ws.onopen = () => {
      if (cancelled) return;
      setConnectedState({ marketId, connected: true });
      ws.send(JSON.stringify({ action: "subscribe", markets: [marketId] }));
    };

    ws.onmessage = (e: MessageEvent<string>) => {
      if (cancelled) return;
      e.data.split("\n").forEach((line) => {
        if (!line.trim()) return;
        let env: Envelope;
        try {
          env = JSON.parse(line);
        } catch {
          return;
        }

        if (env.type === "orderbook") {
          const d = env.data as OrderbookSnapshot;
          if (d.market_id === marketId) setOrderbookState({ marketId, snap: d });
        } else if (env.type === "trade") {
          const d = env.data as WsTradeEvent;
          if (d.market_id !== marketId) return;
          seqRef.current += 1;
          const row: TradeRow = {
            trade_id: d.trade_id || `live-${seqRef.current}`,
            market_id: d.market_id,
            price: d.price,
            size: d.size,
            side: d.side,
            token: d.token,
            timestamp: new Date(d.timestamp).getTime(),
          };
          setTradesState((prev) => {
            const prevRows = prev?.marketId === marketId ? prev.rows : [];
            return { marketId, rows: [row, ...prevRows].slice(0, TRADE_LIMIT) };
          });
        }
      });
    };

    ws.onclose = () => {
      if (!cancelled) setConnectedState({ marketId, connected: false });
    };
    ws.onerror = () => {
      if (!cancelled) setConnectedState({ marketId, connected: false });
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [apiKey, marketId]);

  return {
    orderbook: orderbookState?.marketId === marketId ? orderbookState.snap : null,
    liveTrades: tradesState?.marketId === marketId ? tradesState.rows : [],
    connected: connectedState?.marketId === marketId ? connectedState.connected : false,
  };
}
