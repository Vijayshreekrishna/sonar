import type {
  Category,
  MarketsPage,
  MarketSummary,
  WalletActivityRow,
  WalletMarketRow,
  WalletOpenPosition,
  WalletPnL,
  WalletSummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_PMAXIS_API_URL ?? "https://api.pmaxis.trade";

async function req<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
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

export function getTrendingMarkets(apiKey: string, limit = 20) {
  return req<MarketSummary[]>(`/v1/markets/trending?limit=${limit}`, apiKey);
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
