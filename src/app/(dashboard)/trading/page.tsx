'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Market = 'NSE' | 'US' | 'CRYPTO';
type BrokerID = 'zerodha' | 'angel' | 'upstox' | 'alpaca' | 'ibkr' | 'robinhood' | 'coinbase' | 'binance' | 'kraken';

interface BrokerDef {
  id: BrokerID;
  name: string;
  abbr: string;
  markets: Market[];
  color: string;
}

interface Alert {
  id: string;
  symbol: string;
  condition: 'ABOVE' | 'BELOW' | 'CROSSES';
  price: number;
  indicator?: string;
  action: 'NOTIFY' | 'BUY' | 'SELL';
  broker?: BrokerID;
  qty?: number;
  active: boolean;
  createdAt: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  market: Market;
  exchange: string;
  tvSymbol: string; // TradingView symbol
}

interface IndicatorConfig {
  id: string;
  name: string;
  enabled: boolean;
  params: Record<string, number | string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BROKERS: BrokerDef[] = [
  { id: 'zerodha',   name: 'Zerodha',   abbr: 'Z',  markets: ['NSE'],             color: '#387ED1' },
  { id: 'angel',     name: 'Angel One', abbr: 'A',  markets: ['NSE'],             color: '#E94D35' },
  { id: 'upstox',    name: 'Upstox',    abbr: 'U',  markets: ['NSE'],             color: '#7C3AED' },
  { id: 'alpaca',    name: 'Alpaca',    abbr: 'AP', markets: ['US'],              color: '#FEBD69' },
  { id: 'ibkr',      name: 'IBKR',      abbr: 'IB', markets: ['NSE', 'US'],       color: '#DC2626' },
  { id: 'robinhood', name: 'Robinhood', abbr: 'R',  markets: ['US'],              color: '#00C805' },
  { id: 'coinbase',  name: 'Coinbase',  abbr: 'CB', markets: ['CRYPTO'],          color: '#0052FF' },
  { id: 'binance',   name: 'Binance',   abbr: 'BN', markets: ['CRYPTO'],          color: '#F3BA2F' },
  { id: 'kraken',    name: 'Kraken',    abbr: 'KR', markets: ['CRYPTO'],          color: '#5741D9' },
];

const SEARCH_DB: SearchResult[] = [
  // NSE
  { symbol: 'NIFTY',      name: 'Nifty 50 Index',       market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:NIFTY' },
  { symbol: 'BANKNIFTY',  name: 'Bank Nifty Index',      market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:BANKNIFTY' },
  { symbol: 'RELIANCE',   name: 'Reliance Industries',   market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:RELIANCE' },
  { symbol: 'TCS',        name: 'Tata Consultancy Svcs', market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:TCS' },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank',             market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:HDFCBANK' },
  { symbol: 'INFY',       name: 'Infosys Ltd',           market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:INFY' },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank',            market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:ICICIBANK' },
  { symbol: 'WIPRO',      name: 'Wipro Ltd',             market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:WIPRO' },
  { symbol: 'ADANIENT',   name: 'Adani Enterprises',     market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:ADANIENT' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance',         market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:BAJFINANCE' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors',           market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:TATAMOTORS' },
  { symbol: 'SBIN',       name: 'State Bank of India',   market: 'NSE',    exchange: 'NSE',    tvSymbol: 'NSE:SBIN' },
  // US
  { symbol: 'AAPL',  name: 'Apple Inc.',        market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:AAPL' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',   market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:MSFT' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',      market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:NVDA' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',     market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:GOOGL' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',  market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:AMZN' },
  { symbol: 'META',  name: 'Meta Platforms',   market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:META' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',        market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:TSLA' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',   market: 'US', exchange: 'NYSE',   tvSymbol: 'NYSE:JPM' },
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF', market: 'US', exchange: 'NYSE',   tvSymbol: 'AMEX:SPY' },
  { symbol: 'QQQ',   name: 'Invesco QQQ Trust', market: 'US', exchange: 'NASDAQ', tvSymbol: 'NASDAQ:QQQ' },
  // CRYPTO
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT',   market: 'CRYPTO', exchange: 'Binance', tvSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT',  market: 'CRYPTO', exchange: 'Binance', tvSymbol: 'BINANCE:ETHUSDT' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT',    market: 'CRYPTO', exchange: 'Binance', tvSymbol: 'BINANCE:SOLUSDT' },
  { symbol: 'BNBUSDT', name: 'BNB / USDT',       market: 'CRYPTO', exchange: 'Binance', tvSymbol: 'BINANCE:BNBUSDT' },
  { symbol: 'XRPUSDT', name: 'XRP / USDT',       market: 'CRYPTO', exchange: 'Binance', tvSymbol: 'BINANCE:XRPUSDT' },
  { symbol: 'DOGEUSDT',name: 'Dogecoin / USDT',  market: 'CRYPTO', exchange: 'Binance', tvSymbol: 'BINANCE:DOGEUSDT' },
];

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'RSI',    name: 'RSI',              enabled: true,  params: { period: 14, overbought: 70, oversold: 30 } },
  { id: 'MACD',   name: 'MACD',             enabled: false, params: { fast: 12, slow: 26, signal: 9 } },
  { id: 'EMA',    name: 'EMA',              enabled: true,  params: { period: 20, color: '#3b82f6' } },
  { id: 'BB',     name: 'Bollinger Bands',  enabled: false, params: { period: 20, stddev: 2 } },
  { id: 'VWAP',   name: 'VWAP',            enabled: true,  params: {} },
  { id: 'ATR',    name: 'ATR',              enabled: false, params: { period: 14 } },
  { id: 'STOCH',  name: 'Stochastic',       enabled: false, params: { k: 14, d: 3 } },
  { id: 'ICHIMOKU', name: 'Ichimoku Cloud', enabled: false, params: { conversion: 9, base: 26 } },
];

const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D', '1W'];

// ─── TradingView Widget ───────────────────────────────────────────────────────

function TradingViewChart({ tvSymbol, interval, indicators }: {
  tvSymbol: string;
  interval: string;
  indicators: IndicatorConfig[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const studies = indicators
      .filter(i => i.enabled)
      .map(i => {
        const map: Record<string, string> = {
          RSI: 'RSI@tv-basicstudies',
          MACD: 'MACD@tv-basicstudies',
          EMA: 'MAExp@tv-basicstudies',
          BB: 'BB@tv-basicstudies',
          VWAP: 'VWAP@tv-basicstudies',
          ATR: 'ATR@tv-basicstudies',
          STOCH: 'Stochastic@tv-basicstudies',
          ICHIMOKU: 'IchimokuCloud@tv-basicstudies',
        };
        return map[i.id] || '';
      })
      .filter(Boolean);

    const tvInterval = interval === '1D' ? 'D' : interval === '1W' ? 'W' : interval;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.TradingView) {
        // @ts-ignore
        new window.TradingView.widget({
          container_id: 'tv-chart-container',
          symbol: tvSymbol,
          interval: tvInterval,
          timezone: 'Asia/Kolkata',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0d1525',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          studies,
          width: '100%',
          height: '100%',
          backgroundColor: '#080f1e',
          gridColor: 'rgba(51,65,85,0.15)',
          withdateranges: true,
          allow_symbol_change: false,
          details: true,
          hotlist: false,
          calendar: false,
        });
      }
    };

    const div = document.createElement('div');
    div.id = 'tv-chart-container';
    div.style.width = '100%';
    div.style.height = '100%';
    containerRef.current.appendChild(div);
    containerRef.current.appendChild(script);
    widgetRef.current = script;

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [tvSymbol, interval, indicators]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 480 }}
    />
  );
}

// ─── Stock Search ─────────────────────────────────────────────────────────────

function StockSearch({ onSelect }: { onSelect: (r: SearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const q = query.toUpperCase();
    const r = SEARCH_DB.filter(s =>
      s.symbol.includes(q) || s.name.toUpperCase().includes(q)
    ).slice(0, 8);
    setResults(r);
    setOpen(r.length > 0);
  }, [query]);

  const MCOLOR: Record<Market, string> = { NSE: '#3b82f6', US: '#f59e0b', CRYPTO: '#8b5cf6' };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#475569', fontSize: 14, pointerEvents: 'none',
        }}>⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search symbol or company… (e.g. AAPL, Reliance, BTC)"
          style={{
            width: '100%', padding: '9px 12px 9px 32px',
            background: 'rgba(15,23,42,0.9)',
            border: '1px solid rgba(51,65,85,0.7)',
            borderRadius: 8, color: '#e2e8f0',
            fontFamily: "'DM Mono', monospace", fontSize: 12,
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocusCapture={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(59,130,246,0.6)'}
          onBlurCapture={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(51,65,85,0.7)'}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: '#0d1525', border: '1px solid rgba(51,65,85,0.7)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}>
          {results.map(r => (
            <button
              key={r.tvSymbol}
              onClick={() => { onSelect(r); setQuery(r.symbol); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'none', border: 'none',
                borderBottom: '1px solid rgba(51,65,85,0.3)',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 12,
                color: '#e2e8f0', minWidth: 90,
              }}>{r.symbol}</span>
              <span style={{ fontSize: 11, color: '#64748b', flex: 1 }}>{r.name}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                background: `${MCOLOR[r.market]}22`, color: MCOLOR[r.market],
                letterSpacing: '0.06em',
              }}>{r.market}</span>
              <span style={{ fontSize: 10, color: '#334155' }}>{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Technicals Panel ─────────────────────────────────────────────────────────

const MOCK_TECHNICALS: Record<string, Record<string, string | number>> = {
  default: {
    RSI: 58.4, MACD: '+0.82', Signal: '0.61', Histogram: '+0.21',
    EMA20: '—', EMA50: '—', VWAP: '—',
    'BB Upper': '—', 'BB Lower': '—', ATR: '—',
    Support: '—', Resistance: '—',
    '52W High': '—', '52W Low': '—',
    'Avg Volume': '—', Beta: '—',
  },
  'NSE:NIFTY': {
    RSI: 62.1, MACD: '+48.3', Signal: '31.2', Histogram: '+17.1',
    EMA20: '22,184', EMA50: '21,940', VWAP: '22,390',
    'BB Upper': '22,840', 'BB Lower': '21,520', ATR: '180.4',
    Support: '22,000', Resistance: '22,800',
    '52W High': '23,338', '52W Low': '18,837',
    'Avg Volume': '280M', Beta: '1.00',
  },
  'NASDAQ:AAPL': {
    RSI: 54.7, MACD: '+1.24', Signal: '0.88', Histogram: '+0.36',
    EMA20: '187.4', EMA50: '183.2', VWAP: '189.1',
    'BB Upper': '196.8', 'BB Lower': '181.2', ATR: '3.84',
    Support: '182.00', Resistance: '195.00',
    '52W High': '199.62', '52W Low': '164.08',
    'Avg Volume': '58.2M', Beta: '1.29',
  },
  'BINANCE:BTCUSDT': {
    RSI: 67.8, MACD: '+840', Signal: '520', Histogram: '+320',
    EMA20: '62,400', EMA50: '58,800', VWAP: '64,100',
    'BB Upper': '72,100', 'BB Lower': '56,800', ATR: '2,840',
    Support: '60,000', Resistance: '70,000',
    '52W High': '73,737', '52W Low': '38,555',
    'Avg Volume': '$28.4B', Beta: '—',
  },
};

function TechnicalsPanel({ tvSymbol }: { tvSymbol: string }) {
  const data = MOCK_TECHNICALS[tvSymbol] ?? MOCK_TECHNICALS.default;

  const rsi = Number(data.RSI);
  const rsiColor = rsi > 70 ? '#f43f5e' : rsi < 30 ? '#10b981' : '#94a3b8';
  const rsiLabel = rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';

  const signal = rsi > 60 ? { label: 'BUY', color: '#10b981' } : rsi < 40 ? { label: 'SELL', color: '#f43f5e' } : { label: 'NEUTRAL', color: '#64748b' };

  const rows = Object.entries(data);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Overall signal */}
      <div style={{
        padding: '14px 16px', background: `${signal.color}12`,
        borderBottom: `1px solid ${signal.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Overall Signal</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: signal.color }}>{signal.label}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.08em', marginBottom: 3 }}>RSI ({rsi})</div>
          <div style={{ fontSize: 11, color: rsiColor }}>{rsiLabel}</div>
          <div style={{
            marginTop: 6, height: 4, width: 80, background: 'rgba(51,65,85,0.5)', borderRadius: 2,
          }}>
            <div style={{ height: '100%', width: `${rsi}%`, background: rsiColor, borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
        </div>
      </div>

      {/* Indicators grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 0,
      }}>
        {rows.map(([key, val], i) => (
          <div key={key} style={{
            padding: '9px 14px',
            borderBottom: i < rows.length - 2 ? '1px solid rgba(51,65,85,0.2)' : 'none',
            borderRight: i % 2 === 0 ? '1px solid rgba(51,65,85,0.2)' : 'none',
          }}>
            <div style={{ fontSize: 9, color: '#334155', letterSpacing: '0.08em', marginBottom: 2 }}>{key}</div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500,
              color: typeof val === 'string' && val.startsWith('+') ? '#10b981'
                   : typeof val === 'string' && val.startsWith('-') ? '#f43f5e'
                   : '#94a3b8',
            }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Builder ────────────────────────────────────────────────────────────

function AlertBuilder({
  symbol, connectedBrokers, onAdd,
}: {
  symbol: string;
  connectedBrokers: BrokerID[];
  onAdd: (a: Alert) => void;
}) {
  const [condition, setCondition] = useState<Alert['condition']>('ABOVE');
  const [price, setPrice] = useState('');
  const [action, setAction] = useState<Alert['action']>('NOTIFY');
  const [broker, setBroker] = useState<BrokerID | ''>('');
  const [qty, setQty] = useState('');
  const [indicator, setIndicator] = useState('');

  const handleAdd = () => {
    if (!price) return;
    const alert: Alert = {
      id: `ALT-${Date.now()}`,
      symbol,
      condition,
      price: parseFloat(price),
      indicator: indicator || undefined,
      action,
      broker: broker || undefined,
      qty: qty ? parseFloat(qty) : undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    onAdd(alert);
    setPrice('');
    setQty('');
  };

  const needsBroker = action === 'BUY' || action === 'SELL';

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
        New Alert — <span style={{ color: '#3b82f6' }}>{symbol}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, letterSpacing: '0.06em' }}>CONDITION</div>
          <select value={condition} onChange={e => setCondition(e.target.value as Alert['condition'])} style={selStyle}>
            <option value="ABOVE">Price Above</option>
            <option value="BELOW">Price Below</option>
            <option value="CROSSES">Price Crosses</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, letterSpacing: '0.06em' }}>TRIGGER PRICE</div>
          <input
            type="number" value={price} onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 22500"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, letterSpacing: '0.06em' }}>INDICATOR (OPT)</div>
          <select value={indicator} onChange={e => setIndicator(e.target.value)} style={selStyle}>
            <option value="">None</option>
            <option value="RSI">RSI Cross</option>
            <option value="MACD">MACD Signal</option>
            <option value="EMA">EMA Cross</option>
            <option value="BB">BB Breakout</option>
            <option value="VWAP">VWAP Cross</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, letterSpacing: '0.06em' }}>ACTION</div>
          <select value={action} onChange={e => setAction(e.target.value as Alert['action'])} style={selStyle}>
            <option value="NOTIFY">Notify Only</option>
            <option value="BUY">Execute BUY</option>
            <option value="SELL">Execute SELL</option>
          </select>
        </div>

        {needsBroker && (
          <>
            <div>
              <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, letterSpacing: '0.06em' }}>BROKER</div>
              <select value={broker} onChange={e => setBroker(e.target.value as BrokerID)} style={selStyle}>
                <option value="">Select broker…</option>
                {connectedBrokers.length === 0
                  ? <option disabled>No brokers connected</option>
                  : connectedBrokers.map(b => {
                    const def = BROKERS.find(x => x.id === b);
                    return <option key={b} value={b}>{def?.name ?? b}</option>;
                  })
                }
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#475569', marginBottom: 4, letterSpacing: '0.06em' }}>QUANTITY</div>
              <input
                type="number" value={qty} onChange={e => setQty(e.target.value)}
                placeholder="e.g. 50"
                style={inputStyle}
              />
            </div>
          </>
        )}
      </div>

      {needsBroker && connectedBrokers.length === 0 && (
        <div style={{
          padding: '8px 12px', background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6,
          fontSize: 11, color: '#fbbf24',
        }}>
          ⚠ Connect a broker above to enable trade execution alerts
        </div>
      )}

      <button onClick={handleAdd} style={{
        padding: '9px 14px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd',
        border: '1px solid rgba(59,130,246,0.35)', borderRadius: 6,
        fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: 'pointer',
        fontWeight: 500, letterSpacing: '0.05em', transition: 'all 0.15s',
        marginTop: 2,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.25)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; }}
      >
        + Create Alert
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px',
  background: 'rgba(8,15,30,0.9)', border: '1px solid rgba(51,65,85,0.6)',
  borderRadius: 6, color: '#e2e8f0',
  fontFamily: "'DM Mono', monospace", fontSize: 12, outline: 'none',
};
const selStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', appearance: 'none',
};

// ─── Broker Connect Panel ─────────────────────────────────────────────────────

function BrokerPanel({
  connected, onToggle,
}: {
  connected: Set<BrokerID>;
  onToggle: (id: BrokerID) => void;
}) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        Broker Connections
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {BROKERS.map(b => {
          const isConn = connected.has(b.id);
          return (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 7,
              background: isConn ? `${b.color}12` : 'rgba(15,23,42,0.5)',
              border: `1px solid ${isConn ? b.color + '44' : 'rgba(51,65,85,0.4)'}`,
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5,
                  background: b.color, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff',
                  flexShrink: 0,
                }}>{b.abbr}</div>
                <div>
                  <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 500 }}>{b.name}</div>
                  <div style={{ fontSize: 9, color: '#334155' }}>{b.markets.join(' · ')}</div>
                </div>
              </div>
              <button onClick={() => onToggle(b.id)} style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.06em',
                background: isConn ? 'rgba(244,63,94,0.1)' : `${b.color}22`,
                color: isConn ? '#fda4af' : b.color,
                border: `1px solid ${isConn ? 'rgba(244,63,94,0.3)' : b.color + '44'}`,
              }}>
                {isConn ? 'DISCONNECT' : 'CONNECT'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Indicators Panel ─────────────────────────────────────────────────────────

function IndicatorsPanel({
  indicators, onChange,
}: {
  indicators: IndicatorConfig[];
  onChange: (updated: IndicatorConfig[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(indicators.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  };

  const updateParam = (id: string, key: string, val: string) => {
    onChange(indicators.map(i =>
      i.id === id ? { ...i, params: { ...i.params, [key]: isNaN(Number(val)) ? val : Number(val) } } : i
    ));
  };

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
        Indicators
      </div>
      {indicators.map(ind => (
        <div key={ind.id} style={{
          borderRadius: 7, overflow: 'hidden',
          border: `1px solid ${ind.enabled ? 'rgba(59,130,246,0.3)' : 'rgba(51,65,85,0.4)'}`,
          background: ind.enabled ? 'rgba(59,130,246,0.05)' : 'rgba(15,23,42,0.4)',
          transition: 'all 0.2s',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
          }}>
            <span style={{ fontSize: 12, color: ind.enabled ? '#93c5fd' : '#475569' }}>{ind.name}</span>
            {/* Toggle switch */}
            <div
              onClick={() => toggle(ind.id)}
              style={{
                width: 36, height: 18, borderRadius: 9, cursor: 'pointer', position: 'relative',
                background: ind.enabled ? '#3b82f6' : 'rgba(51,65,85,0.6)',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: ind.enabled ? 21 : 3,
                width: 12, height: 12, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
          {ind.enabled && Object.keys(ind.params).length > 0 && (
            <div style={{
              padding: '0 12px 10px',
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(Object.keys(ind.params).length, 3)}, 1fr)`,
              gap: 6,
            }}>
              {Object.entries(ind.params).map(([key, val]) => (
                <div key={key}>
                  <div style={{ fontSize: 8, color: '#334155', marginBottom: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{key}</div>
                  <input
                    value={val}
                    onChange={e => updateParam(ind.id, key, e.target.value)}
                    style={{ ...inputStyle, padding: '4px 8px', fontSize: 11 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type RightTab = 'technicals' | 'indicators' | 'alerts' | 'brokers';

export default function TradingDashboard() {
  const [selectedStock, setSelectedStock] = useState<SearchResult>(SEARCH_DB[0]); // NIFTY default
  const [interval, setInterval] = useState('15m');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connectedBrokers, setConnectedBrokers] = useState<Set<BrokerID>>(new Set());
  const [rightTab, setRightTab] = useState<RightTab>('technicals');
  const [metrics, setMetrics] = useState<{ open_positions: number; unrealised_pnl: number; realised_pnl: number; win_rate: number } | null>(null);
  const [executingAlert, setExecutingAlert] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; msg: string; ok: boolean }[]>([]);

  useEffect(() => {
    api.metrics().then(m => setMetrics(m));
  }, []);

  const addToast = (msg: string, ok = true) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg, ok }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleToggleBroker = (id: BrokerID) => {
    setConnectedBrokers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        addToast(`${BROKERS.find(b => b.id === id)?.name} disconnected`, false);
      } else {
        next.add(id);
        addToast(`${BROKERS.find(b => b.id === id)?.name} connected ✓`);
      }
      return next;
    });
  };

  const handleAddAlert = (alert: Alert) => {
    setAlerts(prev => [alert, ...prev]);
    addToast(`Alert set: ${alert.symbol} ${alert.condition} ${alert.price}`);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const handleExecuteAlert = async (alert: Alert) => {
    if (!alert.broker || !connectedBrokers.has(alert.broker)) {
      addToast('No broker connected for this alert', false);
      return;
    }
    setExecutingAlert(alert.id);
    try {
      await api.triggerWebhook({
        signal: `${alert.action}_MARKET`,
        symbol: alert.symbol,
        strategy_name: 'ALERT_TRIGGER',
        risk: alert.qty,
      });
      addToast(`✓ ${alert.action} ${alert.qty ?? ''} ${alert.symbol} sent to ${alert.broker}`);
    } catch (e) {
      addToast(`✗ Execution failed: ${e instanceof Error ? e.message : 'unknown error'}`, false);
    } finally {
      setExecutingAlert(null);
    }
  };

  const enabledIndicatorCount = indicators.filter(i => i.enabled).length;
  const activeAlertCount = alerts.filter(a => a.active).length;

  const RIGHT_TABS: { id: RightTab; label: string; badge?: number }[] = [
    { id: 'technicals',  label: 'Technicals' },
    { id: 'indicators',  label: 'Indicators', badge: enabledIndicatorCount },
    { id: 'alerts',      label: 'Alerts',     badge: activeAlertCount },
    { id: 'brokers',     label: 'Brokers',    badge: connectedBrokers.size },
  ];

  return (
    <>
      <style>{`
        .tv-chart-wrapper { width: 100%; flex: 1; min-height: 0; }
        .right-panel { display: flex; flex-direction: column; width: 300px; flex-shrink: 0; min-height: 0; overflow: hidden; }
        .right-panel-body { flex: 1; overflow-y: auto; min-height: 0; }
        .right-panel-body::-webkit-scrollbar { width: 4px; }
        .right-panel-body::-webkit-scrollbar-track { background: transparent; }
        .right-panel-body::-webkit-scrollbar-thumb { background: rgba(51,65,85,0.5); border-radius: 2px; }

        .badge-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 16px; height: 16px; padding: 0 4px;
          border-radius: 8px; font-size: 9px; font-weight: 700;
          background: rgba(59,130,246,0.2); color: #93c5fd;
          margin-left: 5px;
        }

        .toast {
          pointer-events: none;
          padding: 10px 16px; border-radius: 8px; font-size: 11px; font-weight: 500;
          backdrop-filter: blur(12px);
          animation: slideIn 0.2s ease;
          max-width: 320px;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .alert-row:hover { background: rgba(59,130,246,0.05) !important; }
        
        @media (max-width: 900px) {
          .right-panel { display: none; }
        }
      `}</style>

      {/* Toast container */}
      <div style={{
        position: 'fixed', top: 64, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{
            background: t.ok ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
            border: `1px solid ${t.ok ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            color: t.ok ? '#10b981' : '#f43f5e',
          }}>{t.msg}</div>
        ))}
      </div>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 24px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            Trading Terminal
          </h1>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
            Live charts · Indicators · Alerts · Multi-broker execution
          </p>
        </div>

        {/* Metrics strip */}
        {metrics && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Open Pos', val: metrics.open_positions, color: '#93c5fd' },
              { label: 'Realised P&L', val: `₹${metrics.realised_pnl.toLocaleString('en-IN')}`, color: metrics.realised_pnl >= 0 ? '#10b981' : '#f43f5e' },
              { label: 'Unrealised', val: `₹${metrics.unrealised_pnl.toLocaleString('en-IN')}`, color: metrics.unrealised_pnl >= 0 ? '#10b981' : '#f43f5e' },
              { label: 'Win Rate', val: `${metrics.win_rate}%`, color: '#fbbf24' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: m.color }}>{m.val}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <StockSearch onSelect={s => setSelectedStock(s)} />

        {/* Interval picker */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(15,23,42,0.8)', borderRadius: 7, padding: 3, border: '1px solid rgba(51,65,85,0.5)' }}>
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setInterval(iv)} style={{
              padding: '4px 9px', borderRadius: 5, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: interval === iv ? 'rgba(59,130,246,0.3)' : 'transparent',
              color: interval === iv ? '#93c5fd' : '#475569',
              fontFamily: "'DM Mono', monospace",
            }}>{iv}</button>
          ))}
        </div>

        {/* Market badge */}
        {selectedStock && (
          <div style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: selectedStock.market === 'NSE' ? 'rgba(59,130,246,0.12)' :
                        selectedStock.market === 'US'  ? 'rgba(245,158,11,0.12)' : 'rgba(139,92,246,0.12)',
            color:  selectedStock.market === 'NSE' ? '#3b82f6' :
                    selectedStock.market === 'US'  ? '#f59e0b' : '#8b5cf6',
            border: `1px solid ${selectedStock.market === 'NSE' ? 'rgba(59,130,246,0.25)' :
                                  selectedStock.market === 'US'  ? 'rgba(245,158,11,0.25)' : 'rgba(139,92,246,0.25)'}`,
            letterSpacing: '0.06em',
          }}>
            {selectedStock.market} · {selectedStock.exchange}
          </div>
        )}

        {/* Connected brokers count */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: connectedBrokers.size > 0 ? '#10b981' : '#475569',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connectedBrokers.size > 0 ? '#10b981' : '#334155',
            display: 'inline-block',
            boxShadow: connectedBrokers.size > 0 ? '0 0 8px #10b981' : 'none',
          }} />
          {connectedBrokers.size > 0 ? `${connectedBrokers.size} broker${connectedBrokers.size > 1 ? 's' : ''} connected` : 'No brokers connected'}
        </div>
      </div>

      {/* ── Main Layout: Chart + Right Panel ── */}
      <div style={{
        display: 'flex', gap: 0, flex: 1, minHeight: 0,
        margin: '0 24px 24px',
        border: '1px solid rgba(51,65,85,0.5)', borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(8,15,30,0.6)',
      }}>

        {/* Chart area */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TradingViewChart
            tvSymbol={selectedStock?.tvSymbol ?? 'NSE:NIFTY'}
            interval={interval}
            indicators={indicators}
          />
        </div>

        {/* Right panel */}
        <div className="right-panel" style={{ borderLeft: '1px solid rgba(51,65,85,0.4)' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(51,65,85,0.4)',
            background: 'rgba(8,15,30,0.8)',
          }}>
            {RIGHT_TABS.map(tab => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{
                flex: 1, padding: '10px 4px', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.04em', cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${rightTab === tab.id ? '#3b82f6' : 'transparent'}`,
                color: rightTab === tab.id ? '#93c5fd' : '#475569',
                transition: 'all 0.15s', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 1,
              }}>
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="badge-count">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="right-panel-body">
            {rightTab === 'technicals' && (
              <TechnicalsPanel tvSymbol={selectedStock?.tvSymbol ?? 'NSE:NIFTY'} />
            )}

            {rightTab === 'indicators' && (
              <IndicatorsPanel indicators={indicators} onChange={setIndicators} />
            )}

            {rightTab === 'alerts' && (
              <>
                <AlertBuilder
                  symbol={selectedStock?.symbol ?? 'NIFTY'}
                  connectedBrokers={Array.from(connectedBrokers)}
                  onAdd={handleAddAlert}
                />
                {/* Alert list */}
                <div style={{ borderTop: '1px solid rgba(51,65,85,0.4)' }}>
                  <div style={{ padding: '10px 16px 6px', fontSize: 9, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Active Alerts ({alerts.length})
                  </div>
                  {alerts.length === 0 && (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: '#334155', fontSize: 11 }}>
                      No alerts yet
                    </div>
                  )}
                  {alerts.map(alert => (
                    <div key={alert.id} className="alert-row" style={{
                      padding: '10px 16px', borderBottom: '1px solid rgba(51,65,85,0.2)',
                      opacity: alert.active ? 1 : 0.4, transition: 'opacity 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{alert.symbol}</span>
                            <span style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                              background: alert.action === 'BUY' ? 'rgba(16,185,129,0.15)' : alert.action === 'SELL' ? 'rgba(244,63,94,0.15)' : 'rgba(59,130,246,0.15)',
                              color: alert.action === 'BUY' ? '#10b981' : alert.action === 'SELL' ? '#f43f5e' : '#93c5fd',
                            }}>{alert.action}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            {alert.condition} {alert.price.toLocaleString()}
                            {alert.indicator && ` · ${alert.indicator}`}
                            {alert.broker && ` · ${alert.broker}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {(alert.action === 'BUY' || alert.action === 'SELL') && (
                            <button onClick={() => handleExecuteAlert(alert)} disabled={executingAlert === alert.id} style={{
                              padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                              cursor: 'pointer', border: '1px solid rgba(59,130,246,0.3)',
                              background: 'rgba(59,130,246,0.1)', color: '#93c5fd',
                            }}>
                              {executingAlert === alert.id ? '…' : '▶ RUN'}
                            </button>
                          )}
                          <button onClick={() => handleToggleAlert(alert.id)} title="Toggle" style={{
                            padding: '3px 7px', borderRadius: 4, fontSize: 9,
                            cursor: 'pointer', border: '1px solid rgba(51,65,85,0.4)',
                            background: 'transparent', color: '#475569',
                          }}>{alert.active ? '⏸' : '▶'}</button>
                          <button onClick={() => handleDeleteAlert(alert.id)} title="Delete" style={{
                            padding: '3px 7px', borderRadius: 4, fontSize: 9,
                            cursor: 'pointer', border: '1px solid rgba(244,63,94,0.2)',
                            background: 'rgba(244,63,94,0.05)', color: '#f43f5e',
                          }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {rightTab === 'brokers' && (
              <BrokerPanel connected={connectedBrokers} onToggle={handleToggleBroker} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
