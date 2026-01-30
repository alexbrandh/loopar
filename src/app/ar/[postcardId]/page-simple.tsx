'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface PostcardData {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string;
  nft_descriptors: any;
  user_id?: string;
}

// Declaraciones globales simples
declare global {
  interface Window {
    AFRAME: any;
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': any;
      'a-assets': any;
      'a-nft': any;
      'a-video': any;
      'a-entity': any;
      'a-plane': any;
    }
  }
}

function SimpleARViewer({ postcard }: { postcard: PostcardData }) {
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Función de log simple sin dependencias circulares
  const addLog = (message: string) => {
    console.log(message);
    setDebugLog(prev => [...prev.slice(-19), message]);
  };

  useEffect(() => {
    addLog('🚀 Iniciando AR Viewer Simple...');

    // Registrar componente videohandler simple
    if (typeof window !== 'undefined' && window.AFRAME) {
      window.AFRAME.registerComponent('videohandler', {
        init: function () {
          const marker = this.el;
          const vid = document.querySelector("#vid");

          marker.addEventListener('markerFound', () => {
            addLog('🎯 Marcador encontrado');
            if (vid) {
              (vid as HTMLVideoElement).play();
            }
          });

          marker.addEventListener('markerLost', () => {
            addLog('❌ Marcador perdido');
            if (vid) {
              (vid as HTMLVideoElement).pause();
            }
          });
        }
      });
    }
  }, []); // Sin dependencias

  // Construir URL de descriptores NFT
  const getNFTUrl = () => {
    const descriptors = postcard.nft_descriptors;

    if (descriptors && descriptors.files && descriptors.files.fset) {
      // Usar directamente los IDs del objeto postcard en lugar de parsear la URL firmada
      // Esto es mucho más robusto ya que no depende del formato de la URL de almacenamiento
      // Nota: postcard es any o PostcardData, aseguramos que tenga user_id (que viene de la API)
      const p = postcard as any;
      if (p.user_id && p.id) {
        return `/api/ar/nft/${p.user_id}/${p.id}/descriptors`;
      }
    }

    // Fallback a pinball
    return 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball';
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'black' }}>
      {/* Debug Panel */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        maxWidth: '300px',
        maxHeight: '200px',
        overflow: 'auto',
        zIndex: 1000
      }}>
        {debugLog.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>

      {/* A-Frame Scene */}
      <a-scene
        embedded
        arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false;"
        style={{ width: '100vw', height: '100vh' }}
      >
        <a-assets>
          <video
            id="vid"
            src={postcard.video_url}
            preload="metadata"
            autoPlay
            loop
            muted
            playsInline
            crossOrigin="anonymous"
          />
        </a-assets>

        <a-nft
          type="nft"
          url={getNFTUrl()}
          smooth="true"
          smoothCount="10"
          smoothTolerance="0.01"
          smoothThreshold="5"
          emitevents="true"
          videohandler
        >
          <a-video
            id="video-plane"
            src="#vid"
            position="0 0 0"
            rotation="-90 0 0"
            width="1"
            height="1.78"
          />
        </a-nft>

        <a-entity camera />
      </a-scene>
    </div>
  );
}

export default function ARViewerPage() {
  const params = useParams();
  const postcardId = params.postcardId as string;
  const [postcard, setPostcard] = useState<PostcardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostcard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/postcards/${postcardId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setPostcard(data.data);
      } catch (err) {
        console.error('Error fetching postcard:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (postcardId) {
      fetchPostcard();
    }
  }, [postcardId]);

  // Cargar scripts de A-Frame y AR.js
  useEffect(() => {
    const loadScripts = async () => {
      // Cargar A-Frame
      if (!document.querySelector('script[src*="aframe"]')) {
        const aframeScript = document.createElement('script');
        aframeScript.src = 'https://aframe.io/releases/1.4.0/aframe.min.js';
        aframeScript.async = true;
        document.head.appendChild(aframeScript);

        await new Promise((resolve) => {
          aframeScript.onload = resolve;
        });
      }

      // Cargar AR.js
      if (!document.querySelector('script[src*="aframe-ar-nft"]')) {
        const arScript = document.createElement('script');
        arScript.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar-nft.js';
        arScript.async = true;
        document.head.appendChild(arScript);

        await new Promise((resolve) => {
          arScript.onload = resolve;
        });
      }
    };

    loadScripts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p>Cargando postal AR...</p>
        </div>
      </div>
    );
  }

  if (error || !postcard) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-300 mb-4">{error || 'Postal no encontrada'}</p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <SimpleARViewer postcard={postcard} />;
}