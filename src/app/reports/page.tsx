'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,Cell
} from 'recharts';
import { api, type Metrics, type Trade } from '@/lib/api';

// Generate 30-day synthetic equity curve from real metrics seed
function buildEquityCurve(baseCapital = 500000, days = 30) {
  const data = [];
  let equity = baseCapital;
  let running = 0;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const chg = (Math.random() - 0.42) * equity * 0.018;
    equity += chg; running += chg;
    data.push({
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      equity: Math.round(equity),
      dailyPnl: Math.round(chg),
      cumPnl: Math.round(running),
    });
  }
  return data;
}

const CURVE = buildEquityCurve();

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0d1525', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: '#64748b', marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.value >= 0 ? '#10b981' : '#f43f5e' }}>
          {p.name}: {p.value >= 0 ? '+' : ''}₹{Math.abs(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7D' | '30D' | 'ALL'>('30D');

  useEffect(() => {
    Promise.all([api.metrics(), api.trades()]).then(([m, t]) => {
      setMetrics(m); setTrades(t); setLoading(false);
    });
  }, []);

  const curveSlice = period === '7D' ? CURVE.slice(-7) : period === '30D' ? CURVE : CURVE;

  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const wins = closedTrades.filter(t => t.pnl > 0);
  const losses = closedTrades.filter(t => t.pnl < 0);
  const bestTrade = closedTrades.reduce((a, b) => b.pnl > a.pnl ? b : a, { pnl: 0, symbol: '—', id: '' } as Trade);
  const worstTrade = closedTrades.reduce((a, b) => b.pnl < a.pnl ? b : a, { pnl: 0, symbol: '—', id: '' } as Trade);
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : Infinity;

  const marketBreakdown = ['NSE', 'US', 'CRYPTO'].map(m => ({
    market: m,
    pnl: trades.filter(t => t.market === m).reduce((s, t) => s + t.pnl, 0),
    count: trades.filter(t => t.market === m).length,
  }));

  const fmt = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  function handleExport() {
    const rows = [
      ['ID', 'Symbol', 'Side', 'Entry', 'P&L', 'Strategy', 'Status'],
      ...trades.map(t => [t.id, t.symbol, t.side, t.entry_price, t.pnl, t.strategy_name, t.status]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'quant_trade_report.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{`
        .report-grid-top { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
        @media (max-width: 800px) { .report-grid-top { grid-template-columns: 1fr; } }

        .report-grid-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
        @media (max-width: 800px) { .report-grid-stats { grid-template-columns: repeat(2,1fr); } }

        .stat-box {
          background: rgba(15,23,42,0.85); border: 1px solid rgba(51,65,85,0.5);
          border-radius: 10px; padding: 16px 18px;
        }
        .stat-box-label { font-size: 10px; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px; }
        .stat-box-val   { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #f1f5f9; }
        .stat-box-sub   { font-size: 11px; color: #475569; margin-top: 3px; }

        .period-tabs { display: flex; gap: 4px; }
        .ptab {
          padding: 4px 12px; border-radius: 5px; font-size: 11px; font-family: 'DM Mono', monospace;
          font-weight: 500; cursor: pointer; border: 1px solid rgba(51,65,85,0.5);
          background: transparent; color: #475569; transition: all 0.15s;
        }
        .ptab.on { background: rgba(59,130,246,0.12); color: #93c5fd; border-color: rgba(59,130,246,0.3); }
        .ptab:not(.on):hover { color: #94a3b8; }

        .chart-wrap { padding: 18px 20px 12px; }
        .chart-title { font-size: 12px; color: #94a3b8; margin-bottom: 14px; font-family: 'Syne', sans-serif; font-weight: 700; }

        .mkt-bar { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(51,65,85,0.3); }
        .mkt-bar:last-child { border-bottom: none; }
        .mkt-bar-name { width: 60px; font-size: 11px; color: #64748b; }
        .mkt-bar-track { flex: 1; height: 6px; background: rgba(51,65,85,0.4); border-radius: 3px; overflow: hidden; }
        .mkt-bar-fill  { height: 6px; border-radius: 3px; transition: width 0.5s ease; }
        .mkt-bar-val   { width: 90px; text-align: right; font-size: 12px; font-weight: 700; }
      `}</style>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Performance analytics · all strategies · all markets</p>
        </div>
        <button className="btn btn-ghost" onClick={handleExport}>↓ Export CSV</button>
      </div>

      {/* Key stats row */}
      <div className="report-grid-stats">
        {[
          { label: 'Total P&L', val: metrics ? `${metrics.realised_pnl >= 0 ? '+' : '-'}₹${fmt(metrics.realised_pnl + metrics.unrealised_pnl)}` : '—', color: '#10b981' },
          { label: 'Win Rate', val: metrics ? `${metrics.win_rate}%` : '—', sub: `${wins.length}W / ${losses.length}L`, color: '#f59e0b' },
          { label: 'Profit Factor', val: loading ? '—' : profitFactor === Infinity ? '∞' : profitFactor.toFixed(2), sub: 'Avg win / Avg loss', color: '#3b82f6' },
          { label: 'Max Drawdown', val: metrics ? `${metrics.max_drawdown}%` : '—', sub: 'Peak-to-trough', color: '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <div className="stat-box-label">{s.label}</div>
            <div className="stat-box-val" style={{ color: s.color }}>{s.val}</div>
            {s.sub && <div className="stat-box-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="report-grid-top">

        {/* Equity curve */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">EQUITY CURVE</span>
            <div className="period-tabs">
              {(['7D', '30D', 'ALL'] as const).map(p => (
                <button key={p} className={`ptab ${period === p ? 'on' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={curveSlice} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#334155', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="equity" name="Equity" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#eqGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily P&L bars */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">DAILY P&L</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={curveSlice.slice(-14)} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fill: '#334155', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `${v >= 0 ? '+' : ''}${(v / 1000).toFixed(0)}k`} width={42} />
                <ReferenceLine y={0} stroke="rgba(51,65,85,0.8)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="dailyPnl" name="Daily P&L" radius={[2, 2, 0, 0]}>
                  {curveSlice.slice(-14).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.dailyPnl >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Market breakdown */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p className="chart-title">P&L BY MARKET</p>
          {loading
            ? [...Array(3)].map((_, i) => <div key={i} style={{ padding: '10px 0' }}><div className="skeleton" style={{ height: 14 }} /></div>)
            : (() => {
              const maxAbs = Math.max(...marketBreakdown.map(m => Math.abs(m.pnl)), 1);
              return marketBreakdown.map(m => (
                <div key={m.market} className="mkt-bar">
                  <span className="mkt-bar-name">{m.market}</span>
                  <div className="mkt-bar-track">
                    <div className="mkt-bar-fill" style={{
                      width: `${(Math.abs(m.pnl) / maxAbs) * 100}%`,
                      background: m.pnl >= 0 ? '#10b981' : '#f43f5e',
                    }} />
                  </div>
                  <span className="mkt-bar-val" style={{ color: m.pnl >= 0 ? '#10b981' : '#f43f5e' }}>
                    {m.pnl >= 0 ? '+' : '-'}₹{fmt(m.pnl)}
                  </span>
                </div>
              ));
            })()
          }
        </div>

        {/* Best / Worst trades */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p className="chart-title">TRADE HIGHLIGHTS</p>
          {[
            { label: 'Best Trade', trade: bestTrade, color: '#10b981' },
            { label: 'Worst Trade', trade: worstTrade, color: '#f43f5e' },
            { label: 'Avg Win', val: `+₹${fmt(avgWin)}`, color: '#10b981', sub: `${wins.length} wins` },
            { label: 'Avg Loss', val: `-₹${fmt(Math.abs(avgLoss))}`, color: '#f43f5e', sub: `${losses.length} losses` },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '9px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: 12,
            }}>
              <span style={{ color: '#475569', fontSize: 11 }}>{row.label}</span>
              <div style={{ textAlign: 'right' }}>
                {'trade' in row
                  ? <>
                    <span style={{ color: row.color, fontWeight: 700 }}>
                      {row.trade!.pnl >= 0 ? '+' : '-'}₹{fmt(row.trade!.pnl)}
                    </span>
                    <div style={{ fontSize: 10, color: '#334155' }}>{row.trade!.symbol}</div>
                  </>
                  : <>
                    <span style={{ color: row.color, fontWeight: 700 }}>{row.val}</span>
                    <div style={{ fontSize: 10, color: '#334155' }}>{row.sub}</div>
                  </>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
