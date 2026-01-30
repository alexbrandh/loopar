'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ARViewerPage() {
  const params = useParams();
  const postcardId = params.postcardId as string;

  useEffect(() => {
    if (postcardId) {
      window.location.href = `/ar-viewer.html?id=${postcardId}`;
    }
  }, [postcardId]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(168,85,247,0.3)',
          borderTopColor: '#a855f7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p>Cargando visor AR...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
