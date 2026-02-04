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
import { ImageCropper, getCroppedImg } from '@/components/ui/image-cropper';
import FileUpload from '@/components/ui/file-upload';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);

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
  const MAX_VIDEO_SIZE = 250 * 1024 * 1024; // 250MB para videos
  const MIN_IMAGE_RESOLUTION = 800;
  // Sin límite de duración de video

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
        title: 'Tipo de archivo inválido',
        description: 'Por favor sube un archivo de imagen.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: 'Archivo muy grande',
        description: `La imagen debe ser menor a ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create image element to check resolution
      const img = document.createElement('img') as HTMLImageElement;
      const imageUrl = URL.createObjectURL(file);

      img.onload = () => {
        // Show cropper instead of directly setting the file
        setRawImageForCrop(imageUrl);
        setShowImageCropper(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        toast({
          title: 'Imagen inválida',
          description: 'Error al procesar el archivo de imagen.',
          variant: 'destructive',
        });
      };

      img.src = imageUrl;
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: 'Error de carga',
        description: 'Error al procesar el archivo de imagen.',
        variant: 'destructive',
      });
    }
  };

  const handleCropComplete = async (croppedBlob: Blob, croppedUrl: string) => {
    // Create a File from the Blob
    const croppedFile = new File([croppedBlob], 'cropped-image.png', { type: 'image/png' });
    
    // Get dimensions of cropped image
    const img = document.createElement('img');
    img.src = croppedUrl;
    await new Promise(resolve => img.onload = resolve);
    
    // Check minimum resolution after crop
    if (img.width < MIN_IMAGE_RESOLUTION || img.height < MIN_IMAGE_RESOLUTION) {
      toast({
        title: 'Resolución muy baja',
        description: `La imagen recortada debe ser al menos ${MIN_IMAGE_RESOLUTION}x${MIN_IMAGE_RESOLUTION}px para buen tracking AR.`,
        variant: 'destructive',
      });
      return;
    }
    
    setImageFile({
      file: croppedFile,
      preview: croppedUrl,
      type: 'image',
      metadata: { width: img.width, height: img.height }
    });
    
    setShowImageCropper(false);
    setRawImageForCrop(null);
    
    toast({
      title: 'Imagen recortada',
      description: 'Tu imagen ha sido recortada exitosamente.',
    });
  };

  const handleCropCancel = () => {
    if (rawImageForCrop) {
      URL.revokeObjectURL(rawImageForCrop);
    }
    setShowImageCropper(false);
    setRawImageForCrop(null);
  };

  const handleVideoDrop = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Tipo de archivo inválido',
        description: 'Por favor sube un archivo de video.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (250MB max)
    if (file.size > MAX_VIDEO_SIZE) {
      toast({
        title: 'Archivo muy grande',
        description: `El video debe ser menor a ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Obtener duración del video (sin límite)
      const duration = await validateVideoDuration(file);

      const preview = URL.createObjectURL(file);
      setVideoFile({
        file,
        preview,
        type: 'video',
        metadata: { duration }
      });

      toast({
        title: 'Video cargado',
        description: 'Tu video ha sido cargado exitosamente.',
      });
    } catch (error) {
      console.error('Error processing video:', error);
      toast({
        title: 'Error de carga',
        description: 'Error al procesar el archivo de video.',
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <TooltipProvider>
      <MainLayout>
        {/* Image Cropper Modal */}
        {showImageCropper && rawImageForCrop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] overflow-y-auto">
              <ImageCropper
                initialImage={rawImageForCrop}
                onCropComplete={handleCropComplete}
                onCancel={handleCropCancel}
                minWidth={MIN_IMAGE_RESOLUTION}
                minHeight={MIN_IMAGE_RESOLUTION}
                title="Recortar Imagen para Postal AR"
                description="Selecciona el área de la imagen y la proporción deseada (16:9 o 4:5)"
              />
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header mejorado */}
          <div className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Volver al Panel
            </Link>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-ring mb-4">
                <ImageIcon className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Crear Nueva Postal</h1>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm sm:text-base">
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

          <AnimatePresence>
            {currentStep !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="mb-6"
              >
                <Card className="border-primary/20 bg-secondary/50 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {currentStep !== 'completed' ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 className="h-5 w-5 text-primary" />
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </motion.div>
                          )}
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {currentStep === 'converting-video' && 'Convirtiendo video...'}
                              {currentStep === 'creating' && 'Creando postal...'}
                              {currentStep === 'uploading-image' && 'Subiendo imagen...'}
                              {currentStep === 'uploading-video' && 'Subiendo video...'}
                              {currentStep === 'generating-nft' && 'Generando experiencia AR...'}
                              {currentStep === 'completed' && '¡Completado!'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {currentStep === 'creating' && 'Configurando tu postal...'}
                              {currentStep === 'uploading-image' && 'Procesando imagen...'}
                              {currentStep === 'uploading-video' && 'Procesando video...'}
                              {currentStep === 'generating-nft' && 'Creando experiencia AR...'}
                              {currentStep === 'completed' && 'Tu postal está lista'}
                              {currentStep === 'converting-video' && 'Optimizando formato...'}
                            </p>
                          </div>
                        </div>
                        {canCancel && currentStep !== 'completed' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelOperation}
                            disabled={isCancelling}
                            className="text-destructive hover:text-destructive/80"
                          >
                            {isCancelling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Progress bar animada */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Progreso</span>
                          <span className="font-medium">{Math.round(overallProgress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${overallProgress}%` }}
                            transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                            className={`h-full rounded-full ${overallProgress < 100 ? 'bg-primary' : 'bg-emerald-500'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>
                  Dale a tu postal Regaliz un título y descripción
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
                    placeholder="Describe tu postal Regaliz (opcional)"
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
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
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
                <FileUpload
                  type="image"
                  accept="image/*"
                  maxSize={MAX_IMAGE_SIZE}
                  onFileSelect={(file) => {
                    const fileList = new DataTransfer();
                    fileList.items.add(file);
                    handleImageDrop(fileList.files);
                  }}
                  onFileRemove={() => removeFile('image')}
                  file={imageFile ? {
                    name: imageFile.file.name,
                    size: imageFile.file.size,
                    type: imageFile.file.type,
                    preview: imageFile.preview,
                  } : null}
                  isUploading={currentStep === 'uploading-image'}
                  uploadProgress={currentStep === 'uploading-image' ? uploadProgress : undefined}
                  title="Sube tu imagen"
                  description="Esta imagen activará tu contenido AR"
                  supportedFormats="JPG, PNG • Mín. 800x800px"
                  disabled={currentStep !== 'idle'}
                />
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
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
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
                <FileUpload
                  type="video"
                  accept="video/*"
                  maxSize={MAX_VIDEO_SIZE}
                  onFileSelect={(file) => {
                    const fileList = new DataTransfer();
                    fileList.items.add(file);
                    handleVideoDrop(fileList.files);
                  }}
                  onFileRemove={() => removeFile('video')}
                  file={videoFile ? {
                    name: videoFile.file.name,
                    size: videoFile.file.size,
                    type: videoFile.file.type,
                    preview: videoFile.preview,
                  } : null}
                  isUploading={currentStep === 'uploading-video'}
                  uploadProgress={currentStep === 'uploading-video' ? uploadProgress : undefined}
                  title="Sube tu video"
                  description="Este video aparecerá sobre la imagen AR"
                  supportedFormats="MP4, MOV • Máx. 90 segundos"
                  disabled={currentStep !== 'idle'}
                />
              </CardContent>
            </Card>

            {/* Requirements Info */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Requisitos para la Mejor Experiencia AR</h4>
                    <ul className="text-sm text-foreground/80 space-y-1">
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
            <AnimatePresence>
              {currentStep !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 50, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="sticky bottom-4"
                >
                  <Card className="border-primary/20 bg-secondary/50 shadow-lg backdrop-blur">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {currentStep !== 'completed' ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 className="h-5 w-5 text-primary" />
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </motion.div>
                          )}
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {currentStep === 'converting-video' && 'Convirtiendo video...'}
                              {currentStep === 'creating' && 'Creando postal...'}
                              {currentStep === 'uploading-image' && 'Subiendo imagen...'}
                              {currentStep === 'uploading-video' && 'Subiendo video...'}
                              {currentStep === 'generating-nft' && 'Generando experiencia AR...'}
                              {currentStep === 'completed' && '¡Postal creada!'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {overallProgress < 100 ? `~${Math.max(1, Math.round((100 - overallProgress) / 10))}s restantes` : 'Redirigiendo...'}
                            </p>
                          </div>
                        </div>
                        {canCancel && currentStep !== 'completed' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelOperation}
                            disabled={isCancelling}
                            className="text-destructive hover:text-destructive/80"
                          >
                            {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${overallProgress}%` }}
                          transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                          className={`h-full rounded-full ${overallProgress < 100 ? 'bg-primary' : 'bg-emerald-500'}`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-right font-medium">{Math.round(overallProgress)}% completado</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

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