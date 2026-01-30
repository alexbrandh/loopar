'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SharePostcard } from '@/components/SharePostcard';
import { Clock, CheckCircle, AlertCircle, Trash2, XCircle, ImageIcon, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProcessingStatus } from '@/types/database';
import type { Postcard } from '@/types/database';
import { isValidImageUrl, handleImageError } from '@/lib/url-utils';

interface PostcardCardProps {
  postcard: Postcard;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}

const getStatusIcon = (status: ProcessingStatus) => {
  switch (status) {
    case 'processing':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'ready':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'needs_better_image':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
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

const PostcardCard = memo(({ postcard, onDelete, onNavigate }: PostcardCardProps) => {
  const handleCardClick = () => {
    onNavigate(postcard.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(postcard.id);
  };

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-blue-200"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{postcard.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {postcard.description}
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={getStatusVariant(postcard.processing_status)} className="ml-2 flex-shrink-0 cursor-help">
                <div className="flex items-center gap-1">
                  {getStatusIcon(postcard.processing_status)}
                  <span className="text-xs">{getStatusText(postcard.processing_status)}</span>
                </div>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Estado: {getStatusText(postcard.processing_status)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Image Preview */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          {postcard.image_url && isValidImageUrl(postcard.image_url) ? (
            <Image
              src={postcard.image_url}
              alt={postcard.title}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
              unoptimized={true} // ✅ Deshabilitando optimización para URLs firmadas de Supabase
              onError={(e) => handleImageError(postcard.image_url, e.target as HTMLImageElement)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
          
          {/* Processing Progress Overlay */}
          {postcard.processing_status === 'processing' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 max-w-xs w-full mx-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Procesando AR...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {(postcard.processing_status === 'error' || postcard.processing_status === 'needs_better_image') && postcard.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Problema detectado</p>
                <p className="text-xs text-red-600 mt-1">{postcard.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {postcard.processing_status === 'ready' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/ar/${postcard.id}`, '_blank');
                  }}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver AR
                </Button>
                <SharePostcard postcardId={postcard.id} title={postcard.title} />
              </>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

PostcardCard.displayName = 'PostcardCard';

export { PostcardCard };