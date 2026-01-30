'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

interface PostcardData {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string;
  nft_descriptors: any;
  user_id?: string;
}

export default function ARViewerPage() {
  const params = useParams();
  const postcardId = params.postcardId as string;
  const [postcard, setPostcard] = useState<PostcardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Cargar postal
  useEffect(() => {
    if (!postcardId) return;

    const fetchPostcard = async () => {
      try {
        const response = await fetch(`/api/postcards/${postcardId}`);
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();
        setPostcard(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchPostcard();
  }, [postcardId]);

  // Cargar scripts
  useEffect(() => {
    const loadScripts = async () => {
      try {
        if (!document.querySelector('script[src*="aframe"]')) {
          const aframe = document.createElement('script');
          aframe.src = 'https://aframe.io/releases/1.4.0/aframe.min.js';
          document.head.appendChild(aframe);
          await new Promise((resolve, reject) => {
            aframe.onload = resolve;
            aframe.onerror = reject;
          });
        }

        if (!document.querySelector('script[src*="aframe-ar-nft"]')) {
          const arjs = document.createElement('script');
          arjs.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar-nft.js';
          document.head.appendChild(arjs);
          await new Promise((resolve, reject) => {
            arjs.onload = resolve;
            arjs.onerror = reject;
          });
        }

        setScriptsLoaded(true);
      } catch {
        setError('Error cargando librerías AR');
      }
    };

    loadScripts();
  }, []);

  // Construir URL NFT
  const getNFTUrl = useCallback(() => {
    if (postcard?.nft_descriptors && postcard.user_id && postcard.id) {
      return `/api/ar/nft/${postcard.user_id}/${postcard.id}/descriptors`;
    }
    return 'https://raw.githubusercontent.com/nicolo-paternoster/AR.js-project/main/pinball';
  }, [postcard]);

  // Renderizar escena
  useEffect(() => {
    if (!scriptsLoaded || !postcard || !sceneRef.current) return;

    const videoUrl = postcard.video_url;
    if (!videoUrl) {
      setError('La postal no tiene un video asociado');
      return;
    }

    const nftUrl = getNFTUrl();

    // Registrar componente de control de video
    if (typeof window !== 'undefined' && (window as any).AFRAME) {
      const AFRAME = (window as any).AFRAME;
      
      if (!AFRAME.components['ar-video-control']) {
        AFRAME.registerComponent('ar-video-control', {
          init: function() {
            const marker = this.el;
            let video: HTMLVideoElement | null = null;
            
            const checkVideo = () => {
              video = document.querySelector('#ar-video') as HTMLVideoElement;
              if (video) {
                video.pause();
              } else {
                setTimeout(checkVideo, 100);
              }
            };
            checkVideo();
            
            // Monitorear tracking via visibilidad
            let isTracking = false;
            setInterval(() => {
              const nftMarker = document.querySelector('a-nft');
              if (nftMarker) {
                const obj = (nftMarker as any).object3D;
                if (obj && obj.visible && !isTracking) {
                  isTracking = true;
                  video?.play().catch(() => {});
                } else if (obj && !obj.visible && isTracking) {
                  isTracking = false;
                  video?.pause();
                }
              }
            }, 100);
          }
        });
      }
    }

    // Crear escena
    const sceneHTML = `
      <a-scene
        embedded
        vr-mode-ui="enabled: false"
        renderer="logarithmicDepthBuffer: true; antialias: true; colorManagement: true; alpha: true;"
        arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3; sourceWidth: 1280; sourceHeight: 720; displayWidth: 1280; displayHeight: 720;"
        style="height: 100vh; width: 100vw;"
      >
        <a-assets>
          <video
            id="ar-video"
            src="${videoUrl}"
            preload="auto"
            crossorigin="anonymous"
            playsinline
            webkit-playsinline
            muted
            loop
          ></video>
        </a-assets>

        <a-nft
          id="nft-marker"
          type="nft"
          url="${nftUrl}"
          smooth="true"
          smoothCount="30"
          smoothTolerance="0.0001"
          smoothThreshold="15"
          ar-video-control
        >
          <a-plane
            id="ar-video-plane"
            material="shader: flat; src: #ar-video; transparent: false; opacity: 1; side: double;"
            position="150 200 1"
            rotation="-90 0 0"
            width="225"
            height="300"
            scale="1 1 1"
          ></a-plane>
        </a-nft>

        <a-entity camera look-controls-enabled="false"></a-entity>
      </a-scene>
    `;

    sceneRef.current.innerHTML = sceneHTML;

    // Ajustar tamaño del plano basándose en la imagen
    setTimeout(() => {
      const videoEl = document.getElementById('ar-video') as HTMLVideoElement;
      
      if (videoEl) {
        videoEl.addEventListener('loadeddata', () => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const imgW = img.naturalWidth;
            const imgH = img.naturalHeight;
            const plane = document.getElementById('ar-video-plane');
            
            if (plane) {
              const aspectRatio = imgW / imgH;
              let planeW, planeH;
              
              if (aspectRatio < 1) {
                planeH = 1;
                planeW = aspectRatio;
              } else {
                planeW = 1;
                planeH = 1 / aspectRatio;
              }
              
              const baseScale = 150;
              planeW *= baseScale;
              planeH *= baseScale;
              
              plane.setAttribute('width', String(planeW));
              plane.setAttribute('height', String(planeH));
              plane.setAttribute('position', '0 0 0');
            }
          };
          img.src = postcard.image_url;
        });

        videoEl.pause();
      }
    }, 1000);

  }, [scriptsLoaded, postcard, getNFTUrl]);

  // Loading state
  if (loading || !scriptsLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid transparent',
            borderTop: '4px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>{loading ? 'Cargando...' : 'Cargando AR...'}</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error || !postcard) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Error</h1>
          <p style={{ marginBottom: '16px', color: '#ccc' }}>{error || 'Postal no encontrada'}</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '12px 24px',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // AR Scene
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'transparent' }}>
      <div ref={sceneRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
