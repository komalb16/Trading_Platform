"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// AI Copilot types
// ─────────────────────────────────────────────────────────────────────────────
interface AiMessage { role: "user" | "assistant"; content: string; }
interface NewsItem { headline: string; summary: string; source: string; time: string; url: string; sentiment: "positive" | "negative" | "neutral"; }
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, ReferenceLine, ComposedChart, Line, Area, AreaChart,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Market = "US" | "INDIA" | "CRYPTO";
type Sector = "TECH" | "BANKING" | "AI" | "INFRA" | "SEMI" | "OTHER";
type ChartRange = "1m" | "2m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";
type ChartType = "AREA" | "CANDLE" | "LINE" | "BAR";
type OrderSide = "BUY" | "SELL";
type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
type MainTab = "CHART" | "STRATEGY" | "SCREENER" | "ALERTS" | "PORTFOLIO" | "PAPER" | "BACKTEST";
import { useFinnhubWS } from "@/hooks/useFinnhubWS";
type RightTab = "ORDER" | "OPTIONS" | "BROKERS" | null;
type IndicatorId = "SMA20" | "SMA50" | "EMA20" | "BB" | "RSI" | "MACD" | "VWAP" | "ATR" | "STOCH";

interface Quote {
  symbol: string; name: string; price: number; change: number; changePct: number;
  open: number; high: number; low: number; prevClose: number;
  volume: number; avgVolume: number; mktCap: number; pe: number | null;
  high52w: number; low52w: number; currency: string; exchange: string; market: Market;
}
interface TapeItem { s: string; sym: string; v: string; c: string; up: boolean; raw: number; }
interface SearchResult { symbol: string; name: string; exchange: string; type: string; market: Market; }
interface ChartPoint { time: string; price: number; volume: number; open?: number; high?: number; low?: number; }
interface OptionLeg { bid: number; ask: number; last: number; iv: number; delta: number; gamma: number; theta: number; vega: number; openInterest: number; volume: number; }
interface OptionRow { strike: number; call: OptionLeg | null; put: OptionLeg | null; isATM: boolean; }
interface Broker { id: string; name: string; logo: string; markets: Market[]; status: "connected" | "disconnected"; color: string; desc: string; apiKeyLabel: string; }

interface SavedStrategy { id: string; name: string; code: string; savedAt: string; }

interface Alert {
  id: string; symbol: string; market: Market;
  type: "PRICE" | "RSI" | "MACD" | "VOLUME" | "OPTION";
  condition: "ABOVE" | "BELOW" | "CROSS_UP" | "CROSS_DOWN";
  price: number; indicator?: string; message: string;
  action: "NOTIFY" | "BUY" | "SELL" | "PAPER_BUY" | "PAPER_SELL" | "OPTION_BUY";
  qty: number; orderType: OrderType;
  optionStrike?: number; optionExpiry?: string; optionType?: "CALL" | "PUT";
  active: boolean; triggered: boolean; createdAt: string;
}

interface PaperPosition {
  id: string; symbol: string; side: "LONG" | "SHORT"; qty: number;
  entryPrice: number; currentPrice: number; pnl: number; pnlPct: number;
  entryTime: string; market: Market;
  stopLoss?: number; takeProfit?: number;
}
interface PaperOrder { id: string; symbol: string; side: OrderSide; qty: number; orderType: OrderType; price: number; status: "PENDING" | "FILLED" | "CANCELLED"; time: string; pnl?: number; }

interface BacktestResult {
  totalTrades: number; winRate: number; totalReturn: number; maxDrawdown: number;
  sharpeRatio: number; avgWin: number; avgLoss: number; profitFactor: number;
  trades: { date: string; side: string; price: number; pnl: number; pnlPct: number }[];
  equityCurve: { time: string; equity: number }[];
}

interface ScreenerRow { symbol: string; name: string; price: number; changePct: number; volume: string; mktCap: string; pe: string; rsi: number; signal: "BUY" | "SELL" | "NEUTRAL"; sector: Sector; }

interface AgentTechnicalResponse { signal: "BUY" | "SELL" | "HOLD"; confidence: number; reasoning: string; }
interface AgentSectorResponse { signal: "BULLISH" | "BEARISH" | "NEUTRAL"; confidence: number; reasoning: string; }
interface AgentRiskResponse { approved: boolean; suggestedPositionSizeUSD: number; suggestedStopLoss: number; reasoning: string; }
interface AgentCioResponse { finalSignal: "BUY" | "SELL" | "HOLD"; entryPrice: number | null; takeProfit: number | null; stopLoss: number | null; executiveSummary: string; }

interface MultiAgentAnalysis {
  technical: AgentTechnicalResponse | null;
  sector: AgentSectorResponse | null;
  risk: AgentRiskResponse | null;
  cio: AgentCioResponse | null;
  loading: string | null;
  error: string | null;
}

// Custom indicator parameters (user-editable)
interface IndParams {
  sma1Period: number;   // first SMA period (default 20)
  sma2Period: number;   // second SMA period (default 50)
  emaPeriod: number;   // EMA period (default 20)
  rsiPeriod: number;   // RSI period (default 14)
  bbPeriod: number;   // Bollinger period (default 20)
  bbStdDev: number;   // Bollinger std-dev multiplier (default 2)
  macdFast: number;   // MACD fast EMA (default 12)
  macdSlow: number;   // MACD slow EMA (default 26)
  macdSignal: number;   // MACD signal EMA (default 9)
  stochK: number;   // Stochastic %K period (default 14)
  stochD: number;   // Stochastic %D smoothing (default 3)
  atrPeriod: number;   // ATR period (default 14)
}
const DEFAULT_IND_PARAMS: IndParams = {
  sma1Period: 20, sma2Period: 50, emaPeriod: 20,
  rsiPeriod: 14, bbPeriod: 20, bbStdDev: 2,
  macdFast: 12, macdSlow: 26, macdSignal: 9,
  stochK: 14, stochD: 3, atrPeriod: 14,
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
// Timeframe groups for TradingView-style toolbar
const TIMEFRAME_GROUPS = [
  { label: "Intraday", tfs: ["1m", "2m", "5m", "15m", "30m", "1h", "4h"] as ChartRange[] },
  { label: "Daily+", tfs: ["1D", "1W", "1M", "3M", "1Y", "5Y"] as ChartRange[] },
];

const RANGE_MAP: Record<ChartRange, { interval: string; period: string }> = {
  "1m": { interval: "1m", period: "1d" },
  "2m": { interval: "2m", period: "1d" },
  "5m": { interval: "5m", period: "5d" },
  "15m": { interval: "15m", period: "5d" },
  "30m": { interval: "30m", period: "1mo" },
  "1h": { interval: "60m", period: "1mo" },
  "4h": { interval: "60m", period: "3mo" }, // Yahoo doesn't have 4h; use 1h with 3mo
  "1D": { interval: "1d", period: "1y" },
  "1W": { interval: "1wk", period: "2y" },
  "1M": { interval: "1mo", period: "5y" },
  "3M": { interval: "1d", period: "3mo" },
  "1Y": { interval: "1d", period: "1y" },
  "5Y": { interval: "1wk", period: "5y" },
};
// Backtest always forces daily bars for enough data, regardless of chart range
const BT_RANGE_MAP: Record<ChartRange, { interval: string; period: string; label: string }> = {
  "1m": { interval: "1d", period: "3mo", label: "3 Months (daily)" },
  "2m": { interval: "1d", period: "3mo", label: "3 Months (daily)" },
  "5m": { interval: "1d", period: "3mo", label: "3 Months (daily)" },
  "15m": { interval: "1d", period: "6mo", label: "6 Months (daily)" },
  "30m": { interval: "1d", period: "6mo", label: "6 Months (daily)" },
  "1h": { interval: "1d", period: "1y", label: "1 Year (daily)" },
  "4h": { interval: "1d", period: "1y", label: "1 Year (daily)" },
  "1D": { interval: "1d", period: "1y", label: "1 Year (daily)" },
  "1W": { interval: "1d", period: "2y", label: "2 Years (daily)" },
  "1M": { interval: "1d", period: "2y", label: "2 Years (daily)" },
  "3M": { interval: "1d", period: "2y", label: "2 Years (daily)" },
  "1Y": { interval: "1d", period: "5y", label: "5 Years (daily)" },
  "5Y": { interval: "1wk", period: "10y", label: "10 Years (weekly)" },
};

const INDICATOR_META: { id: IndicatorId; label: string; color: string; panel: "main" | "sub"; tooltip: string }[] = [
  { id: "SMA20", label: "SMA 20", color: "#f59e0b", panel: "main", tooltip: "Simple Moving Average (20 periods). Price above SMA → uptrend. Price below → downtrend. Crossover of fast/slow SMA gives buy/sell signals." },
  { id: "SMA50", label: "SMA 50", color: "#818cf8", panel: "main", tooltip: "SMA 50 acts as a medium-term trend line. Golden Cross (SMA20 crosses above SMA50) = BUY signal. Death Cross (SMA20 below SMA50) = SELL signal." },
  { id: "EMA20", label: "EMA 20", color: "#34d399", panel: "main", tooltip: "Exponential MA reacts faster to price changes than SMA. Price bouncing off EMA20 in an uptrend = BUY. Breaking below EMA20 = weakness." },
  { id: "BB", label: "Bollinger Bands", color: "#94a3b8", panel: "main", tooltip: "Price near upper band = overbought (potential SELL). Price near lower band = oversold (potential BUY). Squeeze (bands narrowing) often precedes a big breakout." },
  { id: "VWAP", label: "VWAP", color: "#f472b6", panel: "main", tooltip: "Volume-Weighted Average Price. Institutional benchmark. Price above VWAP = bullish bias (BUY). Price below = bearish (SELL). Most relevant on intraday charts." },
  { id: "RSI", label: "RSI", color: "#60a5fa", panel: "sub", tooltip: "Relative Strength Index (0–100). RSI > 70 = Overbought → consider SELL. RSI < 30 = Oversold → consider BUY. RSI crossing 50 upward = bullish momentum." },
  { id: "MACD", label: "MACD", color: "#4ade80", panel: "sub", tooltip: "MACD line crossing above signal line = BUY. Crossing below = SELL. Green histogram = growing bullish momentum. Red histogram = bearish. Divergence from price is a strong signal." },
  { id: "STOCH", label: "Stoch", color: "#fb923c", panel: "sub", tooltip: "Stochastic Oscillator (0–100). %K > 80 = Overbought. %K < 20 = Oversold. %K crossing above %D = BUY. %K crossing below %D = SELL. Most reliable in ranging markets." },
  { id: "ATR", label: "ATR", color: "#e879f9", panel: "sub", tooltip: "Average True Range measures volatility. High ATR = large price swings, widen your stop losses. Low ATR = calm market, tighter stops OK. Use for position sizing." },
];

const BROKERS_STATIC: Broker[] = [
  { id: "zerodha", name: "Zerodha", logo: "Z", markets: ["INDIA"], status: "disconnected", color: "#387ED1", desc: "Kite Connect API.", apiKeyLabel: "Kite API Key" },
  { id: "angel", name: "Angel One", logo: "A", markets: ["INDIA"], status: "disconnected", color: "#E94D35", desc: "Smart API streaming.", apiKeyLabel: "Angel Smart API Key" },
  { id: "upstox", name: "Upstox", logo: "U", markets: ["INDIA"], status: "disconnected", color: "#6C3CE1", desc: "Upstox API v2.", apiKeyLabel: "Upstox API Key" },
  { id: "fyers", name: "Fyers", logo: "F", markets: ["INDIA"], status: "disconnected", color: "#00C896", desc: "Options flow API.", apiKeyLabel: "Fyers App ID" },
  { id: "dhan", name: "Dhan", logo: "DH", markets: ["INDIA"], status: "disconnected", color: "#8E44AD", desc: "DhanHQ API.", apiKeyLabel: "Dhan Access Token" },
  { id: "alpaca", name: "Alpaca", logo: "AP", markets: ["US"], status: "disconnected", color: "#FEBD69", desc: "Paper + live trading.", apiKeyLabel: "Alpaca API Key" },
  { id: "ibkr", name: "IBKR", logo: "IB", markets: ["US", "INDIA"], status: "disconnected", color: "#E8001C", desc: "TWS API.", apiKeyLabel: "IBKR OAuth Token" },
  { id: "tradier", name: "Tradier", logo: "TR", markets: ["US"], status: "disconnected", color: "#2ECC71", desc: "REST + options chain.", apiKeyLabel: "Tradier Token" },
  { id: "robinhood", name: "Robinhood", logo: "RH", markets: ["US"], status: "disconnected", color: "#00C805", desc: "No-fee trading.", apiKeyLabel: "Robinhood Auth" },
  { id: "schwab", name: "Schwab", logo: "CS", markets: ["US"], status: "disconnected", color: "#0085CA", desc: "Institutional API.", apiKeyLabel: "Schwab App ID" },
  { id: "binance", name: "Binance", logo: "BN", markets: ["CRYPTO"], status: "disconnected", color: "#F3BA2F", desc: "Spot + futures.", apiKeyLabel: "Binance API Key" },
  { id: "coinbase", name: "Coinbase", logo: "CB", markets: ["CRYPTO"], status: "disconnected", color: "#0052FF", desc: "Advanced Trade API.", apiKeyLabel: "Coinbase API Key" },
  { id: "kraken", name: "Kraken", logo: "K", markets: ["CRYPTO"], status: "disconnected", color: "#5841D8", desc: "Professional trading.", apiKeyLabel: "Kraken API Key" },
  { id: "bybit", name: "Bybit", logo: "BB", markets: ["CRYPTO"], status: "disconnected", color: "#f7a600", desc: "Derivatives focus.", apiKeyLabel: "Bybit API Key" },
];

const DEFAULT_WATCHLIST: Record<Market, { sector: Sector; symbols: string[] }[]> = {
  US: [
    { sector: "TECH", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "META"] },
    { sector: "SEMI", symbols: ["NVDA", "AMD", "TSM", "AVGO", "INTC"] },
    { sector: "AI", symbols: ["PLTR", "C3AI", "PATH", "SOUN"] },
    { sector: "BANKING", symbols: ["JPM", "BAC", "GS", "MS", "C"] },
    { sector: "INFRA", symbols: ["CAT", "DE", "VMC", "URI"] },
    { sector: "OTHER", symbols: ["TSLA", "V", "NFLX", "DIS"] }
  ],
  INDIA: [
    { sector: "TECH", symbols: ["TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS"] },
    { sector: "BANKING", symbols: ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS"] },
    { sector: "OTHER", symbols: ["RELIANCE.NS", "LT.NS", "BAJFINANCE.NS", "MARUTI.NS"] }
  ],
  CRYPTO: [
    { sector: "OTHER", symbols: ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD", "ADA-USD", "AVAX-USD"] }
  ],
};

const TAPE_SYMBOLS = [
  { s: "CRUDE", sym: "CL=F", prefix: "$" }, { s: "DXY", sym: "DX-Y.NYB" }, { s: "USD/INR", sym: "INR=X" },
  { s: "EUR/USD", sym: "EURUSD=X" }, { s: "10Y", sym: "^TNX" }, { s: "SPX", sym: "^GSPC" },
  { s: "NDX", sym: "^NDX" }, { s: "DJI", sym: "^DJI" }, { s: "VIX", sym: "^VIX" },
  { s: "NIFTY", sym: "^NSEI" }, { s: "BTC", sym: "BTC-USD", prefix: "$" }, { s: "ETH", sym: "ETH-USD", prefix: "$" },
  { s: "GOLD", sym: "GC=F", prefix: "$" }, { s: "SENSEX", sym: "^BSESN" },
];

const DEFAULT_STRATEGY = `// ProChart Strategy Script (Pine Script v5)
// Edit values below and click "Run Backtest"

strategy("Golden Cross + RSI Filter", overlay=true, initial_capital=10000)

// ── Inputs ─────────────────────────────────────
fast_length    = input(20,  "Fast SMA Length")
slow_length    = input(50,  "Slow SMA Length")
rsi_length     = input(14,  "RSI Length")
rsi_overbought = input(70,  "RSI Overbought")
rsi_oversold   = input(30,  "RSI Oversold")
stop_pct       = input(3,   "Stop Loss %")
tp_pct         = input(6,   "Take Profit %")

// ── Indicators ─────────────────────────────────
fast_ma = sma(close, fast_length)
slow_ma = sma(close, slow_length)
rsi_val = rsi(close, rsi_length)

// ── Signals ────────────────────────────────────
long_signal  = crossover(fast_ma, slow_ma) and rsi_val < rsi_overbought
short_signal = crossunder(fast_ma, slow_ma) and rsi_val > rsi_oversold

// ── Orders ─────────────────────────────────────
if long_signal
    strategy.entry("Long", strategy.long, qty=1)

if short_signal
    strategy.close("Long")

// ── Stop Loss / Take Profit ────────────────────
strategy.exit("Exit", "Long", stop=close*(1-stop_pct/100), limit=close*(1+tp_pct/100))

// ── Plots ──────────────────────────────────────
plot(fast_ma, color=color.yellow, title="Fast MA")
plot(slow_ma, color=color.purple, title="Slow MA")
`;

// ─────────────────────────────────────────────────────────────────────────────
// Technical indicator calculations
// ─────────────────────────────────────────────────────────────────────────────
function calcSMA(data: number[], n: number): (number | null)[] {
  return data.map((_, i) => i < n - 1 ? null : data.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n);
}
function calcEMA(data: number[], n: number): (number | null)[] {
  if (data.length < n) return data.map(() => null);
  const k = 2 / (n + 1); const r: (number | null)[] = new Array(n - 1).fill(null);
  let e = data.slice(0, n).reduce((a, b) => a + b, 0) / n; r.push(e);
  for (let i = n; i < data.length; i++) { e = data[i] * k + e * (1 - k); r.push(parseFloat(e.toFixed(4))); }
  return r;
}
function calcRSI(data: number[], n = 14): (number | null)[] {
  if (data.length <= n) return data.map(() => null);
  const r: (number | null)[] = new Array(n).fill(null);
  let ag = 0, al = 0;
  for (let i = 1; i <= n; i++) { const d = data[i] - data[i - 1]; d > 0 ? ag += d : al += Math.abs(d); }
  ag /= n; al /= n;
  r.push(parseFloat((100 - 100 / (1 + (al === 0 ? Infinity : ag / al))).toFixed(2)));
  for (let i = n + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    ag = (ag * (n - 1) + (d > 0 ? d : 0)) / n; al = (al * (n - 1) + (d < 0 ? Math.abs(d) : 0)) / n;
    r.push(parseFloat((100 - 100 / (1 + (al === 0 ? Infinity : ag / al))).toFixed(2)));
  }
  return r;
}
function calcBB(data: number[], n = 20, m = 2): { upper: (number | null)[]; lower: (number | null)[]; mid: (number | null)[] } {
  const mid = calcSMA(data, n);
  const upper = mid.map((mv, i) => { if (mv === null) return null; const sl = data.slice(i - n + 1, i + 1); const std = Math.sqrt(sl.reduce((a, b) => a + Math.pow(b - mv, 2), 0) / n); return parseFloat((mv + m * std).toFixed(2)); });
  const lower = mid.map((mv, i) => { if (mv === null) return null; const sl = data.slice(i - n + 1, i + 1); const std = Math.sqrt(sl.reduce((a, b) => a + Math.pow(b - mv, 2), 0) / n); return parseFloat((mv - m * std).toFixed(2)); });
  return { upper, lower, mid };
}
function calcMACD(data: number[], fast = 12, slow = 26, signal = 9): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const e12 = calcEMA(data, fast) as (number | null)[];
  const e26 = calcEMA(data, slow) as (number | null)[];
  const macd = e12.map((v, i) => (v !== null && e26[i] !== null) ? parseFloat((v - e26[i]!).toFixed(4)) : null);
  const valid = macd.filter((v): v is number => v !== null);
  const rawSig = calcEMA(valid, signal);
  const sig: (number | null)[] = [];
  let si = 0;
  macd.forEach(v => { if (v !== null) { sig.push(rawSig[si++]); } else sig.push(null); });
  const hist = macd.map((v, i) => (v !== null && sig[i] !== null) ? parseFloat((v - sig[i]!).toFixed(4)) : null);
  return { macd, signal: sig, hist };
}
function calcVWAP(data: ChartPoint[]): (number | null)[] {
  let cpv = 0, cv = 0;
  return data.map(d => { if (!d.volume) return null; const tp = ((d.high ?? d.price) + (d.low ?? d.price) + d.price) / 3; cpv += tp * d.volume; cv += d.volume; return cv ? parseFloat((cpv / cv).toFixed(2)) : null; });
}
function calcStoch(data: ChartPoint[], k = 14, d = 3): { k: (number | null)[]; d: (number | null)[] } {
  const kv: (number | null)[] = data.map((_, i) => {
    if (i < k - 1) return null;
    const sl = data.slice(i - k + 1, i + 1);
    const h = Math.max(...sl.map(x => x.high ?? x.price));
    const l = Math.min(...sl.map(x => x.low ?? x.price));
    return h === l ? 50 : parseFloat(((data[i].price - l) / (h - l) * 100).toFixed(2));
  });
  const dv = calcSMA(kv.filter((v): v is number => v !== null), d);
  const dFull: (number | null)[] = [];
  let di = 0; kv.forEach(v => { if (v !== null) { dFull.push(dv[di++]); } else dFull.push(null); });
  return { k: kv, d: dFull };
}
function calcATR(data: ChartPoint[], n = 14): (number | null)[] {
  if (data.length < 2) return data.map(() => null);
  const tr = data.map((d, i) => { if (i === 0) return d.high && d.low ? d.high - d.low : 0; const ph = data[i - 1].high ?? data[i - 1].price; const pl = data[i - 1].low ?? data[i - 1].price; const h = d.high ?? d.price; const l = d.low ?? d.price; return Math.max(h - l, Math.abs(h - ph), Math.abs(l - ph)); });
  const r: (number | null)[] = new Array(n - 1).fill(null);
  let atr = tr.slice(0, n).reduce((a, b) => a + b, 0) / n; r.push(parseFloat(atr.toFixed(4)));
  for (let i = n; i < data.length; i++) { atr = (atr * (n - 1) + tr[i]) / n; r.push(parseFloat(atr.toFixed(4))); }
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backtester — fixed: uses daily bars, null-safe guards, parse SL/TP from code
// ─────────────────────────────────────────────────────────────────────────────
function runBacktest(data: ChartPoint[], code: string): BacktestResult {
  const empty: BacktestResult = { totalTrades: 0, winRate: 0, totalReturn: 0, maxDrawdown: 0, sharpeRatio: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, trades: [], equityCurve: [] };
  if (data.length < 20) return empty;

  const get = (rx: RegExp, def: number) => { const m = code.match(rx); return m ? parseFloat(m[1]) : def; };
  const fastLen = get(/fast_length\s*=\s*input\((\d+)/, 20);
  const slowLen = get(/slow_length\s*=\s*input\((\d+)/, 50);
  const rsiLen = get(/rsi_length\s*=\s*input\((\d+)/, 14);
  const rsiOB = get(/rsi_overbought\s*=\s*input\((\d+)/, 70);
  const rsiOS = get(/rsi_oversold\s*=\s*input\((\d+)/, 30);
  const slPct = get(/stop_pct\s*=\s*input\((\d+)/, 3);
  const tpPct = get(/tp_pct\s*=\s*input\((\d+)/, 6);

  const closes = data.map(d => d.price);
  // Auto-scale parameters if data is too short
  const effectiveFast = Math.min(fastLen, Math.floor(data.length / 4));
  const effectiveSlow = Math.min(slowLen, Math.floor(data.length / 2));
  const effectiveRSI = Math.min(rsiLen, Math.floor(data.length / 5));
  const fast2 = calcSMA(closes, effectiveFast);
  const slow2 = calcSMA(closes, effectiveSlow);
  const rsi2 = calcRSI(closes, effectiveRSI);
  const warmup = Math.max(effectiveSlow, effectiveRSI) + 2;
  let equity = 10000, position = 0, entryPrice = 0, entryIdx = 0;
  let peak = equity, maxDD = 0, wins = 0, losses = 0, totalWin = 0, totalLoss = 0;
  const trades: BacktestResult["trades"] = [];
  const curve: BacktestResult["equityCurve"] = [];

  const closePos = (i: number, label: string) => {
    const px = closes[i];
    const pnl = (px - entryPrice) * position;
    equity += pnl;
    pnl > 0 ? (wins++, totalWin += pnl) : (losses++, totalLoss += Math.abs(pnl));
    trades.push({ date: data[i].time, side: label, price: px, pnl: parseFloat(pnl.toFixed(2)), pnlPct: parseFloat(((px / entryPrice - 1) * 100).toFixed(2)) });
    position = 0;
  };

  for (let i = warmup; i < data.length; i++) {
    const fc = fast2[i], fp = fast2[i - 1], sc = slow2[i], sp = slow2[i - 1], rv = rsi2[i];
    if (fc === null || fp === null || sc === null || sp === null || rv === null) continue;

    if (position > 0) {
      const px = closes[i];
      if (px <= entryPrice * (1 - slPct / 100)) { closePos(i, "SL"); }
      else if (px >= entryPrice * (1 + tpPct / 100)) { closePos(i, "TP"); }
    }
    if (position === 0) {
      const crossUp = fp <= sp && fc > sc;
      if (crossUp && rv < rsiOB) { position = Math.max(1, Math.floor(equity / closes[i])); entryPrice = closes[i]; entryIdx = i; }
    } else {
      const crossDown = fp >= sp && fc < sc;
      if (crossDown && rv > rsiOS) { closePos(i, "SELL"); }
    }

    if (equity > peak) peak = equity;
    const dd = ((peak - equity) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
    curve.push({ time: data[i].time, equity: parseFloat(equity.toFixed(2)) });
  }
  if (position > 0) closePos(data.length - 1, "CLOSE");

  const tot = wins + losses;
  const retPct = parseFloat(((equity - 10000) / 100).toFixed(2));
  const rets = curve.map((e, i) => i === 0 ? 0 : (e.equity - curve[i - 1].equity) / curve[i - 1].equity);
  const avg = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1);
  const std = Math.sqrt(rets.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / Math.max(rets.length, 1));
  return {
    totalTrades: tot, winRate: tot ? parseFloat(((wins / tot) * 100).toFixed(1)) : 0,
    totalReturn: retPct, maxDrawdown: parseFloat(maxDD.toFixed(2)),
    sharpeRatio: std ? parseFloat(((avg / std) * Math.sqrt(252)).toFixed(2)) : 0,
    avgWin: wins ? parseFloat((totalWin / wins).toFixed(2)) : 0,
    avgLoss: losses ? parseFloat((totalLoss / losses).toFixed(2)) : 0,
    profitFactor: totalLoss ? parseFloat((totalWin / totalLoss).toFixed(2)) : 0,
    trades: trades.slice(-100), equityCurve: curve,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters & helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined, d = 2) => (n == null || isNaN(n as number)) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtCmp = (n: number) => { if (!n || isNaN(n)) return "—"; if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`; if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`; if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`; return n.toLocaleString("en-US"); };
const fmtExp = (iso: string) => { const [y, m, d] = iso.split("-"); const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return `${parseInt(d)} ${mo[parseInt(m) - 1]} ${y.slice(2)}`; };
const cs = (q: Quote | null) => q?.currency === "INR" ? "₹" : "$";
const uid = () => Math.random().toString(36).slice(2, 9);
const dispSym = (s: string) => s.replace(".NS", "").replace("-USD", "");

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────
async function fetchQuote(sym: string): Promise<Quote | null> { try { const r = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" }); return r.ok ? r.json() : null; } catch { return null; } }
async function fetchChart(sym: string, range: ChartRange): Promise<ChartPoint[]> { try { const { interval, period } = RANGE_MAP[range]; const r = await fetch(`/api/chart?symbol=${encodeURIComponent(sym)}&range=${range}&interval=${interval}&period=${period}`); return r.ok ? r.json() : []; } catch { return []; } }
async function searchSymbols(q: string, mkt: Market): Promise<SearchResult[]> { try { const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&market=${mkt}`); return r.ok ? r.json() : []; } catch { return []; } }
async function fetchOptions(sym: string, exp: string, mkt: Market): Promise<OptionRow[]> { if (mkt === "CRYPTO") return []; try { const r = await fetch(`/api/options?symbol=${encodeURIComponent(sym)}&expiry=${encodeURIComponent(exp)}&market=${mkt}`, { cache: "no-store" }); return r.ok ? r.json() : []; } catch { return []; } }
async function fetchOptionExpirations(sym: string, mkt: Market): Promise<string[]> { if (mkt === "CRYPTO") return []; try { const r = await fetch(`/api/options/expirations?symbol=${encodeURIComponent(sym)}&market=${mkt}`); return r.ok ? r.json() : []; } catch { return []; } }
async function fetchChartForBacktest(sym: string, range: ChartRange): Promise<ChartPoint[]> {
  try {
    const { interval, period } = BT_RANGE_MAP[range];
    const r = await fetch(`/api/chart?symbol=${encodeURIComponent(sym)}&range=${range}&interval=${interval}&period=${period}`);
    return r.ok ? r.json() : [];
  } catch { return []; }
}

async function fetchTapeData(): Promise<TapeItem[]> {
  try {
    const syms = TAPE_SYMBOLS.map(t => t.sym).join(",");
    const r = await fetch(`/api/tape?symbols=${encodeURIComponent(syms)}`, { cache: "no-store" });
    if (!r.ok) return [];
    const data: Record<string, { price: number; changePct: number }> = await r.json();
    return TAPE_SYMBOLS.map(t => {
      const d = data[t.sym]; if (!d) return null;
      const up = d.changePct >= 0, pfx = t.prefix ?? "", p = d.price;
      const v = pfx + (p >= 10000 ? p.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(2) : p.toFixed(4));
      return { s: t.s, sym: t.sym, v, c: `${up ? "+" : ""}${d.changePct.toFixed(2)}%`, up, raw: p };
    }).filter(Boolean) as TapeItem[];
  } catch { return []; }
}

// localStorage helpers for strategy persistence
const LS_KEY = "qt_strategies";
function loadStrategies(): SavedStrategy[] { try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; } }
function saveStrategy(s: SavedStrategy) { try { const all = loadStrategies().filter(x => x.id !== s.id); localStorage.setItem(LS_KEY, JSON.stringify([s, ...all].slice(0, 20))); } catch { } }
function deleteStrategy(id: string) { try { localStorage.setItem(LS_KEY, JSON.stringify(loadStrategies().filter(s => s.id !== id))); } catch { } }

// ─────────────────────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────────────────────
function Spinner({ small }: { small?: boolean }) { return <div className={`${small ? "w-3 h-3 border" : "w-6 h-6 border-2"} border-[#3b82f6] border-t-transparent rounded-full animate-spin flex-none`} />; };

function Stat({ l, v, flash }: { l: string; v: string; flash?: boolean }) {
  return (<div className="text-center px-2 flex-none"><div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap font-bold">{l}</div><div className={`font-mono text-[11px] mt-0.5 whitespace-nowrap transition-colors duration-500 ${flash ? "text-[#00d4aa]" : "text-[var(--text)]"}`}>{v}</div></div>);
}

// Indicator tooltip pill
function IndBtn({ ind, active, onToggle }: { ind: typeof INDICATOR_META[0]; active: boolean; onToggle: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <button onClick={onToggle} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        className={`text-[9px] px-2 py-0.5 rounded font-bold border transition-all ${active ? "text-white border-opacity-60" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"}`}
        style={active ? { borderColor: ind.color, color: ind.color, background: `${ind.color}15` } : {}}>
        {ind.label}
      </button>
      {show && (
        <div className="absolute top-6 left-0 z-50 w-64 bg-[#1a1f2e] border border-[#2a3150] rounded-lg p-3 shadow-2xl text-[10px] text-[#b0bec5] leading-relaxed pointer-events-none">
          <div className="text-white font-bold mb-1">{ind.label}</div>
          {ind.tooltip}
        </div>
      )}
    </div>
  );
}

// Candlestick bar (SVG-based since recharts doesn't have native candles)
interface ChartSignal { time: string; type: "BUY" | "SELL"; price: number; }
function CandlestickChart({ data, height, currency, signals = [] }: { data: ChartPoint[]; height: string; currency: string; signals?: ChartSignal[] }) {
  if (!data.length) return null;
  const w = 800, h = 300, pad = 50, topPad = 10;
  const prices = data.flatMap(d => [d.high ?? d.price, d.low ?? d.price]).filter(Boolean);
  const mn = Math.min(...prices), mx = Math.max(...prices), range = mx - mn || 1;
  const toY = (v: number) => topPad + (1 - (v - mn) / range) * (h - topPad - 20);
  const barW = Math.max(1, Math.min(8, Math.floor((w - pad) / (data.length * 1.4))));
  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Y grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const yv = mn + pct * range;
          const yp = toY(yv);
          return (<g key={pct}><line x1={pad} x2={w} y1={yp} y2={yp} stroke="#1a2040" strokeDasharray="3 3" /><text x={pad - 4} y={yp + 4} textAnchor="end" fontSize={9} fill="#4a5580">{currency}{yv >= 1000 ? (yv / 1000).toFixed(1) + "k" : yv.toFixed(2)}</text></g>);
        })}
        {/* Buy/Sell signal arrows (shown when strategy applied) */}
        {signals.map((sig, i) => {
          const di = data.findIndex(d => d.time === sig.time);
          if (di < 0) return null;
          const x = pad + (di / (data.length - 1 || 1)) * (w - pad);
          const py = sig.type === "BUY" ? toY(data[di].low ?? data[di].price) + 12 : toY(data[di].high ?? data[di].price) - 12;
          return (<g key={i}><polygon points={sig.type === "BUY" ? `${x},${py} ${x - 5},${py + 10} ${x + 5},${py + 10}` : `${x},${py} ${x - 5},${py - 10} ${x + 5},${py - 10}`} fill={sig.type === "BUY" ? "#00d4aa" : "#ff4757"} opacity={0.9} /><text x={x} y={sig.type === "BUY" ? py + 18 : py - 15} textAnchor="middle" fontSize={7} fill={sig.type === "BUY" ? "#00d4aa" : "#ff4757"}>{sig.type}</text></g>);
        })}
        {/* Candles */}
        {data.map((d, i) => {
          const x = pad + (i / (data.length - 1 || 1)) * (w - pad);
          const o = d.open ?? d.price, c = d.price, hi = d.high ?? Math.max(o, c), lo = d.low ?? Math.min(o, c);
          const bullish = c >= o; const clr = bullish ? "#00d4aa" : "#ff4757";
          const yO = toY(o), yC = toY(c), yH = toY(hi), yL = toY(lo);
          const bodyTop = Math.min(yO, yC), bodyH = Math.max(1, Math.abs(yO - yC));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={yH} y2={yL} stroke={clr} strokeWidth={Math.max(0.5, barW * 0.15)} />
              <rect x={x - barW / 2} y={bodyTop} width={Math.max(1, barW)} height={Math.max(1, bodyH)} fill={bullish ? "transparent" : clr} stroke={clr} strokeWidth={Math.max(0.5, barW * 0.12)} opacity={0.95} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LiveClock() {
  const [t, setT] = useState("");
  useEffect(() => { const tick = () => setT(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);
  return <span className="text-[10px] font-mono text-[#4a5580]">{t}</span>;
}

function TickerTape() {
  const [items, setItems] = useState<TapeItem[]>([]);
  const [flicker, setFlicker] = useState<Record<string, "up" | "down" | null>>({});
  const prev = useRef<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const refresh = useCallback(async () => {
    const fresh = await fetchTapeData(); if (!fresh.length) return;
    const nf: Record<string, "up" | "down" | null> = {};
    fresh.forEach(it => { const p = prev.current[it.sym]; if (p !== undefined && p !== it.raw) nf[it.sym] = it.raw > p ? "up" : "down"; prev.current[it.sym] = it.raw; });
    setItems(fresh); if (Object.keys(nf).length) { setFlicker(nf); setTimeout(() => setFlicker({}), 800); }
  }, []);
  useEffect(() => { refresh(); timer.current = setInterval(refresh, 5000); return () => { if (timer.current) clearInterval(timer.current); }; }, [refresh]);
  if (!items.length) return <div className="flex-none bg-[#080b17] border-b border-[#1a2040] h-7 flex items-center px-4 gap-6">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-3 rounded bg-[#1a2040] animate-pulse w-16" />)}</div>;
  return (
    <div className="flex-none bg-[#080b17] border-b border-[#1a2040] h-7 flex items-center overflow-hidden">
      <div className="flex gap-8 whitespace-nowrap pl-4 min-w-max animate-[tape_60s_linear_infinite]">
        {[...items, ...items, ...items].map((t, i) => { const fl = flicker[t.sym]; return (<span key={`${t.sym}-${i}`} className="flex items-center gap-1.5 text-[11px]"><span className="text-[#4a5580] font-semibold">{t.s}</span><span className={`font-mono transition-colors duration-300 ${fl === "up" ? "text-[#00d4aa]" : fl === "down" ? "text-[#ff4757]" : "text-white"}`}>{t.v}</span><span className={`font-mono ${t.up ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{t.c}</span></span>); })}
      </div>
      <style>{`@keyframes tape{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}`}</style>
    </div>
  );
}

function BrokerModal({ broker, onClose, onConnect }: { broker: Broker; onClose: () => void; onConnect: (id: string, key: string, secret: string) => void }) {
  const [key, setKey] = useState(""); const [secret, setSecret] = useState("");
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0d1020] border border-[#252d50] rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-none" style={{ background: broker.color }}>{broker.logo}</div><div><div className="text-white font-bold text-sm">{broker.name}</div><div className="text-[11px] text-[#4a5580]">{broker.desc}</div></div></div>
        <div className="space-y-3 mb-4">
          <div><label className="text-[10px] text-[#4a5580] uppercase tracking-wider block mb-1">{broker.apiKeyLabel}</label><input type="password" placeholder="API key…" value={key} onChange={e => setKey(e.target.value)} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#3b82f6] font-mono" /></div>
          <div><label className="text-[10px] text-[#4a5580] uppercase tracking-wider block mb-1">API Secret</label><input type="password" placeholder="Secret…" value={secret} onChange={e => setSecret(e.target.value)} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#3b82f6] font-mono" /></div>
        </div>
        <div className="bg-[#141728] border border-[#252d50] rounded-lg p-3 mb-4 text-[10px] text-[#4a5580]">🔒 Keys stored in your browser only — never sent to QuantTrade servers.</div>
        <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-[#141728] text-[#4a5580] text-xs font-semibold hover:text-white border border-[#252d50]">Cancel</button><button onClick={() => { if (key) onConnect(broker.id, key, secret); }} disabled={!key} className="flex-1 py-2.5 rounded-lg text-xs font-black disabled:opacity-30 text-white transition-all" style={{ background: broker.color }}>Connect {broker.name}</button></div>
      </div>
    </div>
  );
}

// ParamField — number input for indicator settings popup
function ParamField({ label, value, onChange, min, max, step = 1, isFloat = false, color }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; isFloat?: boolean; color: string }) {
  return (
    <div className="bg-[#0b0e1a] border border-[#1a2040] rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="text-[10px] font-mono text-white">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(isFloat ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full h-1 rounded cursor-pointer accent-blue-500" />
      <div className="flex justify-between text-[8px] text-[#252d50] mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

// Fear & Greed Index widget
function FearGreedGauge({ value }: { value: number | null }) {
  if (value === null) return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-2 rounded-full bg-[#1a2040] animate-pulse" />
      <span className="text-[9px] text-[#252d50]">F&G loading…</span>
    </div>
  );
  const label = value <= 20 ? "Extreme Fear" : value <= 40 ? "Fear" : value <= 60 ? "Neutral" : value <= 80 ? "Greed" : "Extreme Greed";
  const clr = value <= 20 ? "#ff4757" : value <= 40 ? "#ff6b35" : value <= 60 ? "#f59e0b" : value <= 80 ? "#00d4aa" : "#00ff88";
  return (
    <div className="flex items-center gap-2 flex-none">
      <div className="text-[9px] text-[#4a5580] uppercase tracking-wider">F&G</div>
      <div className="w-20 h-1.5 rounded-full bg-[#1a2040] relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: `linear-gradient(to right,#ff4757,#f59e0b,#00d4aa)` }} />
      </div>
      <span className="text-[10px] font-bold" style={{ color: clr }}>{value} · {label}</span>
    </div>
  );
}

// Market Hours indicator
function MarketHours() {
  const [status, setStatus] = useState<{ label: string; open: boolean; next: string }[]>([]);
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const utcH = now.getUTCHours(), utcM = now.getUTCMinutes();
      const utcMins = utcH * 60 + utcM;
      const day = now.getUTCDay(); // 0=Sun,6=Sat
      const weekday = day >= 1 && day <= 5;
      // NYSE: 14:30–21:00 UTC
      const nyseOpen = weekday && utcMins >= 870 && utcMins < 1260;
      // NSE: 03:45–10:00 UTC
      const nseOpen = weekday && utcMins >= 225 && utcMins < 600;
      // Crypto: always open
      const minsToNYSE = nyseOpen ? 0 : (weekday && utcMins < 870 ? 870 - utcMins : day === 5 && utcMins >= 1260 ? (7 - day) * 1440 + (870) : !weekday ? (1 + (day === 0 ? 1 : 6 - day)) * 1440 + 870 - utcMins : 870 - utcMins + 1440);
      return [
        { label: "NYSE", open: nyseOpen, next: nyseOpen ? "" : `${Math.floor(minsToNYSE / 60)}h${minsToNYSE % 60}m` },
        { label: "NSE", open: nseOpen, next: nseOpen ? "" : `closes in ${Math.max(0, 600 - utcMins)}m` },
        { label: "Crypto", open: true, next: "24/7" },
      ];
    };
    setStatus(calc());
    const id = setInterval(() => setStatus(calc()), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-2">
      {status.map(s => (
        <div key={s.label} className="flex items-center gap-1" title={s.next || s.label}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.open ? "bg-[#00d4aa] animate-pulse" : "bg-[#4a5580]"}`} />
          <span className={`text-[9px] font-bold ${s.open ? "text-[#00d4aa]" : "text-[#4a5580]"}`}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function PortfolioView({ balance, positions }: { balance: number; positions: PaperPosition[] }) {
  const totalEquity = balance + positions.reduce((acc, p) => acc + p.currentPrice * p.qty, 0);
  const totalPnL = positions.reduce((acc, p) => acc + p.pnl, 0);
  const pnlPct = balance > 0 ? (totalPnL / balance) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#0b0e1a]">
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0d1020] border border-[#1a2040] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
          <div className="text-[10px] text-[#4a5580] uppercase tracking-widest font-bold mb-2">Total Equity</div>
          <div className="text-3xl font-black text-white font-mono">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-[#0d1020] border border-[#1a2040] rounded-2xl p-6 shadow-xl">
          <div className="text-[10px] text-[#4a5580] uppercase tracking-widest font-bold mb-2">Cash Balance</div>
          <div className="text-3xl font-black text-white font-mono">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-[#0d1020] border border-[#1a2040] rounded-2xl p-6 shadow-xl">
          <div className="text-[10px] text-[#4a5580] uppercase tracking-widest font-bold mb-2">Total P&L</div>
          <div className={`text-3xl font-black font-mono ${totalPnL >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-sm ml-2 opacity-60">({pnlPct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      <div className="bg-[#0d1020] border border-[#1a2040] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1a2040] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Active Holdings</h3>
          <span className="text-[10px] text-[#4a5580]">{positions.length} Positions</span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[#141728] text-[10px] text-[#4a5580] uppercase font-bold">
            <tr>
              <th className="px-6 py-3">Symbol</th>
              <th className="px-6 py-3">Market</th>
              <th className="px-6 py-3">Qty</th>
              <th className="px-6 py-3">Avg Cost</th>
              <th className="px-6 py-3">Last Price</th>
              <th className="px-6 py-3">Return</th>
              <th className="px-6 py-3">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2040]">
            {positions.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-[#4a5580] text-sm italic">No active holdings in your portfolio.</td></tr>
            ) : (
              positions.map(p => (
                <tr key={p.id} className="hover:bg-[#141728] transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-white">{p.symbol}</td>
                  <td className="px-6 py-4 text-[10px] text-[#4a5580]">{p.market}</td>
                  <td className="px-6 py-4 font-mono text-white">{p.qty}</td>
                  <td className="px-6 py-4 font-mono text-[#8892b0]">${p.entryPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 font-mono text-white">${p.currentPrice.toFixed(2)}</td>
                  <td className={`px-6 py-4 font-mono font-bold ${p.pnl >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                    <span className="text-[10px] ml-1.5 opacity-60">({p.pnlPct.toFixed(1)}%)</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-white">${(p.currentPrice * p.qty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Home() {
  const [market, setMarket] = useState<Market>("US");
  const [symbol, setSymbol] = useState("AAPL");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQL] = useState(false);
  const [chartData, setCD] = useState<ChartPoint[]>([]);
  const [chartLoading, setCL] = useState(false);
  const [range, setRange] = useState<ChartRange>("1D");
  const [chartType, setChartType] = useState<ChartType>("AREA");
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [watchQuotes, setWQ] = useState<Record<string, Quote>>({});
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSR] = useState<SearchResult[]>([]);
  const [searchLoading, setSL] = useState(false);
  const [priceFlash, setPF] = useState<"up" | "down" | null>(null);
  const [lastUpdated, setLU] = useState<Date | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("CHART");
  const [rightTab, setRightTab] = useState<RightTab>("ORDER");
  const [activeInds, setAI] = useState<Set<IndicatorId>>(new Set(["SMA20", "SMA50"]));
  const [brokers, setBrokers] = useState<Broker[]>(BROKERS_STATIC);
  const [modal, setModal] = useState<Broker | null>(null);
  const [orderSide, setOS] = useState<OrderSide>("BUY");
  const [orderType, setOT] = useState<OrderType>("MARKET");
  const [qty, setQty] = useState("1");
  const [limitPx, setLP] = useState("");
  const [stopPx, setSP] = useState("");
  const [orderDone, setOD] = useState(false);
  const [optExp, setOptExp] = useState<string[]>([]);
  const [optExpiry, setOptExpiry] = useState("");
  const [optRows, setOptRows] = useState<OptionRow[]>([]);
  const [optLoad, setOptLoad] = useState(false);
  const [optExpLoad, setOptExpLoad] = useState(false);
  const [selectedOptStrike, setSelStrike] = useState<number | null>(null);
  const [selectedOptType, setSelOptType] = useState<"CALL" | "PUT">("CALL");
  const [optFilter, setOptFilter] = useState<"ALL" | "ITM" | "OTM" | "BTO" | "STO">("ALL");

  // Strategy
  const [strategyCode, setSC] = useState(DEFAULT_STRATEGY);
  const [strategyName, setStratName] = useState("My Strategy");
  const [savedStrategies, setSaved] = useState<SavedStrategy[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlert, setNewAlert] = useState({ type: "PRICE" as Alert["type"], condition: "ABOVE" as Alert["condition"], price: "", message: "", action: "NOTIFY" as Alert["action"], qty: "1", orderType: "MARKET" as OrderType, optStrike: "", optExpiry: "", optType: "CALL" as "CALL" | "PUT" });

  // Paper trading
  const [paperBalance, setPB] = useState(100000);
  const [paperPositions, setPP] = useState<PaperPosition[]>([]);
  const [paperOrders, setPO] = useState<PaperOrder[]>([]);
  const [paperQty, setPQ] = useState("1");
  const [paperSide, setPS] = useState<OrderSide>("BUY");
  const [paperOT, setPOT] = useState<OrderType>("MARKET");
  const [paperLP, setPLP] = useState("");
  const [paperSL, setPSL] = useState("");
  const [paperTP, setPTP] = useState("");

  // Backtest
  const [btResult, setBTResult] = useState<BacktestResult | null>(null);
  const [btRunning, setBTRunning] = useState(false);
  const [btRange, setBTRange] = useState<ChartRange>("1Y");

  // Screener
  const [sfilt, setSFilt] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [ssort, setSSort] = useState<"changePct" | "rsi">("changePct");
  const [screenerRows, setScreenerRows] = useState<ScreenerRow[]>([]);

  // Themes & UI
  const [theme, setTheme] = useState<"DARK" | "MEDIUM" | "LIGHT">("DARK");
  const [sidebarTab, setSidebarTab] = useState<"MARKET" | "INTEL">("MARKET");
  const [fearGreed, setFearGreed] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch("/api/fear-greed")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) setFearGreed(d.value); })
      .catch(() => { });
  }, []);

  // WebSocket
  const { price: wsPrice, prevPrice: wsPrev } = useFinnhubWS(symbol);
  useEffect(() => {
    if (wsPrice !== null) {
      setQuote(prev => {
        if (!prev) return prev;
        if (wsPrice !== prev.price) {
          setPF(wsPrice > (wsPrev ?? prev.price) ? "up" : "down");
          setTimeout(() => setPF(null), 800);
        }
        return { ...prev, price: wsPrice, change: wsPrice - prev.prevClose, changePct: ((wsPrice - prev.prevClose) / prev.prevClose) * 100 };
      });
    }
  }, [wsPrice, wsPrev]);

  // Load Screener Data
  useEffect(() => {
    const syms = watchlist[market].flatMap(g => g.symbols).join(",");
    fetch(`/api/screener?symbols=${encodeURIComponent(syms)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setScreenerRows(d))
      .catch(() => {});
  }, [market, watchlist]);

  // ── Custom indicator params ───────────────────────────────────────────────
  const [indParams, setIndParams] = useState<IndParams>(DEFAULT_IND_PARAMS);
  const [indSettingsOpen, setIndSettingsOpen] = useState(false);
  const [strategyOnChart, setStrategyOnChart] = useState(false); // overlay strategy signals on chart

  // Multi-Agent Analysis
  const [multiAgentResult, setMultiAgentResult] = useState<MultiAgentAnalysis>({ technical: null, sector: null, risk: null, cio: null, loading: null, error: null });
  const [selectedAnalysisSector, setSAS] = useState<Sector | null>(null);

  const analyzeSector = async (sec: Sector) => {
    setSAS(sec);
    setMultiAgentResult({ technical: null, sector: null, risk: null, cio: null, loading: "Fetching market data...", error: null });
    try {
      const topSym = screenerRows.find(s => s.sector === sec)?.symbol || DEFAULT_WATCHLIST["US"].find(g => g.sector === sec)?.symbols[0] || "AAPL";
      const q = await fetchQuote(topSym);
      if (!q) throw new Error("Could not fetch data for sector leader");
      
      // Fetch data for agents
      const cData = await fetchChart(topSym, "1D");
      const nData = await fetch(`/api/news?symbol=${topSym}`).then(r => r.ok ? r.json() : []).catch(() => []);
      
      const lastATR = cData.length > 14 ? calcATR(cData, 14).slice(-1)[0] : 2.5;
      const lastRSI = cData.length > 14 ? calcRSI(cData.map(d => d.price), 14).slice(-1)[0] : 50;
      const headlines = nData.slice(0, 5).map((n: any) => n.headline);

      setMultiAgentResult(prev => ({ ...prev, loading: "Analyzing technicals..." }));
      const tRes = await fetch("/api/ai/agent-technical", { 
        method: "POST", 
        body: JSON.stringify({ 
          ticker: topSym, 
          price: q.price, 
          indicators: { rsi: lastRSI, atr: lastATR, trend: q.changePct > 0 ? "UP" : "DOWN" } 
        }) 
      }).then(r => r.json());
      setMultiAgentResult(prev => ({ ...prev, technical: tRes, loading: "Analyzing sector trends..." }));
      
      const sRes = await fetch("/api/ai/agent-sector", { 
        method: "POST", 
        body: JSON.stringify({ ticker: topSym, sector: sec, headlines }) 
      }).then(r => r.json());
      setMultiAgentResult(prev => ({ ...prev, sector: sRes, loading: "Evaluating risk..." }));
      
      const rRes = await fetch("/api/ai/agent-risk", { 
        method: "POST", 
        body: JSON.stringify({ 
          ticker: topSym, 
          atr: lastATR, 
          price: q.price, 
          accountBalance: paperBalance, 
          positions: paperPositions.length 
        }) 
      }).then(r => r.json());
      setMultiAgentResult(prev => ({ ...prev, risk: rRes, loading: "CIO final review..." }));
      
      const cRes = await fetch("/api/ai/agent-cio", { 
        method: "POST", 
        body: JSON.stringify({ ticker: topSym, price: q.price, technical: tRes, sector: sRes, risk: rRes }) 
      }).then(r => r.json());
      setMultiAgentResult(prev => ({ ...prev, cio: cRes, loading: null }));
    } catch (e: any) {
      setMultiAgentResult(prev => ({ ...prev, loading: null, error: e.message }));
    }
  };

  // ── AI Copilot state ──────────────────────────────────────────────────────
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMsgs] = useState<AiMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiPanelTab, setAiPanelTab] = useState<"CHAT" | "NEWS">("CHAT");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved strategies on mount
  useEffect(() => { setSaved(loadStrategies()); }, []);

  const loadQuote = useCallback(async (sym: string, silent = false) => {
    if (!silent) setQL(true);
    const q = await fetchQuote(sym);
    if (q) {
      setQuote(prev => { if (prev && q.price !== prev.price) { setPF(q.price > prev.price ? "up" : "down"); setTimeout(() => setPF(null), 800); } return q; });
      setLU(new Date());
    }
    if (!silent) setQL(false);
  }, []);

  const loadChart = useCallback(async (sym: string, r: ChartRange) => { setCL(true); const d = await fetchChart(sym, r); setCD(d); setCL(false); }, []);
  const loadWQ = useCallback(async (syms: string[]) => { for (let i = 0; i < syms.length; i += 3) { const batch = syms.slice(i, i + 3); const res = await Promise.all(batch.map(s => fetchQuote(s))); const map: Record<string, Quote> = {}; res.forEach((q, j) => { if (q) map[batch[j]] = q; }); setWQ(prev => ({ ...prev, ...map })); } }, []);
  const loadExps = useCallback(async (sym: string, mkt: Market) => { if (mkt === "CRYPTO") { setOptExp([]); setOptExpiry(""); return; } setOptExpLoad(true); const e = await fetchOptionExpirations(sym, mkt); setOptExp(e); if (e.length > 0) setOptExpiry(e[0]); setOptExpLoad(false); }, []);
  const loadChain = useCallback(async (sym: string, exp: string, mkt: Market) => { if (!exp || mkt === "CRYPTO") { setOptRows([]); return; } setOptLoad(true); const r = await fetchOptions(sym, exp, mkt); setOptRows(r); setOptLoad(false); }, []);

  useEffect(() => { loadQuote(symbol); loadChart(symbol, range); loadWQ(watchlist[market].flatMap(g => g.symbols)); }, []);// eslint-disable-line
  useEffect(() => { loadChart(symbol, range); }, [symbol, range, loadChart]);
  useEffect(() => { if (qTimer.current) clearInterval(qTimer.current); qTimer.current = setInterval(() => loadQuote(symbol, true), 3000); return () => { if (qTimer.current) clearInterval(qTimer.current); }; }, [symbol, loadQuote]);
  useEffect(() => { if (wTimer.current) clearInterval(wTimer.current); wTimer.current = setInterval(() => loadWQ(watchlist[market].flatMap(g => g.symbols)), 8000); return () => { if (wTimer.current) clearInterval(wTimer.current); }; }, [market, watchlist, loadWQ]);
  useEffect(() => { if (rightTab === "OPTIONS") { loadExps(symbol, market); } }, [rightTab, symbol, market, loadExps]);
  useEffect(() => { if (rightTab === "OPTIONS" && optExpiry) loadChain(symbol, optExpiry, market); }, [optExpiry, rightTab, symbol, market, loadChain]);

  useEffect(() => {
    if (!searchQ.trim()) { setSR([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    setSL(true);
    searchRef.current = setTimeout(async () => { const r = await searchSymbols(searchQ, market); setSR(r); setSL(false); }, 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchQ, market]);

  // Alert checker — fires on every quote update
  useEffect(() => {
    if (!quote) return;
    const closes = chartData.map(d => d.price);
    const rsiVals = calcRSI(closes, 14);
    const currentRSI = rsiVals[rsiVals.length - 1] ?? null;

    setAlerts(prev => prev.map(a => {
      if (!a.active || a.triggered) return a;
      const isThisSym = a.symbol === symbol;
      if (!isThisSym) return a;
      let fired = false;
      if (a.type === "PRICE") {
        fired = (a.condition === "ABOVE" && quote.price > a.price) || (a.condition === "BELOW" && quote.price < a.price);
      } else if (a.type === "RSI" && currentRSI !== null) {
        fired = (a.condition === "ABOVE" && currentRSI > a.price) || (a.condition === "BELOW" && currentRSI < a.price);
      }
      if (fired) {
        // Execute auto actions
        if (a.action === "PAPER_BUY" || a.action === "BUY") executePaperTrade("BUY", a.qty, quote.price, symbol, market);
        if (a.action === "PAPER_SELL" || a.action === "SELL") executePaperTrade("SELL", a.qty, quote.price, symbol, market);
        return { ...a, triggered: true };
      }
      return a;
    }));
  }, [quote]);// eslint-disable-line

  // Update paper positions live
  useEffect(() => {
    if (!quote) return;
    setPP(prev => prev.map(p => {
      if (p.symbol !== symbol) return p;
      const pnl = (quote.price - p.entryPrice) * p.qty * (p.side === "SHORT" ? -1 : 1);
      // Auto stop-loss / take-profit
      let status = p;
      if (p.stopLoss && quote.price <= p.stopLoss && p.side === "LONG") {
        executePaperTrade("SELL", p.qty, quote.price, p.symbol, p.market);
        return { ...p, currentPrice: quote.price, pnl: parseFloat(pnl.toFixed(2)), pnlPct: parseFloat(((pnl / (p.entryPrice * p.qty)) * 100).toFixed(2)) };
      }
      if (p.takeProfit && quote.price >= p.takeProfit && p.side === "LONG") {
        executePaperTrade("SELL", p.qty, quote.price, p.symbol, p.market);
        return { ...p, currentPrice: quote.price, pnl: parseFloat(pnl.toFixed(2)), pnlPct: parseFloat(((pnl / (p.entryPrice * p.qty)) * 100).toFixed(2)) };
      }
      return { ...p, currentPrice: quote.price, pnl: parseFloat(pnl.toFixed(2)), pnlPct: parseFloat(((pnl / (p.entryPrice * p.qty)) * 100).toFixed(2)) };
    }));
  }, [quote]);// eslint-disable-line

  const switchMarket = (m: Market) => { setMarket(m); const sym = watchlist[m][0]?.symbols[0] || "AAPL"; setSymbol(sym); setSearchQ(""); setSR([]); setOptExp([]); setOptExpiry(""); setOptRows([]); loadQuote(sym); loadChart(sym, range); loadWQ(watchlist[m].flatMap(g=>g.symbols)); };
  const selectSym = (sym: string, mkt: Market) => { setSymbol(sym); setMarket(mkt); setSearchQ(""); setSR([]); setOptExp([]); setOptExpiry(""); setOptRows([]); loadQuote(sym); loadChart(sym, range); if (!watchQuotes[sym]) loadWQ([sym]); if (rightTab === "OPTIONS") loadExps(sym, mkt); };

  function executePaperTrade(side: OrderSide, qtyN: number, px: number, sym: string, mkt: Market) {
    const cost = px * (typeof qtyN === "number" ? qtyN : parseInt(String(qtyN)) || 1);
    const q = typeof qtyN === "number" ? qtyN : parseInt(String(qtyN)) || 1;
    if (side === "BUY") {
      if (cost > paperBalance) return;
      setPB(prev => prev - cost);
      setPP(prev => {
        const existing = prev.find(p => p.symbol === sym && p.side === "LONG");
        if (existing) return prev.map(p => p.id === existing.id ? { ...p, qty: p.qty + q } : p);
        const sl = parseFloat(paperSL) || undefined;
        const tp = parseFloat(paperTP) || undefined;
        return [{ id: uid(), symbol: sym, side: "LONG", qty: q, entryPrice: px, currentPrice: px, pnl: 0, pnlPct: 0, entryTime: new Date().toLocaleTimeString(), market: mkt, stopLoss: sl, takeProfit: tp }, ...prev];
      });
    } else {
      const pos = paperPositions.find(p => p.symbol === sym && p.side === "LONG");
      if (pos) {
        const sold = Math.min(q, pos.qty);
        const pnl = (px - pos.entryPrice) * sold;
        setPB(prev => prev + px * sold);
        setPP(prev => prev.filter(p => p.id !== pos.id));
        setPO(prev => [{ id: uid(), symbol: sym, side: "SELL", qty: sold, orderType: "MARKET", price: px, status: "FILLED", time: new Date().toLocaleTimeString(), pnl: parseFloat(pnl.toFixed(2)) }, ...prev]);
        return;
      }
    }
    setPO(prev => [{ id: uid(), symbol: sym, side, qty: q, orderType: "MARKET", price: px, status: "FILLED", time: new Date().toLocaleTimeString() }, ...prev]);
  }

  // Computed indicators — all use user-configurable indParams
  const closes = chartData.map(d => d.price);
  const sma20 = useMemo(() => calcSMA(closes, indParams.sma1Period), [closes.length, closes[0], closes[closes.length - 1], indParams.sma1Period]);// eslint-disable-line
  const sma50 = useMemo(() => calcSMA(closes, indParams.sma2Period), [closes.length, closes[0], closes[closes.length - 1], indParams.sma2Period]);// eslint-disable-line
  const ema20 = useMemo(() => calcEMA(closes, indParams.emaPeriod), [closes.length, closes[0], closes[closes.length - 1], indParams.emaPeriod]);// eslint-disable-line
  const bb = useMemo(() => calcBB(closes, indParams.bbPeriod, indParams.bbStdDev), [closes.length, closes[0], closes[closes.length - 1], indParams.bbPeriod, indParams.bbStdDev]);// eslint-disable-line
  const rsiVals = useMemo(() => calcRSI(closes, indParams.rsiPeriod), [closes.length, closes[0], closes[closes.length - 1], indParams.rsiPeriod]);// eslint-disable-line
  const macdData = useMemo(() => calcMACD(closes, indParams.macdFast, indParams.macdSlow, indParams.macdSignal), [closes.length, closes[0], closes[closes.length - 1], indParams.macdFast, indParams.macdSlow, indParams.macdSignal]);// eslint-disable-line
  const vwapVals = useMemo(() => calcVWAP(chartData), [chartData.length]);// eslint-disable-line
  const stochData = useMemo(() => calcStoch(chartData, indParams.stochK, indParams.stochD), [chartData.length, indParams.stochK, indParams.stochD]);// eslint-disable-line
  const atrVals = useMemo(() => calcATR(chartData, indParams.atrPeriod), [chartData.length, indParams.atrPeriod]);// eslint-disable-line

  const enriched = useMemo(() => chartData.map((d, i) => ({
    ...d,
    sma20: sma20[i] ?? undefined, sma50: sma50[i] ?? undefined, ema20: ema20[i] ?? undefined,
    bbUp: bb.upper[i] ?? undefined, bbLow: bb.lower[i] ?? undefined,
    vwap: vwapVals[i] ?? undefined, rsi: rsiVals[i] ?? undefined,
    macd: macdData.macd[i] ?? undefined, macdSig: macdData.signal[i] ?? undefined, macdHist: macdData.hist[i] ?? undefined,
    stochK: stochData.k[i] ?? undefined, stochD: stochData.d[i] ?? undefined,
    atr: atrVals[i] ?? undefined,
  })), [chartData, sma20, sma50, ema20, bb, vwapVals, rsiVals, macdData, stochData, atrVals]);// eslint-disable-line

  // Compute buy/sell signals from indicators for overlay on chart
  const chartSignals: ChartSignal[] = useMemo(() => {
    if (!enriched.length) return [];
    const sigs: ChartSignal[] = [];
    for (let i = 1; i < enriched.length; i++) {
      const cur = enriched[i], prev = enriched[i - 1];
      // Golden Cross BUY
      if (activeInds.has("SMA20") && activeInds.has("SMA50") && cur.sma20 !== undefined && cur.sma50 !== undefined && prev.sma20 !== undefined && prev.sma50 !== undefined) {
        if (prev.sma20 <= prev.sma50 && cur.sma20 > cur.sma50) sigs.push({ time: cur.time, type: "BUY", price: cur.price });
        if (prev.sma20 >= prev.sma50 && cur.sma20 < cur.sma50) sigs.push({ time: cur.time, type: "SELL", price: cur.price });
      }
      // RSI signals
      if (activeInds.has("RSI") && cur.rsi !== undefined && prev.rsi !== undefined) {
        if (prev.rsi < 30 && cur.rsi >= 30) sigs.push({ time: cur.time, type: "BUY", price: cur.price });
        if (prev.rsi > 70 && cur.rsi <= 70) sigs.push({ time: cur.time, type: "SELL", price: cur.price });
      }
      // MACD signals
      if (activeInds.has("MACD") && cur.macd !== undefined && cur.macdSig !== undefined && prev.macd !== undefined && prev.macdSig !== undefined) {
        if (prev.macd <= prev.macdSig && cur.macd > cur.macdSig) sigs.push({ time: cur.time, type: "BUY", price: cur.price });
        if (prev.macd >= prev.macdSig && cur.macd < cur.macdSig) sigs.push({ time: cur.time, type: "SELL", price: cur.price });
      }
    }
    return sigs;
  }, [enriched, activeInds]);// eslint-disable-line

  const hasSubPanel = activeInds.has("RSI") || activeInds.has("MACD") || activeInds.has("STOCH") || activeInds.has("ATR");
  const connected = brokers.filter(b => b.status === "connected");
  const isUp = (quote?.changePct ?? 0) >= 0;

  // Strategy overlay signals — run backtest logic on chart data to show entry/exit on chart
  const strategySignals: ChartSignal[] = useMemo(() => {
    if (!strategyOnChart || !chartData.length) return [];
    const get = (rx: RegExp, def: number) => { const m = strategyCode.match(rx); return m ? parseFloat(m[1]) : def; };
    const fastLen = Math.min(get(/fast_length\s*=\s*input\((\d+)/, 20), Math.floor(chartData.length / 4));
    const slowLen = Math.min(get(/slow_length\s*=\s*input\((\d+)/, 50), Math.floor(chartData.length / 2));
    const rsiLen = Math.min(get(/rsi_length\s*=\s*input\((\d+)/, 14), Math.floor(chartData.length / 5));
    const rsiOB = get(/rsi_overbought\s*=\s*input\((\d+)/, 70);
    const rsiOS = get(/rsi_oversold\s*=\s*input\((\d+)/, 30);
    const slPct = get(/stop_pct\s*=\s*input\((\d+)/, 3);
    const tpPct = get(/tp_pct\s*=\s*input\((\d+)/, 6);
    const px = chartData.map(d => d.price);
    const fast2 = calcSMA(px, fastLen), slow2 = calcSMA(px, slowLen), rsi2 = calcRSI(px, rsiLen);
    const warmup = Math.max(slowLen, rsiLen) + 2;
    const sigs: ChartSignal[] = [];
    let inPos = false, entryPx = 0;
    for (let i = warmup; i < chartData.length; i++) {
      const fc = fast2[i], fp = fast2[i - 1], sc = slow2[i], sp = slow2[i - 1], rv = rsi2[i];
      if (fc === null || fp === null || sc === null || sp === null || rv === null) continue;
      if (inPos) {
        const cpx = px[i];
        if (cpx <= entryPx * (1 - slPct / 100)) { sigs.push({ time: chartData[i].time, type: "SELL", price: cpx }); inPos = false; }
        else if (cpx >= entryPx * (1 + tpPct / 100)) { sigs.push({ time: chartData[i].time, type: "SELL", price: cpx }); inPos = false; }
        else if (fp >= sp && fc < sc && rv > rsiOS) { sigs.push({ time: chartData[i].time, type: "SELL", price: cpx }); inPos = false; }
      } else {
        if (fp <= sp && fc > sc && rv < rsiOB) { sigs.push({ time: chartData[i].time, type: "BUY", price: px[i] }); inPos = true; entryPx = px[i]; }
      }
    }
    return sigs;
  }, [strategyOnChart, chartData, strategyCode]);// eslint-disable-line

  // Combined signals shown on chart: strategy overlay (if on) OR indicator signals
  const activeChartSignals = strategyOnChart ? strategySignals : chartSignals;
  const chartColor = isUp ? "#00d4aa" : "#ff4757";
  const currency = cs(quote);
  const pMin = chartData.length ? Math.min(...chartData.map(d => d.price)) : 0;
  const pMax = chartData.length ? Math.max(...chartData.map(d => d.price)) : 0;
  const pad = (pMax - pMin) * 0.15;
  const triggeredAlerts = alerts.filter(a => a.triggered);

  const estTotal = (() => { const q = parseFloat(qty) || 0; const px = orderType === "MARKET" ? (quote?.price ?? 0) : parseFloat(limitPx) || (quote?.price ?? 0); return (q * px).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); })();
  const obSizes = (() => { const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0); return Array.from({ length: 6 }, (_, i) => 100 + ((seed * (i + 7) * 1013904223) >>> 0) % 900); })();
  const handleConnect = (id: string, _k: string, _s: string) => { setBrokers(prev => prev.map(b => b.id === id ? { ...b, status: "connected" } : b)); setModal(null); };

  const saveCurrentStrategy = () => {
    const s: SavedStrategy = { id: uid(), name: strategyName, code: strategyCode, savedAt: new Date().toLocaleString() };
    saveStrategy(s); setSaved(loadStrategies()); alert(`Strategy "${strategyName}" saved!`);
  };
  const loadSavedStrategy = (s: SavedStrategy) => { setSC(s.code); setStratName(s.name); setShowSaved(false); setMainTab("STRATEGY"); };
  const deleteSaved = (id: string) => { deleteStrategy(id); setSaved(loadStrategies()); };

  const addAlert = () => {
    if (!newAlert.price && newAlert.type === "PRICE") return;
    const a: Alert = { id: uid(), symbol, market, type: newAlert.type, condition: newAlert.condition, price: parseFloat(newAlert.price) || 0, message: newAlert.message || `${symbol} ${newAlert.condition} ${newAlert.price}`, action: newAlert.action, qty: parseInt(newAlert.qty) || 1, orderType: newAlert.orderType, optionStrike: newAlert.optStrike ? parseFloat(newAlert.optStrike) : undefined, optionExpiry: newAlert.optExpiry || undefined, optionType: newAlert.optType, active: true, triggered: false, createdAt: new Date().toISOString() };
    setAlerts(prev => [a, ...prev]);
    setNewAlert({ type: "PRICE", condition: "ABOVE", price: "", message: "", action: "NOTIFY", qty: "1", orderType: "MARKET", optStrike: "", optExpiry: "", optType: "CALL" });
  };

  const processedScreenerRows = useMemo(() => screenerRows.filter(r => sfilt === "ALL" || r.signal === sfilt).sort((a, b) => ssort === "changePct" ? b.changePct - a.changePct : b.rsi - a.rsi), [screenerRows, sfilt, ssort]);

  // ── Fetch news whenever symbol changes ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setNewsLoading(true);
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (!cancelled) { setNews(d); setNewsLoading(false); } })
      .catch(() => { if (!cancelled) setNewsLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  // Auto-scroll AI chat
  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  // ── Build rich market context for the AI ──────────────────────────────────
  const buildAiContext = useCallback(() => {
    const lastRSI = rsiVals[rsiVals.length - 1];
    const lastMACD = macdData.macd[macdData.macd.length - 1];
    const lastSMA20 = sma20[sma20.length - 1];
    const headlinesSnippet = news.slice(0, 3).map(n => `[${n.sentiment.toUpperCase()}] ${n.headline}`).join(" | ") || "No news loaded";

    return `SYMBOL: ${symbol} | MARKET: ${market} | EXCHANGE: ${quote?.exchange ?? ""} | RANGE: ${range}
PRICE: ${quote?.price} ${currency} | CHANGE: ${(quote?.changePct ?? 0).toFixed(2)}% | TREND: ${(quote?.changePct ?? 0) >= 0 ? "UP" : "DOWN"}
OPEN: ${quote?.open} | HIGH: ${quote?.high} | LOW: ${quote?.low} | PREV CLOSE: ${quote?.prevClose}

=== TECHNICAL INDICATORS ===
RSI(14): ${lastRSI != null ? lastRSI.toFixed(2) : "N/A"}
MACD: ${lastMACD != null ? lastMACD.toFixed(4) : "N/A"}
SMA20: ${lastSMA20 != null ? lastSMA20.toFixed(2) : "N/A"}

=== PORTFOLIO ===
BALANCE: $${paperBalance.toLocaleString()} | POSITIONS: ${paperPositions.length}
${paperPositions.length ? paperPositions.map(p => `${p.symbol}: ${p.qty}@${p.entryPrice}`).join("; ") : "No positions"}

NEWS: ${headlinesSnippet}`;
  }, [symbol, market, range, quote, rsiVals, macdData, sma20, news, paperBalance, paperPositions, currency]);// eslint-disable-line

  // ── Send message to AI ────────────────────────────────────────────────────
  const sendToAI = useCallback(async (userMsg: string) => {
    if (!userMsg.trim() || aiLoading) return;
    const newHistory: AiMessage[] = [...aiMessages, { role: "user", content: userMsg }];
    setAiMsgs(newHistory);
    setAiLoading(true);
    try {
      const context = buildAiContext();
      const historyToSend = newHistory.slice(-6);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyToSend, context }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't generate a response right now.";
      setAiMsgs(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setAiMsgs(prev => [...prev, { role: "assistant", content: "⚠️ AI Connection error." }]);
    }
    setAiLoading(false);
  }, [aiMessages, aiLoading, buildAiContext]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden" style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      {modal && <BrokerModal broker={modal} onClose={() => setModal(null)} onConnect={handleConnect} />}
      <TickerTape />

      <header className="flex-none h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center px-4 gap-4 z-50 relative">
        <div className="flex items-center gap-2.5 flex-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-[11px] font-black text-white">PC</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-black text-[var(--text)] tracking-tight">ProChart</div>
            <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Institutional</div>
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 h-9 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/20 transition-all">
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)] flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder={`Search ${market} symbols…`} value={searchQ} onChange={e => setSearchQ(e.target.value)} className="bg-transparent text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none w-full font-mono" />
            {searchLoading && <Spinner small />}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 flex-none">
          <div className="hidden lg:flex items-center gap-4">
             <MarketHours />
             <div className="w-px h-4 bg-[var(--border)]" />
             <FearGreedGauge value={fearGreed} />
             <div className="w-px h-4 bg-[var(--border)]" />
          </div>

          <div className="flex bg-[var(--bg)] p-0.5 rounded-lg border border-[var(--border-muted)]">
            {(["DARK", "MEDIUM", "LIGHT"] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)} className={`p-1.5 rounded-md transition-all ${theme === t ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`} title={`${t} Theme`}>
                {t === "DARK" ? "🌙" : t === "MEDIUM" ? "🌓" : "☀️"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[9px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" /><span className="text-[#00d4aa]">LIVE</span></div>
            <LiveClock />
          </div>

          <button onClick={() => setRightTab(prev => prev === "BROKERS" ? null : "BROKERS")} className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all ${rightTab === "BROKERS" ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]"}`}>
            ⚡ Brokers
          </button>
        </div>
      </header>

      <div className="flex-none bg-[var(--surface)] border-b border-[var(--border)] flex items-center px-4">
        {(["CHART", "STRATEGY", "SCREENER", "ALERTS", "PAPER", "BACKTEST"] as MainTab[]).map(t => (
          <button key={t} onClick={() => setMainTab(t)} className={`text-[11px] px-5 py-3 font-bold border-b-2 transition-all -mb-px ${mainTab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"}`}>
            {t === "CHART" ? "📈 Chart" : t === "STRATEGY" ? "🤖 Strategy" : t === "SCREENER" ? "🔍 Screener" : t === "ALERTS" ? "🔔 Alerts" : t === "PAPER" ? "💰 Paper" : "📂 Backtest"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 py-1.5 flex-none bg-[var(--bg)] px-3 rounded-full border border-[var(--border-muted)]">
          <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Simulated:</span>
          <span className="text-[11px] font-mono font-black text-[#00d4aa]">${paperBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 flex-none bg-[var(--surface)] border-r border-[var(--border)] flex flex-col overflow-hidden">
          <div className="flex-none bg-[var(--bg)] border-b border-[var(--border-muted)] flex p-1 m-2 rounded-xl">
            {(["MARKET", "INTEL"] as const).map(t => (
              <button key={t} onClick={() => setSidebarTab(t)} className={`flex-1 py-1.5 text-[10px] font-black tracking-widest rounded-lg transition-all ${sidebarTab === t ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>
                {t === "MARKET" ? "📊 MARKET" : "🧠 INTEL"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sidebarTab === "MARKET" ? (
              <div className="p-1">
                {watchlist[market].map(group => (
                  <div key={group.sector} className="mb-2">
                    <div className="flex justify-between items-center px-3 py-2 group">
                      <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider">{group.sector}</span>
                      <button onClick={() => { analyzeSector(group.sector); setSidebarTab("INTEL"); }} className="opacity-0 group-hover:opacity-100 text-[8px] bg-[var(--accent)] text-white px-2 py-0.5 rounded-full font-bold">ANALYZE</button>
                    </div>
                    {group.symbols.map(sym => {
                      const q = watchQuotes[sym];
                      const up = (q?.changePct ?? 0) >= 0;
                      return (
                        <button key={sym} onClick={() => selectSym(sym, market)} className={`w-full px-3 py-2 flex items-center justify-between border-b border-[var(--border-muted)] hover:bg-[var(--surface-hover)] transition-all ${sym === symbol ? "bg-[var(--bg)] border-l-2 border-l-[var(--accent)]" : ""}`}>
                          <div className="text-left"><div className="text-xs font-bold text-[var(--text)]">{dispSym(sym)}</div><div className="text-[9px] text-[var(--text-muted)] truncate max-w-[100px]">{q?.name ?? "—"}</div></div>
                          <div className="text-right">
                            <div className="text-[10px] font-mono font-bold text-[var(--text)]">{currency}{fmt(q?.price ?? 0, 2)}</div>
                            <div className={`text-[9px] font-bold ${up ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{up ? "+" : ""}{q?.changePct.toFixed(2)}%</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-3 border-b border-[var(--border-muted)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg)]/30">AI Sector Intelligence</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {multiAgentResult.loading ? (
                    <div className="h-48 flex flex-col items-center justify-center space-y-3 opacity-50">
                      <Spinner /><div className="text-[10px] font-mono animate-pulse">{multiAgentResult.loading}</div>
                    </div>
                  ) : multiAgentResult.cio ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                       <div className={`p-4 rounded-2xl border-2 ${multiAgentResult.cio.finalSignal === 'BUY' ? 'bg-[#00d4aa]/5 border-[#00d4aa]/20' : 'bg-[#ff4757]/5 border-[#ff4757]/20'}`}>
                          <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">CIO CONSENSUS</div>
                          <div className={`text-xl font-black mb-2 ${multiAgentResult.cio.finalSignal === 'BUY' ? 'text-[#00d4aa]' : 'text-[#ff4757]'}`}>{multiAgentResult.cio.finalSignal} SIGNAL</div>
                          <div className="text-[11px] text-[var(--text)] leading-relaxed italic">&quot;{multiAgentResult.cio.executiveSummary}&quot;</div>
                       </div>
                       <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)]">
                          <div><div className="text-[8px] opacity-50 mb-1">TARGET</div><div className="text-[#00d4aa] font-black">{fmt(multiAgentResult.cio.takeProfit ?? 0, 2)}</div></div>
                          <div><div className="text-[8px] opacity-50 mb-1">STOP</div><div className="text-[#ff4757] font-black">{fmt(multiAgentResult.cio.stopLoss ?? 0, 2)}</div></div>
                       </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center opacity-30 text-center px-6">
                      <div className="text-3xl mb-4">🧠</div>
                      <div className="text-[10px] leading-relaxed">Trigger deep sector analysis by clicking <strong className="text-[var(--accent)]">ANALYZE</strong> on any market group.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* ══ CHART ════════════════════════════════════════════════════ */}
          {mainTab === "CHART" && (
            <>
            <div className="flex-none bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-1 px-3 py-1.5 flex-wrap">
              {/* Timeframe groups */}
              {TIMEFRAME_GROUPS.map(g => (
                <div key={g.label} className="flex items-center gap-0.5">
                  <span className="text-[8px] text-[#2a3558] font-bold uppercase tracking-widest mr-1 select-none">{g.label}</span>
                  {g.tfs.map(tf => (
                    <button key={tf} onClick={() => setRange(tf)} className={`text-[10px] px-2 py-1 rounded font-bold border transition-all ${range === tf ? "bg-[#1e2d6b] text-[#6b9fff] border-[#2d4aaa]" : "text-[#4a5580] hover:text-white border-transparent hover:border-[#1a2040]"}`}>{tf}</button>
                  ))}
                  <div className="w-px h-4 bg-[#131929] mx-1" />
                </div>
              ))}
              {/* Indicators */}
              <div className="flex items-center gap-0.5 ml-1 flex-wrap">
                <span className="text-[8px] text-[#2a3558] font-bold uppercase tracking-widest mr-1 select-none">Indicators</span>
                {INDICATOR_META.map(ind => (
                  <button key={ind.id} title={ind.tooltip} onClick={() => setAI(prev => { const next = new Set(prev); next.has(ind.id) ? next.delete(ind.id) : next.add(ind.id); return next; })} className={`text-[10px] px-2 py-1 rounded font-bold border transition-all ${activeInds.has(ind.id) ? "border-current" : "text-[#4a5580] border-transparent hover:border-[#1a2040] hover:text-white"}`} style={activeInds.has(ind.id) ? { color: ind.color, borderColor: ind.color, background: ind.color + "18" } : {}}>{ind.label}</button>
                ))}
              </div>
              {chartLoading && <div className="ml-auto"><Spinner small /></div>}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {enriched.length ? (
                <>
                  <CandlestickChart data={chartData} height={hasSubPanel ? "55%" : "85%"} currency={currency} signals={activeChartSignals} />
                  {/* Indicator signal annotations */}
                  {activeChartSignals.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 flex-wrap">
                      {activeChartSignals.slice(-5).map((sig, i) => (
                        <div key={i} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${sig.type === "BUY" ? "text-[#00d4aa] border-[#00d4aa]/30 bg-[#00d4aa]/10" : "text-[#ff4757] border-[#ff4757]/30 bg-[#ff4757]/10"}`}>
                          {sig.type} @ {currency}{sig.price.toFixed(2)} <span className="opacity-50">{sig.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeInds.has("RSI") && (
                    <><div className="border-t border-[#131929] mt-1 mb-0" />
                    <div className="text-[8px] text-[#2a3558] font-bold uppercase tracking-widest pl-16 pt-0.5 pb-0 select-none">RSI</div>
                    <ResponsiveContainer width="100%" height="12%">
                      <ComposedChart data={enriched} margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
                        <XAxis dataKey="time" hide /><YAxis domain={[0, 100]} tick={{ fill: "#3d4b6e", fontSize: 8 }} tickLine={false} axisLine={false} width={72} ticks={[30, 50, 70]} />
                        <ReferenceLine y={70} stroke="#ff4757" strokeDasharray="3 4" strokeOpacity={0.4} /><ReferenceLine y={30} stroke="#00d4aa" strokeDasharray="3 4" strokeOpacity={0.4} />
                        <Tooltip formatter={(v: any) => [Number(v).toFixed(2), "RSI"]} contentStyle={{ background: "#0d1020", border: "1px solid #1e2540", borderRadius: 8, fontSize: 10 }} />
                        <Line type="monotone" dataKey="rsi" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </>
                  )}
                  {activeInds.has("MACD") && (
                    <><div className="border-t border-[#131929] mt-1 mb-0" />
                    <div className="text-[8px] text-[#2a3558] font-bold uppercase tracking-widest pl-16 pt-0.5 pb-0 select-none">MACD</div>
                    <ResponsiveContainer width="100%" height="12%">
                      <ComposedChart data={enriched} margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
                        <XAxis dataKey="time" hide /><YAxis tick={{ fill: "#3d4b6e", fontSize: 8 }} tickLine={false} axisLine={false} width={72} />
                        <Tooltip contentStyle={{ background: "#0d1020", border: "1px solid #1e2540", borderRadius: 8, fontSize: 10 }} />
                        <Bar dataKey="macdHist" fill="#4ade80" opacity={0.5} radius={[1, 1, 0, 0]} />
                        <Line type="monotone" dataKey="macd" stroke="#4ade80" strokeWidth={1.2} dot={false} /><Line type="monotone" dataKey="macdSig" stroke="#f87171" strokeWidth={1.2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </>
                  )}
                  {activeInds.has("STOCH") && (
                    <><div className="border-t border-[#131929] mt-1 mb-0" />
                    <div className="text-[8px] text-[#2a3558] font-bold uppercase tracking-widest pl-16 pt-0.5 pb-0 select-none">STOCH</div>
                    <ResponsiveContainer width="100%" height="12%">
                      <ComposedChart data={enriched} margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
                        <XAxis dataKey="time" hide /><YAxis domain={[0, 100]} tick={{ fill: "#3d4b6e", fontSize: 8 }} tickLine={false} axisLine={false} width={72} ticks={[20, 50, 80]} />
                        <ReferenceLine y={80} stroke="#ff4757" strokeDasharray="3 4" strokeOpacity={0.4} /><ReferenceLine y={20} stroke="#00d4aa" strokeDasharray="3 4" strokeOpacity={0.4} />
                        <Tooltip contentStyle={{ background: "#0d1020", border: "1px solid #1e2540", borderRadius: 8, fontSize: 10 }} />
                        <Line type="monotone" dataKey="stochK" stroke="#fb923c" strokeWidth={1.4} dot={false} name="%K" /><Line type="monotone" dataKey="stochD" stroke="#94a3b8" strokeWidth={1} dot={false} name="%D" strokeDasharray="3 2" />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </>
                  )}
                  {activeInds.has("ATR") && (
                    <><div className="border-t border-[#131929] mt-1 mb-0" />
                    <div className="text-[8px] text-[#2a3558] font-bold uppercase tracking-widest pl-16 pt-0.5 pb-0 select-none">ATR</div>
                    <ResponsiveContainer width="100%" height="12%">
                      <ComposedChart data={enriched} margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
                        <XAxis dataKey="time" hide /><YAxis tick={{ fill: "#3d4b6e", fontSize: 8 }} tickLine={false} axisLine={false} width={72} />
                        <Tooltip formatter={(v: any) => [Number(v).toFixed(4), "ATR"]} contentStyle={{ background: "#0d1020", border: "1px solid #1e2540", borderRadius: 8, fontSize: 10 }} />
                        <Line type="monotone" dataKey="atr" stroke="#e879f9" strokeWidth={1.4} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </>
                  )}
                  <div className="border-t border-[#131929] mt-1 mb-0" />
                  <div className="text-[8px] text-[#2a3558] font-bold uppercase tracking-widest pl-16 pt-0.5 pb-0 select-none">Vol</div>
                  <div className="mt-0.5" />
                  <ResponsiveContainer width="100%" height="8%">
                    <BarChart data={enriched} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}><XAxis dataKey="time" hide /><YAxis hide /><Bar dataKey="volume" fill={chartColor} opacity={0.25} radius={[1, 1, 0, 0]} /></BarChart>
                  </ResponsiveContainer>
                </>) : <div className="flex items-center justify-center h-full text-[11px] text-[#4a5580]">No chart data — create <code className="bg-[#141728] px-1 mx-1 rounded">/api/chart</code></div>}
            </div>
          </>)}

          {/* ══ STRATEGY ═══════════════════════════════════════════════ */}
          {mainTab === "STRATEGY" && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
              {/* Top toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <input value={strategyName} onChange={e => setStratName(e.target.value)}
                  className="bg-[#141728] border border-[#252d50] rounded-lg px-3 py-1.5 text-sm text-white font-bold outline-none focus:border-[#3b82f6] w-44" />
                <button onClick={saveCurrentStrategy}
                  className="text-[11px] px-3 py-1.5 bg-[#1e2d6b] hover:bg-[#2d4aaa] text-[#6b9fff] rounded-lg font-bold border border-[#2d4aaa]">💾 Save</button>
                <button onClick={() => setShowSaved(!showSaved)}
                  className="text-[11px] px-3 py-1.5 bg-[#141728] text-[#4a5580] rounded-lg font-bold border border-[#1a2040] hover:text-white">📂 Load ({savedStrategies.length})</button>
                {/* Apply to Chart toggle */}
                <button onClick={() => { setStrategyOnChart(v => !v); if (!strategyOnChart) setMainTab("CHART"); }}
                  title="Overlay strategy buy/sell signals on the main chart"
                  className={`text-[11px] px-3 py-1.5 rounded-lg font-bold border transition-all ${strategyOnChart ? "bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40" : "bg-[#141728] text-[#4a5580] border-[#1a2040] hover:text-white"}`}>
                  {strategyOnChart ? "⚡ On Chart ✓" : "📈 Apply to Chart"}
                </button>
                {/* AI Generate strategy */}
                <button onClick={async () => {
                  setAiLoading(true);
                  setAiOpen(true);
                  const prompt = `Write a professional Pine Script v5 strategy for ${symbol} using the current indicator setup. Focus on ${activeInds.has("RSI") ? "RSI crossovers" : "moving average crosses"}. Ensure it uses strategy.entry and strategy.close.`;
                  const context = buildAiContext();
                  try {
                    const res = await fetch("/api/ai", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], context, pineScriptOnly: true }),
                    });
                    const data = await res.json();
                    if (data.reply) {
                      const codeMatch = data.reply.match(/```(?:pinescript|pine)?([\s\S]*?)```/) || [null, data.reply];
                      const code = (codeMatch[1] || data.reply).trim();
                      setSC(code);
                      setStratName("AI " + strategyName);
                      setAiMsgs(prev => [...prev, { role: "assistant", content: "I've generated a new Pine Script strategy for you based on the current market context. You can see it in the editor." }]);
                    }
                  } catch (e) {
                    console.error("AI Strategy Gen failed", e);
                  }
                  setAiLoading(false);
                }}
                  className="text-[11px] px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg font-bold shadow-lg shadow-[#8b5cf6]/20 transition-all flex items-center gap-1.5">
                  {aiLoading ? <Spinner small /> : "🤖 AI Generate"}
                </button>
                <button onClick={() => setMainTab("BACKTEST")}
                  className="text-[11px] px-4 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold ml-auto">▶ Run Backtest →</button>
              </div>

              {/* Saved strategies */}
              {showSaved && (
                <div className="bg-[#0d1020] border border-[#1a2040] rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {savedStrategies.length === 0
                    ? <div className="text-[11px] text-[#4a5580] text-center py-2">No saved strategies yet</div>
                    : savedStrategies.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-[#141728] rounded-lg">
                        <div><div className="text-xs font-bold text-white">{s.name}</div><div className="text-[9px] text-[#4a5580]">{s.savedAt}</div></div>
                        <div className="flex gap-2">
                          <button onClick={() => loadSavedStrategy(s)} className="text-[9px] px-2 py-1 bg-[#1e2d6b] text-[#6b9fff] rounded">Load</button>
                          <button onClick={() => deleteSaved(s.id)} className="text-[9px] px-2 py-1 bg-[#ff4757]/10 text-[#ff4757] rounded border border-[#ff4757]/30">✕</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Code editor */}
              <div className="flex-1 relative rounded-xl overflow-hidden border border-[#1a2040] min-h-0">
                {/* Editor header */}
                <div className="absolute top-0 left-0 right-0 bg-[#141728] border-b border-[#1a2040] flex items-center px-3 py-1.5 gap-2 z-10 flex-wrap">
                  <span className="text-[9px] text-[#4a5580] font-mono">strategy.ts</span>
                  <div className="w-px h-3 bg-[#1a2040]" />
                  <span className="text-[9px] text-[#4a5580] uppercase tracking-wider">Templates:</span>
                  {[
                    { name: "SMA Cross", sl: 20, fa: 20, slow: 50 },
                    { name: "RSI Mean Rev", sl: 14, fa: 5, slow: 14 },
                    { name: "Breakout", sl: 20, fa: 10, slow: 20 },
                    { name: "Swing", sl: 9, fa: 9, slow: 21 },
                  ].map(t => (
                    <button key={t.name} onClick={() => {
                      setSC(DEFAULT_STRATEGY
                        .replace(/fast_length\s*=\s*input\(\d+/, `fast_length    = input(${t.fa}`)
                        .replace(/slow_length\s*=\s*input\(\d+/, `slow_length    = input(${t.slow}`)
                        .replace(/rsi_length\s*=\s*input\(\d+/, `rsi_length     = input(${t.sl}`)
                      );
                      setStratName(t.name);
                    }}
                      className="text-[9px] px-2 py-0.5 rounded bg-[#1a2040] text-[#4a5580] hover:text-[#6b9fff] border border-[#252d50] transition-colors">
                      {t.name}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    {strategyOnChart && (
                      <span className="text-[9px] text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded px-1.5 py-0.5">⚡ Live on chart</span>
                    )}
                    <span className="text-[9px] text-[#4a5580]">{strategyCode.split("\n").length} lines</span>
                  </div>
                </div>
                {/* Line numbers + textarea */}
                <div className="flex w-full h-full pt-9">
                  <div className="flex-none w-10 bg-[#080b17] border-r border-[#1a2040] pt-4 pb-4 overflow-hidden select-none">
                    {strategyCode.split("\n").map((_, i) => (
                      <div key={i} className="text-[9px] text-[#252d50] text-right pr-2 leading-6 font-mono">{i + 1}</div>
                    ))}
                  </div>
                  <textarea value={strategyCode} onChange={e => setSC(e.target.value)}
                    className="flex-1 bg-[#0d1020] text-[#e2e8f0] text-xs font-mono p-4 outline-none resize-none leading-6"
                    style={{ tabSize: 2 }} spellCheck={false} />
                </div>
              </div>

              {/* Footer hint bar */}
              <div className="flex-none text-[10px] text-[#4a5580] bg-[#141728] border border-[#1a2040] rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap">
                <span><span className="text-white font-bold">Parsed inputs:</span> fast_length · slow_length · rsi_length · rsi_overbought · rsi_oversold · stop_pct · tp_pct</span>
                <span className="text-[#252d50]">|</span>
                <span className="text-yellow-400">📈 Click &quot;Apply to Chart&quot; to see entry/exit arrows live on the main chart</span>
                <span className="text-[#252d50]">|</span>
                <span className="text-[#8b5cf6]">🤖 Use &quot;AI Generate&quot; to auto-write strategies based on current indicators</span>
              </div>
            </div>
          )}

          {/* ══ SCREENER ═══════════════════════════════════════════════ */}
          {mainTab === "SCREENER" && (
            <div className="flex-1 overflow-hidden flex flex-col p-4 gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-white">Market Screener</span>
                <div className="flex gap-1">{(["ALL", "BUY", "SELL"] as const).map(f => <button key={f} onClick={() => setSFilt(f)} className={`text-[11px] px-3 py-1 rounded font-bold border ${sfilt === f ? "bg-[#1e2d6b] text-[#6b9fff] border-[#2d4aaa]" : "text-[#4a5580] hover:text-white border-[#1a2040]"}`}>{f}</button>)}</div>
                <div className="flex items-center gap-2 ml-auto"><span className="text-[10px] text-[#4a5580]">Sort:</span>{(["changePct", "rsi"] as const).map(s => <button key={s} onClick={() => setSSort(s)} className={`text-[10px] px-2 py-0.5 rounded ${ssort === s ? "text-[#6b9fff]" : "text-[#4a5580] hover:text-white"}`}>{s === "changePct" ? "Change %" : "RSI"}</button>)}</div>
              </div>
              <div className="flex-1 overflow-y-auto rounded-xl border border-[#1a2040]">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[#1a2040] bg-[#141728] sticky top-0">{["Symbol", "Name", "Price", "Change", "Vol", "Cap", "P/E", "RSI", "Signal", ""].map(h => <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-[#4a5580] uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>{processedScreenerRows.map((r, i) => (<tr key={r.symbol} onClick={() => selectSym(r.symbol, "US")} className={`border-b border-[#0f1320] hover:bg-[#141728] cursor-pointer ${i % 2 ? "bg-[#0d1020]/30" : ""}`}>
                    <td className="px-4 py-2.5 font-mono font-black text-white">{r.symbol}</td>
                    <td className="px-4 py-2.5 text-[#8892b0] truncate max-w-[120px]">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono text-white">${r.price.toFixed(2)}</td>
                    <td className={`px-4 py-2.5 font-mono font-bold ${r.changePct >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{r.changePct >= 0 ? "+" : ""}{r.changePct.toFixed(2)}%</td>
                    <td className="px-4 py-2.5 text-[#4a5580]">{r.volume}</td><td className="px-4 py-2.5 text-[#4a5580]">${r.mktCap}</td><td className="px-4 py-2.5 text-[#4a5580]">{r.pe}</td>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-1.5"><div className="flex-1 h-1.5 bg-[#1a2040] rounded-full w-12 overflow-hidden"><div className={`h-full rounded-full ${r.rsi > 70 ? "bg-[#ff4757]" : r.rsi < 30 ? "bg-[#00d4aa]" : "bg-[#f59e0b]"}`} style={{ width: `${r.rsi}%` }} /></div><span className="font-mono text-[#8892b0]">{r.rsi}</span></div></td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${r.signal === "BUY" ? "bg-[#00d4aa]/20 text-[#00d4aa]" : r.signal === "SELL" ? "bg-[#ff4757]/20 text-[#ff4757]" : "bg-[#4a5580]/20 text-[#4a5580]"}`}>{r.signal}</span></td>
                    <td className="px-4 py-2.5"><button onClick={e => { e.stopPropagation(); selectSym(r.symbol, "US"); setMainTab("CHART"); }} className="text-[9px] px-2 py-1 bg-[#1e2d6b] text-[#6b9fff] rounded border border-[#2d4aaa]">Chart →</button></td>
                  </tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ ALERTS ═════════════════════════════════════════════════ */}
          {mainTab === "ALERTS" && (
            <div className="flex-1 overflow-hidden flex gap-4 p-4">
              <div className="w-72 flex-none bg-[#0d1020] border border-[#1a2040] rounded-xl p-4 flex flex-col gap-3 overflow-y-auto">
                <div className="text-sm font-bold text-white">Create Alert</div>
                <div className="space-y-2.5">
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Symbol</label><div className="bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white font-mono">{dispSym(symbol)}</div></div>
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Alert Type</label>
                    <select value={newAlert.type} onChange={e => setNewAlert(p => ({ ...p, type: e.target.value as Alert["type"] }))} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none">
                      <option value="PRICE">Price Alert</option><option value="RSI">RSI Alert</option><option value="MACD">MACD Signal</option><option value="OPTION">Options Alert</option>
                    </select>
                  </div>
                  {newAlert.type === "OPTION" && (<>
                    <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Option Type</label>
                      <div className="flex gap-1">{(["CALL", "PUT"] as const).map(t => <button key={t} onClick={() => setNewAlert(p => ({ ...p, optType: t }))} className={`flex-1 py-1 text-xs font-bold rounded ${newAlert.optType === t ? t === "CALL" ? "bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/40" : "bg-[#ff4757]/20 text-[#ff4757] border border-[#ff4757]/40" : "bg-[#141728] text-[#4a5580] border border-[#1a2040]"}`}>{t}</button>)}</div>
                    </div>
                    <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Strike Price</label><input type="number" value={newAlert.optStrike} onChange={e => setNewAlert(p => ({ ...p, optStrike: e.target.value }))} placeholder="e.g. 200" className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono" /></div>
                    <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Expiry (ISO: 2025-05-16)</label><input type="text" value={newAlert.optExpiry} onChange={e => setNewAlert(p => ({ ...p, optExpiry: e.target.value }))} placeholder="2025-05-16" className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono" /></div>
                  </>)}
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Condition</label>
                    <select value={newAlert.condition} onChange={e => setNewAlert(p => ({ ...p, condition: e.target.value as Alert["condition"] }))} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none">
                      <option value="ABOVE">Crosses Above</option><option value="BELOW">Crosses Below</option><option value="CROSS_UP">Cross Up</option><option value="CROSS_DOWN">Cross Down</option>
                    </select>
                  </div>
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">{newAlert.type === "RSI" ? "RSI Level" : "Price Level"} ({newAlert.type === "RSI" ? "0-100" : currency})</label><input type="number" value={newAlert.price} onChange={e => setNewAlert(p => ({ ...p, price: e.target.value }))} placeholder={newAlert.type === "RSI" ? "70" : fmt(quote?.price ?? 0, 2)} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono focus:border-[#3b82f6]" /></div>
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Message</label><input type="text" value={newAlert.message} onChange={e => setNewAlert(p => ({ ...p, message: e.target.value }))} placeholder="Alert description…" className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#3b82f6]" /></div>
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Action</label>
                    <select value={newAlert.action} onChange={e => setNewAlert(p => ({ ...p, action: e.target.value as Alert["action"] }))} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none">
                      <option value="NOTIFY">Notify Only</option>
                      <option value="PAPER_BUY">📄 Paper BUY</option><option value="PAPER_SELL">📄 Paper SELL</option>
                      <option value="BUY">🔴 Live BUY (Broker)</option><option value="SELL">🔴 Live SELL (Broker)</option>
                      {newAlert.type === "OPTION" && <option value="OPTION_BUY">⚙️ Buy Option Contract</option>}
                    </select>
                  </div>
                  {(newAlert.action !== "NOTIFY") && (<div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Quantity</label><input type="number" value={newAlert.qty} onChange={e => setNewAlert(p => ({ ...p, qty: e.target.value }))} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 py-2 text-xs text-white outline-none font-mono" /></div>)}
                  {(newAlert.action === "BUY" || newAlert.action === "SELL") && connected.length === 0 && <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-[10px] text-yellow-400">⚠️ Connect a broker first for live order execution</div>}
                  <button onClick={addAlert} className="w-full py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-black rounded-lg">+ Create Alert</button>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                <div className="flex items-center justify-between"><div className="text-sm font-bold text-white">Alerts ({alerts.length})</div>{triggeredAlerts.length > 0 && <button onClick={() => setAlerts(prev => prev.map(a => ({ ...a, triggered: false })))} className="text-[10px] text-[#4a5580] hover:text-white">Reset all</button>}</div>
                {alerts.length === 0 && <div className="text-[11px] text-[#4a5580] text-center py-8 bg-[#0d1020] border border-[#1a2040] rounded-xl">No alerts yet — create one on the left</div>}
                {alerts.map(a => (
                  <div key={a.id} className={`flex items-start gap-4 p-3 rounded-xl border ${a.triggered ? "border-[#00d4aa]/40 bg-[#00d4aa]/5" : a.active ? "border-[#1a2040] bg-[#0d1020]" : "border-[#1a2040]/50 bg-[#0d1020]/50 opacity-50"}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{a.symbol}</span>
                        <span className="text-[9px] bg-[#141728] px-1.5 py-0.5 rounded text-[#4a5580]">{a.type}</span>
                        <span className="text-[10px] text-[#4a5580]">{a.condition.replace("_", " ")} {(a.type === "PRICE" || a.type === "RSI") ? `${a.type === "RSI" ? "" : currency}${a.price}` : ""}</span>
                        {a.triggered && <span className="text-[9px] text-[#00d4aa] bg-[#00d4aa]/10 px-1.5 py-0.5 rounded-full font-bold animate-pulse">✓ TRIGGERED</span>}
                        {a.type === "OPTION" && <span className="text-[9px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">{a.optionType} {currency}{a.optionStrike} {a.optionExpiry}</span>}
                      </div>
                      <div className="text-[10px] text-[#4a5580] mt-0.5">{a.message}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${a.action === "BUY" || a.action === "PAPER_BUY" ? "text-[#00d4aa] bg-[#00d4aa]/10" : a.action === "SELL" || a.action === "PAPER_SELL" ? "text-[#ff4757] bg-[#ff4757]/10" : "text-[#4a5580] bg-[#1a2040]"}`}>{a.action.replace("_", " ")}</span>
                        {a.qty > 0 && <span className="text-[9px] text-[#4a5580]">×{a.qty}</span>}
                        <span className="text-[9px] text-[#252d50]">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-none">
                      <button onClick={() => setAlerts(prev => prev.map(x => x.id === a.id ? { ...x, active: !x.active } : x))} className={`text-[9px] px-2 py-1 rounded border font-bold ${a.active ? "border-[#00d4aa]/40 text-[#00d4aa]" : "border-[#1a2040] text-[#4a5580]"}`}>{a.active ? "ON" : "OFF"}</button>
                      <button onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))} className="text-[9px] px-2 py-1 rounded border border-[#ff4757]/30 text-[#ff4757] hover:bg-[#ff4757]/10">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PAPER TRADING ══════════════════════════════════════════ */}
          {mainTab === "PAPER" && (
            <div className="flex-1 overflow-hidden flex gap-4 p-4">
              <div className="w-64 flex-none bg-[#0d1020] border border-[#1a2040] rounded-xl p-4 flex flex-col gap-3 overflow-y-auto">
                <div className="text-sm font-bold text-white">Paper Order</div>
                <div className="flex rounded-lg overflow-hidden border border-[#1a2040]">{(["BUY", "SELL"] as OrderSide[]).map(s => <button key={s} onClick={() => setPS(s)} className={`flex-1 py-2 text-xs font-black ${paperSide === s ? s === "BUY" ? "bg-[#00d4aa] text-[#0b0e1a]" : "bg-[#ff4757] text-white" : "bg-[#141728] text-[#4a5580]"}`}>{s}</button>)}</div>
                <div className="bg-[#141728] rounded-lg p-2.5 flex justify-between items-center"><span className="text-xs font-black text-white">{dispSym(symbol)}</span><span className={`text-xs font-bold ${isUp ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{currency}{fmt(quote?.price ?? 0, 2)}</span></div>
                <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Order Type</label><select value={paperOT} onChange={e => setPOT(e.target.value as OrderType)} className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 h-8 text-xs text-white outline-none"><option>MARKET</option><option>LIMIT</option><option>STOP</option></select></div>
                <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Quantity</label><div className="flex items-center gap-2 bg-[#141728] border border-[#252d50] rounded-lg px-3 h-9"><button onClick={() => setPQ(q => String(Math.max(1, parseInt(q || "1") - 1)))} className="text-[#4a5580] hover:text-white">−</button><input type="number" value={paperQty} onChange={e => setPQ(e.target.value)} className="flex-1 bg-transparent text-xs text-white text-center outline-none font-mono" /><button onClick={() => setPQ(q => String(parseInt(q || "0") + 1))} className="text-[#4a5580] hover:text-white">+</button></div></div>
                {paperOT !== "MARKET" && <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Limit Price</label><div className="flex items-center gap-2 bg-[#141728] border border-[#252d50] rounded-lg px-3 h-9"><span className="text-[#4a5580] text-xs">{currency}</span><input type="number" value={paperLP} onChange={e => setPLP(e.target.value)} className="flex-1 bg-transparent text-xs text-white outline-none font-mono" /></div></div>}
                {/* Stop loss & Take profit */}
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Stop Loss</label><div className="flex items-center gap-1 bg-[#141728] border border-[#ff4757]/30 rounded-lg px-2 h-8"><span className="text-[#4a5580] text-[9px]">{currency}</span><input type="number" value={paperSL} onChange={e => setPSL(e.target.value)} placeholder="0" className="flex-1 bg-transparent text-[10px] text-white outline-none font-mono" /></div></div>
                  <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1">Take Profit</label><div className="flex items-center gap-1 bg-[#141728] border border-[#00d4aa]/30 rounded-lg px-2 h-8"><span className="text-[#4a5580] text-[9px]">{currency}</span><input type="number" value={paperTP} onChange={e => setPTP(e.target.value)} placeholder="0" className="flex-1 bg-transparent text-[10px] text-white outline-none font-mono" /></div></div>
                </div>
                <div className="bg-[#141728] rounded-lg p-2.5 space-y-1"><div className="flex justify-between text-[10px]"><span className="text-[#4a5580]">Cost</span><span className="text-white font-mono">{currency}{((parseFloat(paperQty) || 1) * (quote?.price ?? 0)).toFixed(2)}</span></div><div className="flex justify-between text-[10px]"><span className="text-[#4a5580]">Balance</span><span className="text-[#00d4aa] font-mono">${paperBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div></div>
                <button onClick={() => executePaperTrade(paperSide, parseInt(paperQty) || 1, quote?.price ?? 0, symbol, market)} className={`w-full py-2.5 rounded-lg text-sm font-black ${paperSide === "BUY" ? "bg-[#00d4aa] hover:bg-[#00bfa0] text-[#0b0e1a]" : "bg-[#ff4757] hover:bg-[#e03a48] text-white"}`}>{paperSide === "BUY" ? "▲" : "▼"} Paper {paperSide}</button>
                <div className="text-[9px] text-[#4a5580] text-center">🧪 Simulated — no real money</div>
                <div className="border-t border-[#1a2040] pt-2">
                  <div className="text-[9px] text-[#4a5580] uppercase tracking-wider mb-1.5">Alert → Auto Trade</div>
                  <div className="text-[9px] text-[#4a5580]">Go to 🔔 Alerts tab → set action to &quot;📄 Paper BUY/SELL&quot; to auto-execute paper trades when alerts fire.</div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                <div><div className="text-xs font-bold text-white mb-2">Open Positions ({paperPositions.length}) <span className={`ml-2 text-xs font-mono ${paperPositions.reduce((a, p) => a + p.pnl, 0) >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>Total P&L: {currency}{paperPositions.reduce((a, p) => a + p.pnl, 0).toFixed(2)}</span></div>
                  {paperPositions.length === 0 ? <div className="text-[11px] text-[#4a5580] bg-[#0d1020] border border-[#1a2040] rounded-xl p-4 text-center">No open positions</div> : (
                    <div className="bg-[#0d1020] border border-[#1a2040] rounded-xl overflow-hidden"><table className="w-full text-xs"><thead><tr className="border-b border-[#1a2040]">{["Symbol", "Side", "Qty", "Entry", "Price", "P&L", "SL", "TP", "Close"].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] text-[#4a5580] font-bold uppercase">{h}</th>)}</tr></thead>
                      <tbody>{paperPositions.map(p => (<tr key={p.id} className="border-b border-[#0f1320] hover:bg-[#141728]">
                        <td className="px-3 py-2 font-mono font-black text-white">{dispSym(p.symbol)}</td>
                        <td className="px-3 py-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.side === "LONG" ? "text-[#00d4aa] bg-[#00d4aa]/10" : "text-[#ff4757] bg-[#ff4757]/10"}`}>{p.side}</span></td>
                        <td className="px-3 py-2 font-mono text-white">{p.qty}</td>
                        <td className="px-3 py-2 font-mono text-[#8892b0]">${p.entryPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-white">${p.currentPrice.toFixed(2)}</td>
                        <td className={`px-3 py-2 font-mono font-bold ${p.pnl >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)} <span className="text-[9px] opacity-70">({p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(1)}%)</span></td>
                        <td className="px-3 py-2 font-mono text-[#ff4757] text-[9px]">{p.stopLoss ? `$${p.stopLoss}` : "—"}</td>
                        <td className="px-3 py-2 font-mono text-[#00d4aa] text-[9px]">{p.takeProfit ? `$${p.takeProfit}` : "—"}</td>
                        <td className="px-3 py-2"><button onClick={() => executePaperTrade("SELL", p.qty, quote?.price ?? p.currentPrice, p.symbol, p.market)} className="text-[9px] px-2 py-0.5 rounded bg-[#ff4757]/20 text-[#ff4757] border border-[#ff4757]/30">Close</button></td>
                      </tr>))}</tbody></table></div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden flex flex-col"><div className="text-xs font-bold text-white mb-2">Order History</div>
                  <div className="flex-1 overflow-y-auto bg-[#0d1020] border border-[#1a2040] rounded-xl">
                    {paperOrders.length === 0 ? <div className="text-[11px] text-[#4a5580] p-4 text-center">No orders yet</div> : (
                      <table className="w-full text-xs"><thead><tr className="border-b border-[#1a2040] sticky top-0 bg-[#0d1020]">{["Time", "Symbol", "Side", "Price", "Qty", "Status", "P&L"].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] text-[#4a5580] font-bold uppercase">{h}</th>)}</tr></thead>
                        <tbody>{paperOrders.map(o => (<tr key={o.id} className="border-b border-[#0f1320] hover:bg-[#141728]">
                          <td className="px-3 py-2 text-[#4a5580]">{o.time}</td><td className="px-3 py-2 font-mono font-bold text-white">{o.symbol}</td>
                          <td className="px-3 py-2"><span className={`text-[9px] font-bold ${o.side === "BUY" ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{o.side}</span></td>
                          <td className="px-3 py-2 font-mono text-white">${o.price.toFixed(2)}</td><td className="px-3 py-2 font-mono text-white">{o.qty}</td>
                          <td className="px-3 py-2"><span className="text-[9px] text-[#00d4aa] bg-[#00d4aa]/10 px-1.5 py-0.5 rounded">{o.status}</span></td>
                          <td className={`px-3 py-2 font-mono text-[11px] font-bold ${o.pnl === undefined ? "text-[#4a5580]" : o.pnl >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{o.pnl !== undefined ? `${o.pnl >= 0 ? "+" : ""}$${o.pnl.toFixed(2)}` : "—"}</td>
                        </tr>))}</tbody></table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ BACKTEST ════════════════════════════════════════════════ */}
          {mainTab === "BACKTEST" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-white">Backtest: <span className="text-[#6b9fff]">{dispSym(symbol)}</span></span>
                <div className="flex gap-1 flex-wrap">{(["1D", "1W", "1M", "3M", "1Y", "5Y"] as ChartRange[]).map(r => <button key={r} onClick={() => setBTRange(r)} title={BT_RANGE_MAP[r].label} className={`text-[11px] px-3 py-1 rounded font-bold border ${btRange === r ? "bg-[#1e2d6b] text-[#6b9fff] border-[#2d4aaa]" : "text-[#4a5580] hover:text-white border-[#1a2040]"}`}>{r}</button>)}</div>
                <button onClick={() => setMainTab("STRATEGY")} className="text-[11px] px-3 py-1.5 rounded-lg border border-[#252d50] text-[#4a5580] hover:text-white">✏️ Edit Strategy</button>
                <button onClick={async () => { setBTRunning(true); setBTResult(null); const d = await fetchChartForBacktest(symbol, btRange); const r = runBacktest(d, strategyCode); setBTResult(r); setBTRunning(false); }} disabled={btRunning} className="text-[11px] px-4 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-2">
                  {btRunning && <Spinner small />}{btRunning ? "Running…" : "▶ Run Backtest"}
                </button>
                {btResult && <span className="text-[10px] text-[#4a5580]">Initial: $10,000 · {btResult.totalTrades} trades</span>}
              </div>
              {!btResult && !btRunning && <div className="text-[11px] text-[#4a5580] text-center py-16 bg-[#0d1020] border border-[#1a2040] rounded-xl">Select a range and click &quot;Run Backtest&quot;<br /><span className="text-[9px] text-[#252d50] mt-1 block">Uses 1Y daily bars (250+ candles) for statistically meaningful results</span></div>}
              {btRunning && <div className="flex items-center justify-center py-16 gap-3"><Spinner /><span className="text-[11px] text-[#4a5580]">Fetching {btRange} daily bars and running strategy…</span></div>}
              {btResult && (<>
                {btResult.totalTrades === 0 ? (<div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                  <div className="text-yellow-400 text-sm font-bold">No trades generated</div>
                  <div className="text-[11px] text-[#4a5580] mt-1 space-y-1">
                    <p>The strategy found no crossover signals. Try:</p>
                    <p>• Use a <strong className="text-white">longer range</strong> (1M = 1 year, 3M = 2 years, 1Y = 5 years)</p>
                    <p>• Lower <code className="text-yellow-400">fast_length</code> (try 5) and <code className="text-yellow-400">slow_length</code> (try 20) in the strategy</p>
                    <p>• The backtest always uses <span className="text-[#00d4aa]">daily bars</span> for accuracy: {BT_RANGE_MAP[btRange].label}</p>
                  </div>
                </div>) : (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {[{ l: "Total Return", v: `${btResult.totalReturn >= 0 ? "+" : ""}${btResult.totalReturn}%`, up: btResult.totalReturn >= 0 }, { l: "Win Rate", v: `${btResult.winRate}%`, up: btResult.winRate >= 50 }, { l: "Trades", v: `${btResult.totalTrades}`, up: true }, { l: "Sharpe", v: `${btResult.sharpeRatio}`, up: btResult.sharpeRatio >= 1 }, { l: "Max DD", v: `-${btResult.maxDrawdown}%`, up: false }, { l: "Profit Factor", v: `${btResult.profitFactor}x`, up: btResult.profitFactor >= 1 }, { l: "Avg Win", v: `$${btResult.avgWin}`, up: true }, { l: "Avg Loss", v: `$${btResult.avgLoss}`, up: false }].map(s => (<div key={s.l} className="bg-[#0d1020] border border-[#1a2040] rounded-xl p-3"><div className="text-[9px] text-[#4a5580] uppercase tracking-wider">{s.l}</div><div className={`text-xl font-black font-mono mt-1 ${s.up ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{s.v}</div></div>))}
                    </div>
                    <div className="bg-[#0d1020] border border-[#1a2040] rounded-xl p-4">
                      <div className="text-xs font-bold text-white mb-3">Equity Curve (starting $10,000)</div>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={btResult.equityCurve} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a2040" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: "#4a5580", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: "#4a5580", fontSize: 9 }} tickLine={false} axisLine={false} width={72} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`} />
                          <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Equity"]} contentStyle={{ background: "#1a1f2e", border: "1px solid #2a3150", fontSize: 10 }} />
                          <ReferenceLine y={10000} stroke="#4a5580" strokeDasharray="4 4" strokeOpacity={0.5} />
                          <Area type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={1.5} fill="url(#eq)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-[#0d1020] border border-[#1a2040] rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#1a2040] text-xs font-bold text-white">Trade Log (last {btResult.trades.length})</div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-xs"><thead><tr className="border-b border-[#1a2040] bg-[#141728] sticky top-0">{["Date", "Action", "Price", "P&L", "P&L %"].map(h => <th key={h} className="px-4 py-2 text-left text-[9px] text-[#4a5580] font-bold uppercase">{h}</th>)}</tr></thead>
                          <tbody>{btResult.trades.map((t, i) => (<tr key={i} className="border-b border-[#0f1320] hover:bg-[#141728]"><td className="px-4 py-2 text-[#4a5580]">{t.date}</td><td className="px-4 py-2"><span className={`text-[9px] font-bold ${t.side === "SELL" || t.side === "SL" ? "text-[#ff4757]" : t.side === "TP" ? "text-[#00d4aa]" : "text-[#6b9fff]"}`}>{t.side}</span></td><td className="px-4 py-2 font-mono text-white">${t.price.toFixed(2)}</td><td className={`px-4 py-2 font-mono font-bold ${t.pnl >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}</td><td className={`px-4 py-2 font-mono ${t.pnlPct >= 0 ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%</td></tr>))}</tbody></table>
                      </div>
                    </div>
                  </>
                )}
              </>)}
            </div>
          )}
        </div>

        {/* Right panel — Chart tab only */}
        {mainTab === "CHART" && rightTab !== null && (
          <aside className="w-72 flex-none bg-[#0d1020] border-l border-[#1a2040] flex flex-col overflow-hidden">
            {rightTab === "ORDER" && <>
              <div className="p-3 border-b border-[#1a2040] flex-none"><div className="flex rounded-lg overflow-hidden border border-[#1a2040]">{(["BUY", "SELL"] as OrderSide[]).map(s => <button key={s} onClick={() => setOS(s)} className={`flex-1 py-2 text-xs font-black ${orderSide === s ? s === "BUY" ? "bg-[#00d4aa] text-[#0b0e1a]" : "bg-[#ff4757] text-white" : "bg-[#141728] text-[#4a5580]"}`}>{s}</button>)}</div></div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="bg-[#141728] rounded-lg p-3 border border-[#1a2040] flex justify-between items-center"><div><div className="text-xs font-black text-white">{dispSym(symbol)}</div><div className="text-[9px] text-[#4a5580] truncate max-w-[130px]">{quote?.name ?? "—"}</div></div><div className="text-right"><div className={`text-xs font-bold transition-colors duration-300 ${priceFlash === "up" ? "text-[#00d4aa]" : priceFlash === "down" ? "text-[#ff4757]" : isUp ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{currency}{fmt(quote?.price ?? 0, (quote?.price ?? 0) < 10 ? 4 : 2)}</div><div className={`text-[9px] ${isUp ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{isUp ? "+" : ""}{(quote?.changePct ?? 0).toFixed(2)}%</div></div></div>
                <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1.5">Order Type</label><div className="grid grid-cols-4 gap-1">{(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] as OrderType[]).map(t => <button key={t} onClick={() => setOT(t)} className={`py-1.5 text-[9px] rounded font-bold text-center ${orderType === t ? "bg-[#1e2d6b] text-[#6b9fff] border border-[#2d4aaa]" : "bg-[#141728] text-[#4a5580] border border-[#1a2040] hover:text-white"}`}>{t === "STOP_LIMIT" ? "STP LMT" : t}</button>)}</div></div>
                <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1.5">Qty</label><div className="flex items-center gap-2 bg-[#141728] border border-[#252d50] rounded-lg px-3 h-9"><button onClick={() => setQty(q => String(Math.max(1, parseInt(q || "1") - 1)))} className="text-[#4a5580] hover:text-white">−</button><input type="number" value={qty} onChange={e => setQty(e.target.value)} className="flex-1 bg-transparent text-xs text-white text-center outline-none font-mono" /><button onClick={() => setQty(q => String(parseInt(q || "0") + 1))} className="text-[#4a5580] hover:text-white">+</button></div></div>
                {(orderType === "LIMIT" || orderType === "STOP_LIMIT") && <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1.5">Limit</label><div className="flex items-center gap-2 bg-[#141728] border border-[#252d50] rounded-lg px-3 h-9"><span className="text-[#4a5580] text-xs">{currency}</span><input type="number" value={limitPx} onChange={e => setLP(e.target.value)} className="flex-1 bg-transparent text-xs text-white outline-none font-mono" /></div></div>}
                {(orderType === "STOP" || orderType === "STOP_LIMIT") && <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1.5">Stop</label><div className="flex items-center gap-2 bg-[#141728] border border-[#252d50] rounded-lg px-3 h-9"><span className="text-[#4a5580] text-xs">{currency}</span><input type="number" value={stopPx} onChange={e => setSP(e.target.value)} className="flex-1 bg-transparent text-xs text-white outline-none font-mono" /></div></div>}
                <div><label className="text-[9px] text-[#4a5580] uppercase tracking-wider block mb-1.5">TIF</label><select className="w-full bg-[#141728] border border-[#252d50] rounded-lg px-3 h-9 text-xs text-white outline-none"><option>Day Only</option><option>Good Till Cancel</option><option>IOC</option><option>FOK</option><option>Extended Hours</option></select></div>
                <div className="bg-[#141728] rounded-lg p-3 border border-[#1a2040] space-y-1.5"><div className="flex justify-between text-[10px]"><span className="text-[#4a5580]">Mkt Price</span><span className="text-white font-mono">{currency}{fmt(quote?.price ?? 0, (quote?.price ?? 0) < 10 ? 4 : 2)}</span></div><div className="flex justify-between text-[10px]"><span className="text-[#4a5580]">Qty</span><span className="text-white font-mono">{qty || "0"}</span></div><div className="flex justify-between text-[10px]"><span className="text-[#4a5580]">Broker</span><span className="text-white font-mono">{connected.length > 0 ? connected[0].name : "None"}</span></div><div className="border-t border-[#1a2040] pt-1.5 flex justify-between text-[11px]"><span className="text-[#4a5580] font-bold">Est. Total</span><span className="text-white font-mono font-bold">{currency}{estTotal}</span></div></div>
                {connected.length === 0 && <button onClick={() => setRightTab("BROKERS")} className="w-full py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold hover:bg-yellow-500/20">⚠️ Connect broker →</button>}
                <button onClick={() => setOD(true)} className={`w-full py-3 rounded-lg text-sm font-black ${orderSide === "BUY" ? "bg-[#00d4aa] hover:bg-[#00bfa0] text-[#0b0e1a]" : "bg-[#ff4757] hover:bg-[#e03a48] text-white"}`}>{orderSide === "BUY" ? "▲" : "▼"} Place {orderType.replace("_", " ")} {orderSide}</button>
                {orderDone && <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg p-3 text-center"><div className="text-[#00d4aa] text-xs font-bold">✓ Order Submitted</div><div className="text-[#4a5580] text-[10px] mt-0.5">{orderSide} {qty} × {dispSym(symbol)}</div></div>}
              </div>
              <div className="border-t border-[#1a2040] p-3 flex-none">
                <div className="text-[9px] text-[#4a5580] uppercase tracking-wider mb-2">Order Book</div>
                {[3, 2, 1].map((i, idx) => { const ap = (quote?.price ?? 0) * (1 + i * 0.001); const sz = obSizes[idx]; return <div key={"a" + i} className="flex items-center justify-between text-[10px] font-mono mb-0.5"><span className="text-[#ff4757] w-20">{ap.toFixed(2)}</span><div className="flex-1 mx-2 h-1.5 bg-[#ff4757]/10 rounded-sm"><div className="h-full bg-[#ff4757]/40 rounded-sm" style={{ width: `${sz / 10}%` }} /></div><span className="text-[#4a5580] w-10 text-right">{sz}</span></div>; })}
                <div className="flex justify-between text-[10px] font-mono py-1 border-y border-[#1a2040] my-0.5"><span className={`font-black transition-colors duration-300 ${priceFlash === "up" ? "text-[#00d4aa]" : priceFlash === "down" ? "text-[#ff4757]" : isUp ? "text-[#00d4aa]" : "text-[#ff4757]"}`}>{(quote?.price ?? 0).toFixed(2)}</span><span className="text-[#4a5580] text-[9px]">LAST</span></div>
                {[1, 2, 3].map((i, idx) => { const bp = (quote?.price ?? 0) * (1 - i * 0.001); const sz = obSizes[idx + 3]; return <div key={"b" + i} className="flex items-center justify-between text-[10px] font-mono mb-0.5"><span className="text-[#00d4aa] w-20">{bp.toFixed(2)}</span><div className="flex-1 mx-2 h-1.5 bg-[#00d4aa]/10 rounded-sm"><div className="h-full bg-[#00d4aa]/40 rounded-sm" style={{ width: `${sz / 10}%` }} /></div><span className="text-[#4a5580] w-10 text-right">{sz}</span></div>; })}
              </div>
            </>}
            {rightTab === "OPTIONS" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b border-[#1a2040] flex-none">
                  <div className="flex items-center justify-between mb-2"><div className="text-xs font-bold text-white">Options Chain</div><div className="flex items-center gap-1.5">{optLoad && <Spinner small />}<div className="text-[9px] text-[#4a5580]">{dispSym(symbol)}</div></div></div>
                  {market === "CRYPTO" ? <div className="text-[10px] text-[#4a5580] bg-[#141728] rounded-lg p-2 text-center">Options not available for crypto</div>
                    : optExpLoad ? <div className="flex items-center gap-2 py-2"><Spinner small /><span className="text-[10px] text-[#4a5580]">Loading…</span></div>
                      : optExp.length === 0 ? <div className="text-[10px] text-[#4a5580] bg-[#141728] rounded-lg p-2 text-center">No expiry dates<br /><span className="text-[9px]">Create <code>/api/options/expirations</code></span></div>
                        : (<><div className="text-[9px] text-[#4a5580] mb-1.5 uppercase tracking-wider">Expiry</div><div className="flex flex-wrap gap-1">{optExp.map(exp => <button key={exp} onClick={() => setOptExpiry(exp)} className={`text-[9px] px-2 py-0.5 rounded font-bold ${optExpiry === exp ? "bg-[#1e2d6b] text-[#6b9fff] border border-[#2d4aaa]" : "bg-[#141728] text-[#4a5580] border border-[#1a2040] hover:text-white"}`}>{fmtExp(exp)}</button>)}</div></>)}
                  {selectedOptStrike && <div className="mt-2 p-2 bg-[#141728] rounded-lg flex items-center justify-between"><div className="text-[10px] text-white">{selectedOptType} Strike ${selectedOptStrike}</div><div className="flex gap-1"><button onClick={() => { setMainTab("ALERTS"); setNewAlert(p => ({ ...p, type: "OPTION", optStrike: String(selectedOptStrike), optType: selectedOptType, optExpiry, action: "NOTIFY" })); }} className="text-[9px] px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">🔔 Alert</button></div></div>}
                </div>
                {market !== "CRYPTO" && optExp.length > 0 && (<>
                  <div className="flex items-center gap-1 px-2 py-1 border-b border-[#1a2040] flex-none bg-[#0a0d19]">
                    <span className="text-[8px] text-[#4a5580] uppercase tracking-wider mr-1">Filter:</span>
                    {(["ALL", "ITM", "OTM", "BTO", "STO"] as const).map(f => (
                      <button key={f} onClick={() => setOptFilter(f as "ALL" | "ITM" | "OTM" | "BTO" | "STO")} className={`text-[8px] px-1.5 py-0.5 rounded font-bold border transition-all ${optFilter === f ? "bg-[#1e2d6b] text-[#6b9fff] border-[#2d4aaa]" : "text-[#4a5580] border-[#1a2040] hover:text-white"}`} title={f === "BTO" ? "Buy to Open" : f === "STO" ? "Sell to Open" : f === "ITM" ? "In the Money" : f === "OTM" ? "Out of the Money" : "All strikes"}>{f}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-9 px-2 py-1.5 border-b border-[#1a2040] flex-none bg-[#0d1020]">{["BID", "ASK", "IV", "Δ", "STRIKE", "Δ", "IV", "BID", "ASK"].map((h, i) => <div key={i} className={`text-[8px] font-bold uppercase tracking-wider ${i < 4 ? "text-[#00d4aa]/60" : i === 4 ? "text-center text-white" : "text-[#ff4757]/60 text-right"}`}>{h}</div>)}</div>
                  <div className="text-[8px] flex justify-between px-4 py-0.5 border-b border-[#0f1320] bg-[#0a0d19] flex-none"><span className="text-[#00d4aa]/50">◀ CALLS</span><span className="text-[#ff4757]/50">PUTS ▶</span></div>
                </>)}
                <div className="flex-1 overflow-y-auto">
                  {optLoad ? <div className="flex items-center justify-center h-32 gap-2"><Spinner /><span className="text-[11px] text-[#4a5580]">Loading…</span></div>
                    : optRows.length > 0 ? optRows.filter(row => {
                      if (optFilter === "ALL") return true;
                      if (optFilter === "ITM") return (row.call?.delta ?? 0) > 0.5 || (row.put?.delta ?? 0) < -0.5;
                      if (optFilter === "OTM") return (row.call?.delta ?? 0) < 0.5 && (row.call?.delta ?? 0) > 0 && (row.put?.delta ?? 0) > -0.5;
                      if (optFilter === "BTO") return (row.call?.bid ?? 0) > 0 || (row.put?.bid ?? 0) > 0;
                      if (optFilter === "STO") return (row.call?.openInterest ?? 0) > 0 || (row.put?.openInterest ?? 0) > 0;
                      return true;
                    }).map(row => (
                      <div key={row.strike} onClick={() => { setSelStrike(row.strike); setSelOptType(row.call ? "CALL" : "PUT"); }} className={`grid grid-cols-9 px-2 py-1 border-b border-[#0f1320] hover:bg-[#141728] cursor-pointer text-[9px] font-mono ${row.isATM ? "bg-[#1a2540]/80" : ""} ${selectedOptStrike === row.strike ? "ring-1 ring-[#f59e0b]/40" : ""}`}>
                        <span className="text-[#00d4aa]">{row.call ? fmt(row.call.bid, 2) : "—"}</span><span className="text-[#00d4aa]/70">{row.call ? fmt(row.call.ask, 2) : "—"}</span>
                        <span className="text-[#4a5580]">{row.call ? `${(row.call.iv * 100).toFixed(0)}%` : "—"}</span><span className="text-[#4a5580]">{row.call ? row.call.delta.toFixed(2) : "—"}</span>
                        <span className={`text-center font-black ${row.isATM ? "text-white" : "text-[#8892b0]"}`}>{row.strike}</span>
                        <span className="text-[#4a5580] text-right">{row.put ? row.put.delta.toFixed(2) : "—"}</span><span className="text-[#4a5580] text-right">{row.put ? `${(row.put.iv * 100).toFixed(0)}%` : "—"}</span>
                        <span className="text-[#ff4757]/70 text-right">{row.put ? fmt(row.put.bid, 2) : "—"}</span><span className="text-[#ff4757] text-right">{row.put ? fmt(row.put.ask, 2) : "—"}</span>
                      </div>
                    )) : optExpiry && !optLoad ? <div className="flex flex-col items-center justify-center h-32 gap-1 text-center px-4"><div className="text-[11px] text-[#4a5580]">No options data</div><div className="text-[9px] text-[#252d50]">Create <code className="text-[#4a5580]">/api/options</code></div></div> : null}
                </div>
                <div className="p-2 border-t border-[#1a2040] text-[9px] text-[#4a5580] text-center flex-none">Click any row to select strike · 🔔 to set alert</div>
              </div>
            )}
            {rightTab === "BROKERS" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b border-[#1a2040] flex-none"><div className="text-xs font-bold text-white">Broker Integrations</div><div className="text-[10px] text-[#4a5580] mt-0.5">Connect for live data & orders</div></div>
                <div className="flex-1 overflow-y-auto p-2">{(["US", "INDIA", "CRYPTO"] as Market[]).map(m => (<div key={m}><div className="text-[9px] text-[#4a5580] uppercase tracking-wider px-1 py-2">{m === "US" ? "🇺🇸 US" : m === "INDIA" ? "🇮🇳 India" : "₿ Crypto"}</div>{brokers.filter(b => b.markets.includes(m)).map(b => { const conn = b.status === "connected"; return (<div key={b.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border mb-1 ${conn ? "border-[#00d4aa]/30 bg-[#00d4aa]/5" : "border-[#1a2040] bg-[#141728] hover:border-[#252d50]"}`}><div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-none" style={{ background: b.color }}>{b.logo}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><span className="text-[11px] font-bold text-white">{b.name}</span>{conn && <span className="text-[8px] text-[#00d4aa] bg-[#00d4aa]/10 px-1.5 py-0.5 rounded-full font-bold">LIVE</span>}</div><div className="text-[9px] text-[#4a5580] truncate">{b.desc}</div></div><button onClick={() => conn ? setBrokers(prev => prev.map(x => x.id === b.id ? { ...x, status: "disconnected" } : x)) : setModal(b)} className={`flex-none text-[9px] px-2 py-1 rounded font-bold whitespace-nowrap ${conn ? "bg-[#141728] text-[#4a5580] border border-[#252d50] hover:text-[#ff4757]" : "text-white border"}`} style={conn ? {} : { background: b.color, borderColor: b.color }}>{conn ? "Disconnect" : "Connect"}</button></div>); })}</div>))}</div>
                <div className="p-3 border-t border-[#1a2040] text-[9px] text-[#4a5580] text-center flex-none">🔒 Keys in localStorage only</div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
           🤖 AI COPILOT — floating panel
      ══════════════════════════════════════════════════════════════════ */}

      {/* Floating button */}
      <button
        onClick={() => setAiOpen(v => !v)}
        title="ProChartAI Copilot"
        className={`fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 ${aiOpen ? "bg-[#ff4757]" : "bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]"}`}
      >
        {aiOpen ? "✕" : "🤖"}
      </button>

      {/* AI Panel */}
      {aiOpen && (
        <div className="fixed bottom-24 right-6 z-[199] w-[420px] h-[600px] bg-[#0d1020] border border-[#252d50] rounded-2xl shadow-[0_0_60px_rgba(59,130,246,0.15)] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex-none bg-gradient-to-r from-[#0d1a3a] to-[#0d1020] border-b border-[#1a2040] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-base">🤖</div>
                <div>
                  <div className="text-sm font-black text-white">ProChartAI</div>
                  <div className="text-[9px] text-[#6b9fff]">Groq · Llama 3.1 70B · {dispSym(symbol)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {aiMessages.length > 0 && (
                  <button onClick={() => setAiMsgs([])} className="text-[9px] text-[#4a5580] hover:text-white px-2 py-1 rounded border border-[#1a2040] hover:border-[#252d50]">Clear</button>
                )}
                <div className="flex rounded-lg overflow-hidden border border-[#1a2040]">
                  {(["CHAT", "NEWS"] as const).map(t => (
                    <button key={t} onClick={() => setAiPanelTab(t)} className={`px-3 py-1 text-[10px] font-bold ${aiPanelTab === t ? "bg-[#1e2d6b] text-[#6b9fff]" : "text-[#4a5580] hover:text-white"}`}>
                      {t === "CHAT" ? "💬 Chat" : "📰 News"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live context strip */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[
                { l: "RSI", v: (() => { const r = rsiVals[rsiVals.length - 1]; return r != null ? r.toFixed(0) : "—" })(), color: (() => { const r = rsiVals[rsiVals.length - 1]; return r == null ? "#4a5580" : r > 70 ? "#ff4757" : r < 30 ? "#00d4aa" : "#f59e0b" })() },
                { l: "MACD", v: (() => { const m = macdData.macd[macdData.macd.length - 1], s = macdData.signal[macdData.signal.length - 1]; return (m != null && s != null) ? m > s ? "▲ Bull" : "▼ Bear" : "—" })(), color: (() => { const m = macdData.macd[macdData.macd.length - 1], s = macdData.signal[macdData.signal.length - 1]; return (m != null && s != null) ? m > s ? "#00d4aa" : "#ff4757" : "#4a5580" })() },
                { l: "Vol×", v: (quote && quote.avgVolume > 0) ? (quote.volume / quote.avgVolume).toFixed(1) + "x" : "—", color: (quote && quote.avgVolume > 0) ? (quote.volume / quote.avgVolume) > 1.5 ? "#00d4aa" : (quote.volume / quote.avgVolume) < 0.5 ? "#ff4757" : "#f59e0b" : "#4a5580" },
                { l: "Trend", v: (quote?.changePct ?? 0) >= 0 ? "▲ Up" : "▼ Down", color: (quote?.changePct ?? 0) >= 0 ? "#00d4aa" : "#ff4757" },
              ].map(it => (
                <div key={it.l} className="bg-[#141728] rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[8px] text-[#4a5580] uppercase tracking-wider">{it.l}</div>
                  <div className="text-[11px] font-black font-mono mt-0.5" style={{ color: it.color }}>{it.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CHAT TAB ── */}
          {aiPanelTab === "CHAT" && (<>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.length === 0 && (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🤖</div>
                    <div className="text-xs font-bold text-white">ProChartAI Copilot</div>
                    <div className="text-[10px] text-[#4a5580] mt-1">Ask me anything about {dispSym(symbol)} — I have live indicator data.</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {[
                      "Should I buy now?", "Analyze all signals", "Suggest a stop loss", "Is this overbought?",
                      "What does MACD say?", "Explain the volatility", "Best entry point?", "Rate this trade setup",
                    ].map(q => (
                      <button key={q} onClick={() => { sendToAI(q); }}
                        className="text-[10px] px-2 py-1.5 rounded-lg bg-[#141728] text-[#6b9fff] border border-[#1a2040] hover:border-[#2d4aaa] hover:bg-[#1e2d6b] text-left transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {aiMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-[11px] leading-relaxed ${m.role === "user"
                      ? "bg-[#1e2d6b] text-white rounded-br-sm"
                      : "bg-[#141728] border border-[#1e2540] text-[#c8d3f5] rounded-bl-sm"
                    }`}>
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[8px] text-[#6b9fff] font-bold uppercase tracking-wider">🤖 QuantTradeAI</span>
                      </div>
                    )}
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#141728] border border-[#1e2540] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                    <span className="text-[10px] text-[#4a5580]">Analyzing {dispSym(symbol)}…</span>
                  </div>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex-none border-t border-[#1a2040] p-3">
              <div className="flex gap-2">
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && aiInput.trim()) { e.preventDefault(); sendToAI(aiInput); setAiInput(""); } }}
                  placeholder={`Ask about ${dispSym(symbol)}…`}
                  disabled={aiLoading}
                  className="flex-1 bg-[#141728] border border-[#252d50] rounded-xl px-3 py-2 text-[11px] text-white placeholder-[#4a5580] outline-none focus:border-[#3b82f6] disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={() => { if (aiInput.trim()) { sendToAI(aiInput); setAiInput(""); } }}
                  disabled={aiLoading || !aiInput.trim()}
                  className="w-10 h-10 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold text-sm transition-all"
                >↑</button>
              </div>
              <div className="text-[9px] text-[#252d50] text-center mt-1.5">Powered by Groq · Not financial advice</div>
            </div>
          </>)}

          {/* ── NEWS TAB ── */}
          {aiPanelTab === "NEWS" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col">
              <div className="flex items-center justify-between mb-1 flex-none">
                <span className="text-[10px] text-[#4a5580] uppercase tracking-wider">Latest News · {dispSym(symbol)}</span>
                {newsLoading && <div className="w-3 h-3 border border-[#3b82f6] border-t-transparent rounded-full animate-spin" />}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {news.length === 0 && !newsLoading && (
                  <div className="text-[11px] text-[#4a5580] text-center py-8 bg-[#141728] rounded-xl border border-[#1a2040]">
                    No news found<br /><span className="text-[9px]">Add FINNHUB_API_KEY to .env.local for live news</span>
                  </div>
                )}
                {news.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noreferrer"
                    className="block bg-[#141728] border border-[#1a2040] rounded-xl p-3 hover:border-[#252d50] transition-all">
                    <div className="flex items-start gap-2">
                      <span className={`flex-none text-[8px] font-black px-1.5 py-0.5 rounded-full mt-0.5 ${n.sentiment === "positive" ? "bg-[#00d4aa]/20 text-[#00d4aa]"
                          : n.sentiment === "negative" ? "bg-[#ff4757]/20 text-[#ff4757]"
                            : "bg-[#4a5580]/20 text-[#4a5580]"
                        }`}>{n.sentiment === "positive" ? "▲" : n.sentiment === "negative" ? "▼" : "●"}</span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-white leading-tight">{n.headline}</div>
                        {n.summary && <div className="text-[9px] text-[#4a5580] mt-1">{n.summary}</div>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[8px] text-[#252d50]">{n.source}</span>
                          <span className="text-[8px] text-[#252d50]">·</span>
                          <span className="text-[8px] text-[#252d50]">{n.time}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              {news.length > 0 && (
                <button
                  onClick={() => { setAiPanelTab("CHAT"); sendToAI(`Analyze the recent news sentiment for ${dispSym(symbol)} and tell me if it's bullish or bearish for trading.`); }}
                  className="flex-none w-full py-2 rounded-xl bg-[#1e2d6b] border border-[#2d4aaa] text-[#6b9fff] text-[10px] font-bold hover:bg-[#252d80] transition-colors mt-2"
                >
                  🤖 Ask AI to analyze this news →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
