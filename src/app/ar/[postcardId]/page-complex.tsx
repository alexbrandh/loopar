'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Camera, Download, Volume2, VolumeX, RotateCcw, ExternalLink, Shield, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { NFTDescriptors } from '@/lib/nft-generator'

// Type declarations for A-Frame elements
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    AFRAME: any;
    THREEx: any;
    eruda?: { init: () => void; destroy?: () => void };
  }
}

// Extend JSX to include A-Frame elements
/* eslint-disable @typescript-eslint/no-namespace */
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
/* eslint-enable @typescript-eslint/no-namespace */
/* eslint-enable @typescript-eslint/no-explicit-any */

interface PostcardData {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string;
  nft_descriptors: NFTDescriptors | { descriptorUrl?: string } | null;
}

interface ARViewerProps {
  postcard: PostcardData;
}

type CameraStatus = 'checking' | 'granted' | 'denied' | 'unavailable' | 'insecure_context';

interface AFrameSceneEl extends HTMLElement {
  renderer?: { dispose?: () => void; domElement?: HTMLCanvasElement | null };
  canvas?: HTMLCanvasElement | null;
}

function ARViewer({ postcard }: ARViewerProps) {
  const [isARReady, setIsARReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('checking');
  const [isMuted, setIsMuted] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingLost, setTrackingLost] = useState(false);
  const [isInIDE, setIsInIDE] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const initializedRef = useRef(false);
  const [cameraParamsUrl, setCameraParamsUrl] = useState<string>('/api/ar/camera-params');
  const [sourceDims, setSourceDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [debugMode, setDebugMode] = useState(false);

  // Función de logging igual al test simple
  const log = useCallback((message: string) => {
    console.log(message);
    setDebugLog(prev => [...prev.slice(-20), message]); // Mantener solo los últimos 20 logs
  }, []);

  // Función para actualizar estado igual al test simple
  const updateStatus = useCallback((status: string) => {
    console.log(`Status: ${status}`);
    setDebugLog(prev => [...prev.slice(-20), `Status: ${status}`]);
  }, []);

  const updateCameraStatus = useCallback((status: string) => {
    console.log(`Camera: ${status}`);
    setDebugLog(prev => [...prev.slice(-20), `Camera: ${status}`]);
  }, []);

  const updateTrackingStatus = useCallback((status: string) => {
    console.log(`Tracking: ${status}`);
    setDebugLog(prev => [...prev.slice(-20), `Tracking: ${status}`]);
    setIsTracking(status.includes('✅'));
    setTrackingLost(status.includes('❌'));
  }, []);

  useEffect(() => {
    log('🚀 Iniciando AR Viewer...');
  }, []); // Remover dependencia de log para evitar bucle infinito

  // Usar directamente el endpoint local sin verificaciones que puedan causar ERR_ABORTED
  useEffect(() => {
    // Usar el endpoint local directamente ya que sabemos que existe
    setCameraParamsUrl('/api/ar/camera-params');
  }, []);

  // Debug mode flag from query string (?debug=1|true)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const val = params.get('debug');
      setDebugMode(val === '1' || val === 'true');
      
      // Always enable debug mode for development
      if (process.env.NODE_ENV === 'development') {
        setDebugMode(true);
        log('🔧 Debug mode enabled for development');
      }
    } catch { /* noop */ }
  }, []); // Remover dependencia de log para evitar bucle infinito

  // Optional: on-device console when debug is enabled (eruda)
  useEffect(() => {
    if (!debugMode) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => {
      try { window.eruda?.init(); log('[AR][debug] eruda initialized'); } catch {}
    };
    document.body.appendChild(s);
    return () => {
      try { window.eruda?.destroy?.(); } catch {}
      if (s.parentNode) s.parentNode.removeChild(s);
    };
  }, [debugMode]); // Solo depender de debugMode, no de log

  // Verificar acceso a cámara igual al test simple
  const checkCamera = useCallback(async (): Promise<boolean> => {
    try {
      updateCameraStatus('Solicitando acceso...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      updateCameraStatus('✅ Acceso concedido');
      setCameraStatus('granted');
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateCameraStatus('❌ Error: ' + errorMessage);
      setCameraStatus('denied');
      return false;
    }
  }, [updateCameraStatus]);

  // Función para forzar posición del video igual al test simple
  const forceVideoPosition = useCallback(() => {
    const aPlane = document.querySelector('#video-plane');
    
    if (aPlane) {
      console.log('🔧 AJUSTANDO POSICIÓN - X = 300');
      setDebugLog(prev => [...prev.slice(-20), '🔧 AJUSTANDO POSICIÓN - X = 300']);
      
      // Método 1: Usar matrix transform directo en Three.js X = 300
      if ((aPlane as any).object3D) {
        // Resetear completamente la matriz de transformación
        (aPlane as any).object3D.matrix.identity();
        (aPlane as any).object3D.position.set(300, 0, 0.1); // X = 300
        (aPlane as any).object3D.rotation.set(-Math.PI/2, 0, 0);
        (aPlane as any).object3D.scale.set(2, 2, 2); // Escala reducida
        (aPlane as any).object3D.updateMatrix();
        (aPlane as any).object3D.matrixAutoUpdate = false; // Evitar que AR.js sobrescriba
        console.log('🔧 Matrix transform aplicado directamente - X = 300');
        setDebugLog(prev => [...prev.slice(-20), '🔧 Matrix transform aplicado directamente - X = 300']);
      }
      
      // Método 2: Configurar A-Frame X = 300 con tamaño reducido
      aPlane.setAttribute('position', '300 0 0.1');
      aPlane.setAttribute('width', '150'); // Reducido de 200 a 150
      aPlane.setAttribute('height', '267'); // Reducido de 356 a 267
      aPlane.setAttribute('scale', '2 2 2'); // Escala reducida
      aPlane.setAttribute('rotation', '-90 0 0');
      aPlane.setAttribute('visible', 'true');
      
      // Método 3: Forzar posición cada frame X = 300
      const forcePositionLoop = () => {
        if (aPlane && (aPlane as any).object3D) {
          (aPlane as any).object3D.position.x = 300; // X = 300
          (aPlane as any).object3D.position.y = 0;
          (aPlane as any).object3D.position.z = 0.1;
          (aPlane as any).object3D.updateMatrix();
        }
        requestAnimationFrame(forcePositionLoop);
      };
      forcePositionLoop();
      
      console.log('✅ Video ajustado a posición - X = 300');
      console.log('🔄 Posición se fuerza cada frame para mantener (300,0,0.1)');
      setDebugLog(prev => [...prev.slice(-20), '✅ Video ajustado a posición - X = 300', '🔄 Posición se fuerza cada frame para mantener (300,0,0.1)']);
      
      return true;
    }
    return false;
  }, []); // Remover dependencia de log

  // Función para arreglar el video de la cámara igual al test simple
  const fixCameraVideo = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 20;
    
    function tryFix() {
      attempts++;
      
      // Find the AR.js injected video element
      const arVideo = document.getElementById('arjs-video');
      if (arVideo) {
        console.log('🎥 Found AR video element, applying fixes');
        setDebugLog(prev => [...prev.slice(-20), '🎥 Found AR video element, applying fixes']);
        
        // Ensure video properties
        arVideo.setAttribute('playsinline', 'true');
        arVideo.setAttribute('webkit-playsinline', 'true');
        arVideo.setAttribute('muted', 'true');
        arVideo.setAttribute('autoplay', 'true');
        (arVideo as HTMLVideoElement).playsInline = true;
        (arVideo as HTMLVideoElement).muted = true;
        (arVideo as HTMLVideoElement).autoplay = true;
        
        // Force video styles to be visible
        arVideo.style.setProperty('position', 'fixed', 'important');
        arVideo.style.setProperty('top', '0', 'important');
        arVideo.style.setProperty('left', '0', 'important');
        arVideo.style.setProperty('width', '100vw', 'important');
        arVideo.style.setProperty('height', '100vh', 'important');
        arVideo.style.setProperty('object-fit', 'cover', 'important');
        arVideo.style.setProperty('z-index', '-1', 'important');
        arVideo.style.setProperty('display', 'block', 'important');
        arVideo.style.setProperty('visibility', 'visible', 'important');
        arVideo.style.setProperty('opacity', '1', 'important');
        arVideo.style.setProperty('background', 'black', 'important');
        arVideo.style.setProperty('margin', '0', 'important');
        arVideo.style.setProperty('padding', '0', 'important');
        arVideo.style.setProperty('border', 'none', 'important');
        arVideo.style.setProperty('outline', 'none', 'important');
        
        // Try to play the video
        (arVideo as HTMLVideoElement).play().catch(() => {
          console.log('⚠️ Video autoplay failed, waiting for user interaction');
          setDebugLog(prev => [...prev.slice(-20), '⚠️ Video autoplay failed, waiting for user interaction']);
        });
        
        return;
      }
      
      // Find the canvas and ensure it's transparent
      const canvas = document.querySelector('canvas.a-canvas');
      if (canvas) {
        console.log('🎨 Found A-Frame canvas, making it transparent');
        setDebugLog(prev => [...prev.slice(-20), '🎨 Found A-Frame canvas, making it transparent']);
        (canvas as HTMLElement).style.setProperty('background', 'transparent', 'important');
        (canvas as HTMLElement).style.setProperty('background-color', 'transparent', 'important');
        (canvas as HTMLElement).style.setProperty('background-image', 'none', 'important');
        (canvas as HTMLElement).style.setProperty('z-index', '1', 'important');
        (canvas as HTMLElement).style.setProperty('position', 'fixed', 'important');
        (canvas as HTMLElement).style.setProperty('top', '0', 'important');
        (canvas as HTMLElement).style.setProperty('left', '0', 'important');
        (canvas as HTMLElement).style.setProperty('width', '100vw', 'important');
        (canvas as HTMLElement).style.setProperty('height', '100vh', 'important');
        (canvas as HTMLElement).style.setProperty('margin', '0', 'important');
        (canvas as HTMLElement).style.setProperty('padding', '0', 'important');
        (canvas as HTMLElement).style.setProperty('border', 'none', 'important');
        (canvas as HTMLElement).style.setProperty('pointer-events', 'auto', 'important');
      }
      
      // Also try to find any other canvas elements
      const allCanvases = document.querySelectorAll('canvas');
      allCanvases.forEach((canvasEl, index) => {
        console.log(`🎨 Found canvas ${index + 1}, making it transparent`);
        setDebugLog(prev => [...prev.slice(-20), `🎨 Found canvas ${index + 1}, making it transparent`]);
        (canvasEl as HTMLElement).style.setProperty('background', 'transparent', 'important');
        (canvasEl as HTMLElement).style.setProperty('background-color', 'transparent', 'important');
        (canvasEl as HTMLElement).style.setProperty('background-image', 'none', 'important');
      });
      
      // Remove any A-Frame UI elements that might be white
      const aframeUI = document.querySelectorAll('.a-enter-vr, .a-orientation-modal, .a-dialog');
      aframeUI.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
      
      // Ensure the scene itself has no white background
      const scene = document.querySelector('a-scene');
      if (scene) {
        (scene as HTMLElement).style.setProperty('background', 'transparent', 'important');
        (scene as HTMLElement).style.setProperty('background-color', 'transparent', 'important');
        (scene as HTMLElement).style.setProperty('position', 'fixed', 'important');
        (scene as HTMLElement).style.setProperty('top', '0', 'important');
        (scene as HTMLElement).style.setProperty('left', '0', 'important');
        (scene as HTMLElement).style.setProperty('width', '100vw', 'important');
        (scene as HTMLElement).style.setProperty('height', '100vh', 'important');
        (scene as HTMLElement).style.setProperty('margin', '0', 'important');
        (scene as HTMLElement).style.setProperty('padding', '0', 'important');
        
        // Remove any background attribute that might be causing white screen
        scene.removeAttribute('background');
        
        // Force renderer to not clear with white
        const renderer = (scene as any).renderer;
        if (renderer && renderer.domElement) {
          renderer.domElement.style.background = 'transparent';
          renderer.setClearColor(0x000000, 0); // Transparent black
        }
      }
      
      // Force WebGL context to be transparent
      setTimeout(() => {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          // Remove any problematic WebGL manipulation
          (canvas as HTMLElement).style.setProperty('background', 'transparent', 'important');
          (canvas as HTMLElement).style.setProperty('background-color', 'transparent', 'important');
          (canvas as HTMLElement).style.setProperty('z-index', '1', 'important');
          
          // Ensure canvas doesn't block camera
          (canvas as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
          (canvas as HTMLElement).style.setProperty('mix-blend-mode', 'multiply', 'important');
        });
        
        // Force AR.js video to be visible
        const arVideo = document.getElementById('arjs-video');
        if (arVideo) {
          console.log('🎥 Forcing AR video visibility');
          setDebugLog(prev => [...prev.slice(-20), '🎥 Forcing AR video visibility']);
          arVideo.style.setProperty('z-index', '-1', 'important');
          arVideo.style.setProperty('display', 'block', 'important');
          arVideo.style.setProperty('visibility', 'visible', 'important');
          arVideo.style.setProperty('opacity', '1', 'important');
        }
      }, 2000);
      
      if (attempts < maxAttempts) {
        setTimeout(tryFix, 500);
      } else {
        console.log('⚠️ Could not find AR video element after ' + maxAttempts + ' attempts');
        setDebugLog(prev => [...prev.slice(-20), '⚠️ Could not find AR video element after ' + maxAttempts + ' attempts']);
      }
    }
    
    tryFix();
  }, []); // Remover dependencia de log

  // Inicialización igual al test simple
  useEffect(() => {
    const initializeAR = async () => {
      updateStatus('Verificando cámara...');
      const cameraOk = await checkCamera();
      
      if (cameraOk) {
        updateStatus('✅ Listo para AR');
        log('✅ Sistema listo. Apunta la cámara a la imagen target');
        
        // Fix camera video after AR.js initializes
        setTimeout(() => {
          fixCameraVideo();
        }, 2000);
        
        setIsARReady(true);
      } else {
        updateStatus('❌ Error de cámara');
        setError('No se pudo acceder a la cámara');
      }
    };

    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeAR();
    }
  }, [checkCamera, fixCameraVideo, updateStatus]); // Remover log de dependencias

  // Registrar componente videohandler igual al test simple
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AFRAME && !initializedRef.current) {
      // Registrar componente videohandler según documentación AR.js
      window.AFRAME.registerComponent('videohandler', {
        init: function () {
          const marker = this.el;
          this.vid = document.querySelector("#vid");
          
          log('🎬 VideoHandler: Componente inicializado');
          
          marker.addEventListener('markerFound', () => {
            log('🎯 VideoHandler: Marcador encontrado - reproduciendo video');
            updateTrackingStatus('✅ Marcador detectado');
            if (this.vid) {
              this.vid.muted = true;
              this.vid.playsInline = true;
              this.vid.play().then(() => {
                log('✅ VideoHandler: Video reproduciéndose');
                
                // Ajustar tamaño del plano al marcador
                const aPlane = document.querySelector('#video-plane');
                
                if (aPlane) {
                  log('📏 AJUSTANDO video a posición - X = 300');
                  
                  // Configurar propiedades A-Frame X = 300 con tamaño reducido
                  aPlane.setAttribute('width', '150'); // Reducido de 200 a 150
                  aPlane.setAttribute('height', '267'); // Reducido de 356 a 267
                  aPlane.setAttribute('position', '300 0 0.1'); // X = 300
                  aPlane.setAttribute('scale', '2 2 2'); // Escala reducida
                  aPlane.setAttribute('rotation', '-90 0 0');
                  aPlane.setAttribute('visible', 'true');
                  
                  // FORZAR matrix transform directo en Three.js X = 300
                  if ((aPlane as any).object3D) {
                    // Resetear matriz y aplicar transformaciones directas
                    (aPlane as any).object3D.matrix.identity();
                    (aPlane as any).object3D.position.set(300, 0, 0.1); // X = 300
                    (aPlane as any).object3D.rotation.set(-Math.PI/2, 0, 0);
                    (aPlane as any).object3D.scale.set(2, 2, 2); // Escala reducida
                    (aPlane as any).object3D.updateMatrix();
                    (aPlane as any).object3D.matrixAutoUpdate = false;
                    
                    log('🔧 Matrix transform directo aplicado en videohandler - X = 300');
                    
                    // Loop continuo para mantener posición X = 300
                    const maintainPosition = () => {
                      if (aPlane && (aPlane as any).object3D) {
                        (aPlane as any).object3D.position.set(300, 0, 0.1); // X = 300
                        (aPlane as any).object3D.updateMatrix();
                      }
                      requestAnimationFrame(maintainPosition);
                    };
                    maintainPosition();
                  }
                  
                  log('✅ Video ajustado en videohandler - X = 300');
                }
                
              }).catch((e: Error) => {
                log('❌ VideoHandler: Error reproduciendo - ' + e.message);
              });
            }
          });
          
          marker.addEventListener('markerLost', () => {
            log('❌ VideoHandler: Marcador perdido - pausando video');
            updateTrackingStatus('❌ Marcador perdido');
            if (this.vid) {
              this.vid.pause();
              this.vid.currentTime = 0;
            }
          });
        }
      });
    }
  }, [updateTrackingStatus]); // Remover log de dependencias

  // Forzar posición cada segundo hasta que funcione igual al test simple
  useEffect(() => {
    let positionForced = false;
    const forceInterval = setInterval(() => {
      if (!positionForced) {
        if (forceVideoPosition()) {
          positionForced = true;
          log('✅ Posición del video forzada exitosamente');
          clearInterval(forceInterval);
        }
      }
    }, 1000);

    return () => clearInterval(forceInterval);
  }, [forceVideoPosition]); // Remover log de dependencias

  // Eventos globales igual al test simple
  useEffect(() => {
    // Eventos de AR globales como fallback
    const handleMarkerFound = () => {
      updateTrackingStatus('✅ Marcador detectado');
      log('🎯 Marcador NFT encontrado!');
    };
    
    const handleMarkerLost = () => {
      updateTrackingStatus('❌ Marcador perdido');
      log('❌ Marcador NFT perdido');
    };

    document.addEventListener('markerFound', handleMarkerFound);
    document.addEventListener('markerLost', handleMarkerLost);

    return () => {
      document.removeEventListener('markerFound', handleMarkerFound);
      document.removeEventListener('markerLost', handleMarkerLost);
    };
  }, [updateTrackingStatus]); // Remover log de dependencias

  // Eventos de A-Frame igual al test simple
  useEffect(() => {
    const handleSceneLoaded = () => {
      updateStatus('✅ A-Frame cargado');
      log('✅ Escena A-Frame cargada');
      
      // También forzar cuando la escena esté cargada
      setTimeout(() => {
        forceVideoPosition();
      }, 2000);
    };

    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('loaded', handleSceneLoaded);
      return () => scene.removeEventListener('loaded', handleSceneLoaded);
    }
  }, [updateStatus, forceVideoPosition]); // Remover log de dependencias

  // Log de errores globales igual al test simple
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      log('❌ Error global: ' + e.message);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []); // Remover log de dependencias

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error en AR</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos CSS iguales al test simple */}
      <style jsx>{`
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          overflow: hidden;
          background: black;
        }
        
        /* Force A-Frame scene to fill entire viewport */
        a-scene {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          background: transparent !important;
        }
        
        /* Ensure AR video fills the screen */
        #arjs-video {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          object-fit: cover !important;
          z-index: -1 !important;
          background: black !important;
        }
        
        /* Make canvas transparent and on top */
        canvas.a-canvas {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: transparent !important;
          background-color: transparent !important;
          z-index: 1 !important;
          pointer-events: auto !important;
        }
        
        /* Force canvas transparency with multiple selectors */
        canvas, canvas.a-canvas, .a-canvas {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          pointer-events: none !important;
          mix-blend-mode: multiply !important;
        }
        
        /* Override any A-Frame default styles */
        a-scene canvas {
          background: transparent !important;
          background-color: transparent !important;
          pointer-events: none !important;
        }
        
        /* Ensure AR video is always visible */
        #arjs-video {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          object-fit: cover !important;
          z-index: -1 !important;
          background: black !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          outline: none !important;
        }
        
        /* Hide any white backgrounds */
        .a-enter-vr, .a-orientation-modal {
          display: none !important;
        }
      `}</style>

      {/* Info panel igual al test simple */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '12px',
        maxWidth: '300px'
      }}>
        <strong>AR Viewer - {postcard.title}</strong><br />
        Estado: <span>{isARReady ? '✅ Listo para AR' : 'Inicializando...'}</span><br />
        Cámara: <span>{cameraStatus === 'granted' ? '✅ Acceso concedido' : 'Verificando...'}</span><br />
        Tracking: <span>{isTracking ? '✅ Marcador detectado' : '❌ No detectado'}</span>
      </div>

      {/* Debug panel igual al test simple */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '10px',
        maxWidth: '300px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        <strong>Debug Log:</strong><br />
        {debugLog.map((logEntry, index) => (
          <div key={index}>{logEntry}</div>
        ))}
      </div>

      {/* A-Frame scene igual al test simple */}
      <a-scene
        vr-mode-ui="enabled: false"
        renderer="logarithmicDepthBuffer: true; antialias: true; colorManagement: true; alpha: true; preserveDrawingBuffer: true;"
        arjs="trackingMethod: best; sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3; maxDetectionRate: 20; smooth: true; smoothCount: 3; smoothTolerance: 0.02; smoothThreshold: 3; displayWidth: 640; displayHeight: 480;"
        embedded
        style={{ height: '100vh', width: '100vw' }}
        ref={sceneRef}
      >
        <a-assets timeout="30000">
          <video
            id="vid"
            ref={videoRef}
            src={postcard.video_url}
            preload="metadata"
            loop
            autoPlay
            muted
            playsInline
            controls={false}
            webkit-playsinline="true"
            width="320"
            height="240"
            crossOrigin="anonymous"
            onLoadStart={() => log('🎬 Video: Iniciando carga')}
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (video) {
                log('📊 Video: Metadatos cargados - ' + video.duration.toFixed(2) + 's');
                // Intentar reproducir tan pronto como tengamos metadatos
                video.muted = true;
                video.playsInline = true;
                video.play().catch(() => log('⚠️ Autoplay temprano bloqueado'));
              }
            }}
            onLoadedData={() => log('✅ Video: Datos cargados')}
            onCanPlay={() => {
              log('▶️ Video: Listo para reproducir');
              const video = videoRef.current;
              if (video) {
                video.muted = true;
                video.playsInline = true;
                video.play().catch(() => log('⚠️ Autoplay bloqueado, esperando interacción'));
              }
            }}
            onCanPlayThrough={() => {
              log('🚀 Video: Completamente cargado');
              const video = videoRef.current;
              if (video) {
                video.muted = true;
                video.playsInline = true;
                video.play().catch(() => log('⚠️ Autoplay final bloqueado'));
              }
            }}
            onPlay={() => log('▶️ Video: Reproduciendo')}
            onPause={() => log('⏸️ Video: Pausado')}
            onEnded={() => log('🔄 Video: Terminado, reiniciando loop')}
            onError={(e) => {
              const video = e.target as HTMLVideoElement;
              const error = video.error;
              if (error) {
                log('❌ Video error code: ' + error.code);
                log('❌ Video error message: ' + error.message);
                switch(error.code) {
                  case 1:
                    log('❌ MEDIA_ERR_ABORTED: Reproducción abortada');
                    break;
                  case 2:
                    log('❌ MEDIA_ERR_NETWORK: Error de red');
                    break;
                  case 3:
                    log('❌ MEDIA_ERR_DECODE: Error de decodificación');
                    break;
                  case 4:
                    log('❌ MEDIA_ERR_SRC_NOT_SUPPORTED: Formato no soportado');
                    break;
                }
              }
              log('❌ Video src: ' + video.src);
              log('❌ Video readyState: ' + video.readyState);
              log('❌ Video networkState: ' + video.networkState);
            }}
          />
        </a-assets>

        {/* Usar descriptores NFT reales de la postal de Supabase */}
        <a-nft
          type="nft"
          url={(() => {
            const descriptors = postcard.nft_descriptors;
            
            // Verificar si tenemos descriptores NFT válidos
            if (descriptors && typeof descriptors === 'object' && 'files' in descriptors && descriptors.files) {
              // Construir URL del proxy endpoint para AR.js
              if (descriptors.files.fset) {
                // Extraer userId y postcardId de la URL fset
                const fsetUrl = new URL(descriptors.files.fset);
                const pathMatch = fsetUrl.pathname.match(/postcards\/([^/]+)\/([^/]+)\/nft\/descriptors\.fset/);
                
                if (pathMatch) {
                  const [, userId, postcardId] = pathMatch;
                  const proxyUrl = `/api/ar/nft/${userId}/${postcardId}/descriptors`;
                  log('🎯 Usando proxy NFT para AR.js: ' + proxyUrl);
                  return proxyUrl;
                }
              }
              
              // Fallback: usar descriptorUrl si está disponible (formato base sin extensión)
              if (descriptors.descriptorUrl) {
                const baseUrl = descriptors.descriptorUrl.replace(/\.(fset|iset|fset3).*$/, '');
                log('🎯 Usando descriptores NFT directos: ' + baseUrl);
                return baseUrl;
              }
            }
            
            // Fallback final: usar descriptores de prueba de AR.js
            log('⚠️ No se encontraron descriptores NFT válidos, usando pinball de prueba');
            return 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball';
          })()}
          smooth="true"
          smoothCount="5"
          smoothTolerance="0.01"
          smoothThreshold="2"
          emitevents="true"
          id="nft-marker"
          videohandler
        >
          {/* NUEVA ESTRATEGIA: Usar transform matrix directo igual al test simple */}
          <a-plane
            src="#vid"
            position="300 0 0.1"
            rotation="-90 0 0"
            width="150"
            height="267"
            material="shader: flat; transparent: false; side: double;"
            visible="true"
            id="video-plane"
            animation="property: object3D.position.x; to: 300; dur: 1; easing: linear; loop: false"
          />
        </a-nft>

        <a-entity camera look-controls-enabled="false" />
      </a-scene>
    </>
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
        setPostcard(data.data); // Usar data.data en lugar de data directamente
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

  // Cargar scripts de A-Frame y AR.js igual al test simple
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

  return <ARViewer postcard={postcard} />;
}