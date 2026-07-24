import type {
  Category,
  ClustersPage,
  LeaderboardEntry,
  MarketsPage,
  MarketSummary,
  OnchainTx,
  OrderbookHistoryPoint,
  OrderbookSnapshot,
  TradeRow,
  WalletActivityRow,
  WalletCalibration,
  WalletCluster,
  WalletMarketRow,
  WalletOpenPosition,
  WalletPnL,
  WalletsPage,
  WalletSummary,
  WatchedWallets,
  WatchStatus,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_PMAXIS_API_URL ?? "https://api.pmaxis.trade";

// The backend VPS is currently memory/disk constrained and some ClickHouse queries
// (wallet PnL especially) have been observed taking 15-60s instead of their normal
// sub-second time under swap pressure - 30s gives those a real chance to finish
// instead of erroring out on a backend that would've succeeded a few seconds later.
const REQUEST_TIMEOUT_MS = 30_000;

async function req<T>(path: string, apiKey: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "X-API-Key": apiKey },
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${API_BASE}${path}`);
    }
    throw new Error(`Network error calling ${API_BASE}${path}: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} (${API_BASE}${path}): ${body}`);
  }
  return res.json() as Promise<T>;
}

// --- Markets ---

export function listMarkets(
  apiKey: string,
  opts: { category?: string; status?: string; cursor?: string; limit?: number } = {}
) {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.status) params.set("status", opts.status);
  if (opts.cursor) params.set("cursor", opts.cursor);
  params.set("limit", String(opts.limit ?? 30));
  return req<MarketsPage>(`/v1/markets?${params.toString()}`, apiKey);
}

export function searchMarkets(apiKey: string, q: string, limit = 20) {
  return req<MarketSummary[]>(
    `/v1/markets/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    apiKey
  );
}

export function getTopMarkets(
  apiKey: string,
  opts: { by?: "volume" | "trades"; period?: "1h" | "24h" | "7d"; limit?: number } = {}
) {
  const params = new URLSearchParams();
  params.set("by", opts.by ?? "volume");
  params.set("period", opts.period ?? "24h");
  params.set("limit", String(opts.limit ?? 20));
  return req<MarketSummary[]>(`/v1/markets/top?${params.toString()}`, apiKey);
}

export async function getTrendingMarkets(apiKey: string, limit = 20) {
  const res = await req<{ data: MarketSummary[]; count: number }>(
    `/v1/markets/trending?limit=${limit}`,
    apiKey
  );
  return res.data;
}

export function getCategories(apiKey: string) {
  return req<Category[]>("/v1/categories", apiKey);
}

export function getCategoryMarkets(
  apiKey: string,
  slug: string,
  opts: { sort?: string; limit?: number; status?: string } = {}
) {
  const params = new URLSearchParams();
  params.set("sort", opts.sort ?? "created");
  params.set("limit", String(opts.limit ?? 30));
  if (opts.status) params.set("status", opts.status);
  return req<{ category: string; data: MarketSummary[]; count: number }>(
    `/v1/categories/${encodeURIComponent(slug)}/markets?${params.toString()}`,
    apiKey
  );
}

export function getMarket(apiKey: string, id: string) {
  return req<MarketSummary & Record<string, unknown>>(`/v1/markets/${id}`, apiKey);
}

export function getOrderbook(apiKey: string, id: string) {
  return req<OrderbookSnapshot>(`/v1/markets/${id}/orderbook`, apiKey);
}

export function getOrderbookHistory(apiKey: string, id: string, limit = 100) {
  return req<{ market_id: string; data: OrderbookHistoryPoint[]; count: number }>(
    `/v1/markets/${id}/orderbook/history?limit=${limit}`,
    apiKey
  ).then((res) => res.data);
}

export function getMarketTrades(apiKey: string, id: string, limit = 50) {
  return req<TradeRow[]>(`/v1/markets/${id}/trades?limit=${limit}`, apiKey);
}

// --- Wallets ---

export function getLeaderboard(
  apiKey: string,
  opts: {
    window?: "24h" | "7d" | "30d" | "all";
    category?: string;
    sort?: "volume" | "recent";
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("window", opts.window ?? "7d");
  if (opts.category) params.set("category", opts.category);
  params.set("sort", opts.sort ?? "volume");
  params.set("limit", String(opts.limit ?? 25));
  return req<{ window: string; category: string; sort: string; data: LeaderboardEntry[]; count: number }>(
    `/v1/leaderboard?${params.toString()}`,
    apiKey
  ).then((res) => res.data);
}

export function getWalletSummary(apiKey: string, address: string) {
  return req<WalletSummary>(`/v1/wallets/${address}/summary`, apiKey);
}

export function getWalletPnL(apiKey: string, address: string) {
  return req<WalletPnL>(`/v1/wallets/${address}/pnl`, apiKey);
}

export function getWalletActivity(apiKey: string, address: string, limit = 20) {
  return req<{ address: string; data: WalletActivityRow[]; count: number }>(
    `/v1/wallets/${address}/activity?limit=${limit}`,
    apiKey
  );
}

export function getWalletMarkets(apiKey: string, address: string, limit = 20) {
  return req<{ address: string; data: WalletMarketRow[]; count: number }>(
    `/v1/wallets/${address}/markets?limit=${limit}`,
    apiKey
  );
}

export function getWalletOpenPositions(apiKey: string, address: string) {
  return req<{ address: string; data: WalletOpenPosition[]; count: number }>(
    `/v1/wallets/${address}/positions/open`,
    apiKey
  );
}

// Search/browse wallets by volume, trade count, category, and activity recency - unlike
// getLeaderboard (a flat top-N list), this is filterable and cursor-paginated. Returns the
// page directly (not unwrapped) so callers can drive "load more" off next_cursor/has_more.
//
// Note: `category` filters to "traded in this category at some point" - it does NOT
// rescope total_volume/total_trades to just that category, unlike getLeaderboard's
// `category` param, which does rescope. Different semantics, easy to conflate.
export function searchWallets(
  apiKey: string,
  opts: {
    minVolume?: number;
    maxVolume?: number;
    minTrades?: number;
    maxTrades?: number;
    category?: string;
    active?: "24h" | "7d" | "30d" | "all";
    sort?: "volume" | "trades" | "recent";
    limit?: number;
    cursor?: string;
  } = {}
) {
  const params = new URLSearchParams();
  if (opts.minVolume != null) params.set("min_volume", String(opts.minVolume));
  if (opts.maxVolume != null) params.set("max_volume", String(opts.maxVolume));
  if (opts.minTrades != null) params.set("min_trades", String(opts.minTrades));
  if (opts.maxTrades != null) params.set("max_trades", String(opts.maxTrades));
  if (opts.category) params.set("category", opts.category);
  params.set("active", opts.active ?? "all");
  params.set("sort", opts.sort ?? "volume");
  params.set("limit", String(opts.limit ?? 50));
  if (opts.cursor) params.set("cursor", opts.cursor);
  return req<WalletsPage>(`/v1/wallets?${params.toString()}`, apiKey);
}

export function getWalletOnchain(apiKey: string, address: string, limit = 50) {
  return req<OnchainTx[]>(`/v1/wallets/${address}/onchain?limit=${limit}`, apiKey);
}

// Two DELIBERATELY separate signals - resolved.brier_score (a real, proven track record)
// vs open (unrealized edge on still-open positions, explicitly NOT calibration). Never
// merge these into one score in the UI.
export function getWalletCalibration(apiKey: string, address: string, limit = 200) {
  return req<WalletCalibration>(`/v1/wallets/${address}/calibration?limit=${limit}`, apiKey);
}

// Platform-wide funding-source clusters (Sybil/multi-account signal, Tier 2). Named
// `listClusters` (not `getWalletClusters`) to stay visually distinct from the singular,
// address-scoped `getWalletCluster` below. No historical backfill - only wallets funded
// since 2026-07-23 can appear.
export function listClusters(apiKey: string, opts: { limit?: number; cursor?: string } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(opts.limit ?? 20));
  if (opts.cursor) params.set("cursor", opts.cursor);
  return req<ClustersPage>(`/v1/wallets/clusters?${params.toString()}`, apiKey);
}

// One wallet's funding-source cluster (Tier 2, hard on-chain fact) plus its behavioral
// lockstep-trading cluster (Tier 1, a noisier heuristic) - never conflate the two.
export function getWalletCluster(apiKey: string, address: string) {
  return req<WalletCluster>(`/v1/wallets/${address}/cluster`, apiKey);
}

// Proxies Polymarket's own Data API - response shape isn't controlled by PMAxis, so this
// is intentionally left as unknown[] rather than inventing a type contract for it (same
// precedent as WalletPnL.data before it was typed from PMAxis's own computeWalletPnL).
export function getWalletPositions(apiKey: string, address: string) {
  return req<unknown[]>(`/v1/positions?wallet=${address}`, apiKey);
}

export function getWalletClosedPositions(apiKey: string, address: string) {
  return req<unknown[]>(`/v1/positions/closed?wallet=${address}`, apiKey);
}

// --- Wallet watching ---
// wallet_activity/wallet_market_activity (feeding getWalletActivity/getWalletMarkets/
// getWalletOpenPositions above) are gated by a Redis watched:wallets set - an unwatched
// wallet can show empty activity/markets/positions even if it trades heavily, until
// someone watches it.

async function reqMutate<T>(
  path: string,
  apiKey: string,
  method: "POST" | "DELETE",
  body?: unknown
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "X-API-Key": apiKey,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${API_BASE}${path}`);
    }
    throw new Error(`Network error calling ${API_BASE}${path}: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const responseBody = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} (${API_BASE}${path}): ${responseBody}`);
  }
  return res.json() as Promise<T>;
}

export function watchWallet(apiKey: string, address: string) {
  return reqMutate<WatchStatus>("/v1/wallets/watch", apiKey, "POST", { address });
}

export function unwatchWallet(apiKey: string, address: string) {
  return reqMutate<WatchStatus>(`/v1/wallets/${address}/watch`, apiKey, "DELETE");
}

export function getWatchedWallets(apiKey: string) {
  return req<WatchedWallets>("/v1/wallets/watched", apiKey);
}
