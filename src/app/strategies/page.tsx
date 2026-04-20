'use client';

import { useState, useEffect } from 'react';
import { api, type Strategy } from '@/lib/api';

const MARKET_COLOR: Record<string, string> = {
  NSE: '#3b82f6', 'US EQ': '#f59e0b', CRYPTO: '#8b5cf6',
};

function StrategyCard({ strategy, onToggle }: { strategy: Strategy; onToggle: (id: string, s: 'LIVE' | 'PAUSED') => void }) {
  const mc   = MARKET_COLOR[strategy.market] ?? '#64748b';
  const live = strategy.status === 'LIVE';
  const pnlPos = strategy.realised_pnl >= 0;
  const fmt = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  return (
    <div className="strat-card" style={{ borderColor: live ? `${mc}44` : 'rgba(51,65,85,0.5)' }}>
      <div className="strat-card-head">
        <div>
          <div className="strat-card-name">{strategy.name}</div>
          <span className="badge" style={{ background: `${mc}22`, color: mc }}>{strategy.market}</span>
        </div>
        {strategy.status !== 'INACTIVE' && (
          <button
            className={`toggle-btn ${live ? 'toggle-on' : 'toggle-off'}`}
            onClick={() => onToggle(strategy.id, live ? 'PAUSED' : 'LIVE')}
          >
            {live ? '⏸ PAUSE' : '▶ ACTIVATE'}
          </button>
        )}
        {strategy.status === 'INACTIVE' && (
          <span className="badge badge-slate">INACTIVE</span>
        )}
      </div>

      {strategy.description && (
        <p className="strat-desc">{strategy.description}</p>
      )}

      <div className="strat-stats">
        <div className="strat-stat">
          <div className="strat-stat-label">Trades</div>
          <div className="strat-stat-val">{strategy.total_trades}</div>
        </div>
        <div className="strat-stat">
          <div className="strat-stat-label">Win Rate</div>
          <div className="strat-stat-val" style={{
            color: strategy.win_rate >= 60 ? '#10b981' : strategy.win_rate > 0 ? '#f59e0b' : '#475569',
          }}>
            {strategy.win_rate > 0 ? `${strategy.win_rate}%` : '—'}
          </div>
        </div>
        <div className="strat-stat">
          <div className="strat-stat-label">Realised P&L</div>
          <div className="strat-stat-val" style={{ color: pnlPos ? '#10b981' : '#f43f5e' }}>
            {strategy.total_trades > 0
              ? `${pnlPos ? '+' : '-'}₹${fmt(strategy.realised_pnl)}`
              : '—'}
          </div>
        </div>
        <div className="strat-stat">
          <div className="strat-stat-label">Status</div>
          <div className="strat-stat-val">
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: live ? '#10b981' : strategy.status === 'PAUSED' ? '#f59e0b' : '#475569',
              fontSize: 12, fontWeight: 700,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                background: live ? '#10b981' : strategy.status === 'PAUSED' ? '#f59e0b' : '#475569',
                boxShadow: live ? '0 0 6px #10b981' : 'none',
              }} />
              {strategy.status}
            </span>
          </div>
        </div>
      </div>

      {/* Win rate bar */}
      {strategy.win_rate > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155', marginBottom: 4 }}>
            <span>Win rate</span><span>{strategy.win_rate}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(51,65,85,0.4)', borderRadius: 2 }}>
            <div style={{
              height: 3, borderRadius: 2, transition: 'width 0.5s ease',
              width: `${strategy.win_rate}%`,
              background: strategy.win_rate >= 60 ? '#10b981' : '#f59e0b',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [msg,        setMsg]        = useState('');
  const [filter,     setFilter]     = useState<'ALL' | 'LIVE' | 'PAUSED' | 'INACTIVE'>('ALL');

  useEffect(() => { api.strategies().then(s => { setStrategies(s); setLoading(false); }); }, []);

  async function handleToggle(id: string, newStatus: 'LIVE' | 'PAUSED') {
    try {
      const updated = await api.toggleStrategy(id, newStatus);
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: updated.status } : s));
      setMsg(`✓ Strategy ${newStatus === 'LIVE' ? 'activated' : 'paused'}`);
    } catch {
      // Optimistic UI update since backend may not have this endpoint yet
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      setMsg(`✓ Strategy ${newStatus === 'LIVE' ? 'activated' : 'paused'} (local only)`);
    }
    setTimeout(() => setMsg(''), 3000);
  }

  const visible = strategies.filter(s => filter === 'ALL' || s.status === filter);
  const live    = strategies.filter(s => s.status === 'LIVE').length;
  const paused  = strategies.filter(s => s.status === 'PAUSED').length;
  const totalPnl = strategies.reduce((s, st) => s + st.realised_pnl, 0);

  return (
    <>
      <style>{`
        .strat-summary { display: flex; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
        .sum-chip {
          padding: 10px 18px; background: rgba(15,23,42,0.85);
          border: 1px solid rgba(51,65,85,0.5); border-radius: 9px;
        }
        .sum-label { font-size: 10px; color: #475569; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
        .sum-val { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #f1f5f9; }

        .filter-tabs { display: flex; gap: 6px; margin-bottom: 20px; }
        .ftab {
          padding: 6px 16px; border-radius: 6px; font-size: 11px; font-family: 'DM Mono', monospace;
          font-weight: 500; cursor: pointer; border: 1px solid rgba(51,65,85,0.5);
          background: transparent; color: #475569; transition: all 0.15s; letter-spacing: 0.05em;
        }
        .ftab.on { background: rgba(59,130,246,0.12); color: #93c5fd; border-color: rgba(59,130,246,0.35); }
        .ftab:not(.on):hover { color: #94a3b8; }

        .strat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }

        .strat-card {
          background: rgba(15,23,42,0.85); border: 1px solid;
          border-radius: 12px; padding: 20px; transition: border-color 0.2s, transform 0.15s;
        }
        .strat-card:hover { transform: translateY(-2px); }
        .strat-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .strat-card-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #f1f5f9; margin-bottom: 5px; }
        .strat-desc { font-size: 12px; color: #475569; line-height: 1.5; margin-bottom: 14px; }
        .strat-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .strat-stat { }
        .strat-stat-label { font-size: 10px; color: #334155; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 3px; }
        .strat-stat-val { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #e2e8f0; }

        .toggle-btn {
          padding: 5px 12px; border-radius: 5px; font-size: 10px; font-family: 'DM Mono', monospace;
          font-weight: 700; letter-spacing: 0.07em; cursor: pointer; border: 1px solid; white-space: nowrap;
          transition: all 0.15s;
        }
        .toggle-on  { background: rgba(244,63,94,0.1); color: #fda4af; border-color: rgba(244,63,94,0.3); }
        .toggle-on:hover  { background: rgba(244,63,94,0.2); }
        .toggle-off { background: rgba(16,185,129,0.1); color: #6ee7b7; border-color: rgba(16,185,129,0.3); }
        .toggle-off:hover { background: rgba(16,185,129,0.2); }

        .msg { padding: 10px 14px; border-radius: 7px; font-size: 12px; margin-bottom: 16px; }
        .msg-ok { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981; }

        .skel-card {
          background: rgba(15,23,42,0.85); border: 1px solid rgba(51,65,85,0.4);
          border-radius: 12px; padding: 20px; height: 190px;
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Strategies</h1>
        <p className="page-subtitle">Manage execution strategies across all markets</p>
      </div>

      {msg && <div className="msg msg-ok">{msg}</div>}

      {/* Summary chips */}
      <div className="strat-summary">
        {[
          { label: 'Total',    val: strategies.length,                     color: '#e2e8f0' },
          { label: 'Live',     val: live,                                  color: '#10b981' },
          { label: 'Paused',   val: paused,                                color: '#f59e0b' },
          { label: 'Combined P&L', val: `${totalPnl >= 0 ? '+' : ''}₹${Math.abs(totalPnl).toLocaleString('en-IN')}`, color: totalPnl >= 0 ? '#10b981' : '#f43f5e' },
        ].map(c => (
          <div key={c.label} className="sum-chip">
            <div className="sum-label">{c.label}</div>
            <div className="sum-val" style={{ color: c.color }}>{loading ? '—' : c.val}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {(['ALL', 'LIVE', 'PAUSED', 'INACTIVE'] as const).map(f => (
          <button key={f} className={`ftab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Cards */}
      <div className="strat-grid">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="skel-card"><div className="skeleton" style={{ width: '60%', height: 18, marginBottom: 10 }} /></div>)
          : visible.length === 0
            ? <div style={{ color: '#334155', fontSize: 13, padding: '20px 0' }}>No strategies match this filter.</div>
            : visible.map(s => (
              <StrategyCard key={s.id} strategy={s} onToggle={handleToggle} />
            ))
        }
      </div>
    </>
  );
}
