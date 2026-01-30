/**
 * Client-side NFT Descriptor Generator
 * Uses the AR.js NFT Marker Creator WASM module directly in the browser
 */

import { useState, useCallback } from 'react';

interface NFTGenerationResult {
  isetBlob: Blob;
  fsetBlob: Blob;
  fset3Blob: Blob;
}

interface UseClientNFTGeneratorReturn {
  generateDescriptors: (imageFile: File) => Promise<NFTGenerationResult>;
  isGenerating: boolean;
  progress: number;
  error: string | null;
}

// Global reference to the loaded WASM module
let nftModule: any = null;
let moduleLoading: Promise<any> | null = null;

/**
 * Load the NFT Marker Creator WASM module
 * Uses ES6 dynamic import for the local WASM module
 */
async function loadNFTModule(): Promise<any> {
  if (nftModule) return nftModule;
  
  if (moduleLoading) return moduleLoading;
  
  moduleLoading = (async () => {
    try {
      console.log('📦 Loading NFT Marker Creator WASM module...');
      
      // Try ES6 module import first (local file)
      try {
        // @ts-ignore - Dynamic import from public folder
        const NftMC = await import(/* webpackIgnore: true */ '/nft-wasm/NftMarkerCreator_ES6_wasm.js');
        console.log('📦 ES6 module loaded, initializing...');
        
        // The module exports a default function that returns the WASM module
        const moduleFactory = NftMC.default || NftMC;
        if (typeof moduleFactory === 'function') {
          nftModule = await moduleFactory();
          console.log('✅ NFT WASM Module initialized via ES6 import');
          return nftModule;
        }
      } catch (e) {
        console.warn('⚠️ ES6 import failed, trying script injection:', e);
      }
      
      // Fallback: Try loading the non-ES6 version via script tag
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/nft-wasm/NftMarkerCreator_wasm.js';
        script.async = true;
        
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error('Timeout loading WASM script'));
        }, 15000);
        
        script.onload = async () => {
          clearTimeout(timeout);
          console.log('📦 NFT Marker Creator script loaded');
          
          // Check for various global names the module might use
          const globalNames = ['NftMarkerCreator', 'NftMC', 'Module'];
          let factory = null;
          
          for (const name of globalNames) {
            if ((window as any)[name]) {
              factory = (window as any)[name];
              console.log(`Found module as window.${name}`);
              break;
            }
          }
          
          if (factory && typeof factory === 'function') {
            try {
              nftModule = await factory();
              console.log('✅ NFT WASM Module initialized via script');
              resolve(nftModule);
            } catch (e) {
              reject(new Error(`Failed to initialize WASM module: ${e}`));
            }
          } else {
            reject(new Error('NftMarkerCreator not found after script load'));
          }
        };
        
        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          reject(new Error('Failed to load WASM script'));
        };
        
        document.head.appendChild(script);
      });
      
    } catch (error) {
      console.error('❌ Failed to load NFT Marker Creator:', error);
      throw new Error(`Failed to load NFT Marker Creator: ${error instanceof Error ? error.message : error}`);
    }
  })();
  
  return moduleLoading;
}

// Maximum image size for NFT generation (to avoid very long processing times)
// 384px provides good AR tracking while keeping generation under 15-20 seconds
// Lower values = faster processing but slightly less accurate tracking
const MAX_IMAGE_DIMENSION = 384;

/**
 * Process image and generate NFT descriptors
 */
async function processImageForNFT(
  imageFile: File,
  onProgress: (progress: number) => void
): Promise<NFTGenerationResult> {
  console.log('🔧 Starting client-side NFT generation for:', imageFile.name);
  onProgress(5);
  
  // Load the WASM module
  const Module = await loadNFTModule();
  onProgress(15);
  
  // Create a canvas to load and resize the image
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
  
  onProgress(25);
  
  // Resize image if too large (to speed up NFT generation)
  let targetWidth = img.width;
  let targetHeight = img.height;
  
  if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
    const scale = Math.min(MAX_IMAGE_DIMENSION / img.width, MAX_IMAGE_DIMENSION / img.height);
    targetWidth = Math.round(img.width * scale);
    targetHeight = Math.round(img.height * scale);
    console.log(`📐 Resizing image from ${img.width}x${img.height} to ${targetWidth}x${targetHeight} for faster processing`);
  }
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  // Clean up object URL
  URL.revokeObjectURL(img.src);
  
  onProgress(35);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rawPixels = new Uint8Array(imgData.data.buffer);
  
  // Convert RGBA to RGB
  const rgbPixels = new Uint8Array((rawPixels.length / 4) * 3);
  for (let i = 0, j = 0; i < rawPixels.length; i += 4, j += 3) {
    rgbPixels[j] = rawPixels[i];     // R
    rgbPixels[j + 1] = rawPixels[i + 1]; // G
    rgbPixels[j + 2] = rawPixels[i + 2]; // B
  }
  
  onProgress(45);
  
  console.log('📊 Image loaded:', {
    originalSize: `${img.width}x${img.height}`,
    processedSize: `${canvas.width}x${canvas.height}`,
    pixelCount: rgbPixels.length
  });
  
  // Generate NFT descriptors using the WASM module
  try {
    // Default DPI if not available
    const dpi = 150;
    
    console.log('🔧 Calling createNftDataSet...');
    Module.createNftDataSet(
      rgbPixels,
      dpi,
      canvas.width,
      canvas.height,
      3, // RGB channels
      '' // No extra params
    );
    
    onProgress(80);
    
    // Read generated files from the virtual filesystem
    const isetData = Module.FS.readFile('tempFilename.iset');
    const fsetData = Module.FS.readFile('tempFilename.fset');
    const fset3Data = Module.FS.readFile('tempFilename.fset3');
    
    console.log('✅ NFT descriptors generated:', {
      isetSize: isetData.length,
      fsetSize: fsetData.length,
      fset3Size: fset3Data.length
    });
    
    onProgress(100);
    
    return {
      isetBlob: new Blob([isetData], { type: 'application/octet-stream' }),
      fsetBlob: new Blob([fsetData], { type: 'application/octet-stream' }),
      fset3Blob: new Blob([fset3Data], { type: 'application/octet-stream' })
    };
    
  } catch (error) {
    console.error('❌ Error generating NFT descriptors:', error);
    throw error;
  }
}

/**
 * Hook for client-side NFT descriptor generation
 */
export function useClientNFTGenerator(): UseClientNFTGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const generateDescriptors = useCallback(async (imageFile: File): Promise<NFTGenerationResult> => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    
    try {
      const result = await processImageForNFT(imageFile, setProgress);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);
  
  return {
    generateDescriptors,
    isGenerating,
    progress,
    error
  };
}

/**
 * Upload NFT descriptors to Supabase and update postcard
 */
export async function uploadNFTDescriptors(
  postcardId: string,
  userId: string,
  descriptors: NFTGenerationResult
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create FormData with the descriptor files
    const formData = new FormData();
    formData.append('postcardId', postcardId);
    formData.append('iset', descriptors.isetBlob, 'descriptors.iset');
    formData.append('fset', descriptors.fsetBlob, 'descriptors.fset');
    formData.append('fset3', descriptors.fset3Blob, 'descriptors.fset3');
    
    // Upload to our API endpoint
    const response = await fetch('/api/nft/upload-descriptors', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload descriptors');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error uploading NFT descriptors:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
