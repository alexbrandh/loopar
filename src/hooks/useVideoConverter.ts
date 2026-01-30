'use client';

import { useState, useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface ConversionProgress {
  percent: number;
  message: string;
}

interface UseVideoConverterReturn {
  convertToMp4: (file: File) => Promise<File>;
  isConverting: boolean;
  progress: ConversionProgress;
  error: string | null;
}

// Formats that need conversion (not natively supported by browsers)
const FORMATS_NEEDING_CONVERSION = ['.mov', '.avi', '.wmv', '.mkv', '.flv', '.m4v'];

// Formats natively supported by browsers
const SUPPORTED_FORMATS = ['.mp4', '.webm', '.ogg'];

export function needsConversion(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return FORMATS_NEEDING_CONVERSION.includes(ext);
}

export function isSupportedFormat(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return SUPPORTED_FORMATS.includes(ext) || FORMATS_NEEDING_CONVERSION.includes(ext);
}

export function useVideoConverter(): UseVideoConverterReturn {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress>({ percent: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);

  const loadFFmpeg = useCallback(async () => {
    if (loadedRef.current && ffmpegRef.current) {
      return ffmpegRef.current;
    }

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    ffmpeg.on('progress', ({ progress: p }) => {
      const percent = Math.round(p * 100);
      console.log('[FFmpeg] Progress:', percent + '%');
      setProgress({
        percent: 20 + Math.round(percent * 0.7), // Scale to 20-90%
        message: `Convirtiendo... ${percent}%`
      });
    });

    setProgress({ percent: 0, message: 'Cargando convertidor de video...' });

    // Load FFmpeg core from CDN with multithread support
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd';
    
    try {
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        workerURL: `${baseURL}/ffmpeg-core.worker.js`,
      });
      console.log('[FFmpeg] Loaded with multithread support');
    } catch (e) {
      console.warn('[FFmpeg] Multithread failed, trying single thread:', e);
      // Fallback to single thread
      const fallbackURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: `${fallbackURL}/ffmpeg-core.js`,
        wasmURL: `${fallbackURL}/ffmpeg-core.wasm`,
      });
      console.log('[FFmpeg] Loaded with single thread');
    }

    loadedRef.current = true;
    return ffmpeg;
  }, []);

  const convertToMp4 = useCallback(async (file: File): Promise<File> => {
    // Check if conversion is needed
    if (!needsConversion(file.name)) {
      console.log('[VideoConverter] File already in compatible format:', file.name);
      return file;
    }

    setIsConverting(true);
    setError(null);
    setProgress({ percent: 0, message: 'Preparando conversión...' });

    try {
      console.log('[VideoConverter] Starting conversion for:', file.name, 'Size:', file.size);
      
      const ffmpeg = await loadFFmpeg();
      
      // Use simple names without special characters
      const inputName = 'input.mov';
      const outputName = 'output.mp4';

      setProgress({ percent: 10, message: 'Cargando archivo...' });

      // Read file as ArrayBuffer and write to FFmpeg
      const fileData = await fetchFile(file);
      console.log('[VideoConverter] File data size:', fileData.byteLength);
      
      await ffmpeg.writeFile(inputName, fileData);
      console.log('[VideoConverter] Input file written to FFmpeg FS');

      setProgress({ percent: 20, message: 'Convirtiendo video (esto puede tardar)...' });

      // Convert to MP4 - using copy codec first to try fast remux
      // If MOV is already H.264, this will be instant
      console.log('[VideoConverter] Starting FFmpeg conversion...');
      
      // First try to just remux (copy codecs) - fastest option
      const exitCode = await ffmpeg.exec([
        '-i', inputName,
        '-c', 'copy',        // Copy both video and audio without re-encoding
        '-movflags', '+faststart',
        '-y',
        outputName
      ]);
      
      console.log('[VideoConverter] FFmpeg exit code:', exitCode);

      // Check if output file exists and has content
      let data;
      try {
        data = await ffmpeg.readFile(outputName);
        console.log('[VideoConverter] Output file size:', (data as Uint8Array).byteLength);
        
        // If output is too small, try re-encoding
        if ((data as Uint8Array).byteLength < 1000) {
          console.log('[VideoConverter] Output too small, trying re-encode...');
          
          await ffmpeg.exec([
            '-i', inputName,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            outputName
          ]);
          
          data = await ffmpeg.readFile(outputName);
          console.log('[VideoConverter] Re-encoded output size:', (data as Uint8Array).byteLength);
        }
      } catch (readErr) {
        console.error('[VideoConverter] Failed to read output:', readErr);
        throw new Error('La conversión no produjo un archivo válido');
      }

      setProgress({ percent: 90, message: 'Finalizando...' });

      // Create new File object with .mp4 extension
      const originalName = file.name.slice(0, file.name.lastIndexOf('.'));
      // Cast through unknown to avoid TypeScript issues with FFmpeg's FileData type
      const blob = new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
      const convertedFile = new File(
        [blob],
        `${originalName}.mp4`,
        { type: 'video/mp4' }
      );

      // Cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (cleanupErr) {
        console.warn('[VideoConverter] Cleanup error:', cleanupErr);
      }

      setProgress({ percent: 100, message: '¡Conversión completada!' });
      console.log('[VideoConverter] Conversion complete:', convertedFile.name, 'Size:', convertedFile.size);

      // Validate output size
      if (convertedFile.size < 1000) {
        throw new Error('El video convertido es demasiado pequeño, posible error de conversión');
      }

      return convertedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conversión';
      console.error('[VideoConverter] Conversion error:', err);
      setError(errorMessage);
      throw new Error(`Error al convertir video: ${errorMessage}`);
    } finally {
      setIsConverting(false);
    }
  }, [loadFFmpeg]);

  return {
    convertToMp4,
    isConverting,
    progress,
    error
  };
}
