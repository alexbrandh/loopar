'use client';

import { useState, useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

    ffmpeg.on('progress', ({ progress: p, time }) => {
      const percent = Math.round(p * 100);
      setProgress({
        percent,
        message: `Convirtiendo... ${percent}%`
      });
    });

    setProgress({ percent: 0, message: 'Cargando convertidor de video...' });

    // Load FFmpeg core from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

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
      console.log('[VideoConverter] Starting conversion for:', file.name);
      
      const ffmpeg = await loadFFmpeg();
      
      // Get file extension
      const inputExt = file.name.slice(file.name.lastIndexOf('.'));
      const inputName = `input${inputExt}`;
      const outputName = 'output.mp4';

      setProgress({ percent: 10, message: 'Cargando archivo...' });

      // Write input file to FFmpeg virtual filesystem
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      setProgress({ percent: 20, message: 'Convirtiendo video...' });

      // Convert to MP4 with H.264 codec (widely compatible)
      // Using fast preset for quicker conversion
      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputName
      ]);

      setProgress({ percent: 90, message: 'Finalizando...' });

      // Read output file
      const data = await ffmpeg.readFile(outputName);
      
      // Create new File object with .mp4 extension
      const originalName = file.name.slice(0, file.name.lastIndexOf('.'));
      // Convert to Blob - cast needed for FFmpeg's FileData type
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
      const convertedFile = new File(
        [blob],
        `${originalName}.mp4`,
        { type: 'video/mp4' }
      );

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setProgress({ percent: 100, message: '¡Conversión completada!' });
      console.log('[VideoConverter] Conversion complete:', convertedFile.name, convertedFile.size);

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
