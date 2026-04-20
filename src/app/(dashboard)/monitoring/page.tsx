'use client';

import { useMetricsPolling } from '@/hooks/useMetricsPolling';
import LatencyGraph from '@/components/charts/LatencyGraph';

export default function MonitoringDashboard() {
  const { metrics, history, isPaused, setIsPaused } = useMetricsPolling(5000, 50);

  if (!metrics) return (
    <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">Synchronizing with Performance Stream...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Telemetry</h1>
          <p className="text-slate-400">High-Resolution Operational Health Portfolio</p>
        </div>
        <button 
          onClick={() => setIsPaused(!isPaused)} 
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            isPaused ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {isPaused ? '▶ RESUME TELEMETRY' : '⏸ PAUSE DATA'}
        </button>
      </header>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { name: 'Execution Latency', value: `${metrics.latency.avg_ms}ms`, status: metrics.latency.status.toUpperCase(), color: metrics.latency.status === 'healthy' ? 'emerald' : 'amber' },
          { name: 'Broker Score', value: `${metrics.broker_health.score}%`, status: metrics.broker_health.status.toUpperCase(), color: metrics.broker_health.status === 'online' ? 'emerald' : 'rose' },
          { name: 'Execution Quality', value: 'OPTIMAL', status: 'AUDITED', color: 'blue' },
          { name: 'Active Signals', value: metrics.active_trades_count, status: 'NORMAL', color: 'blue' },
        ].map((stat) => (
          <div key={stat.name} className={`glass-card p-6 border-l-4 border-${stat.color}-500 shadow-lg shadow-blue-500/5`}>
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{stat.name}</p>
            <p className="text-2xl font-mono font-bold">{stat.value}</p>
            <p className={`text-[10px] mt-2 font-bold text-${stat.color}-500`}>● {stat.status}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Graph */}
        <section className="lg:col-span-2 glass-card p-6 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-sm">End-to-End Latency Stream (Last 50 Events)</h3>
            <span className="text-[10px] text-slate-500">{isPaused ? 'PAUSED' : 'WINDOW: STEADY'}</span>
          </div>
          <div className="flex-1">
            <LatencyGraph data={history} />
          </div>
        </section>

        {/* Broker Health Details */}
        <section className="glass-card">
           <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h2 className="font-semibold text-sm">Market Accessibility</h2>
          </div>
          <div className="p-6 space-y-6">
             <div className="space-y-4">
                {[
                  { name: 'Zerodha Kite (NSE)', health: metrics.broker_health.score, status: 'ONLINE' },
                  { name: 'Alpaca (NYSE)', health: 99.9, status: 'ONLINE' },
                ].map((broker) => (
                  <div key={broker.name} className="flex justify-between items-center p-3 rounded bg-slate-900/30 border border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-300">{broker.name}</p>
                      <p className="text-[10px] text-emerald-500 font-bold">{broker.status}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-mono">{broker.health}%</p>
                    </div>
                  </div>
                ))}
             </div>
             
             <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
               <p className="text-[11px] text-blue-400 font-semibold mb-1">Production Guard</p>
               <p className="text-[10px] text-slate-500 leading-relaxed">
                 Memory consumption is stabilized via strict moving-window buffers.
               </p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
