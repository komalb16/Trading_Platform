import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, type Metrics } from '@/lib/api';

interface MetricPoint {
  time: string;
  value: number;
}

interface MonitoringMetrics extends Metrics {
  latency: { avg_ms: number };
}

export function useMetricsPolling(intervalMs: number = 5000, limit: number = 50) {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (isPaused) return;

    try {
      const data = await apiClient.get<MonitoringMetrics>('/monitoring/metrics', { latency: { avg_ms: 0 } } as MonitoringMetrics);
      setMetrics(data);

      const now = new Date().toLocaleTimeString();
      setHistory(prev => {
        const next = [...prev, { time: now, value: data.latency.avg_ms }];
        return next.slice(-limit);
      });
    } catch (err) {
      console.error("Telemetry poll failed:", err);
    }
  }, [isPaused, limit]);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, intervalMs);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchData, intervalMs]);

  return { metrics, history, isPaused, setIsPaused };
}