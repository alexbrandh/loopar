'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Download, Eye, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MainLayout } from '@/components/layout/MainLayout';
import { SharePostcard } from '@/components/SharePostcard';
import { usePostcards } from '@/hooks/usePostcards';
import { Postcard, ProcessingStatus } from '@/types/database';

export default function PostcardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { postcards, loading, error, fetchPostcards } = usePostcards();
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [notFound, setNotFound] = useState(false);

  const postcardId = params.id as string;

  useEffect(() => {
    if (!loading && Array.isArray(postcards)) {
      const foundPostcard = postcards.find(p => p.id === postcardId);
      if (foundPostcard) {
        setPostcard(foundPostcard);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    }
  }, [postcards, postcardId, loading]);

  useEffect(() => {
    // Fetch postcards if not already loaded
    if (!loading && (!postcards || postcards.length === 0)) {
      fetchPostcards(false);
    }
  }, [fetchPostcards, loading, postcards]);

  const getStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'needs_better_image':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: ProcessingStatus) => {
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

  const getStatusVariant = (status: ProcessingStatus) => {
    switch (status) {
      case 'processing':
        return 'secondary' as const;
      case 'ready':
        return 'default' as const;
      case 'error':
        return 'destructive' as const;
      case 'needs_better_image':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando postal...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || notFound) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {notFound ? 'Postal no encontrada' : 'Error al cargar'}
              </h2>
              <p className="text-gray-600 mb-4">
                {notFound 
                  ? 'La postal que buscas no existe o ha sido eliminada.'
                  : error || 'Hubo un problema al cargar la postal.'
                }
              </p>
              <Button onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!postcard) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando postal...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{postcard.title}</h1>
            <p className="text-gray-600 mt-1">
              Creado el {new Date(postcard.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={getStatusVariant(postcard.processing_status)} className="flex items-center gap-2">
            {getStatusIcon(postcard.processing_status)}
            <span>{getStatusText(postcard.processing_status)}</span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                {postcard.image_url ? (
                  <Image 
                    src={postcard.image_url} 
                    alt={postcard.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Eye className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Sin imagen</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  {postcard.description || 'Sin descripción disponible.'}
                </p>
              </CardContent>
            </Card>

            {/* Status Details */}
            <Card>
              <CardHeader>
                <CardTitle>Estado del Procesamiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(postcard.processing_status)}
                  <span className="font-medium">{getStatusText(postcard.processing_status)}</span>
                </div>
                
                {postcard.processing_status === 'processing' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Tu postal está siendo procesada para AR. Este proceso puede tomar unos minutos mientras generamos los descriptores necesarios para el seguimiento.
                    </p>
                  </div>
                )}
                
                {postcard.processing_status === 'ready' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ¡Tu postal está lista! Ahora puedes compartirla y cualquier persona podrá verla en realidad aumentada usando su cámara.
                    </p>
                  </div>
                )}
                
                {postcard.processing_status === 'error' && postcard.error_message && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{postcard.error_message}</p>
                  </div>
                )}
                
                {postcard.processing_status === 'needs_better_image' && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      La calidad de la imagen es muy baja para el seguimiento AR. Por favor sube una imagen de mayor resolución para obtener mejores resultados.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {postcard.processing_status === 'ready' && (
                    <SharePostcard postcardId={postcard.id} title={postcard.title} />
                  )}
                  
                  {postcard.image_url && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = postcard.image_url!;
                        link.download = `${postcard.title}.jpg`;
                        link.click();
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Imagen
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Creado: {new Date(postcard.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Actualizado: {new Date(postcard.updated_at).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="text-xs text-gray-500">
                  ID: {postcard.id}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}