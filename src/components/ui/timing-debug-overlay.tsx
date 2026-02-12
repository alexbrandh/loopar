'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface TimingEntry {
  label: string;
  elapsed: string;
  ts: number;
}

interface TimingDebugOverlayProps {
  entries: TimingEntry[];
  visible: boolean;
}

export function TimingDebugOverlay({ entries, visible }: TimingDebugOverlayProps) {
  const [minimized, setMinimized] = useState(false);

  if (!visible || entries.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        right: 8,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.88)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 11,
        borderRadius: 8,
        padding: minimized ? '6px 10px' : '8px 10px',
        maxHeight: minimized ? 32 : '45vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: minimized ? 0 : 4 }}
        onClick={() => setMinimized(!minimized)}
      >
        <span style={{ fontWeight: 'bold', color: '#ff0' }}>⏱️ TIMING DEBUG</span>
        <span style={{ color: '#888', cursor: 'pointer' }}>{minimized ? '▲' : '▼'} {entries.length} entries</span>
      </div>
      {!minimized && (
        <div>
          {entries.map((e, i) => (
            <div key={i} style={{ padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#0ff' }}>{e.elapsed}s</span>{' '}
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hook that provides a timing logger which stores entries for the overlay
 * AND logs to console simultaneously.
 */
export function useTimingLog() {
  const [entries, setEntries] = useState<TimingEntry[]>([]);
  const t0Ref = useRef<number>(0);

  const reset = useCallback(() => {
    t0Ref.current = performance.now();
    setEntries([]);
  }, []);

  const lap = useCallback((label: string) => {
    const now = performance.now();
    const elapsed = ((now - t0Ref.current) / 1000).toFixed(2);
    console.log(`⏱️ [TIMING] ${label} — ${elapsed}s desde inicio`);
    setEntries(prev => [...prev, { label, elapsed, ts: now }]);
  }, []);

  const lapDuration = useCallback((label: string, startTime: number) => {
    const now = performance.now();
    const duration = ((now - startTime) / 1000).toFixed(2);
    const elapsed = ((now - t0Ref.current) / 1000).toFixed(2);
    const fullLabel = `${label} (duró ${duration}s)`;
    console.log(`⏱️ [TIMING] ${fullLabel} — ${elapsed}s desde inicio`);
    setEntries(prev => [...prev, { label: fullLabel, elapsed, ts: now }]);
  }, []);

  const addInfo = useCallback((label: string) => {
    console.log(`⏱️ [TIMING] ${label}`);
    const elapsed = t0Ref.current > 0 ? ((performance.now() - t0Ref.current) / 1000).toFixed(2) : '—';
    setEntries(prev => [...prev, { label, elapsed: String(elapsed), ts: performance.now() }]);
  }, []);

  return { entries, reset, lap, lapDuration, addInfo };
}
