'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { toast } from '@/hooks/use-toast';
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  HelpCircle,
  Loader2,
  WifiOff
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpload } from '@/hooks/useUpload';
import { usePostcards } from '@/hooks/usePostcards';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useMindARBrowserCompiler } from '@/hooks/useMindARBrowserCompiler';
import { useVideoConverter, needsConversion } from '@/hooks/useVideoConverter';
import { logger } from '@/lib/logger';

interface FileWithPreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
}



export default function NewPostcard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { uploadFile, uploads, cancelUpload, cancelAllUploads } = useUpload();
  const { createPostcard } = usePostcards();
  const { isOnline } = useNetworkStatus();
  const { convertToMp4, isConverting, progress: conversionProgress } = useVideoConverter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<FileWithPreview | null>(null);
  const [videoFile, setVideoFile] = useState<FileWithPreview | null>(null);

  // Estados para progreso detallado
  const [currentStep, setCurrentStep] = useState<'idle' | 'converting-video' | 'creating' | 'uploading-image' | 'uploading-video' | 'generating-nft' | 'uploading-nft' | 'completed'>('idle');
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);

  // Referencias para cancelación
  const currentPostcardIdRef = useRef<string | null>(null);
  const currentUploadIdsRef = useRef<{ image?: string; video?: string }>({});

  // MindAR Browser compilation hook - compiles in browser with progress feedback
  const { status: compilationStatus } = useMindARBrowserCompiler({
    postcardId: currentPostcardIdRef.current,
    imageUploaded,
    imageFile: imageFile?.file || null,
    onGenerationStart: () => {
      setCurrentStep('generating-nft');
      updateOverallProgress('generating-nft');
    },
    onGenerationComplete: () => {
      setCurrentStep('completed');
      updateOverallProgress('completed');
      setCanCancel(false);

      toast({
        title: "¡Postal creada!",
        description: "Tu postal AR está lista para usar con MindAR.",
      });

      logger.info('Postal completada con MindAR', {
        postcardId: currentPostcardIdRef.current ?? undefined,
        operation: 'complete_postcard_mindar'
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    },
    onGenerationError: (error: string) => {
      logger.error('Error en compilación MindAR', {
        postcardId: currentPostcardIdRef.current ?? undefined,
        operation: 'mindar_compilation_error'
      }, new Error(error));

      setCurrentStep('completed');
      updateOverallProgress('completed');
      setCanCancel(false);

      toast({
        title: "¡Postal creada!",
        description: "Tu postal fue creada. El target AR se está procesando.",
      });
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  });

  const [dragActive, setDragActive] = useState<'image' | 'video' | null>(null);

  const MAX_FILE_SIZE_MB = (() => {
    const v = process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB;
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 50;
  })();
  const MAX_IMAGE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
  const MAX_VIDEO_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
  const MIN_IMAGE_RESOLUTION = 800;
  const MAX_VIDEO_DURATION = 90; // seconds

  // Función para cancelar todas las operaciones
  const handleCancelOperation = useCallback(async () => {
    if (!canCancel || isCancelling) return;

    setIsCancelling(true);
    logger.info('Usuario cancelando operación de creación de postal', { operation: 'cancel_postcard_creation' });

    try {
      // Cancelar subidas en progreso
      if (currentUploadIdsRef.current.image) {
        await cancelUpload(currentUploadIdsRef.current.image);
      }
      if (currentUploadIdsRef.current.video) {
        await cancelUpload(currentUploadIdsRef.current.video);
      }

      // Cancelar todas las subidas pendientes
      await cancelAllUploads();

      // Resetear estados
      setCurrentStep('idle');
      setOverallProgress(0);
      setCanCancel(false);
      setImageUploaded(false);
      currentPostcardIdRef.current = null;
      currentUploadIdsRef.current = {};

      toast({
        title: "Operación cancelada",
        description: "La creación de la postal ha sido cancelada.",
      });
    } catch (error) {
      logger.error('Error al cancelar operación', { operation: 'cancel_postcard_creation' }, error instanceof Error ? error : new Error(String(error)));
      toast({
        title: "Error al cancelar",
        description: "Hubo un problema al cancelar la operación.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  }, [cancelUpload, cancelAllUploads, canCancel, isCancelling]);

  // Función para actualizar el progreso general
  const updateOverallProgress = useCallback((step: typeof currentStep, stepProgress: number = 0) => {
    const stepWeights = {
      idle: 0,
      'converting-video': 5,
      creating: 10,
      'uploading-image': 30,
      'uploading-video': 30,
      'generating-nft': 15,
      'uploading-nft': 15,
      completed: 100
    };

    const baseProgress = stepWeights[step];
    const totalProgress = Math.min(100, baseProgress + stepProgress);
    setOverallProgress(totalProgress);
  }, []);

  // Efecto para limpiar operaciones al desmontar (sin disparar UI/Logs de usuario)
  useEffect(() => {
    return () => {
      // Cancelar subidas pendientes de forma silenciosa en unmount
      cancelAllUploads();
    };
  }, [cancelAllUploads]);

  // Efecto para actualizar progreso de upload
  useEffect(() => {
    if (uploads.length > 0) {
      // Obtener el progreso del upload más reciente
      const latestUpload = uploads[uploads.length - 1];
      if (latestUpload && latestUpload.progress !== undefined) {
        setUploadProgress(latestUpload.progress);
      }
    } else {
      setUploadProgress(0);
    }
  }, [uploads]);





  const validateVideoDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        const duration = video.duration;
        resolve(duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  }, []);

  const handleImageDrop = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: 'File Too Large',
        description: `Image must be smaller than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create image element to check resolution
      const img = document.createElement('img') as HTMLImageElement;
      const imageUrl = URL.createObjectURL(file);

      img.onload = () => {
        // Validate image resolution
        if (img.width < MIN_IMAGE_RESOLUTION || img.height < MIN_IMAGE_RESOLUTION) {
          URL.revokeObjectURL(imageUrl);
          toast({
            title: 'Image Resolution Too Low',
            description: `Image must be at least ${MIN_IMAGE_RESOLUTION}x${MIN_IMAGE_RESOLUTION}px for good AR tracking.`,
            variant: 'destructive',
          });
          return;
        }

        const preview = URL.createObjectURL(file);
        setImageFile({
          file,
          preview,
          type: 'image',
          metadata: { width: img.width, height: img.height }
        });

        toast({
          title: 'Image Uploaded',
          description: 'Your image has been uploaded successfully.',
        });

        URL.revokeObjectURL(imageUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        toast({
          title: 'Invalid Image',
          description: 'Failed to process the image file.',
          variant: 'destructive',
        });
      };

      img.src = imageUrl;
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to process the image file.',
        variant: 'destructive',
      });
    }
  };

  const handleVideoDrop = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a video file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      toast({
        title: 'File Too Large',
        description: `Video must be smaller than ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Validate video duration
      const duration = await validateVideoDuration(file);
      if (duration > MAX_VIDEO_DURATION) {
        toast({
          title: 'Video Too Long',
          description: `Video must be shorter than ${MAX_VIDEO_DURATION} seconds.`,
          variant: 'destructive',
        });
        return;
      }

      const preview = URL.createObjectURL(file);
      setVideoFile({
        file,
        preview,
        type: 'video',
        metadata: { duration }
      });

      toast({
        title: 'Video Uploaded',
        description: 'Your video has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Error processing video:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to process the video file.',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    setDragActive(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(null);
  };

  const handleDrop = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    setDragActive(null);
    const files = e.dataTransfer.files;
    if (type === 'image') {
      handleImageDrop(files);
    } else {
      handleVideoDrop(files);
    }
  };

  const removeFile = (type: 'image' | 'video') => {
    if (type === 'image' && imageFile) {
      URL.revokeObjectURL(imageFile.preview);
      setImageFile(null);
    } else if (type === 'video' && videoFile) {
      URL.revokeObjectURL(videoFile.preview);
      setVideoFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error de autenticación",
        description: "Debes estar autenticado para crear una postal.",
        variant: "destructive",
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Sin conexión",
        description: "Necesitas conexión a internet para crear una postal.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Título requerido",
        description: "Por favor ingresa un título para tu postal.",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: "Imagen requerida",
        description: "Por favor selecciona una imagen para tu postal.",
        variant: "destructive",
      });
      return;
    }

    if (!videoFile) {
      toast({
        title: "Video requerido",
        description: "Por favor selecciona un video para tu postal.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCanCancel(true);
      
      // Convert video if needed (e.g., .mov to .mp4)
      let finalVideoFile = videoFile.file;
      if (needsConversion(videoFile.file.name)) {
        setCurrentStep('converting-video');
        updateOverallProgress('converting-video');
        logger.info('Convirtiendo video a formato compatible', { 
          userId: user.id, 
          operation: 'convert_video', 
          metadata: { originalFormat: videoFile.file.name.split('.').pop() } 
        });
        
        toast({
          title: "Convirtiendo video",
          description: "Tu video se está convirtiendo a formato MP4 compatible...",
        });
        
        finalVideoFile = await convertToMp4(videoFile.file);
        logger.info('Video convertido exitosamente', { 
          operation: 'video_converted', 
          metadata: { newSize: finalVideoFile.size } 
        });
      }
      
      setCurrentStep('creating');
      updateOverallProgress('creating');
      logger.info('Iniciando creación de postal', { userId: user.id, operation: 'create_postcard', metadata: { title } });

      // Create postcard record
      const postcard = await createPostcard({
        title: title.trim(),
        description: description.trim(),
        imageFile: imageFile.file,
        videoFile: finalVideoFile,
      });

      currentPostcardIdRef.current = postcard.postcard.id;
      logger.info('Postal creada', { postcardId: postcard.postcard.id, operation: 'create_postcard_record' });

      // Upload image
      setCurrentStep('uploading-image');
      updateOverallProgress('uploading-image');

      const imageUploadId = `image-${postcard.postcard.id}`;
      currentUploadIdsRef.current.image = imageUploadId;

      await uploadFile(imageFile.file, postcard.imageUploadUrl, { uploadId: imageUploadId });
      setImageUploaded(true);
      logger.info('Imagen subida exitosamente', { postcardId: postcard.postcard.id, operation: 'image_upload_complete' });

      // Upload video
      setCurrentStep('uploading-video');
      updateOverallProgress('uploading-video');

      const videoUploadId = `video-${postcard.postcard.id}`;
      currentUploadIdsRef.current.video = videoUploadId;

      await uploadFile(finalVideoFile, postcard.videoUploadUrl, { uploadId: videoUploadId });
      // Video uploaded successfully
      logger.info('Video subido exitosamente', { postcardId: postcard.postcard.id, operation: 'video_upload_complete' });

      // Trigger automatic NFT generation
      setImageUploaded(true);
      logger.info('Archivos subidos, iniciando generación de NFT', {
        postcardId: postcard.postcard.id,
        operation: 'files_uploaded_starting_nft'
      });
    } catch (error) {
      logger.error('Error creando postal', { operation: 'create_postcard' }, error instanceof Error ? error : new Error(String(error)));

      // Resetear estados en caso de error
      setCurrentStep('idle');
      setOverallProgress(0);
      setCanCancel(false);
      setImageUploaded(false);
      // Video removed
      currentPostcardIdRef.current = null;
      currentUploadIdsRef.current = {};

      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      toast({
        title: "Error al crear postal",
        description: `Hubo un problema al crear tu postal: ${errorMessage}. Por favor intenta de nuevo.`,
        variant: "destructive",
      });
    }
  };

  if (!isLoaded) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <TooltipProvider>
      <MainLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Crear Nueva Postal Loopar</h1>
              <p className="text-gray-600 mt-1">
                Sube una imagen y video para crear tu experiencia AR interactiva
              </p>
            </div>
          </div>

          {/* Indicador de conexión */}
          {!isOnline && (
            <Alert className="mb-4">
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Sin conexión a internet. Conéctate para crear una postal.
              </AlertDescription>
            </Alert>
          )}

          {/* Indicador de progreso detallado */}
          {currentStep !== 'idle' && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {currentStep === 'creating' && 'Creando postal...'}
                      {currentStep === 'uploading-image' && 'Subiendo imagen...'}
                      {currentStep === 'uploading-video' && 'Subiendo video...'}
                      {currentStep === 'generating-nft' && 'Generando NFT...'}
                      {currentStep === 'completed' && '¡Completado!'}
                    </h3>
                    {canCancel && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelOperation}
                        disabled={isCancelling}
                        className="text-red-600 hover:text-red-700"
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelando...
                          </>
                        ) : (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progreso general</span>
                      <span>{Math.round(overallProgress)}%</span>
                    </div>
                    <Progress value={overallProgress} className="w-full" />
                  </div>

                  {/* Progreso específico de subida */}
                  {(currentStep === 'uploading-image' || currentStep === 'uploading-video') && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>
                          {currentStep === 'uploading-image' ? 'Subiendo imagen' : 'Subiendo video'}
                        </span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {currentStep !== 'completed' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {currentStep === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <span>
                      {currentStep === 'creating' && 'Configurando tu postal...'}
                      {currentStep === 'uploading-image' && 'Procesando imagen...'}
                      {currentStep === 'uploading-video' && 'Procesando video...'}
                      {currentStep === 'generating-nft' && 'Creando experiencia AR...'}
                      {currentStep === 'completed' && 'Tu postal está lista'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>
                  Dale a tu postal Loopar un título y descripción
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ingresa un título atractivo para tu postal"
                    disabled={currentStep !== 'idle'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe tu postal Loopar (opcional)"
                    disabled={currentStep !== 'idle'}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Imagen Objetivo AR *
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Esta imagen será detectada por la cámara para activar el contenido AR. Usa imágenes con buen contraste, detalles únicos y evita superficies brillantes o reflectantes.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  Sube una imagen de alta calidad (mín. {MIN_IMAGE_RESOLUTION}x{MIN_IMAGE_RESOLUTION}px, máx. {MAX_IMAGE_SIZE / 1024 / 1024}MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!imageFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${currentStep !== 'idle'
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : dragActive === 'image'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    onDragOver={currentStep === 'idle' ? (e) => handleDragOver(e, 'image') : undefined}
                    onDragLeave={currentStep === 'idle' ? handleDragLeave : undefined}
                    onDrop={currentStep === 'idle' ? (e) => handleDrop(e, 'image') : undefined}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Suelta tu imagen aquí, o haz clic para explorar
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Soporta archivos JPG, PNG
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageDrop(e.target.files)}
                      className="hidden"
                      id="image-upload"
                      disabled={currentStep !== 'idle'}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentStep !== 'idle'}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      Elegir Imagen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Image
                        src={imageFile.preview}
                        alt="Preview"
                        width={400}
                        height={300}
                        className="w-full max-w-md mx-auto rounded-lg shadow-md object-cover"
                        unoptimized
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeFile('image')}
                        disabled={currentStep !== 'idle'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-center text-sm text-gray-600 space-y-1">
                      <p className="font-medium">{imageFile.file.name}</p>
                      <div className="flex justify-center gap-4 text-xs">
                        <span>{(imageFile.file.size / 1024 / 1024).toFixed(2)} MB</span>
                        {imageFile.metadata && (
                          <span>{imageFile.metadata.width}x{imageFile.metadata.height}px</span>
                        )}
                        <span className="text-green-600 font-medium">✓ Válida para AR</span>
                      </div>
                    </div>

                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Contenido de Video AR *
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este video aparecerá flotando sobre la imagen cuando sea detectada. Mantén el video corto (máx. 90 segundos) y con buena calidad para la mejor experiencia AR.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  Sube un video que se reproducirá cuando se escanee la imagen (máx. {MAX_VIDEO_SIZE / 1024 / 1024}MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!videoFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${currentStep !== 'idle'
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        : dragActive === 'video'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    onDragOver={currentStep === 'idle' ? (e) => handleDragOver(e, 'video') : undefined}
                    onDragLeave={currentStep === 'idle' ? handleDragLeave : undefined}
                    onDrop={currentStep === 'idle' ? (e) => handleDrop(e, 'video') : undefined}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Suelta tu video aquí, o haz clic para explorar
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Soporta archivos MP4, MOV
                    </p>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => e.target.files && handleVideoDrop(e.target.files)}
                      className="hidden"
                      id="video-upload"
                      disabled={currentStep !== 'idle'}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentStep !== 'idle'}
                      onClick={() => document.getElementById('video-upload')?.click()}
                    >
                      Elegir Video
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        src={videoFile.preview}
                        controls
                        className="w-full max-w-md mx-auto rounded-lg shadow-md"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeFile('video')}
                        disabled={currentStep !== 'idle'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-center text-sm text-gray-600 space-y-1">
                      <p className="font-medium">{videoFile.file.name}</p>
                      <div className="flex justify-center gap-4 text-xs">
                        <span>{(videoFile.file.size / 1024 / 1024).toFixed(2)} MB</span>
                        {videoFile.metadata?.duration && (
                          <span>{Math.round(videoFile.metadata.duration)}s duración</span>
                        )}
                        <span className="text-green-600 font-medium">✓ Válido para AR</span>
                      </div>
                    </div>

                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requirements Info */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">Requisitos para la Mejor Experiencia AR</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Usa imágenes de alto contraste con detalles claros</li>
                      <li>• Evita superficies reflectantes o transparentes</li>
                      <li>• Asegura buena iluminación al tomar fotos</li>
                      <li>• Mantén los videos bajo 90 segundos para carga óptima</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Bar - Shown at bottom when creating */}
            {currentStep !== 'idle' && (
              <Card className="border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 sticky bottom-4">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {currentStep !== 'completed' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {currentStep === 'converting-video' && 'Convirtiendo video...'}
                          {currentStep === 'creating' && 'Creando postal...'}
                          {currentStep === 'uploading-image' && 'Subiendo imagen...'}
                          {currentStep === 'uploading-video' && 'Subiendo video...'}
                          {currentStep === 'generating-nft' && 'Generando experiencia AR...'}
                          {currentStep === 'completed' && '¡Postal creada!'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {overallProgress < 100 ? `~${Math.max(1, Math.round((100 - overallProgress) / 10))}s restantes` : 'Redirigiendo...'}
                        </p>
                      </div>
                    </div>
                    {canCancel && currentStep !== 'completed' && (
                      <Button type="button" variant="outline" size="sm" onClick={handleCancelOperation} disabled={isCancelling} className="text-red-600">
                        {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                  <p className="text-xs text-gray-500 mt-2 text-right">{Math.round(overallProgress)}% completado</p>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link href="/dashboard">
                <Button type="button" variant="outline" disabled={currentStep !== 'idle'}>
                  Cancelar
                </Button>
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="submit" disabled={currentStep !== 'idle' || !imageFile || !videoFile || !title.trim() || !isOnline}>
                    {currentStep !== 'idle' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {currentStep === 'creating' && 'Creando postal...'}
                        {currentStep === 'uploading-image' && 'Subiendo imagen...'}
                        {currentStep === 'uploading-video' && 'Subiendo video...'}
                        {currentStep === 'generating-nft' && 'Generando NFT...'}
                        {currentStep === 'completed' && 'Completado'}
                      </>
                    ) : !isOnline ? (
                      <>
                        <WifiOff className="mr-2 h-4 w-4" />
                        Sin conexión
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Crear Postal AR
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Se requiere título, imagen y video para crear la postal AR</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </form>
        </div>
      </MainLayout>
    </TooltipProvider>
  );
}