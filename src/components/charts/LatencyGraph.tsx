'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface LatencyData {
  time: string;
  value: number;
}

export default function LatencyGraph({ data }: { data: LatencyData[] }) {
  // Institutional threshold for latency spikes
  const THRESHOLD = 300;

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            fontSize={10}
            tickFormatter={(str) => str.split(':')[2] + 's'} // Only show seconds for clarity
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            unit="ms"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: '12px' }}
            itemStyle={{ color: '#3b82f6' }}
          />
          <ReferenceLine y={THRESHOLD} label={{ value: 'SPIKE', position: 'insideRight', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            isAnimationActive={false} // Improves performance for live updates
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
