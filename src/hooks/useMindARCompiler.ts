/**
 * MindAR Image Target Compiler
 * Generates .mind files for image tracking directly in the browser
 * Much faster and more reliable than AR.js NFT descriptors
 */

import { useState, useCallback } from 'react';

interface MindARCompilerReturn {
  compileImageTarget: (imageFile: File) => Promise<Blob>;
  isCompiling: boolean;
  progress: number;
  error: string | null;
}

// Global reference to compiler
let compilerInstance: any = null;
let compilerLoading: Promise<any> | null = null;

/**
 * Dynamically load the MindAR compiler using the standalone compiler version
 */
async function loadMindARCompiler(): Promise<any> {
  if (compilerInstance) return compilerInstance;
  if (compilerLoading) return compilerLoading;

  compilerLoading = (async () => {
    // Use dynamic import for the ES module version of the compiler
    // Dynamic import approach commented out - use script injection instead
    // MindAR requires special handling for browser loading

    // Fallback: Load via script tag with type="module"
    return new Promise((resolve, reject) => {
      // Create an inline module script that loads and exposes the compiler
      const moduleScript = document.createElement('script');
      moduleScript.type = 'module';
      moduleScript.textContent = `
        import { Compiler } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
        window.MindARCompiler = Compiler;
        window.dispatchEvent(new CustomEvent('mindar-compiler-loaded'));
      `;

      const timeout = setTimeout(() => {
        moduleScript.remove();
        reject(new Error('Timeout loading MindAR compiler'));
      }, 30000);

      const handleLoaded = () => {
        clearTimeout(timeout);
        window.removeEventListener('mindar-compiler-loaded', handleLoaded);
        if ((window as any).MindARCompiler) {
          compilerInstance = (window as any).MindARCompiler;
          resolve(compilerInstance);
        } else {
          reject(new Error('MindAR compiler not found after module load'));
        }
      };

      window.addEventListener('mindar-compiler-loaded', handleLoaded);
      document.head.appendChild(moduleScript);
    });
  })();

  return compilerLoading;
}

/**
 * Load image file into an HTMLImageElement
 */
async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
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
 * Resize image if too large (MindAR works best with images < 1024px)
 */
function resizeImageIfNeeded(img: HTMLImageElement, maxSize: number = 1024): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  let { width, height } = img;

  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Hook for compiling image targets with MindAR
 */
export function useMindARCompiler(): MindARCompilerReturn {
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const compileImageTarget = useCallback(async (imageFile: File): Promise<Blob> => {
    setIsCompiling(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Load compiler (10%)
      setProgress(10);
      const Compiler = await loadMindARCompiler();

      // Step 2: Load and resize image (30%)
      setProgress(30);
      const img = await loadImageFromFile(imageFile);
      const canvas = resizeImageIfNeeded(img, 1024);

      // Step 3: Initialize compiler and compile (50-90%)
      setProgress(50);
      const compiler = new Compiler();
      
      // MindAR compiler expects an array of images for multi-target support
      // We only use one image target per postcard
      const images = [canvas];

      // Compile with progress callback
      await compiler.compileImageTargets(images, (progressValue: number) => {
        // progressValue is 0-100
        setProgress(50 + Math.round(progressValue * 0.4)); // Maps to 50-90%
      });

      // Step 4: Export compiled data (100%)
      setProgress(95);
      const exportedData = await compiler.exportData();
      
      // Convert to Blob
      const mindBlob = new Blob([exportedData], { type: 'application/octet-stream' });
      
      setProgress(100);
      setIsCompiling(false);
      
      return mindBlob;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown compilation error';
      setError(errorMessage);
      setIsCompiling(false);
      throw new Error(`MindAR compilation failed: ${errorMessage}`);
    }
  }, []);

  return {
    compileImageTarget,
    isCompiling,
    progress,
    error
  };
}

/**
 * Upload compiled .mind file to backend
 */
export async function uploadMindTarget(
  postcardId: string,
  mindBlob: Blob
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('postcardId', postcardId);
    formData.append('mindFile', mindBlob, 'target.mind');

    const response = await fetch('/api/ar/upload-mind-target', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Upload failed' };
    }

    return { success: true };

  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Upload failed' 
    };
  }
}

export default useMindARCompiler;
