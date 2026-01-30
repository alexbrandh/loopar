'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { toast } from './use-toast';

interface CompilationOptions {
  postcardId: string | null;
  imageUploaded: boolean;
  imageFile: File | null;
  onGenerationStart?: () => void;
  onGenerationComplete?: () => void;
  onGenerationError?: (error: string) => void;
}

interface CompilationStatus {
  state: 'idle' | 'loading' | 'compiling' | 'uploading' | 'completed' | 'error';
  progress: number;
  message: string;
}

// Global compiler instance (loaded once)
let compilerPromise: Promise<any> | null = null;
let Compiler: any = null;

/**
 * Load MindAR compiler dynamically using the AFRAME version which exposes globals
 */
async function loadCompiler(): Promise<any> {
  if (Compiler) return Compiler;
  
  if (compilerPromise) return compilerPromise;

  compilerPromise = new Promise(async (resolve, reject) => {
    try {
      // First load AFRAME if not present (required by MindAR AFRAME bundle)
      if (!(window as any).AFRAME) {
        console.log('📦 Loading A-Frame...');
        await loadScript('https://aframe.io/releases/1.5.0/aframe.min.js');
      }

      // Load MindAR AFRAME bundle which exposes MINDAR global properly
      console.log('📦 Loading MindAR compiler...');
      await loadScript('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js');
      
      // Check for MINDAR global
      if ((window as any).MINDAR?.IMAGE?.Compiler) {
        Compiler = (window as any).MINDAR.IMAGE.Compiler;
        console.log('✅ MindAR Compiler loaded successfully');
        resolve(Compiler);
      } else {
        // Try alternative: the prod bundle might expose it differently
        console.log('⚠️ Trying alternative compiler location...');
        
        // Some versions expose it on window directly
        const possibleLocations = [
          (window as any).MINDAR?.IMAGE?.Compiler,
          (window as any).MindARImageCompiler,
          (window as any).Compiler,
        ];
        
        for (const loc of possibleLocations) {
          if (loc) {
            Compiler = loc;
            console.log('✅ MindAR Compiler found at alternative location');
            resolve(Compiler);
            return;
          }
        }
        
        reject(new Error('MINDAR.IMAGE.Compiler not found after loading scripts'));
      }
    } catch (error) {
      reject(error);
    }
  });

  return compilerPromise;
}

/**
 * Helper to load a script and wait for it
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    
    document.head.appendChild(script);
  });
}

/**
 * Load image file as HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Hook para compilación de targets MindAR en el navegador
 * Compila directamente en el main thread con feedback de progreso
 */
export function useMindARBrowserCompiler({
  postcardId,
  imageUploaded,
  imageFile,
  onGenerationStart,
  onGenerationComplete,
  onGenerationError
}: CompilationOptions) {
  const generationTriggeredRef = useRef(false);
  const currentPostcardIdRef = useRef<string | null>(null);
  
  const [status, setStatus] = useState<CompilationStatus>({
    state: 'idle',
    progress: 0,
    message: ''
  });

  // Reset when postcardId changes
  useEffect(() => {
    if (postcardId !== currentPostcardIdRef.current) {
      generationTriggeredRef.current = false;
      currentPostcardIdRef.current = postcardId;
      setStatus({ state: 'idle', progress: 0, message: '' });
    }
  }, [postcardId]);

  const compile = useCallback(async () => {
    if (!postcardId || !imageFile || generationTriggeredRef.current) {
      return;
    }

    generationTriggeredRef.current = true;
    onGenerationStart?.();

    try {
      // Step 1: Load compiler
      setStatus({ state: 'loading', progress: 0.05, message: 'Cargando compilador MindAR...' });
      
      const CompilerClass = await loadCompiler();
      const compiler = new CompilerClass();

      // Step 2: Load image
      setStatus({ state: 'loading', progress: 0.1, message: 'Cargando imagen...' });
      
      const img = await loadImageFromFile(imageFile);

      logger.info('🚀 [MINDAR] Starting browser compilation', {
        operation: 'mindar_browser_compile_start',
        metadata: { postcardId, width: img.width, height: img.height }
      });

      // Step 3: Compile
      setStatus({ state: 'compiling', progress: 0.15, message: 'Compilando target AR...' });

      // Compile with progress callback
      const dataList = await compiler.compileImageTargets([img], (progress: number) => {
        // Map progress from 0.15 to 0.85
        const mappedProgress = 0.15 + (progress / 100 * 0.7);
        setStatus({
          state: 'compiling',
          progress: mappedProgress,
          message: `Analizando características: ${Math.round(progress)}%`
        });
      });

      console.log('📊 Compilation result:', dataList);

      // Step 4: Export
      setStatus({ state: 'compiling', progress: 0.88, message: 'Exportando datos...' });
      
      const exportedBuffer = await compiler.exportData();
      
      console.log('📦 Exported buffer size:', exportedBuffer.byteLength);

      // Step 5: Upload to server
      setStatus({ state: 'uploading', progress: 0.92, message: 'Subiendo target...' });

      const formData = new FormData();
      formData.append('postcardId', postcardId);
      formData.append('mindFile', new Blob([exportedBuffer], { type: 'application/octet-stream' }), 'target.mind');

      const response = await fetch('/api/ar/upload-mind-target', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Upload failed');
      }

      // Complete!
      setStatus({ state: 'completed', progress: 1, message: '¡Completado!' });

      logger.info('✅ [MINDAR] Compilation complete', {
        operation: 'mindar_browser_compile_complete',
        metadata: { postcardId, bufferSize: exportedBuffer.byteLength }
      });

      toast({
        title: "¡Target AR generado!",
        description: "Tu postal AR está lista para usar.",
      });

      onGenerationComplete?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      logger.error('❌ [MINDAR] Compilation failed', {
        operation: 'mindar_browser_compile_error',
        metadata: { postcardId, error: errorMessage }
      }, error as Error);

      setStatus({ state: 'error', progress: 0, message: errorMessage });
      generationTriggeredRef.current = false;

      toast({
        title: "Error generando target AR",
        description: errorMessage,
        variant: "destructive",
      });

      onGenerationError?.(errorMessage);
    }
  }, [postcardId, imageFile, onGenerationStart, onGenerationComplete, onGenerationError]);

  // Auto-trigger when image is uploaded
  useEffect(() => {
    if (postcardId && imageUploaded && imageFile && !generationTriggeredRef.current) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        compile();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [postcardId, imageUploaded, imageFile, compile]);

  return {
    status,
    compile,
    isCompiling: status.state === 'loading' || status.state === 'compiling' || status.state === 'uploading'
  };
}

export default useMindARBrowserCompiler;
