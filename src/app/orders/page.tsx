'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, type Order } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  FILLED: '#10b981', PARTIAL: '#f59e0b', PENDING: '#3b82f6',
  CANCELLED: '#64748b', REJECTED: '#f43f5e',
};
const ORDER_TYPES = ['ALL', 'MARKET', 'LIMIT', 'SL', 'SL-M'];
const STATUSES    = ['ALL', 'FILLED', 'PENDING', 'CANCELLED', 'REJECTED'];

export default function OrdersPage() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFil,  setStatusFil]  = useState('ALL');
  const [search,     setSearch]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState('');

  // New order form state
  const [form, setForm] = useState({
    symbol: '', side: 'BUY', qty: '', order_type: 'MARKET',
    price: '', strategy: '', broker: 'Zerodha',
  });

  useEffect(() => { api.orders().then(o => { setOrders(o); setLoading(false); }); }, []);

  const filtered = useMemo(() => orders.filter(o =>
    (typeFilter === 'ALL' || o.order_type === typeFilter) &&
    (statusFil  === 'ALL' || o.status     === statusFil) &&
    (search === '' || o.symbol.toLowerCase().includes(search.toLowerCase()) ||
                      o.strategy_name.toLowerCase().includes(search.toLowerCase()))
  ), [orders, typeFilter, statusFil, search]);

  const totalFilled    = orders.filter(o => o.status === 'FILLED').length;
  const totalPending   = orders.filter(o => o.status === 'PENDING').length;
  const totalCancelled = orders.filter(o => o.status === 'CANCELLED' || o.status === 'REJECTED').length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await api.triggerWebhook({
        signal: `${form.side}_${form.order_type}`,
        symbol: form.symbol,
        strategy_name: form.strategy || 'MANUAL',
        risk: Number(form.qty),
      });
      setMsg('✓ Order submitted successfully');
      setShowForm(false);
      setForm({ symbol: '', side: 'BUY', qty: '', order_type: 'MARKET', price: '', strategy: '', broker: 'Zerodha' });
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg(`✗ ${err instanceof Error ? err.message : 'Submission failed'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        .filter-bar {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px;
        }
        .filter-input {
          padding: 7px 12px; background: rgba(15,23,42,0.8); border: 1px solid rgba(51,65,85,0.6);
          border-radius: 7px; color: #e2e8f0; font-family: 'DM Mono', monospace; font-size: 12px;
          outline: none; transition: border-color 0.15s;
        }
        .filter-input:focus { border-color: rgba(59,130,246,0.5); }
        .filter-input::placeholder { color: #334155; }
        .filter-select {
          padding: 7px 12px; background: rgba(15,23,42,0.8); border: 1px solid rgba(51,65,85,0.6);
          border-radius: 7px; color: #94a3b8; font-family: 'DM Mono', monospace; font-size: 12px;
          outline: none; cursor: pointer;
        }
        .stat-chips { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
        .stat-chip {
          padding: 8px 16px; background: rgba(15,23,42,0.8); border: 1px solid rgba(51,65,85,0.5);
          border-radius: 8px; font-size: 12px;
        }
        .stat-chip-label { font-size: 10px; color: #475569; letter-spacing: 0.08em; margin-bottom: 3px; }
        .stat-chip-val { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: #f1f5f9; }

        /* Form modal */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal {
          background: #0d1525; border: 1px solid rgba(51,65,85,0.7); border-radius: 12px;
          padding: 24px; width: 100%; max-width: 480px;
        }
        .modal-title {
          font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700;
          color: #f1f5f9; margin-bottom: 20px;
        }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group.full { grid-column: 1 / -1; }
        .form-label { font-size: 10px; color: #475569; letter-spacing: 0.08em; text-transform: uppercase; }
        .form-input, .form-select {
          padding: 9px 12px; background: rgba(8,15,30,0.9); border: 1px solid rgba(51,65,85,0.6);
          border-radius: 7px; color: #e2e8f0; font-family: 'DM Mono', monospace; font-size: 13px;
          outline: none; transition: border-color 0.15s;
        }
        .form-input:focus, .form-select:focus { border-color: rgba(59,130,246,0.6); }
        .form-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

        .msg { padding: 10px 14px; border-radius: 7px; font-size: 12px; margin-bottom: 16px; }
        .msg-ok  { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981; }
        .msg-err { background: rgba(244,63,94,0.1);  border: 1px solid rgba(244,63,94,0.3);  color: #f43f5e; }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Orders</h1>
        <p className="page-subtitle">Order book · all brokers · all markets</p>
      </div>

      {msg && (
        <div className={`msg ${msg.startsWith('✓') ? 'msg-ok' : 'msg-err'}`}>{msg}</div>
      )}

      {/* Summary chips */}
      <div className="stat-chips">
        {[
          { label: 'Total Orders', val: orders.length, color: '#e2e8f0' },
          { label: 'Filled',       val: totalFilled,    color: '#10b981' },
          { label: 'Pending',      val: totalPending,   color: '#f59e0b' },
          { label: 'Cancelled / Rejected', val: totalCancelled, color: '#64748b' },
        ].map(c => (
          <div key={c.label} className="stat-chip">
            <div className="stat-chip-label">{c.label}</div>
            <div className="stat-chip-val" style={{ color: c.color }}>{loading ? '—' : c.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="filter-input" placeholder="Search symbol or strategy…"
          value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }}
        />
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {ORDER_TYPES.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
        </select>
        <select className="filter-select" value={statusFil} onChange={e => setStatusFil(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}>
          + Place Order
        </button>
      </div>

      {/* Table */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">ORDER BOOK</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{filtered.length} orders</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Order ID</th><th>Symbol</th><th>Side</th><th>Type</th>
              <th>Qty</th><th>Price</th><th>Filled</th><th>Avg Price</th>
              <th>Strategy</th><th>Broker</th><th>Time</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(12)].map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ width: '70%', height: 14 }} /></td>
                  ))}
                </tr>
              ))
              : filtered.length === 0
                ? <tr><td colSpan={12} style={{ textAlign: 'center', color: '#334155', padding: 32 }}>No orders match filters</td></tr>
                : filtered.map(o => (
                  <tr key={o.id}>
                    <td style={{ color: '#475569', fontSize: 11 }}>{o.id}</td>
                    <td className="sym">{o.symbol}</td>
                    <td style={{ color: o.side === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 700 }}>{o.side}</td>
                    <td><span className="badge badge-slate">{o.order_type}</span></td>
                    <td>{o.qty}</td>
                    <td className="muted">{o.price ?? '—'}</td>
                    <td style={{ color: o.filled_qty === o.qty ? '#10b981' : '#f59e0b' }}>{o.filled_qty}</td>
                    <td className="muted">{o.avg_price ?? '—'}</td>
                    <td style={{ color: '#64748b', fontSize: 11 }}>{o.strategy_name}</td>
                    <td><span className="badge badge-slate">{o.broker}</span></td>
                    <td style={{ color: '#475569', fontSize: 11 }}>
                      {new Date(o.created_at).toLocaleTimeString('en-IN', { hour12: false })}
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: `${STATUS_COLORS[o.status]}22`,
                        color: STATUS_COLORS[o.status] ?? '#64748b',
                      }}>{o.status}</span>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Place order modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <p className="modal-title">Place New Order</p>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Symbol</label>
                  <input className="form-input" placeholder="e.g. NIFTY 25000 CE"
                    value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Side</label>
                  <select className="form-select" value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" placeholder="50"
                    value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Order Type</label>
                  <select className="form-select" value={form.order_type} onChange={e => setForm(f => ({ ...f, order_type: e.target.value }))}>
                    {['MARKET', 'LIMIT', 'SL', 'SL-M'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price (if LIMIT)</label>
                  <input className="form-input" type="number" step="0.05" placeholder="—"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Strategy Tag</label>
                  <input className="form-input" placeholder="MANUAL"
                    value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Broker</label>
                  <select className="form-select" value={form.broker} onChange={e => setForm(f => ({ ...f, broker: e.target.value }))}>
                    {['Zerodha', 'Alpaca', 'Binance'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
