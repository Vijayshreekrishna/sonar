export type MarketSummary = {
  market_id: string;
  exchange?: string;
  slug?: string;
  title?: string;
  question?: string;
  status?: string;
  event_id?: string;
  outcomes?: string[];
  condition_id?: string;
  start_time?: string;
  end_time?: string;
  tags?: string[];
  category?: string;
  series?: string;
  price?: number;
  mid_price?: number;
  best_bid?: number;
  best_ask?: number;
  spread?: number;
  volume?: number;
  volume_24h?: number;
  yes_price?: number;
  no_price?: number;
  volume_period?: number;
  trades_period?: number;
  stale?: boolean;
};

export type MarketsPage = {
  data: MarketSummary[];
  next_cursor?: string;
  has_more: boolean;
};

export type Category = {
  category: string;
  market_count: number;
};

export type WalletSummary = {
  address: string;
  total_trades: number;
  total_volume: number;
  buy_volume: number;
  sell_volume: number;
  first_seen: string | null;
  last_seen: string | null;
  market_count: number;
};

export type WalletPnL = {
  address: string;
  data: unknown[];
  count: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  total_pnl: number;
  markets_missing_cost_basis: number;
  note?: string;
};

export type WalletActivityRow = {
  tx_hash: string;
  wallet: string;
  maker: string;
  taker: string;
  token_id: string;
  market_id: string;
  title: string;
  question: string;
  category: string;
  amount: number;
  side: string;
  timestamp: string;
};

export type WalletMarketRow = {
  market_id: string;
  title: string;
  category: string;
  bought: number;
  sold: number;
  net_position: number;
  trades: number;
  first_trade: string;
  last_trade: string;
};

export type WalletOpenPosition = {
  market_id: string;
  title: string;
  category: string;
  bought: number;
  sold: number;
  net_position: number;
};

export type LeaderboardEntry = {
  rank: number;
  wallet: string;
  total_trades: number;
  total_volume: number;
  buy_volume: number;
  sell_volume: number;
  market_count: number;
  last_seen: string;
};
