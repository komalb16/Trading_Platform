'use client';

import { useState, useEffect } from 'react';
import { api, type Trade } from '@/lib/api';

const MARKET_META: Record<string, { color: string; label: string }> = {
  NSE:    { color: '#3b82f6', label: 'NSE / India' },
  US:     { color: '#f59e0b', label: 'US Equities' },
  CRYPTO: { color: '#8b5cf6', label: 'Crypto' },
};

export default function PositionsPage() {
  const [trades,  setTrades]  = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [squaring, setSquaring] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.trades().then(t => { setTrades(t); setLoading(false); }); }, []);

  const open   = trades.filter(t => t.status === 'OPEN');
  const closed = trades.filter(t => t.status === 'CLOSED');

  const byMarket = ['NSE', 'US', 'CRYPTO'].map(m => ({
    market: m,
    trades: open.filter(t => t.market === m),
    pnl:    open.filter(t => t.market === m).reduce((s, t) => s + t.pnl, 0),
  }));

  const totalPnl = open.reduce((s, t) => s + t.pnl, 0);

  async function handleSquareOff(id: string, symbol: string) {
    if (!confirm(`Square off ${symbol}?`)) return;
    setSquaring(id);
    try {
      await api.squareOff(id);
      setTrades(prev => prev.map(t => t.id === id ? { ...t, status: 'CLOSED', ltp: 0, pnl: t.pnl } : t));
      setMsg(`✓ ${symbol} squared off`);
    } catch {
      setMsg(`✗ Failed to square off ${symbol}`);
    } finally {
      setSquaring(null);
      setTimeout(() => setMsg(''), 4000);
    }
  }

  const fmt = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <>
      <style>{`
        .market-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 24px; }
        @media (max-width: 700px) { .market-grid { grid-template-columns: 1fr; } }
        .market-card {
          background: rgba(15,23,42,0.85); border: 1px solid rgba(51,65,85,0.6);
          border-radius: 10px; padding: 16px 20px;
        }
        .market-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .market-dot { width: 8px; height: 8px; border-radius: 50%; }
        .market-name { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #e2e8f0; }
        .market-sub  { font-size: 11px; color: #475569; }
        .market-pnl  { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; }

        .section-title {
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          color: #e2e8f0; margin: 24px 0 12px;
        }
        .sqoff-btn {
          padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700;
          letter-spacing: 0.06em; cursor: pointer; transition: all 0.15s;
          background: rgba(244,63,94,0.1); color: #fda4af; border: 1px solid rgba(244,63,94,0.25);
        }
        .sqoff-btn:hover { background: rgba(244,63,94,0.2); border-color: #f43f5e; }
        .sqoff-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .pnl-bar-bg { height: 4px; background: rgba(51,65,85,0.4); border-radius: 2px; margin-top: 8px; }
        .pnl-bar-fg { height: 4px; border-radius: 2px; transition: width 0.4s ease; }

        .msg { padding: 10px 14px; border-radius: 7px; font-size: 12px; margin-bottom: 16px; }
        .msg-ok  { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981; }
        .msg-err { background: rgba(244,63,94,0.1);  border: 1px solid rgba(244,63,94,0.3);  color: #f43f5e; }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Positions</h1>
        <p className="page-subtitle">{open.length} open · {closed.length} closed today</p>
      </div>

      {msg && <div className={`msg ${msg.startsWith('✓') ? 'msg-ok' : 'msg-err'}`}>{msg}</div>}

      {/* Market summary cards */}
      <div className="market-grid">
        {byMarket.map(({ market, trades: mt, pnl }) => {
          const meta = MARKET_META[market];
          const maxAbs = Math.max(...byMarket.map(b => Math.abs(b.pnl)), 1);
          return (
            <div key={market} className="market-card" style={{ borderColor: `${meta.color}33` }}>
              <div className="market-header">
                <span className="market-dot" style={{ background: meta.color }} />
                <div>
                  <div className="market-name">{meta.label}</div>
                  <div className="market-sub">{mt.length} position{mt.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              {loading
                ? <div className="skeleton" style={{ height: 28, width: '70%' }} />
                : <div className="market-pnl" style={{ color: pnl >= 0 ? '#10b981' : '#f43f5e' }}>
                    {mt.length === 0 ? <span style={{ color: '#334155', fontSize: 16 }}>No positions</span>
                      : <>{pnl >= 0 ? '+' : '-'}₹{fmt(pnl)}</>}
                  </div>
              }
              <div className="pnl-bar-bg">
                <div className="pnl-bar-fg" style={{
                  width: `${(Math.abs(pnl) / maxAbs) * 100}%`,
                  background: pnl >= 0 ? '#10b981' : '#f43f5e',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', background: 'rgba(15,23,42,0.85)',
        border: '1px solid rgba(51,65,85,0.6)', borderRadius: 10, marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total Open P&L</div>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700,
            color: totalPnl >= 0 ? '#10b981' : '#f43f5e',
          }}>
            {loading ? '—' : <>{totalPnl >= 0 ? '+' : '-'}₹{fmt(totalPnl)}</>}
          </div>
        </div>
        <button className="btn btn-danger">⊗ Square Off All</button>
      </div>

      {/* Open positions table */}
      <div className="section-title">Open Positions</div>
      <div className="panel" style={{ marginBottom: 24 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th><th>Symbol</th><th>Market</th><th>Side</th>
              <th>Qty</th><th>Entry</th><th>LTP</th><th>P&L</th><th>Strategy</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(10)].map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ width: '75%', height: 13 }} /></td>
                ))}</tr>
              ))
              : open.length === 0
                ? <tr><td colSpan={10} style={{ textAlign: 'center', color: '#334155', padding: 28 }}>No open positions</td></tr>
                : open.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: '#475569', fontSize: 11 }}>{t.id}</td>
                    <td className="sym">{t.symbol}</td>
                    <td>
                      <span className="badge" style={{
                        background: `${MARKET_META[t.market]?.color ?? '#64748b'}22`,
                        color: MARKET_META[t.market]?.color ?? '#64748b',
                      }}>{t.market}</span>
                    </td>
                    <td style={{ color: t.side === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 700 }}>{t.side}</td>
                    <td>{t.qty}</td>
                    <td>{t.entry_price.toLocaleString('en-IN')}</td>
                    <td style={{ color: '#94a3b8' }}>{t.ltp.toLocaleString('en-IN')}</td>
                    <td className={t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                      {t.pnl >= 0 ? '+' : '-'}₹{fmt(t.pnl)}
                    </td>
                    <td style={{ color: '#64748b', fontSize: 11 }}>{t.strategy_name}</td>
                    <td>
                      <button className="sqoff-btn"
                        disabled={squaring === t.id}
                        onClick={() => handleSquareOff(t.id, t.symbol)}>
                        {squaring === t.id ? '…' : 'SQ OFF'}
                      </button>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Closed positions table */}
      <div className="section-title" style={{ color: '#475569' }}>Closed Today</div>
      <div className="panel">
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th><th>Symbol</th><th>Market</th><th>Side</th>
              <th>Qty</th><th>Entry</th><th>Exit P&L</th><th>Strategy</th><th>Closed At</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(9)].map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ width: '70%', height: 13 }} /></td>
                ))}</tr>
              ))
              : closed.length === 0
                ? <tr><td colSpan={9} style={{ textAlign: 'center', color: '#334155', padding: 28 }}>No closed positions</td></tr>
                : closed.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: '#475569', fontSize: 11 }}>{t.id}</td>
                    <td className="sym">{t.symbol}</td>
                    <td>
                      <span className="badge" style={{
                        background: `${MARKET_META[t.market]?.color ?? '#64748b'}22`,
                        color: MARKET_META[t.market]?.color ?? '#64748b',
                      }}>{t.market}</span>
                    </td>
                    <td style={{ color: t.side === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 700 }}>{t.side}</td>
                    <td>{t.qty}</td>
                    <td>{t.entry_price.toLocaleString('en-IN')}</td>
                    <td className={t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                      {t.pnl >= 0 ? '+' : '-'}₹{fmt(t.pnl)}
                    </td>
                    <td style={{ color: '#64748b', fontSize: 11 }}>{t.strategy_name}</td>
                    <td style={{ color: '#475569', fontSize: 11 }}>
                      {new Date(t.created_at).toLocaleTimeString('en-IN', { hour12: false })}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </>
  );
}
