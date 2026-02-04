'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Download, Eye, Video, Image as ImageIcon, Loader2, QrCode, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      <MainLayout>
        <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Cargando postal...</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Error al cargar la postal</h3>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                <Link href="/dashboard">
                  <Button variant="outline" className="border-border hover:bg-muted">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!postcard) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Postal no encontrada</h3>
                  <p className="text-muted-foreground">
                    La postal que buscas no existe o no está disponible.
                  </p>
                </div>
                <Link href="/dashboard">
                  <Button variant="outline" className="border-border hover:bg-muted">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {/* Header con navegación */}
          <div className="mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground hover:bg-muted -ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {postcard.title || 'Postal sin título'}
              </h1>
              <Badge 
                className={`w-fit text-sm font-medium px-3 py-1 rounded-full ${
                  postcard.status === 'ready' 
                    ? 'bg-emerald-500 text-white' 
                    : postcard.status === 'processing'
                    ? 'bg-amber-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {postcard.status === 'ready' && <CheckCircle className="h-4 w-4" />}
                  {postcard.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {getStatusText(postcard.status)}
                </span>
              </Badge>
            </div>
            
            {postcard.description && (
              <p className="text-muted-foreground mb-3 max-w-2xl">{postcard.description}</p>
            )}
            
            <p className="text-sm text-primary">
              Creada: {new Date(postcard.created_at).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Grid de contenido */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Vista previa de imagen */}
            <Card className="border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border bg-muted/50">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Imagen Target
                  </h2>
                </div>
                <div className="relative aspect-4/3 bg-muted">
                  {postcard.image_url && isValidImageUrl(postcard.image_url) ? (
                    <Image
                      src={postcard.image_url}
                      alt={postcard.title || 'Imagen de la postal'}
                      fill
                      className="object-contain"
                      onError={(e) => handleImageError(postcard.image_url, e.target as HTMLImageElement)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vista previa de video */}
            <Card className="border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border bg-muted/50">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    Video AR
                  </h2>
                </div>
                <div className="relative aspect-4/3 bg-foreground">
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
                  <Video className="h-16 w-16 text-muted-foreground/70" />
                </div>
              )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones */}
          <div className="mt-8 space-y-6">
            {/* Botón principal de AR */}
            {postcard.status === 'ready' ? (
              <Card className="border-border bg-linear-to-r from-primary/10 to-ring/10">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">¡Tu postal está lista!</h3>
                      <p className="text-muted-foreground text-sm">Apunta tu cámara a la imagen para ver la magia.</p>
                    </div>
                    <Link href={`/ar/${postcard.id}`}>
                      <Button size="lg" className="bg-linear-to-r from-primary to-ring hover:from-primary/90 hover:to-ring/90 text-white font-semibold shadow-md hover:shadow-lg transition-all">
                        <Eye className="mr-2 h-5 w-5" />
                        Ver en Realidad Aumentada
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(postcard.status)}
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-1">
                        Experiencia AR en preparación
                      </h3>
                      <p className="text-amber-700 text-sm mb-3">
                        {postcard.status === 'processing' && 'Estamos procesando tu postal para crear la experiencia de realidad aumentada...'}
                        {postcard.status === 'error' && 'Hubo un error al procesar tu postal. Por favor, intenta nuevamente.'}
                        {postcard.status === 'needs_better_image' && 'La imagen necesita más contraste o detalles para funcionar bien en AR.'}
                      </p>
                      <Button disabled variant="outline" className="opacity-50 border-amber-300">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver en AR (No disponible)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Opciones de compartir - solo cuando esté listo */}
            {postcard.status === 'ready' && (
              <Card className="border-border">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Compartir experiencia AR</h3>
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
                      className="bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Twitter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sección de descargas */}
            {(postcard.video_url || postcard.image_url) && (
              <Card className="border-border">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Descargas</h3>
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
                        className="border-border hover:bg-muted"
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Descargar Video
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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
    </MainLayout>
  );
}