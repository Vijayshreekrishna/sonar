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

export type WalletPnLRow = {
  market_id: string;
  token_id: string;
  title: string;
  outcome: string;
  status: string;
  bought: number;
  sold: number;
  net_position: number;
  avg_buy_price: number;
  avg_sell_price: number;
  mark_price: number;
  price_source: string;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  has_cost_basis: boolean;
};

export type WalletPnL = {
  address: string;
  data: WalletPnLRow[];
  count: number;
  total_positions?: number;
  truncated?: boolean;
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

// --- Wallet browse/search (GET /v1/wallets) ---
// Note: `category` here filters to "traded in this category at some point" - it does NOT
// rescope total_volume/total_trades to just that category, unlike the leaderboard's
// `category` param, which does rescope. Different semantics, easy to conflate.

export type WalletBrowseRow = {
  wallet: string;
  total_trades: number;
  total_volume: number;
  buy_volume: number;
  sell_volume: number;
  market_count: number;
  first_seen: string | null;
  last_seen: string | null;
};

export type WalletsPage = {
  data: WalletBrowseRow[];
  next_cursor?: string;
  has_more: boolean;
};

// --- On-chain history (GET /v1/wallets/{address}/onchain) ---

export type OnchainTx = {
  tx_hash: string;
  maker: string;
  taker: string;
  token_id: string;
  amount: string; // raw 6-decimal units, kept as string - formatting is a display concern
  timestamp: string;
  side: "buy" | "sell";
};

// --- Calibration (GET /v1/wallets/{address}/calibration) ---
// Two DELIBERATELY separate signals - never merge into one score. `resolved` is a real
// Brier score from settled positions; `open` is unrealized edge on still-open positions,
// explicitly NOT a calibration score since the outcome isn't known yet.

export type CalibrationOpenPosition = {
  market_id: string;
  outcome: string;
  avg_buy_price: number;
  mark_price: number;
  price_source: string;
  unrealized_pnl: number;
};

export type WalletCalibration = {
  address: string;
  resolved: {
    positions_scored: number;
    brier_score: number | null;
  };
  open: {
    disclaimer: string;
    position_count: number;
    truncated: boolean;
    total_unrealized_pnl: number;
    positions: CalibrationOpenPosition[];
  };
};

// --- Wallet clustering (Sybil/multi-account signal) ---
// Tier 2 (funding_source/members) is a hard on-chain fact. Tier 1 (behavioral) is a
// noisier lockstep-trading correlation - never conflate the two.

export type ClusterEntry = {
  funding_source: string;
  cluster_size: number;
  members: string[];
};

export type ClustersPage = {
  data: ClusterEntry[];
  next_cursor?: string;
  has_more: boolean;
};

export type BehavioralCluster = {
  wallet: string;
  co_occurrences: number;
  last_co_occurred: string;
};

export type WalletCluster = {
  address: string;
  cluster_size: number;
  members: string[];
  funding_source?: string;
  note?: string; // present instead of funding_source when no funding record exists yet
  behavioral: BehavioralCluster[];
  behavioral_note: string;
};

// --- Wallet watching ---
// wallet_activity/wallet_market_activity (feeding activity/markets/open-positions) are
// gated by a Redis watched:wallets set - an unwatched wallet can show empty sections
// even if it trades heavily, until someone watches it.

export type WatchStatus = {
  address: string;
  watching: boolean;
};

export type WatchedWallets = {
  wallets: string[];
  count: number;
};

export type PriceLevel = {
  price: string;
  size: string;
};

export type OrderbookSnapshot = {
  market_id: string;
  token: string;
  timestamp: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  best_bid: string;
  best_ask: string;
};

export type TradeRow = {
  trade_id: string;
  market_id: string;
  price: number;
  size: number;
  side: string;
  token: string;
  timestamp: number;
};

export type OrderbookHistoryPoint = {
  best_bid: number;
  best_ask: number;
  mid_price: number;
  spread: number;
  timestamp: number;
};
