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
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f1f 50%, #1a1a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FAF8F5'
    }}>
      <img 
        src="/regaliz-isotipo.svg" 
        alt="Regaliz" 
        style={{ width: '80px', height: '80px', marginBottom: '24px' }}
      />
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(244, 123, 107, 0.2)',
        borderTopColor: '#F47B6B',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }} />
      <p style={{ color: '#F47B6B', fontSize: '14px' }}>Iniciando experiencia AR...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
