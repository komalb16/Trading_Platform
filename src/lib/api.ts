// src/lib/api.ts
// All calls target your FastAPI backend at NEXT_PUBLIC_API_URL (default: localhost:8000)
// Every function falls back to mock data if the server is unreachable, so the UI
// always renders something useful during development.

const BASE = (
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
);

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } catch {
    console.warn(`[api] ${path} unreachable – using mock data`);
    return fallback;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthStatus = {
  status: string;
  services: Record<string, { status: string; latency_ms?: number }>;
  version?: string;
};

export type Metrics = {
  total_trades: number;
  open_positions: number;
  realised_pnl: number;
  unrealised_pnl: number;
  win_rate: number;
  max_drawdown: number;
  net_exposure_pct: number;
  margin_used: number;
  margin_available: number;
};

export type Trade = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  entry_price: number;
  ltp: number;
  pnl: number;
  strategy_name: string;
  status: 'OPEN' | 'CLOSED' | 'PENDING' | 'CANCELLED';
  created_at: string;
  market: 'NSE' | 'US' | 'CRYPTO';
};

export type Strategy = {
  id: string;
  name: string;
  market: string;
  total_trades: number;
  win_rate: number;
  status: 'LIVE' | 'PAUSED' | 'INACTIVE';
  realised_pnl: number;
  description?: string;
};

export type Order = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  order_type: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  price?: number;
  trigger_price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'PARTIAL';
  strategy_name: string;
  broker: string;
  created_at: string;
  filled_qty: number;
  avg_price?: number;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_HEALTH: HealthStatus = {
  status: 'degraded',
  services: {
    'API Gateway':    { status: 'healthy',   latency_ms: 2   },
    'Celery Workers': { status: 'healthy',   latency_ms: 5   },
    'Redis Broker':   { status: 'healthy',   latency_ms: 1   },
    'PostgreSQL':     { status: 'healthy',   latency_ms: 4   },
    'NSE Gateway':    { status: 'healthy',   latency_ms: 28  },
    'US Gateway':     { status: 'degraded',  latency_ms: 312 },
    'Crypto Gateway': { status: 'healthy',   latency_ms: 45  },
  },
  version: '2.4.1',
};

const MOCK_METRICS: Metrics = {
  total_trades: 179,
  open_positions: 4,
  realised_pnl: 12960,
  unrealised_pnl: 10092.5,
  win_rate: 71.1,
  max_drawdown: -2.3,
  net_exposure_pct: 67,
  margin_used: 320000,
  margin_available: 180400,
};

const MOCK_TRADES: Trade[] = [
  { id: 'TRD-8821', symbol: 'NIFTY 25000 CE', side: 'BUY',  qty: 50,   entry_price: 182.50, ltp: 204.75, pnl: +1112.50,  strategy_name: 'RSI_Breakout',   status: 'OPEN',   created_at: '2025-04-19T09:15:00Z', market: 'NSE'    },
  { id: 'TRD-8820', symbol: 'BANKNIFTY FUT',  side: 'SELL', qty: 25,   entry_price: 48320,  ltp: 47980,  pnl: +8500.00,  strategy_name: 'MeanRevert_BN',  status: 'OPEN',   created_at: '2025-04-19T09:22:00Z', market: 'NSE'    },
  { id: 'TRD-8819', symbol: 'AAPL 220C',      side: 'BUY',  qty: 10,   entry_price: 4.20,   ltp: 3.85,   pnl: -350.00,   strategy_name: 'IV_Crush',       status: 'OPEN',   created_at: '2025-04-19T14:10:00Z', market: 'US'     },
  { id: 'TRD-8818', symbol: 'BTC-USDT PERP',  side: 'BUY',  qty: 0.5,  entry_price: 67240,  ltp: 68900,  pnl: +830.00,   strategy_name: 'Trend_Crypto',   status: 'OPEN',   created_at: '2025-04-19T11:05:00Z', market: 'CRYPTO' },
  { id: 'TRD-8817', symbol: 'NIFTY 24800 PE', side: 'SELL', qty: 100,  entry_price: 95.00,  ltp: 0,      pnl: +9500.00,  strategy_name: 'RSI_Breakout',   status: 'CLOSED', created_at: '2025-04-18T15:20:00Z', market: 'NSE'    },
  { id: 'TRD-8816', symbol: 'TSLA 250P',      side: 'BUY',  qty: 20,   entry_price: 8.40,   ltp: 0,      pnl: -1680.00,  strategy_name: 'Earnings_Strat', status: 'CLOSED', created_at: '2025-04-17T13:45:00Z', market: 'US'     },
  { id: 'TRD-8815', symbol: 'ETH-USDT PERP',  side: 'SELL', qty: 2,    entry_price: 3180,   ltp: 0,      pnl: +740.00,   strategy_name: 'Trend_Crypto',   status: 'CLOSED', created_at: '2025-04-17T10:00:00Z', market: 'CRYPTO' },
  { id: 'TRD-8814', symbol: 'RELIANCE FUT',   side: 'BUY',  qty: 250,  entry_price: 2942,   ltp: 0,      pnl: +12500.00, strategy_name: 'MeanRevert_BN',  status: 'CLOSED', created_at: '2025-04-16T09:30:00Z', market: 'NSE'    },
];

const MOCK_STRATEGIES: Strategy[] = [
  { id: 's1', name: 'RSI_Breakout',   market: 'NSE',    total_trades: 142, win_rate: 71.1, status: 'LIVE',     realised_pnl: 84200,  description: 'Breakout on RSI divergence with volume confirmation on Nifty options.' },
  { id: 's2', name: 'MeanRevert_BN',  market: 'NSE',    total_trades: 89,  win_rate: 68.5, status: 'LIVE',     realised_pnl: 61800,  description: 'Mean-reversion strategy on BankNifty futures using Bollinger Bands.' },
  { id: 's3', name: 'IV_Crush',       market: 'US EQ',  total_trades: 56,  win_rate: 62.3, status: 'LIVE',     realised_pnl: 28400,  description: 'Sells premium ahead of earnings events, profits from IV collapse.' },
  { id: 's4', name: 'Trend_Crypto',   market: 'CRYPTO', total_trades: 203, win_rate: 58.9, status: 'LIVE',     realised_pnl: 47600,  description: 'Trend-following on BTC/ETH perps using EMA crossover with ATR stops.' },
  { id: 's5', name: 'Earnings_Strat', market: 'US EQ',  total_trades: 31,  win_rate: 45.2, status: 'PAUSED',   realised_pnl: -4100,  description: 'Directional bets on earnings surprises. Paused for recalibration.' },
  { id: 's6', name: 'Arb_Delta',      market: 'NSE',    total_trades: 0,   win_rate: 0,    status: 'INACTIVE', realised_pnl: 0,      description: 'Delta-neutral arbitrage between futures and options. Under development.' },
];

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-2201', symbol: 'NIFTY 25000 CE', side: 'BUY',  qty: 50,  order_type: 'MARKET', status: 'FILLED',    strategy_name: 'RSI_Breakout',  broker: 'Zerodha', created_at: '2025-04-19T09:15:00Z', filled_qty: 50,  avg_price: 182.50  },
  { id: 'ORD-2200', symbol: 'BANKNIFTY FUT',  side: 'SELL', qty: 25,  order_type: 'MARKET', status: 'FILLED',    strategy_name: 'MeanRevert_BN', broker: 'Zerodha', created_at: '2025-04-19T09:22:00Z', filled_qty: 25,  avg_price: 48320   },
  { id: 'ORD-2199', symbol: 'AAPL 220C',      side: 'BUY',  qty: 10,  order_type: 'LIMIT',  status: 'FILLED',    strategy_name: 'IV_Crush',      broker: 'Alpaca',  created_at: '2025-04-19T14:10:00Z', filled_qty: 10,  avg_price: 4.20, price: 4.25  },
  { id: 'ORD-2198', symbol: 'BTC-USDT PERP',  side: 'BUY',  qty: 0.5, order_type: 'MARKET', status: 'FILLED',    strategy_name: 'Trend_Crypto',  broker: 'Binance', created_at: '2025-04-19T11:05:00Z', filled_qty: 0.5, avg_price: 67240   },
  { id: 'ORD-2197', symbol: 'TSLA 260C',      side: 'BUY',  qty: 5,   order_type: 'LIMIT',  status: 'CANCELLED', strategy_name: 'IV_Crush',      broker: 'Alpaca',  created_at: '2025-04-19T13:00:00Z', filled_qty: 0,   price: 2.80        },
  { id: 'ORD-2196', symbol: 'NIFTY 24800 PE', side: 'SELL', qty: 100, order_type: 'MARKET', status: 'FILLED',    strategy_name: 'RSI_Breakout',  broker: 'Zerodha', created_at: '2025-04-18T15:20:00Z', filled_qty: 100, avg_price: 95.00   },
  { id: 'ORD-2195', symbol: 'ETH-USDT PERP',  side: 'SELL', qty: 2,   order_type: 'SL-M',   status: 'FILLED',    strategy_name: 'Trend_Crypto',  broker: 'Binance', created_at: '2025-04-17T10:00:00Z', filled_qty: 2,   avg_price: 3180, trigger_price: 3170 },
  { id: 'ORD-2194', symbol: 'RELIANCE FUT',   side: 'BUY',  qty: 250, order_type: 'MARKET', status: 'FILLED',    strategy_name: 'MeanRevert_BN', broker: 'Zerodha', created_at: '2025-04-16T09:30:00Z', filled_qty: 250, avg_price: 2942    },
];

// ─── Public API ───────────────────────────────────────────────────────────────
export const apiClient = {
  get,
  post,
  health:     () => get<HealthStatus>('/system/health', MOCK_HEALTH),
  metrics:    () => get<Metrics>('/data/metrics', MOCK_METRICS),
  trades:     () => get<Trade[]>('/trades', MOCK_TRADES),
  strategies: () => get<Strategy[]>('/strategies', MOCK_STRATEGIES),
  orders:     () => get<Order[]>('/orders', MOCK_ORDERS),

  triggerWebhook: (payload: { signal: string; symbol: string; strategy_name: string; risk?: number }) =>
    post<{ task_id: string; status: string }>('/webhook', payload),

  toggleStrategy: (id: string, status: 'LIVE' | 'PAUSED') =>
    post<Strategy>(`/strategies/${id}/toggle`, { status }),

  squareOff: (tradeId: string) =>
    post<{ status: string }>(`/trades/${tradeId}/square-off`, {}),
};

export const api = apiClient;


