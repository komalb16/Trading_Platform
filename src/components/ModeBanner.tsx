'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export default function ModeBanner() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await apiClient.get('/system/status');
        setStatus(data);
      } catch (err) {
        console.error("Failed to fetch system status");
      }
    };
    fetchStatus();
  }, []);

  if (!status) return null;

  const isPaper = status.execution_mode === 'PAPER';
  
  return (
    <div className={`w-full py-1.5 px-4 text-center text-[11px] font-bold tracking-widest uppercase transition-colors ${
      isPaper 
        ? 'bg-amber-500/10 text-amber-500 border-b border-amber-500/20' 
        : 'bg-rose-600 text-white animate-pulse'
    }`}>
      {isPaper ? '● Paper Trading Mode Active (Simulation)' : '⚠️ LIVE TRADING MODE ACTIVE - USE EXTREME CAUTION'}
    </div>
  );
}
