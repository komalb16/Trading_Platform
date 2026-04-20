'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',            label: 'Dashboard',  icon: '▦' },
  { href: '/orders',      label: 'Orders',     icon: '↕' },
  { href: '/positions',   label: 'Positions',  icon: '◈' },
  { href: '/strategies',  label: 'Strategies', icon: '⟳' },
  { href: '/reports',     label: 'Reports',    icon: '▤' },
];

// Seed ticker data — values jitter every few seconds to simulate a live feed.
// When a real broker WebSocket is connected, replace this with actual quotes.
const BASE_TICKERS = [
  { sym: 'NIFTY',  base: 24832.15, chg: +0.82,  flag: '🇮🇳', fmt: (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
  { sym: 'BNKN',   base: 53410.80, chg: -0.31,  flag: '🇮🇳', fmt: (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
  { sym: 'SPX',    base: 5612.34,  chg: +0.15,  flag: '🇺🇸', fmt: (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 }) },
  { sym: 'NASDAQ', base: 17840.20, chg: +0.62,  flag: '🇺🇸', fmt: (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 }) },
  { sym: 'BTC',    base: 68902.00, chg: +2.47,  flag: '₿',   fmt: (v: number) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }) },
  { sym: 'ETH',    base: 3148.72,  chg: -1.32,  flag: 'Ξ',   fmt: (v: number) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 }) },
  { sym: 'USDINR', base: 83.42,    chg: -0.09,  flag: '₹',   fmt: (v: number) => v.toFixed(2) },
  { sym: 'GOLD',   base: 2387.60,  chg: +0.41,  flag: '⬤',   fmt: (v: number) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 }) },
];

function jitter(base: number, pct = 0.0008) {
  return base * (1 + (Math.random() - 0.5) * pct);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const [time, setTime]       = useState('');
  const [ping, setPing]       = useState(12);
  const [sideOpen, setSideOpen] = useState(true);

  // Live ticker state
  const [tickers, setTickers] = useState(
    BASE_TICKERS.map(t => ({ ...t, val: t.base, prevVal: t.base }))
  );
  const tickerRef = useRef(tickers);
  tickerRef.current = tickers;

  // Clock
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
      setPing(Math.floor(Math.random() * 8) + 9);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Ticker jitter — simulates streaming quotes; replace with WS in production
  useEffect(() => {
    const id = setInterval(() => {
      setTickers(prev =>
        prev.map(t => {
          const newVal = jitter(t.val);
          return { ...t, prevVal: t.val, val: newVal };
        })
      );
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        body {
          background: #080f1e;
          color: #e2e8f0;
          font-family: 'DM Mono', monospace;
        }
        body::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(51,65,85,0.10) 39px, rgba(51,65,85,0.10) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(51,65,85,0.10) 39px, rgba(51,65,85,0.10) 40px);
        }

        /* ── App shell ── */
        .app-shell {
          display: flex; min-height: 100vh; position: relative; z-index: 1;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 220px; flex-shrink: 0;
          background: rgba(8,15,30,0.97);
          border-right: 1px solid rgba(51,65,85,0.5);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
          transition: width 0.2s ease;
        }
        .sidebar.collapsed { width: 56px; }

        .sidebar-logo {
          padding: 18px 18px 14px;
          border-bottom: 1px solid rgba(51,65,85,0.4);
          display: flex; align-items: center; gap: 10px;
          overflow: hidden; white-space: nowrap;
        }
        .logo-icon {
          width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
          background: linear-gradient(135deg, #1d4ed8, #0891b2);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; color: #fff;
        }
        .logo-text {
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px;
          background: linear-gradient(90deg, #f8fafc 30%, #3b82f6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .nav-section { flex: 1; padding: 10px 0; overflow-y: auto; }
        .nav-group-label {
          font-size: 9px; color: #334155; letter-spacing: 0.12em;
          text-transform: uppercase; padding: 10px 18px 4px;
          white-space: nowrap; overflow: hidden;
        }
        .collapsed .nav-group-label { opacity: 0; }

        .nav-link {
          display: flex; align-items: center; gap: 12px;
          padding: 9px 18px; font-size: 13px; color: #475569;
          text-decoration: none; transition: all 0.15s; white-space: nowrap;
          border-left: 2px solid transparent; overflow: hidden;
        }
        .nav-link:hover { color: #94a3b8; background: rgba(51,65,85,0.2); }
        .nav-link.active {
          color: #93c5fd; background: rgba(59,130,246,0.1);
          border-left-color: #3b82f6;
        }
        .nav-icon { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; }
        .nav-label-text { overflow: hidden; }
        .collapsed .nav-label-text { display: none; }

        .sidebar-footer {
          padding: 12px 16px;
          border-top: 1px solid rgba(51,65,85,0.4);
          overflow: hidden;
        }
        .user-row { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
        .avatar {
          width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%;
          background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: #93c5fd; font-weight: 700;
        }
        .user-info { overflow: hidden; }
        .user-name { font-size: 12px; color: #e2e8f0; font-weight: 500; }
        .user-role { font-size: 10px; color: #475569; }
        .collapsed .user-info { display: none; }

        /* ── Main area ── */
        .main-area {
          margin-left: 220px; flex: 1; display: flex; flex-direction: column;
          min-height: 100vh; transition: margin-left 0.2s ease;
        }
        .main-area.collapsed { margin-left: 56px; }

        /* ── Topbar ── */
        .topbar {
          height: 50px;
          background: rgba(8,15,30,0.97);
          border-bottom: 1px solid rgba(51,65,85,0.5);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px;
          position: sticky; top: 0; z-index: 40;
          gap: 12px;
        }

        .topbar-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .collapse-btn {
          background: none; border: none; color: #475569; cursor: pointer;
          font-size: 14px; padding: 4px 6px; border-radius: 4px;
          transition: color 0.15s; flex-shrink: 0;
        }
        .collapse-btn:hover { color: #94a3b8; }

        /* Scrolling ticker */
        .ticker-viewport {
          flex: 1; overflow: hidden; min-width: 0;
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        .ticker-track {
          display: flex; align-items: center; gap: 20px;
          animation: tickerScroll 40s linear infinite;
          width: max-content;
        }
        .ticker-track:hover { animation-play-state: paused; }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; white-space: nowrap; cursor: default;
        }
        .ticker-flag { font-size: 10px; }
        .ticker-sym { color: #64748b; font-size: 10px; letter-spacing: 0.06em; }
        .ticker-val { color: #e2e8f0; font-weight: 500; font-size: 11px; transition: color 0.3s; }
        .ticker-val.flash-up   { color: #10b981; }
        .ticker-val.flash-down { color: #f43f5e; }
        .ticker-chg { font-size: 10px; }
        .chg-pos { color: #10b981; }
        .chg-neg { color: #f43f5e; }
        .ticker-sep { color: #1e2d45; font-size: 10px; }

        .topbar-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .time-display { font-size: 11px; color: #64748b; font-variant-numeric: tabular-nums; }
        .ping-display { font-size: 10px; color: #10b981; }
        .market-badge {
          display: flex; align-items: center; gap: 5px;
          background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
          padding: 3px 9px; border-radius: 4px;
          font-size: 9px; color: #10b981; letter-spacing: 0.08em; font-weight: 700;
        }
        .live-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #10b981;
          animation: livePulse 1.4s ease-in-out infinite; flex-shrink: 0;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #10b981; }
          50%       { opacity: 0.3; box-shadow: none; }
        }

        /* ── Page content ── */
        .page-content {
          flex: 1; padding: 0; overflow-y: auto;
          display: flex; flex-direction: column;
        }

        /* ── Shared panel ── */
        .panel {
          background: rgba(15,23,42,0.85);
          border: 1px solid rgba(51,65,85,0.6);
          border-radius: 10px; overflow: hidden;
        }
        .panel-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(51,65,85,0.5);
        }
        .panel-title {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
          color: #e2e8f0; letter-spacing: 0.04em;
        }

        /* ── Page header (used by child pages) ── */
        .page-header { padding: 24px 28px 0; margin-bottom: 20px; }
        .page-title {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700;
          color: #f1f5f9; letter-spacing: -0.3px;
        }
        .page-subtitle { font-size: 12px; color: #475569; margin-top: 4px; }

        /* ── Tables ── */
        .tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
        .tbl thead tr { border-bottom: 1px solid rgba(51,65,85,0.5); }
        .tbl th {
          padding: 10px 16px; text-align: left;
          font-size: 10px; color: #475569; font-weight: 500;
          letter-spacing: 0.09em; text-transform: uppercase;
        }
        .tbl td { padding: 11px 16px; color: #cbd5e1; border-bottom: 1px solid rgba(51,65,85,0.2); }
        .tbl tbody tr { transition: background 0.12s; }
        .tbl tbody tr:hover { background: rgba(59,130,246,0.05); }
        .tbl tbody tr:last-child td { border-bottom: none; }

        /* ── Shared utilities ── */
        .badge {
          display: inline-block; padding: 2px 8px; border-radius: 3px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
        }
        .badge-green  { background: rgba(16,185,129,0.15); color: #10b981; }
        .badge-red    { background: rgba(244,63,94,0.15);  color: #f43f5e; }
        .badge-blue   { background: rgba(59,130,246,0.15); color: #93c5fd; }
        .badge-amber  { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .badge-slate  { background: rgba(71,85,105,0.3);   color: #64748b; }

        .btn {
          padding: 8px 16px; border-radius: 7px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500;
          letter-spacing: 0.05em; transition: all 0.15s; border: 1px solid;
        }
        .btn-primary {
          background: rgba(59,130,246,0.15); color: #93c5fd;
          border-color: rgba(59,130,246,0.35);
        }
        .btn-primary:hover { background: rgba(59,130,246,0.25); border-color: #3b82f6; }
        .btn-ghost { background: transparent; color: #64748b; border-color: rgba(51,65,85,0.5); }
        .btn-ghost:hover { color: #94a3b8; border-color: #475569; }
        .btn-danger { background: rgba(244,63,94,0.1); color: #fda4af; border-color: rgba(244,63,94,0.25); }
        .btn-danger:hover { background: rgba(244,63,94,0.2); border-color: #f43f5e; }

        .pnl-pos { color: #10b981; font-weight: 700; }
        .pnl-neg { color: #f43f5e; font-weight: 700; }
        .muted   { color: #475569; }
        .sym     { color: #e2e8f0; font-weight: 500; }

        .skeleton {
          background: linear-gradient(90deg, rgba(51,65,85,0.3) 25%, rgba(51,65,85,0.5) 50%, rgba(51,65,85,0.3) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 768px) {
          .ticker-viewport { display: none; }
          .sidebar { width: 56px; }
          .sidebar .nav-label-text, .sidebar .logo-text,
          .sidebar .nav-group-label, .sidebar .user-info { display: none; }
          .main-area { margin-left: 56px; }
        }
      `}</style>

      <div className="app-shell">
        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sideOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-logo">
            <div className="logo-icon">QT</div>
            <span className="logo-text">QuantTrade</span>
          </div>

          <nav className="nav-section">
            <div className="nav-group-label">Navigation</div>
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label-text">{item.label}</span>
              </Link>
            ))}

            <div className="nav-group-label" style={{ marginTop: 8 }}>System</div>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="nav-link">
              <span className="nav-icon">⊡</span>
              <span className="nav-label-text">API Docs</span>
            </a>
            <a href="http://localhost:8000/api/v1/system/health" target="_blank" rel="noreferrer" className="nav-link">
              <span className="nav-icon">♥</span>
              <span className="nav-label-text">Health Check</span>
            </a>
          </nav>

          <div className="sidebar-footer">
            <div className="user-row">
              <div className="avatar">K</div>
              <div className="user-info">
                <div className="user-name">Komal</div>
                <div className="user-role">Admin · NSE + US</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className={`main-area ${sideOpen ? '' : 'collapsed'}`}>

          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-left">
              <button className="collapse-btn" onClick={() => setSideOpen(o => !o)}>
                {sideOpen ? '◁' : '▷'}
              </button>

              {/* Scrolling live ticker */}
              <div className="ticker-viewport">
                <div className="ticker-track">
                  {/* Duplicate items for seamless loop */}
                  {[...tickers, ...tickers].map((t, idx) => {
                    const up = t.val >= t.prevVal;
                    return (
                      <div key={idx} className="ticker-item">
                        <span className="ticker-flag">{t.flag}</span>
                        <span className="ticker-sym">{t.sym}</span>
                        <span className={`ticker-val ${up ? 'flash-up' : 'flash-down'}`}>
                          {t.fmt(t.val)}
                        </span>
                        <span className={`ticker-chg ${t.chg >= 0 ? 'chg-pos' : 'chg-neg'}`}>
                          {t.chg >= 0 ? '+' : ''}{t.chg}%
                        </span>
                        <span className="ticker-sep">|</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="topbar-right">
              <span className="time-display">{time}</span>
              <span className="ping-display">{ping}ms</span>
              <div className="market-badge">
                <span className="live-dot" />
                SIMULATED
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
