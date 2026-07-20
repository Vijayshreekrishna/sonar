import type {
  Category,
  LeaderboardEntry,
  MarketsPage,
  MarketSummary,
  WalletActivityRow,
  WalletMarketRow,
  WalletOpenPosition,
  WalletPnL,
  WalletSummary,
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
