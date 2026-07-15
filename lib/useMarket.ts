"use client";

import { useEffect, useState } from "react";
import { getMarket } from "./api";
import type { MarketSummary } from "./types";

type Market = MarketSummary & Record<string, unknown>;
type Result = { marketId: string; market: Market | null; error: string | null };

export function useMarket(apiKey: string, marketId: string | null) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    getMarket(apiKey, marketId)
      .then((m) => {
        if (cancelled) return;
        setResult({ marketId, market: m, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({ marketId, market: null, error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, marketId]);

  const current = result?.marketId === marketId ? result : null;
  const loading = marketId != null && !current;

  return { market: current?.market ?? null, loading, error: current?.error ?? null };
}
