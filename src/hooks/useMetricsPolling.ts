import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';

interface MetricPoint {
  time: string;
  value: number;
}

export function useMetricsPolling(intervalMs: number = 5000, limit: number = 50) {
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (isPaused) return;
    
    try {
      const data = await apiClient.get('/monitoring/metrics', { latency: { avg_ms: 0 } } as any);
      setMetrics(data);
      
      const now = new Date().toLocaleTimeString();
      setHistory(prev => {
        const next = [...prev, { time: now, value: data.latency.avg_ms }];
        return next.slice(-limit); // Strict memory-safe windowing
      });
    } catch (err) {
      console.error("Telemetry poll failed:", err);
    }
  }, [isPaused, limit]);

  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Controlled polling
    timerRef.current = setInterval(fetchData, intervalMs);
    
    // Critical Cleanup: Prevent memory leaks on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchData, intervalMs]);

  return { metrics, history, isPaused, setIsPaused };
}
