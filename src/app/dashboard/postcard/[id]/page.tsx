'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Download, Eye, Video, Image as ImageIcon, Loader2, QrCode, Copy, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { isValidImageUrl, handleImageError } from '@/lib/url-utils';

// Removed unused PostcardResponse interface

export default function PostcardDetailPage() {
  const params = useParams();
  const [postcard, setPostcard] = useState<{
    id: string;
    title: string;
    description: string;
    image_url: string;
    video_url: string;
    video_path?: string; // Path for signed URL generation
    user_id?: string; // User ID for path construction
    status: string;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrDialog, setShowQrDialog] = useState(false);
  
  const postcardId = params?.id as string;

  // Generate signed URL for video using the hook
  // Construct video path from postcard data
  const videoPath = postcard?.user_id && postcard?.id 
    ? `${postcard.user_id}/${postcard.id}/video.mp4`
    : '';

  const {
    signedUrl: videoSignedUrl,
    loading: videoUrlLoading,
    error: videoUrlError
  } = useSignedUrl({
    bucket: 'postcard-videos',
    path: videoPath,
    expiresIn: 3600, // 1 hour
    enabled: !!videoPath && postcard?.status === 'ready'
  });

  useEffect(() => {
    if (!postcardId) return;

    const fetchPostcard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/postcards/${postcardId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch postcard');
        }
        
        if (data.success) {
          setPostcard(data.data);
        } else {
          throw new Error(data.error?.message || 'Failed to fetch postcard');
        }
      } catch (err) {
        console.error('Error fetching postcard:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch postcard');
      } finally {
        setLoading(false);
      }
    };

    fetchPostcard();
  }, [postcardId]);

  // Generar código QR cuando la postal esté lista
  useEffect(() => {
    if (postcard && postcard.status === 'ready') {
      const arUrl = `${window.location.origin}/ar/${postcard.id}`;
      QRCode.toDataURL(arUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Error generating QR code:', err));
    }
  }, [postcard]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'ready':
        return <div className="h-5 w-5 flex items-center justify-center text-green-600">✓</div>;
      case 'error':
        return <div className="h-5 w-5 flex items-center justify-center text-red-600">❌</div>;
      case 'needs_better_image':
        return <div className="h-5 w-5 flex items-center justify-center text-yellow-600">⚠️</div>;
      default:
        return <div className="h-5 w-5 flex items-center justify-center text-gray-600">?</div>;
    }
  };

  const handleShare = async (type: 'copy' | 'qr' | 'whatsapp' | 'twitter') => {
    if (!postcard) return;
    const url = `${window.location.origin}/ar/${postcard.id}`;
    
    switch (type) {
      case 'copy':
        await navigator.clipboard.writeText(url);
        toast.success('Enlace copiado al portapapeles');
        break;
      case 'qr':
        setShowQrDialog(true);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`¡Mira mi postal en realidad aumentada! ${url}`)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`¡Mira mi postal en realidad aumentada! ${url}`)}`, '_blank');
        break;
    }
  };





  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing':
        return 'Procesando';
      case 'ready':
        return 'Listo';
      case 'error':
        return 'Error';
      case 'needs_better_image':
        return 'Necesita Mejor Imagen';
      default:
        return 'Desconocido';
    }
  };

  // Removed unused getStatusVariant function

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-muted-foreground">Cargando postal...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 text-red-500 mx-auto flex items-center justify-center">
                ❌
              </div>
              <div>
                <h3 className="text-lg font-semibold">Error al cargar la postal</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Link href="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!postcard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 text-yellow-500 mx-auto flex items-center justify-center">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-semibold">Postal no encontrada</h3>
                <p className="text-muted-foreground">
                  La postal que buscas no existe o no está disponible.
                </p>
              </div>
              <Link href="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">
              {postcard.title || 'Postal sin título'}
            </h1>
            {getStatusIcon(postcard.status)}
          </div>
          
          {postcard.description && (
            <p className="text-muted-foreground mb-4">{postcard.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Estado: {getStatusText(postcard.status)}</span>
            <span>•</span>
            <span>Creada: {new Date(postcard.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vista previa de imagen */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Imagen Target</h2>
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {postcard.image_url && isValidImageUrl(postcard.image_url) ? (
                <Image
                  src={postcard.image_url}
                  alt={postcard.title || 'Imagen de la postal'}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(postcard.image_url, e.target as HTMLImageElement)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Vista previa de video */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Video AR</h2>
            <div className="relative bg-muted rounded-lg overflow-hidden" style={{maxHeight: '600px', minHeight: '300px'}}>
              {postcard.video_url ? (
                <>
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    muted
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      console.error('Video error:', e);
                      if (videoUrlError) {
                        console.error('Video URL generation error:', videoUrlError);
                      }
                    }}
                    onLoadStart={() => {
                      console.log('Video load started with URL:', videoSignedUrl || postcard.video_url);
                    }}
                    onCanPlay={() => {
                      console.log('Video can play');
                    }}
                  >
                    <source src={videoSignedUrl || postcard.video_url} type="video/mp4" />
                    Tu navegador no soporta el elemento de video.
                  </video>
                  {videoUrlLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  {videoUrlError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg">
                      <p className="text-red-600 text-sm">Error cargando video: {videoUrlError}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-8 space-y-6">
          {/* Botón principal de AR - siempre visible */}
          <div className="flex flex-col gap-4">
            {postcard.status === 'ready' ? (
              <Link href={`/ar/${postcard.id}`}>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6">
                  <Eye className="mr-2 h-5 w-5" />
                  Ver en Realidad Aumentada
                </Button>
              </Link>
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(postcard.status)}
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Experiencia AR en preparación
                  </h3>
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                  {postcard.status === 'processing' && 'Estamos procesando tu postal para crear la experiencia de realidad aumentada...'}
                  {postcard.status === 'error' && 'Hubo un error al procesar tu postal. Por favor, intenta nuevamente.'}
                  {postcard.status === 'needs_better_image' && 'La imagen necesita más contraste o detalles para funcionar bien en AR.'}
                </p>
                <Button disabled variant="outline" className="opacity-50">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver en AR (No disponible)
                </Button>
              </div>
            )}
          </div>

          {/* Opciones de compartir - solo cuando esté listo */}
          {postcard.status === 'ready' && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Compartir experiencia AR</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleShare('copy')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar enlace
                </Button>
                
                <Button
                  onClick={() => handleShare('qr')}
                  variant="outline"
                  size="sm"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Código QR
                </Button>
                
                <Button
                  onClick={() => handleShare('whatsapp')}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                
                <Button
                  onClick={() => handleShare('twitter')}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Twitter
                </Button>
              </div>
            </div>
          )}

          {/* Sección de descargas - mejorada */}
          {(postcard.video_url || postcard.image_url) && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">Descargas</h3>
              <div className="flex flex-wrap gap-3">
                {/* Botón descargar imagen */}
                {postcard.image_url && (
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = postcard.image_url!;
                      link.download = `${postcard.title || 'postal'}-imagen.jpg`;
                      link.click();
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Descargar Imagen
                  </Button>
                )}
                
                {/* Botón descargar video */}
                {postcard.video_url && (
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = postcard.video_url!;
                      link.download = `${postcard.title || 'postal'}-video.mp4`;
                      link.click();
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Descargar Video
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Diálogo del código QR */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Código QR para Realidad Aumentada</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              {qrCodeUrl && (
                <Image
                  src={qrCodeUrl}
                  alt="Código QR para AR"
                  width={256}
                  height={256}
                  className="border rounded-lg"
                />
              )}
              <p className="text-sm text-muted-foreground text-center">
                Escanea este código QR con tu teléfono para acceder directamente a la experiencia de realidad aumentada.
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  onClick={() => handleShare('copy')}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar enlace
                </Button>
                <Button
                  onClick={() => {
                    if (qrCodeUrl) {
                      const link = document.createElement('a');
                      link.href = qrCodeUrl;
                      link.download = `qr-${postcard.title || 'postal'}.png`;
                      link.click();
                    }
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar QR
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}