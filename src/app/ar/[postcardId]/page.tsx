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

// Tipo auxiliar para acceder a props internas de A-Frame sin usar any
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const initializedRef = useRef(false);
  const [cameraParamsUrl, setCameraParamsUrl] = useState<string>('/api/ar/camera-params');
  const [sourceDims, setSourceDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [debugMode, setDebugMode] = useState(false);
  useEffect(() => {
    console.log('[AR] Using cameraParametersUrl:', cameraParamsUrl);
  }, [cameraParamsUrl]);
  // Verificar endpoint local y hacer fallback a CDN si GET no responde 200 (evitar HEAD falso positivo)
  useEffect(() => {
    let cancelled = false;
    const ensureCameraParams = async () => {
      try {
        const res = await fetch('/api/ar/camera-params', { method: 'GET', cache: 'no-store', redirect: 'manual' as RequestRedirect });
        // Queremos estricto 200; si es 302 u otro, forzamos fallback a CDN
        if (res.status !== 200) throw new Error(String(res.status));
        if (!cancelled) setCameraParamsUrl('/api/ar/camera-params');
      } catch {
        // Prefer GH Pages (widely used in AR.js examples), then raw GH, then jsDelivr
        const ghPages = 'https://jeromeetienne.github.io/AR.js/data/data/camera_para.dat';
        const ghRaw = 'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/camera_para.dat';
        const cdn = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@master/data/data/camera_para.dat';
        try {
          const r = await fetch(ghPages, { method: 'HEAD', cache: 'no-store' });
          if (r.ok && !cancelled) { setCameraParamsUrl(ghPages); return; }
        } catch {/* ignore */}
        try {
          const r2 = await fetch(ghRaw, { method: 'HEAD', cache: 'no-store' });
          if (r2.ok && !cancelled) { setCameraParamsUrl(ghRaw); return; }
        } catch {/* ignore */}
        if (!cancelled) setCameraParamsUrl(cdn);
      }
    };
    ensureCameraParams();
    return () => { cancelled = true; };
  }, []);

  // Debug mode flag from query string (?debug=1|true)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const val = params.get('debug');
      setDebugMode(val === '1' || val === 'true');
    } catch { /* noop */ }
  }, []);

  // Optional: on-device console when debug is enabled (eruda)
  useEffect(() => {
    if (!debugMode) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/eruda';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = () => {
      try { window.eruda?.init(); console.log('[AR][debug] eruda initialized'); } catch {}
    };
    document.body.appendChild(s);
    return () => {
      try { window.eruda?.destroy?.(); } catch {}
      if (s.parentNode) s.parentNode.removeChild(s);
    };
  }, [debugMode]);

  // Refuerzo de reproducción de video: intentar play() al estar listo y ante primer gesto de usuario
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      try {
        const p = v.play();
        if (p && typeof (p as Promise<void>).catch === 'function') {
          (p as Promise<void>).catch(() => { /* ignorar restricciones de autoplay */ });
        }
      } catch { /* noop */ }
    };

    const onCanPlay = () => tryPlay();
    const onLoadedData = () => {
      if (v.readyState >= 2) tryPlay();
    };
    const onUserInteract = () => {
      tryPlay();
      document.removeEventListener('touchstart', onUserInteract as EventListener);
      document.removeEventListener('click', onUserInteract as EventListener);
    };

    v.addEventListener('canplay', onCanPlay as EventListener);
    v.addEventListener('loadeddata', onLoadedData as EventListener);
    document.addEventListener('touchstart', onUserInteract as EventListener, { once: true } as AddEventListenerOptions);
    document.addEventListener('click', onUserInteract as EventListener, { once: true } as AddEventListenerOptions);

    return () => {
      v.removeEventListener('canplay', onCanPlay as EventListener);
      v.removeEventListener('loadeddata', onLoadedData as EventListener);
      document.removeEventListener('touchstart', onUserInteract as EventListener);
      document.removeEventListener('click', onUserInteract as EventListener);
    };
  }, [isARReady]);

  useEffect(() => {
    // Detect if running in IDE browser preview
    const detectIDEContext = () => {
      const hostname = window.location.hostname;
      const userAgent = navigator.userAgent;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const hasIDEIndicators = userAgent.includes('Chrome') && window.location.port === '3000';
      
      setIsInIDE(isLocalhost && hasIDEIndicators);
    };

    // Detect mobile device
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test((userAgent || '').toLowerCase()) ||
                            (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform)) ||
                            window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    // Enhanced camera permission and availability check
    const checkCameraAvailability = async () => {
      try {
        // Check if we're in a secure context (HTTPS or localhost)
        if (!window.isSecureContext && window.location.protocol !== 'http:') {
          setCameraStatus('insecure_context');
          setError('La cámara requiere HTTPS o localhost para funcionar');
          return;
        }

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraStatus('unavailable');
          setError('La API de cámara no está disponible en este navegador');
          return;
        }

        // Try to enumerate devices first
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        
        if (!hasCamera) {
          setCameraStatus('unavailable');
          setError('No se detectaron cámaras disponibles');
          return;
        }

        // Request camera permission with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 10000);
        });

        const streamPromise = navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });

        const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
        
        // Test if stream is actually working
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState !== 'live') {
          throw new Error('Camera stream not active');
        }

        setCameraStatus('granted');
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error) {
        console.error('Camera check error:', error);
        
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setCameraStatus('denied');
            setError('Acceso a la cámara denegado. Por favor, permite el acceso a la cámara.');
          } else if (error.name === 'NotFoundError') {
            setCameraStatus('unavailable');
            setError('No se encontró ninguna cámara disponible.');
          } else if (error.name === 'NotSupportedError') {
            setCameraStatus('unavailable');
            setError('La cámara no es compatible con este navegador.');
          } else if (error.message === 'Timeout') {
            setCameraStatus('unavailable');
            setError('Timeout al acceder a la cámara. Puede que no esté disponible en el preview del IDE.');
          } else {
            setCameraStatus('unavailable');
            setError('Error al acceder a la cámara. Intenta abrir en un navegador externo.');
          }
        } else {
          setCameraStatus('unavailable');
          setError('Error desconocido al acceder a la cámara.');
        }
      }
    };

    detectIDEContext();
    detectMobile();
    checkCameraAvailability();
    
    // Re-check mobile on window resize
    const handleResize = () => {
      detectMobile();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mantener dimensiones de la ventana para pasarlas a AR.js (reduce letterboxing)
  useEffect(() => {
    const update = () => {
      setSourceDims({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Helper functions
  const loadScripts = async () => {
    // Load A-Frame with timeout and error handling
    if (!window.AFRAME) {
      await new Promise((resolve, reject) => {
        const aframeScript = document.createElement('script');
        // Usar A-Frame 1.2.0 (WebGL1) para evitar conflictos de contexto con AR.js
        aframeScript.src = 'https://aframe.io/releases/1.2.0/aframe.min.js';
        aframeScript.async = true;
        aframeScript.crossOrigin = 'anonymous';
        
        const timeout = setTimeout(() => {
          reject(new Error('A-Frame loading timeout'));
        }, 10000);
        
        aframeScript.onload = () => {
          clearTimeout(timeout);
          resolve(void 0);
        };
        
        aframeScript.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load A-Frame'));
        };
        
        document.head.appendChild(aframeScript);
      });
    }

    // Load AR.js with timeout and error handling
    if (!window.THREEx) {
      await new Promise((resolve, reject) => {
        const arScript = document.createElement('script');
        arScript.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar-nft.js';
        arScript.async = true;
        arScript.crossOrigin = 'anonymous';
        
        const timeout = setTimeout(() => {
          reject(new Error('AR.js loading timeout'));
        }, 10000);
        
        arScript.onload = () => {
          clearTimeout(timeout);
          resolve(void 0);
        };
        
        arScript.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load AR.js'));
        };
        
        document.head.appendChild(arScript);
      });
    }

    // Wait for A-Frame to be fully initialized
    await new Promise((resolve) => {
      if (window.AFRAME && window.AFRAME.registerComponent) {
        resolve(void 0);
      } else {
        const checkInterval = setInterval(() => {
           if (window.AFRAME && window.AFRAME.registerComponent) {
             clearInterval(checkInterval);
             resolve(void 0);
           }
         }, 100) as NodeJS.Timeout;
      }
    });
  };



  // Eventos de tracking con cleanup adecuado
  useEffect(() => {
    const onMarkerFound = () => {
      console.log('🎯 [AR] Marker found');
      setIsTracking(true);
      setTrackingLost(false);
      toast.success('¡Postal detectada!');
      // Intentar reproducir el video al detectar el marcador
      try {
        const v = videoRef.current;
        if (v) {
          const p = v.play();
          if (p && typeof p.then === 'function') {
            p.catch(() => {/* ignorar restricciones autoplay */});
          }
        }
      } catch {/* noop */}
    };

    const onMarkerLost = () => {
      console.log('❌ [AR] Marker lost');
      setIsTracking(false);
      setTrackingLost(true);
    };

    const onArError = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.error('❌ [AR] AR Error:', customEvent.detail);
      setError('Error en el sistema AR');
    };

    document.addEventListener('markerFound', onMarkerFound);
    document.addEventListener('markerLost', onMarkerLost);
    document.addEventListener('arError', onArError);

    return () => {
      document.removeEventListener('markerFound', onMarkerFound);
      document.removeEventListener('markerLost', onMarkerLost);
      document.removeEventListener('arError', onArError);
    };
  }, []);

  const initializeAR = useCallback(async () => {
    console.log('🎯 [AR INIT] Starting AR initialization');
    
    const validateNFTDescriptors = async (nftDescriptors: NFTDescriptors | { descriptorUrl?: string }) => {
      console.log('=== DEBUG: Validating NFT Descriptors ===');
      console.log('Postcard data:', JSON.stringify(postcard, null, 2));
      console.log('NFT descriptors:', JSON.stringify(nftDescriptors, null, 2));
      
      // Handle both old format (just descriptorUrl) and new format (full NFTDescriptors)
       if (typeof nftDescriptors === 'object' && nftDescriptors !== null) {
         // Check if it's the new format with files
         if ('files' in nftDescriptors && nftDescriptors.files) {
           const { files } = nftDescriptors as NFTDescriptors;
           if (!files?.iset || !files?.fset || !files?.fset3) {
             throw new Error('Incomplete NFT descriptors. Missing required tracking files.');
           }
           
           // Test if the descriptor files are accessible
           try {
             const testPromises = [files.iset, files.fset, files.fset3].map(async (url: string) => {
               const response = await fetch(url, { method: 'HEAD' });
               if (!response.ok) {
                 throw new Error(`Descriptor file not accessible: ${response.status}`);
               }
             });
             
             await Promise.all(testPromises);
             console.log('All NFT descriptor files are accessible');
           } catch (error) {
             console.warn('Some NFT descriptor files may not be accessible:', error);
             // Continue anyway - the AR experience might still work
           }
         } else if ('descriptorUrl' in nftDescriptors && nftDescriptors.descriptorUrl) {
           // Old format - just check if descriptorUrl exists
           console.log('Using legacy NFT descriptor format with descriptorUrl:', nftDescriptors.descriptorUrl);
         } else {
           throw new Error('Invalid NFT descriptors format. Missing files or descriptorUrl.');
         }
       } else {
         throw new Error('NFT descriptors must be an object.');
       }
    };
    
    try {
      // Load A-Frame and AR.js scripts
      await loadScripts();
      
      // Validate NFT descriptors
      if (!postcard.nft_descriptors) {
        throw new Error('No hay descriptores NFT disponibles para esta postal');
      }
      
      await validateNFTDescriptors(postcard.nft_descriptors);
      
      // Eliminar residuos de montajes anteriores (canvases y video AR.js)
      try {
        document.querySelectorAll('canvas.a-canvas').forEach((c) => c.parentNode?.removeChild(c));
        const oldArVideo = document.getElementById('arjs-video') as HTMLVideoElement | null;
        if (oldArVideo) {
          try { oldArVideo.pause(); } catch {}
          const s = oldArVideo.srcObject as MediaStream | null;
          if (s) s.getTracks().forEach(t => t.stop());
          oldArVideo.srcObject = null;
          oldArVideo.removeAttribute('src');
          try { oldArVideo.load(); } catch {}
          oldArVideo.parentNode?.removeChild(oldArVideo);
        }
      } catch {}

      // Listeners de tracking se instalan via useEffect superior

      setIsARReady(true);
      console.log('✅ [AR INIT] AR initialization completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ [AR INIT] AR initialization failed:', errorMessage);
      setError(`Error al inicializar AR: ${errorMessage}`);
    }
  }, [postcard]);

  // Load AR scripts when camera is ready
  useEffect(() => {
    if (cameraStatus !== 'granted') return;
    if (initializedRef.current) return; // evitar doble init (StrictMode / remounts)
    initializedRef.current = true;
    initializeAR();
  }, [cameraStatus, initializeAR]);

  // Forzar estilos del video/canvas inyectados por AR.js/A-Frame para evitar letterboxing
  useEffect(() => {
    if (!isARReady) return;
    let tries = 0;
    const applyVideoStyles = () => {
      const v = document.getElementById('arjs-video') as HTMLVideoElement | null;
      if (v) {
        v.setAttribute('playsinline', 'true');
        v.setAttribute('webkit-playsinline', 'true');
        v.setAttribute('muted', 'true');
        v.setAttribute('autoplay', 'true');
        try { v.playsInline = true; } catch {}
        v.muted = true;
        v.autoplay = true;
        v.style.setProperty('position', 'fixed', 'important');
        v.style.setProperty('inset', '0', 'important');
        v.style.setProperty('width', '100vw', 'important');
        v.style.setProperty('height', '100dvh', 'important');
        v.style.setProperty('object-fit', 'cover', 'important');
        v.style.setProperty('object-position', 'center center', 'important');
        v.style.setProperty('background', 'black', 'important');
        v.style.setProperty('max-width', 'none', 'important');
        v.style.setProperty('max-height', 'none', 'important');
        v.style.setProperty('transform', 'none', 'important');
        v.style.setProperty('z-index', '0', 'important');
        return true;
      }
      return false;
    };

    const applyCanvasStyles = () => {
      const c = document.querySelector('canvas.a-canvas') as HTMLCanvasElement | null;
      if (c) {
        c.style.setProperty('position', 'fixed', 'important');
        c.style.setProperty('inset', '0', 'important');
        c.style.setProperty('width', '100vw', 'important');
        c.style.setProperty('height', '100dvh', 'important');
        c.style.setProperty('background', 'transparent', 'important');
        c.style.setProperty('transform', 'none', 'important');
        c.style.setProperty('z-index', '1', 'important');
        return true;
      }
      return false;
    };

    const id = setInterval(() => {
      const okV = applyVideoStyles();
      const okC = applyCanvasStyles();
      tries++;
      if ((okV && okC) || tries > 30) {
        clearInterval(id);
      }
    }, 200);

    return () => clearInterval(id);
  }, [isARReady]);

  // Debug: Periodically log AR.js video element/stream status on iOS
  useEffect(() => {
    if (!debugMode || !isARReady) return;
    const id = setInterval(() => {
      const v = document.getElementById('arjs-video') as HTMLVideoElement | null;
      if (!v) {
        console.warn('[AR][debug] arjs-video not found yet');
        return;
      }
      const stream = v.srcObject as MediaStream | null;
      console.log('[AR][debug] arjs-video', {
        readyState: v.readyState,
        autoplay: v.autoplay,
        muted: v.muted,
        hasStream: !!stream,
        track: stream?.getVideoTracks()?.[0]?.readyState
      });
    }, 2000);
    return () => clearInterval(id);
  }, [debugMode, isARReady]);

  // Nota: mantenemos por defecto el URL externo estable. Si se desea forzar el endpoint local,
  // se puede hacer mediante un flag o query param en el futuro.

  // Cleanup robusto para evitar fugas de WebGL y cámara al desmontar
  useEffect(() => {
    const sceneEl = sceneRef.current as AFrameSceneEl | null;
    const videoEl = videoRef.current as (HTMLVideoElement | null);
    return () => {
      try {
        // Pausar y limpiar el video de la app
        if (videoEl) {
          try { videoEl.pause(); } catch {}
          // Desvincular posibles MediaStream
          const currentSrcObj = (videoEl as HTMLVideoElement & { srcObject: MediaStream | null }).srcObject;
          if (currentSrcObj) {
            currentSrcObj.getTracks().forEach(t => t.stop());
          }
          (videoEl as HTMLVideoElement & { srcObject: MediaStream | null }).srcObject = null;
          videoEl.removeAttribute('src');
          try { videoEl.load(); } catch {}
        }

        // Detener la cámara de AR.js (video inyectado #arjs-video)
        const arVideo = document.getElementById('arjs-video') as HTMLVideoElement | null;
        if (arVideo) {
          try { arVideo.pause(); } catch {}
          const stream = arVideo.srcObject as MediaStream | null;
          if (stream) {
            stream.getTracks().forEach(t => t.stop());
          }
          arVideo.srcObject = null;
          arVideo.removeAttribute('src');
          try { arVideo.load(); } catch {}
          if (arVideo.parentNode) {
            arVideo.parentNode.removeChild(arVideo);
          }
        }

        // Liberar renderer/canvas/scene de A-Frame
        if (sceneEl) {
          try {
            if (sceneEl.renderer && typeof sceneEl.renderer.dispose === 'function') {
              sceneEl.renderer.dispose();
            }
          } catch {}
          const canvas = sceneEl.canvas || sceneEl.renderer?.domElement;
          if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
          if (sceneEl.parentNode) {
            sceneEl.parentNode.removeChild(sceneEl);
          }
        }
      } catch (e) {
        console.warn('[AR Cleanup] Error durante cleanup', e);
      }
    };
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(postcard.video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${postcard.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('¡Video descargado exitosamente!');
    } catch {
      toast.error('Error al descargar el video');
    }
  }, [postcard.video_url, postcard.title]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      toast.success(isMuted ? 'Audio activado' : 'Audio silenciado');
    }
  }, [isMuted]);

  const resetTracking = useCallback(() => {
    if (sceneRef.current) {
      // Restart AR tracking
      const scene = sceneRef.current as HTMLElement & {
        systems?: {
          arjs?: {
            restart?: () => void;
          };
        };
      };
      const arSystem = scene.systems?.arjs;
      if (arSystem && arSystem.restart) {
        arSystem.restart();
      }
      setTrackingLost(false);
      toast.success('Tracking reiniciado');
    }
  }, []);

  const openInExternalBrowser = useCallback(() => {
    const currentUrl = window.location.href;
    // Try to open in default browser
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      toast.success('URL copiada al portapapeles');
    }
    // Show instructions
    toast.info('Abre esta URL en tu navegador preferido para usar la cámara');
  }, []);

  if (error || cameraStatus === 'denied' || cameraStatus === 'unavailable' || cameraStatus === 'insecure_context') {
    const getErrorIcon = () => {
      switch (cameraStatus) {
        case 'insecure_context': return <Shield className="h-16 w-16 text-orange-500 mx-auto" />;
        case 'unavailable': return <Camera className="h-16 w-16 text-red-500 mx-auto" />;
        case 'denied': return <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />;
        default: return <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />;
      }
    };

    const getErrorTitle = () => {
      switch (cameraStatus) {
        case 'insecure_context': return 'Contexto No Seguro';
        case 'unavailable': return 'Cámara No Disponible';
        case 'denied': return 'Acceso Denegado';
        default: return 'Error AR';
      }
    };

    const getErrorMessage = () => {
      if (isInIDE && cameraStatus === 'unavailable') {
        return 'La cámara no está disponible en el preview del navegador del IDE. Para usar la realidad aumentada, necesitas abrir esta página en un navegador externo.';
      }
      
      if (error) {
        if (error.includes('descriptores NFT')) {
          return error;
        } else if (error.includes('librerías AR')) {
          return error;
        } else {
          return error;
        }
      }
      
      return 'Error desconocido';
    };

    const getInstructions = () => {
      if (isInIDE) {
        return [
          '1. Copia la URL de esta página',
          '2. Ábrela en Chrome, Firefox o Safari',
          '3. Permite el acceso a la cámara cuando se solicite',
          '4. ¡Disfruta de la experiencia AR!'
        ];
      }
      
      switch (cameraStatus) {
        case 'insecure_context':
          return [
            '1. Asegúrate de usar HTTPS',
            '2. O accede desde localhost',
            '3. Recarga la página'
          ];
        case 'denied':
          return [
            '1. Haz clic en el ícono de cámara en la barra de direcciones',
            '2. Selecciona "Permitir" para el acceso a la cámara',
            '3. Recarga la página'
          ];
        default:
          return [
            '1. Verifica que tu dispositivo tenga cámara',
            '2. Cierra otras aplicaciones que usen la cámara',
            '3. Intenta con un navegador diferente'
          ];
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          {getErrorIcon()}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getErrorTitle()}</h1>
          <p className="text-gray-600 dark:text-gray-300">{getErrorMessage()}</p>
          
          {/* Instructions */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cómo solucionarlo:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {getInstructions().map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isInIDE && (
              <Button onClick={openInExternalBrowser} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir en Navegador
              </Button>
            )}
            <Button 
              onClick={() => window.location.reload()} 
              variant={isInIDE ? "outline" : "default"}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Intentar de Nuevo
            </Button>
          </div>

          {/* Additional Info for IDE */}
          {isInIDE && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <Wifi className="h-4 w-4" />
                <span className="font-medium">Detectado: Preview del IDE</span>
              </div>
              <p className="text-blue-600 dark:text-blue-300">
                Los navegadores integrados en IDEs tienen limitaciones de acceso a hardware. 
                Para la mejor experiencia AR, usa un navegador independiente.
              </p>
            </div>
          )}
        </div>
        {debugMode && (
          <div className="mt-2 text-xs opacity-70">
            <div>
              debug: on | cameraStatus: {cameraStatus} | isARReady: {String(isARReady)} | isTracking: {String(isTracking)}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (cameraStatus === 'checking' || !isARReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Camera className="h-16 w-16 text-blue-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cargando Experiencia AR</h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md">
            {cameraStatus === 'checking' ? 'Solicitando acceso a la cámara...' : 'Cargando librerías AR...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Enhanced styles for mobile AR camera compatibility */}
      <style>{`
        html, body, #__next { 
          height: 100%; 
          margin: 0; 
          padding: 0; 
          overflow: hidden; 
          background: #000;
          -webkit-overflow-scrolling: touch;
          touch-action: none;
        }
        
        /* AR.js camera video element - optimized for mobile */
        #arjs-video {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          min-height: 100vh !important;
          min-height: 100dvh !important;
          object-fit: cover !important;
          background: black !important;
          object-position: center center !important;
          max-width: none !important;
          max-height: none !important;
          transform: none !important;
          z-index: -1 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* A-Frame canvas - mobile optimized */
        canvas.a-canvas {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          min-height: 100vh !important;
          min-height: 100dvh !important;
          display: block !important;
          background: transparent !important;
          transform: none !important;
          z-index: 10 !important;
          pointer-events: auto !important;
          touch-action: none !important;
        }
        
        /* Mobile-specific optimizations */
        @media screen and (max-width: 768px) {
          #arjs-video {
            height: 100vh !important;
            height: 100dvh !important;
            width: 100vw !important;
            object-fit: cover !important;
            z-index: -1 !important;
          }
          
          canvas.a-canvas {
            height: 100vh !important;
            height: 100dvh !important;
            width: 100vw !important;
            z-index: 10 !important;
          }
          
          /* Ensure proper stacking on mobile */
          a-scene {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            z-index: 1 !important;
          }
        }
        
        /* iPhone Pro 16 specific optimizations (402x874) */
        @media screen and (max-width: 430px) and (max-height: 932px) {
          #arjs-video {
            height: 100vh !important;
            height: 100dvh !important;
            width: 100vw !important;
            object-fit: cover !important;
            object-position: center center !important;
            z-index: -1 !important;
          }
          
          canvas.a-canvas {
            height: 100vh !important;
            height: 100dvh !important;
            width: 100vw !important;
            z-index: 10 !important;
          }
          
          /* Optimized UI positioning for iPhone Pro 16 */
          .ar-instructions {
            bottom: 8px !important;
            left: 8px !important;
            right: auto !important;
            max-width: calc(100vw - 80px) !important;
            font-size: 12px !important;
            padding: 8px !important;
          }
          
          .ar-controls {
            bottom: 8px !important;
            right: 8px !important;
            gap: 6px !important;
          }
          
          .ar-header {
            top: 8px !important;
            left: 8px !important;
            right: 8px !important;
            padding: 8px !important;
            font-size: 14px !important;
          }
        }
        
        /* iPad Pro specific optimizations (1024x1366) */
        @media screen and (min-width: 1000px) and (max-width: 1100px) and (min-height: 1300px) {
          #arjs-video {
            height: 100vh !important;
            height: 100dvh !important;
            width: 100vw !important;
            object-fit: cover !important;
            object-position: center center !important;
            z-index: -1 !important;
            /* Fix for black bar issue */
            transform: scale(1.02) !important;
            -webkit-transform: scale(1.02) !important;
          }
          
          canvas.a-canvas {
            height: 100vh !important;
            height: 100dvh !important;
            width: 100vw !important;
            z-index: 10 !important;
          }
          
          /* Ensure no black bars on iPad Pro */
          a-scene {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            z-index: 1 !important;
            overflow: hidden !important;
          }
          
          .ar-instructions {
            bottom: 16px !important;
            left: 16px !important;
            max-width: 400px !important;
            font-size: 14px !important;
          }
          
          .ar-controls {
            bottom: 16px !important;
            right: 16px !important;
            gap: 8px !important;
          }
          
          .ar-header {
            top: 16px !important;
            left: 16px !important;
            right: 16px !important;
            max-width: none !important;
          }
        }
        
        /* iOS Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          #arjs-video {
            height: 100vh !important;
            height: -webkit-fill-available !important;
          }
          
          canvas.a-canvas {
            height: 100vh !important;
            height: -webkit-fill-available !important;
          }
        }
        
        /* Prevent scrolling and zooming on mobile */
         body {
           -webkit-user-select: none;
           -webkit-touch-callout: none;
           -webkit-text-size-adjust: none;
           -webkit-tap-highlight-color: transparent;
           user-select: none;
         }
         
         /* Dynamic mobile-specific styles */
         ${isMobile ? `
           #arjs-video {
             transform: translateZ(0) !important;
             -webkit-transform: translateZ(0) !important;
             backface-visibility: hidden !important;
             -webkit-backface-visibility: hidden !important;
             will-change: transform !important;
           }
           
           canvas.a-canvas {
             transform: translateZ(0) !important;
             -webkit-transform: translateZ(0) !important;
             backface-visibility: hidden !important;
             -webkit-backface-visibility: hidden !important;
             will-change: transform !important;
           }
           
           /* Force hardware acceleration on mobile */
           a-scene {
             transform: translateZ(0) !important;
             -webkit-transform: translateZ(0) !important;
           }
         ` : ''}
         
         /* Orientation-specific styles for mobile */
         @media screen and (orientation: portrait) and (max-width: 768px) {
           #arjs-video, canvas.a-canvas {
             width: 100vw !important;
             height: 100vh !important;
             height: 100dvh !important;
           }
         }
         
         @media screen and (orientation: landscape) and (max-width: 768px) {
           #arjs-video, canvas.a-canvas {
             width: 100vw !important;
             height: 100vh !important;
             height: 100dvh !important;
           }
         }
      `}
      </style>
      {/* AR Scene */}
      <a-scene
        ref={sceneRef}
        vr-mode-ui="enabled: false"
        renderer="logarithmicDepthBuffer: true; antialias: true; colorManagement: true; alpha: true;"
        arjs={`trackingMethod: best; sourceType: webcam; debugUIEnabled: ${debugMode ? 'true' : 'false'}; detectionMode: mono_and_matrix; matrixCodeType: 3x3; cameraParametersUrl: ${cameraParamsUrl}; sourceWidth: ${sourceDims.w}; sourceHeight: ${sourceDims.h}; maxDetectionRate: 60;`}
        id="scene"
        embedded
        style={{ height: '100dvh', width: '100vw' }}
      >
        <a-assets timeout="15000">
          <video
            ref={videoRef}
            id="vid"
            src={postcard.video_url && postcard.video_url.trim().length > 0
              ? postcard.video_url.replace(/\(/g, '%28').replace(/\)/g, '%29')
              : 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'}
            preload="auto"
            response-type="arraybuffer"
            loop
            crossOrigin="anonymous"
            autoPlay
            muted={isMuted}
            playsInline
            controls={false}
          />
        </a-assets>

        <a-nft
          type="nft"
          url={(postcard.nft_descriptors as NFTDescriptors)?.files?.fset?.replace('.fset', '') || (postcard.nft_descriptors as NFTDescriptors)?.descriptorUrl || ''}
          smooth="true"
          smoothCount="10"
          smoothTolerance="0.01"
          smoothThreshold="5"
          raycaster="objects: .clickable"
          emitevents="true"
          id="nft-marker"
        >
          <a-video
            src="#vid"
            position="0 0 0"
            rotation="-90 0 0"
            width="1"
            height="1.78"
            opacity="0.95"
            material="shader: flat; transparent: true;"
            geometry="primitive: plane;"
            class="clickable"
          />
        </a-nft>

        <a-entity camera look-controls-enabled="false" cursor="rayOrigin: mouse" />
      </a-scene>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="ar-header bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">{postcard.title}</h1>
              <p className="text-sm opacity-80">{postcard.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Tracking Status */}
              <div className={`w-3 h-3 rounded-full ${
                isTracking ? 'bg-green-500' : trackingLost ? 'bg-red-500' : 'bg-yellow-500'
              }`} title={isTracking ? 'Tracking activo' : trackingLost ? 'Tracking perdido' : 'Buscando...'} />
              <span className="text-xs opacity-70">
                {isTracking ? 'Detectado' : trackingLost ? 'Perdido' : 'Buscando...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="ar-controls absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
        {/* Volume Control */}
        <Button
          onClick={toggleMute}
          className="bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-full p-3 shadow-lg"
          size="icon"
          title={isMuted ? 'Activar audio' : 'Silenciar audio'}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        
        {/* Reset Tracking */}
        {trackingLost && (
          <Button
            onClick={resetTracking}
            className="bg-orange-600/80 hover:bg-orange-700/80 text-white rounded-full p-3 shadow-lg"
            size="icon"
            title="Reiniciar tracking"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        )}
        
        {/* Download Button */}
        <Button
          onClick={handleDownload}
          className="bg-blue-600/80 hover:bg-blue-700/80 text-white rounded-full p-3 shadow-lg"
          size="icon"
          title="Descargar video"
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="ar-instructions absolute bottom-4 left-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm max-w-xs">
          {!isTracking && !trackingLost && (
            <p>📱 Apunta tu cámara a la imagen de la postal para ver la experiencia AR</p>
          )}
          {isTracking && (
            <p>✅ ¡Postal detectada! Mantén la cámara estable para una mejor experiencia</p>
          )}
          {trackingLost && (
            <p>⚠️ Postal perdida. Vuelve a enfocar la imagen o usa el botón de reinicio</p>
          )}
          <div className="mt-2 text-xs opacity-70">
            <p>💡 Consejo: Mantén buena iluminación y la postal completamente visible</p>
          </div>
        </div>
      </div>
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
        const response = await fetch(`/api/postcards/${postcardId}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Postal no encontrada o no es pública');
        }
        const json = await response.json();
        if (!json?.success || !json?.data) {
          throw new Error(json?.error?.message || 'Respuesta inválida del servidor');
        }
        setPostcard(json.data as PostcardData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Error al cargar la postal');
      } finally {
        setLoading(false);
      }
    };

    if (postcardId) {
      fetchPostcard();
    }
  }, [postcardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-300">Cargando experiencia AR...</p>
        </div>
      </div>
    );
  }

  if (error || !postcard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Postal No Encontrada</h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md">
            {error || 'Esta postal no está disponible o no es pública.'}
          </p>
          <Button onClick={() => window.history.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return <ARViewer postcard={postcard} />;
}