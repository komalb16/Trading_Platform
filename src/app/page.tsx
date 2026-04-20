"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type Market = "US" | "INDIA" | "CRYPTO";
type AssetClass = "stocks" | "options" | "crypto";

interface Broker {
  id: string;
  name: string;
  logo: string;
  markets: Market[];
  status: "connected" | "disconnected";
  color: string;
}

interface Ticker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: string;
  mktCap: string;
  market: Market;
  sector?: string;
}

// ── Static Data ────────────────────────────────────────────────────────────
const BROKERS: Broker[] = [
  { id: "zerodha",   name: "Zerodha",        logo: "Z",  markets: ["INDIA"],         status: "disconnected", color: "#387ED1" },
  { id: "angel",     name: "Angel One",       logo: "A",  markets: ["INDIA"],         status: "disconnected", color: "#E94D35" },
  { id: "upstox",    name: "Upstox",          logo: "U",  markets: ["INDIA"],         status: "disconnected", color: "#6C3CE1" },
  { id: "robinhood", name: "Robinhood",       logo: "R",  markets: ["US"],            status: "disconnected", color: "#00C805" },
  { id: "alpaca",    name: "Alpaca",          logo: "AP", markets: ["US"],            status: "disconnected", color: "#FEBD69" },
  { id: "ibkr",      name: "IBKR",           logo: "IB", markets: ["US", "INDIA"],   status: "disconnected", color: "#E8001C" },
  { id: "coinbase",  name: "Coinbase",        logo: "C",  markets: ["CRYPTO"],        status: "disconnected", color: "#0052FF" },
  { id: "binance",   name: "Binance",         logo: "BN", markets: ["CRYPTO"],        status: "disconnected", color: "#F3BA2F" },
  { id: "kraken",    name: "Kraken",          logo: "KR", markets: ["CRYPTO"],        status: "disconnected", color: "#5741D9" },
];

const US_STOCKS: Ticker[] = [
  { symbol: "AAPL",  name: "Apple Inc.",           price: 189.84, change: +2.31, changePct: +1.23, volume: "62.4M", mktCap: "2.94T", market: "US", sector: "Technology" },
  { symbol: "MSFT",  name: "Microsoft Corp.",       price: 415.26, change: -1.74, changePct: -0.42, volume: "18.2M", mktCap: "3.08T", market: "US", sector: "Technology" },
  { symbol: "NVDA",  name: "NVIDIA Corp.",          price: 878.36, change: +14.5, changePct: +1.68, volume: "41.6M", mktCap: "2.16T", market: "US", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.",         price: 172.63, change: -0.88, changePct: -0.51, volume: "22.1M", mktCap: "2.12T", market: "US", sector: "Communication" },
  { symbol: "AMZN",  name: "Amazon.com Inc.",       price: 195.87, change: +3.12, changePct: +1.62, volume: "35.4M", mktCap: "2.07T", market: "US", sector: "Consumer" },
  { symbol: "META",  name: "Meta Platforms",        price: 523.08, change: +8.44, changePct: +1.64, volume: "15.9M", mktCap: "1.33T", market: "US", sector: "Communication" },
  { symbol: "TSLA",  name: "Tesla Inc.",            price: 163.57, change: -4.23, changePct: -2.52, volume: "88.7M", mktCap: "0.52T", market: "US", sector: "Automotive" },
  { symbol: "JPM",   name: "JPMorgan Chase",        price: 228.45, change: +1.06, changePct: +0.47, volume: "9.8M",  mktCap: "0.66T", market: "US", sector: "Finance" },
];

const INDIA_STOCKS: Ticker[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2934.50, change: +22.3, changePct: +0.77, volume: "5.2M",  mktCap: "19.87T", market: "INDIA", sector: "Energy" },
  { symbol: "TCS",      name: "Tata Consultancy",    price: 3845.20, change: -18.6, changePct: -0.48, volume: "1.4M",  mktCap: "13.99T", market: "INDIA", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank",           price: 1642.80, change: +9.4,  changePct: +0.58, volume: "8.7M",  mktCap: "12.47T", market: "INDIA", sector: "Finance" },
  { symbol: "INFY",     name: "Infosys Ltd",         price: 1483.65, change: -7.2,  changePct: -0.48, volume: "3.2M",  mktCap: "6.17T",  market: "INDIA", sector: "IT" },
  { symbol: "WIPRO",    name: "Wipro Ltd",           price: 452.30,  change: +3.8,  changePct: +0.85, volume: "6.1M",  mktCap: "2.38T",  market: "INDIA", sector: "IT" },
  { symbol: "ICICIBANK",name: "ICICI Bank",          price: 1258.40, change: +11.2, changePct: +0.90, volume: "7.3M",  mktCap: "8.86T",  market: "INDIA", sector: "Finance" },
  { symbol: "BAJFINANCE",name:"Bajaj Finance",       price: 6824.75, change: -45.2, changePct: -0.66, volume: "0.9M",  mktCap: "4.11T",  market: "INDIA", sector: "Finance" },
  { symbol: "ADANIENT", name: "Adani Enterprises",  price: 2423.60, change: +31.5, changePct: +1.32, volume: "2.4M",  mktCap: "2.76T",  market: "INDIA", sector: "Conglomerate" },
];

const CRYPTO_ASSETS: Ticker[] = [
  { symbol: "BTC",  name: "Bitcoin",         price: 64823.40, change: +1234.5, changePct: +1.94, volume: "28.4B", mktCap: "1.27T", market: "CRYPTO" },
  { symbol: "ETH",  name: "Ethereum",        price: 3148.72,  change: -42.3,  changePct: -1.32, volume: "12.7B", mktCap: "378.4B", market: "CRYPTO" },
  { symbol: "SOL",  name: "Solana",          price: 148.63,   change: +4.82,  changePct: +3.35, volume: "3.2B",  mktCap: "68.2B",  market: "CRYPTO" },
  { symbol: "BNB",  name: "BNB",             price: 583.27,   change: +8.14,  changePct: +1.42, volume: "1.8B",  mktCap: "86.1B",  market: "CRYPTO" },
  { symbol: "XRP",  name: "XRP",             price: 0.5234,   change: -0.012, changePct: -2.24, volume: "2.1B",  mktCap: "29.4B",  market: "CRYPTO" },
  { symbol: "DOGE", name: "Dogecoin",        price: 0.1648,   change: +0.008, changePct: +5.1,  volume: "1.3B",  mktCap: "23.8B",  market: "CRYPTO" },
  { symbol: "ADA",  name: "Cardano",         price: 0.4521,   change: -0.019, changePct: -4.04, volume: "0.7B",  mktCap: "15.9B",  market: "CRYPTO" },
  { symbol: "AVAX", name: "Avalanche",       price: 36.84,    change: +1.24,  changePct: +3.48, volume: "0.5B",  mktCap: "15.1B",  market: "CRYPTO" },
];

const US_OPTIONS = [
  { symbol: "AAPL 190C 24/05", type: "CALL", strike: 190, expiry: "24 May", bid: 4.20,  ask: 4.35,  iv: "28.4%", oi: "42.3K", delta: 0.48 },
  { symbol: "NVDA 900C 31/05", type: "CALL", strike: 900, expiry: "31 May", bid: 18.40, ask: 18.70, iv: "52.1%", oi: "18.9K", delta: 0.42 },
  { symbol: "TSLA 160P 24/05", type: "PUT",  strike: 160, expiry: "24 May", bid: 5.60,  ask: 5.80,  iv: "61.3%", oi: "31.2K", delta: -0.51 },
  { symbol: "SPY  520C 17/05", type: "CALL", strike: 520, expiry: "17 May", bid: 2.10,  ask: 2.18,  iv: "14.2%", oi: "98.4K", delta: 0.44 },
];

const INDIA_OPTIONS = [
  { symbol: "NIFTY 22500CE 30/05", type: "CALL", strike: 22500, expiry: "30 May", bid: 142.5,  ask: 143.0,  iv: "12.8%", oi: "1.24M", delta: 0.46 },
  { symbol: "BANKNIFTY 48000PE 23/05", type: "PUT", strike: 48000, expiry: "23 May", bid: 284.0,  ask: 285.5,  iv: "18.4%", oi: "0.87M", delta: -0.49 },
  { symbol: "RELIANCE 2950CE 25/05", type: "CALL", strike: 2950, expiry: "25 May", bid: 38.2, ask: 38.8, iv: "22.1%", oi: "0.34M", delta: 0.43 },
  { symbol: "TCS 3800PE 30/05", type: "PUT", strike: 3800, expiry: "30 May", bid: 55.4, ask: 56.0, iv: "19.6%", oi: "0.21M", delta: -0.44 },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtPrice = (v: number, mkt: Market) =>
  mkt === "INDIA" ? `₹${v.toLocaleString("en-IN")}` :
  mkt === "CRYPTO" && v < 1 ? `$${v.toFixed(4)}` :
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Components ─────────────────────────────────────────────────────────────

function MarketBadge({ market }: { market: Market }) {
  const cfg: Record<Market, { label: string; cls: string }> = {
    US:     { label: "🇺🇸 US",     cls: "bg-blue-900/40 text-blue-300 border-blue-700/40" },
    INDIA:  { label: "🇮🇳 India",  cls: "bg-orange-900/40 text-orange-300 border-orange-700/40" },
    CRYPTO: { label: "₿ Crypto",  cls: "bg-yellow-900/40 text-yellow-300 border-yellow-700/40" },
  };
  const { label, cls } = cfg[market];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cls}`}>{label}</span>
  );
}

function ChangeCell({ v, pct }: { v: number; pct: number }) {
  const pos = v >= 0;
  return (
    <div className={`text-right ${pos ? "text-emerald-400" : "text-red-400"}`}>
      <div className="text-sm font-semibold">{pos ? "+" : ""}{v.toFixed(2)}</div>
      <div className="text-xs opacity-80">{pos ? "+" : ""}{pct.toFixed(2)}%</div>
    </div>
  );
}

function BrokerCard({ broker, onToggle }: { broker: Broker; onToggle: (id: string) => void }) {
  return (
    <div
      className="relative flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      style={{
        borderColor: broker.status === "connected" ? broker.color + "66" : "#2a2a2a",
        background: broker.status === "connected" ? broker.color + "12" : "#111",
      }}
      onClick={() => onToggle(broker.id)}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black text-white"
          style={{ background: broker.color }}
        >
          {broker.logo}
        </div>
        <div className={`w-2 h-2 rounded-full mt-1 ${broker.status === "connected" ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-zinc-600"}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{broker.name}</div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {broker.markets.map(m => <MarketBadge key={m} market={m} />)}
        </div>
      </div>
      <button
        className="text-xs py-1.5 px-3 rounded-lg font-semibold transition-colors"
        style={{
          background: broker.status === "connected" ? "#1a1a1a" : broker.color,
          color: broker.status === "connected" ? "#888" : "#fff",
          border: `1px solid ${broker.status === "connected" ? "#333" : broker.color}`,
        }}
      >
        {broker.status === "connected" ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}

function StocksTable({ data, market }: { data: Ticker[]; market: Market }) {
  const curr = market === "INDIA" ? "₹" : "$";
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            {["Symbol", "Name", "Price", "Change", "Volume", "Mkt Cap", "Sector"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((t, i) => (
            <tr key={t.symbol} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-zinc-900/20"}`}>
              <td className="px-4 py-3">
                <span className="font-mono font-bold text-white text-xs tracking-wide">{t.symbol}</span>
              </td>
              <td className="px-4 py-3 text-zinc-300 max-w-[160px] truncate">{t.name}</td>
              <td className="px-4 py-3 font-semibold text-white font-mono">{fmtPrice(t.price, market)}</td>
              <td className="px-4 py-3"><ChangeCell v={t.change} pct={t.changePct} /></td>
              <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{t.volume}</td>
              <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{curr}{t.mktCap}</td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{t.sector ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OptionsTable({ data, market }: { data: typeof US_OPTIONS; market: Market }) {
  const curr = market === "INDIA" ? "₹" : "$";
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            {["Contract", "Type", "Strike", "Expiry", "Bid", "Ask", "IV", "OI", "Delta"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((o, i) => (
            <tr key={o.symbol} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-zinc-900/20"}`}>
              <td className="px-4 py-3 font-mono font-bold text-white text-xs">{o.symbol}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${o.type === "CALL" ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>{o.type}</span>
              </td>
              <td className="px-4 py-3 font-mono text-zinc-300">{curr}{o.strike.toLocaleString()}</td>
              <td className="px-4 py-3 text-zinc-400 text-xs">{o.expiry}</td>
              <td className="px-4 py-3 font-mono text-emerald-400">{curr}{o.bid}</td>
              <td className="px-4 py-3 font-mono text-red-400">{curr}{o.ask}</td>
              <td className="px-4 py-3 font-mono text-yellow-400">{o.iv}</td>
              <td className="px-4 py-3 font-mono text-zinc-300 text-xs">{o.oi}</td>
              <td className="px-4 py-3 font-mono text-zinc-300 text-xs">{o.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CryptoTable({ data }: { data: Ticker[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            {["Symbol", "Name", "Price (USD)", "24h Change", "Volume (24h)", "Mkt Cap"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((t, i) => (
            <tr key={t.symbol} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-zinc-900/20"}`}>
              <td className="px-4 py-3">
                <span className="font-mono font-black text-yellow-400 text-xs tracking-widest">{t.symbol}</span>
              </td>
              <td className="px-4 py-3 text-zinc-300">{t.name}</td>
              <td className="px-4 py-3 font-semibold text-white font-mono">{fmtPrice(t.price, "CRYPTO")}</td>
              <td className="px-4 py-3"><ChangeCell v={t.change} pct={t.changePct} /></td>
              <td className="px-4 py-3 text-zinc-400 font-mono text-xs">${t.volume}</td>
              <td className="px-4 py-3 text-zinc-400 font-mono text-xs">${t.mktCap}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [activeMarket, setActiveMarket] = useState<Market>("US");
  const [activeTab, setActiveTab] = useState<AssetClass>("stocks");
  const [brokers, setBrokers] = useState<Broker[]>(BROKERS);
  const [showBrokers, setShowBrokers] = useState(false);

  const toggleBroker = (id: string) => {
    setBrokers(prev =>
      prev.map(b => b.id === id ? { ...b, status: b.status === "connected" ? "disconnected" : "connected" } : b)
    );
  };

  const connectedCount = brokers.filter(b => b.status === "connected").length;

  const marketCfg: Record<Market, { label: string; flag: string; color: string }> = {
    US:     { label: "US Markets",    flag: "🇺🇸", color: "#3b82f6" },
    INDIA:  { label: "India Markets", flag: "🇮🇳", color: "#f97316" },
    CRYPTO: { label: "Crypto",        flag: "₿",   color: "#eab308" },
  };

  const availableTabs: AssetClass[] = activeMarket === "CRYPTO" ? ["crypto"] : ["stocks", "options"];

  // ensure tab is valid when switching market
  const currentTab = activeMarket === "CRYPTO" ? "crypto" : (availableTabs.includes(activeTab) ? activeTab : "stocks");

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#080808]/95 backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">M</span>
            </div>
            <span className="font-bold text-white text-sm tracking-tight">MarketLens</span>
            <span className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5 font-medium">RAW DATA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{connectedCount} broker{connectedCount !== 1 ? "s" : ""} connected</span>
            <button
              onClick={() => setShowBrokers(v => !v)}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 transition-all font-medium"
            >
              <span>⚡</span> Brokers
            </button>
          </div>
        </div>
      </header>

      {/* ── Broker Panel ── */}
      {showBrokers && (
        <div className="border-b border-zinc-800 bg-zinc-950">
          <div className="max-w-screen-2xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Connect Brokers</h2>
              <button onClick={() => setShowBrokers(false)} className="text-zinc-500 hover:text-white text-xs">✕ Close</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {brokers.map(b => <BrokerCard key={b.id} broker={b} onToggle={toggleBroker} />)}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* ── Market Selector ── */}
        <div className="flex gap-3">
          {(["US", "INDIA", "CRYPTO"] as Market[]).map(m => {
            const { label, flag, color } = marketCfg[m];
            const active = activeMarket === m;
            return (
              <button
                key={m}
                onClick={() => { setActiveMarket(m); setActiveTab("stocks"); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border"
                style={{
                  background: active ? color + "22" : "transparent",
                  borderColor: active ? color + "88" : "#27272a",
                  color: active ? "#fff" : "#71717a",
                  boxShadow: active ? `0 0 20px ${color}22` : "none",
                }}
              >
                <span>{flag}</span> {label}
              </button>
            );
          })}
        </div>

        {/* ── Asset Class Tabs ── */}
        {activeMarket !== "CRYPTO" && (
          <div className="flex gap-1 border-b border-zinc-800 pb-0">
            {(["stocks", "options"] as AssetClass[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition-colors -mb-px ${
                  currentTab === tab
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {activeMarket === "US" && [
            { label: "S&P 500",  val: "5,204.34", chg: "+0.87%", pos: true },
            { label: "NASDAQ",   val: "16,384.47", chg: "+1.14%", pos: true },
            { label: "DOW",      val: "38,905.26", chg: "-0.11%", pos: false },
            { label: "VIX",      val: "14.82",    chg: "-3.2%",  pos: false },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-xs text-zinc-500 mb-1">{c.label}</div>
              <div className="text-lg font-bold text-white font-mono">{c.val}</div>
              <div className={`text-xs font-semibold ${c.pos ? "text-emerald-400" : "text-red-400"}`}>{c.chg}</div>
            </div>
          ))}
          {activeMarket === "INDIA" && [
            { label: "NIFTY 50",   val: "22,402.40", chg: "+0.44%", pos: true },
            { label: "SENSEX",     val: "73,648.62", chg: "+0.39%", pos: true },
            { label: "BANK NIFTY", val: "48,123.85", chg: "+0.62%", pos: true },
            { label: "INDIA VIX",  val: "11.34",     chg: "-1.8%",  pos: false },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-xs text-zinc-500 mb-1">{c.label}</div>
              <div className="text-lg font-bold text-white font-mono">{c.val}</div>
              <div className={`text-xs font-semibold ${c.pos ? "text-emerald-400" : "text-red-400"}`}>{c.chg}</div>
            </div>
          ))}
          {activeMarket === "CRYPTO" && [
            { label: "Total Mkt Cap", val: "$2.38T",  chg: "+1.2%",  pos: true },
            { label: "BTC Dominance", val: "53.4%",   chg: "+0.3%",  pos: true },
            { label: "ETH/BTC",       val: "0.04861", chg: "-3.1%",  pos: false },
            { label: "Fear & Greed",  val: "72 Greed",chg: "Greedy", pos: true },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-xs text-zinc-500 mb-1">{c.label}</div>
              <div className="text-lg font-bold text-white font-mono">{c.val}</div>
              <div className={`text-xs font-semibold ${c.pos ? "text-emerald-400" : "text-red-400"}`}>{c.chg}</div>
            </div>
          ))}
        </div>

        {/* ── Main Table ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
              {activeMarket === "US" && currentTab === "stocks" && "US Equities"}
              {activeMarket === "US" && currentTab === "options" && "US Options Chain"}
              {activeMarket === "INDIA" && currentTab === "stocks" && "NSE / BSE Equities"}
              {activeMarket === "INDIA" && currentTab === "options" && "NSE F&O Options"}
              {activeMarket === "CRYPTO" && "Crypto Assets"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
              Static data — connect a broker for live prices
            </div>
          </div>

          {activeMarket === "US" && currentTab === "stocks" && <StocksTable data={US_STOCKS} market="US" />}
          {activeMarket === "US" && currentTab === "options" && <OptionsTable data={US_OPTIONS} market="US" />}
          {activeMarket === "INDIA" && currentTab === "stocks" && <StocksTable data={INDIA_STOCKS} market="INDIA" />}
          {activeMarket === "INDIA" && currentTab === "options" && <OptionsTable data={INDIA_OPTIONS} market="INDIA" />}
          {activeMarket === "CRYPTO" && <CryptoTable data={CRYPTO_ASSETS} />}
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-xs text-zinc-700 pb-4">
          MarketLens displays raw reference data only. No live prices, no paper trading, no backtesting.
          Connect a broker above to enable live data feeds.
        </p>
      </div>
    </div>
  );
}
