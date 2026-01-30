'use client';

import { useState } from 'react';
import { ArrowLeft, Camera, QrCode, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Postcard } from '@/types/database';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { isValidImageUrl, handleImageError } from '@/lib/url-utils';

interface SharePostcardViewProps {
  postcard: Postcard;
}

export function SharePostcardView({ postcard }: SharePostcardViewProps) {
  const [imageError, setImageError] = useState(false);
  const arUrl = `/ar/${postcard.id}`;
  const shareUrl = `${window.location.origin}/share/${postcard.id}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Postcard AR: ${postcard.title}`,
          text: `¡Mira esta increíble postcard en realidad aumentada!`,
          url: shareUrl
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error compartiendo:', error);
          toast.error('Error al compartir');
        }
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Enlace copiado al portapapeles');
      } catch (error) {
        console.error('Error copiando al portapapeles:', error);
        toast.error('Error al copiar enlace');
      }
    }
  };

  const openAR = () => {
    // Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // En móvil, abrir directamente el visor AR
      window.location.href = arUrl;
    } else {
      // En desktop, abrir en nueva pestaña
      window.open(arUrl, '_blank');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center text-blue-600 hover:text-blue-700">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Loopar
        </Link>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </Button>
      </div>

      {/* Postcard Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{postcard.title}</CardTitle>
              <CardDescription className="text-base">
                Experimenta esta postcard en realidad aumentada
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Listo para AR
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Imagen */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                {postcard.image_url && isValidImageUrl(postcard.image_url) && !imageError ? (
                  <Image
                    src={postcard.image_url}
                    alt={postcard.title}
                    fill
                    className="object-cover"
                    unoptimized={true} // ✅ Deshabilitando optimización para URLs firmadas de Supabase
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <QrCode className="h-16 w-16" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 text-center">
                📱 Usa esta imagen como marcador AR
              </p>
            </div>

            {/* Instrucciones y botones */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">¿Cómo funciona?</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Haz clic en &quot;Abrir en AR&quot; desde tu móvil</li>
                  <li>Permite el acceso a la cámara</li>
                  <li>Apunta la cámara hacia la imagen de arriba</li>
                  <li>¡Disfruta de la experiencia AR!</li>
                </ol>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={openAR}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Abrir en AR
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open(arUrl, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en nueva pestaña
                </Button>
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Consejos:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Usa buena iluminación</li>
                  <li>• Mantén la imagen plana y visible</li>
                  <li>• Mueve el dispositivo lentamente</li>
                  <li>• Funciona mejor en móviles</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm">
        <p>Creado con ❤️ usando Loopar AR</p>
        <p className="mt-1">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Crea tu propia postcard AR
          </Link>
        </p>
      </div>
    </div>
  );
}