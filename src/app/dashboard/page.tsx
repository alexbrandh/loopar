'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import { SharePostcard } from '@/components/SharePostcard';
import { Plus, Camera, Clock, CheckCircle, AlertCircle, Trash2, XCircle, ImageIcon, ExternalLink, Search, Filter, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePostcards } from '@/hooks/usePostcards';
import { ProcessingStatus } from '@/types/database';
import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { postcards, loading, error, deletePostcard, fetchPostcards, refreshAllPostcards } = usePostcards();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | 'all'>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debug logging for user authentication state
  useEffect(() => {
    console.log('🔐 [Dashboard] User authentication state:', {
      isLoaded,
      hasUser: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
  }, [user, isLoaded]);

  // Debug logging for postcards state
  useEffect(() => {
    console.log('🏠 [Dashboard] Postcards state updated:', {
      count: Array.isArray(postcards) ? postcards.length : 0,
      loading,
      error,
      postcards: postcards?.map(p => ({ id: p.id, title: p.title, status: p.processing_status })) || []
    });
  }, [postcards, loading, error]);

  // Handle visibility change for refresh when navigating back
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🏠 [Dashboard] Page became visible, scheduling refresh...');
        // Clear any existing timeout to prevent multiple calls
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        // Delay the refresh to avoid conflicts with other ongoing requests
        visibilityTimeout = setTimeout(() => {
          // Only refresh if user is authenticated and not currently loading
          if (isLoaded && user && !loading) {
            console.log('🏠 [Dashboard] Executing delayed refresh...');
            fetchPostcards(false); // Use non-cache-busting fetch
          }
        }, 1000); // Increased delay to 1000ms to avoid conflicts
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [fetchPostcards, isLoaded, user, loading]);

  const handleDelete = async (postcardId: string) => {
    try {
      setIsDeleting(true);
      await deletePostcard(postcardId);
      setConfirmOpen(false);
      setPendingDeleteId(null);
    } catch {
      // Error handling is done in the hook
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedPostcard = useMemo(() => {
    if (!pendingDeleteId || !Array.isArray(postcards)) return null;
    return postcards.find(p => p.id === pendingDeleteId) || null;
  }, [pendingDeleteId, postcards]);

  // Filter and search postcards
  const filteredPostcards = useMemo(() => {
    if (!Array.isArray(postcards)) {
      return [];
    }
    return postcards.filter(postcard => {
      const matchesSearch = postcard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (postcard.description && postcard.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || postcard.processing_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [postcards, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!Array.isArray(postcards)) {
      return { total: 0, ready: 0, processing: 0, errors: 0 };
    }
    const total = postcards.length;
    const ready = postcards.filter(p => p.processing_status === 'ready').length;
    const processing = postcards.filter(p => p.processing_status === 'processing').length;
    const errors = postcards.filter(p => p.processing_status === 'error' || p.processing_status === 'needs_better_image').length;
    return { total, ready, processing, errors };
  }, [postcards]);

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

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando tus postales...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Algo salió mal</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => fetchPostcards(false)}>
                Intentar de nuevo
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <TooltipProvider>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Postales Loopar</h1>
            <p className="text-gray-600 mt-1">
              {!Array.isArray(postcards) || postcards.length === 0 
                ? 'Crea tu primera postal AR para comenzar' 
                : `${postcards.length} postal${postcards.length === 1 ? '' : 'es'}`
              }
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Crear Nueva Postal
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        {Array.isArray(postcards) && postcards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <p className="text-xs text-gray-600">Total Postales</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
                <p className="text-xs text-gray-600">Listas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.processing}</div>
                <p className="text-xs text-gray-600">Procesando</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <p className="text-xs text-gray-600">Con Errores</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        {Array.isArray(postcards) && postcards.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar postales por título o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProcessingStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="ready">Listas</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="error">Con errores</SelectItem>
                  <SelectItem value="needs_better_image">Necesita mejor imagen</SelectItem>
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshAllPostcards()}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualizar datos desde la base de datos</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Results Info */}
        {Array.isArray(postcards) && postcards.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {filteredPostcards.length === postcards.length 
                ? `Mostrando ${filteredPostcards.length} postal${filteredPostcards.length === 1 ? '' : 'es'}`
                : `Mostrando ${filteredPostcards.length} de ${postcards.length} postales`
              }
            </p>
          </div>
        )}

        {/* Empty State */}
        {!Array.isArray(postcards) || postcards.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Camera className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Aún no hay postales</h2>
              <p className="text-gray-600 mb-6">
                Crea tu primera postal AR subiendo una foto y video. 
                Comparte experiencias mágicas que cobran vida a través de cualquier cámara.
              </p>
              <Link href="/dashboard/new">
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Crear Tu Primera Postal
                </Button>
              </Link>
            </div>
          </div>
        ) : filteredPostcards.length === 0 ? (
          /* No Results State */
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-md">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron postales</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Intenta ajustar tus filtros de búsqueda.'
                  : 'No tienes postales que coincidan con los criterios.'
                }
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Postcards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPostcards.map((postcard) => (
              <Card 
                key={postcard.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  // Navigate to postcard detail view
                  window.location.href = `/dashboard/postcard/${postcard.id}`;
                }}
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
                        <p>
                          {postcard.processing_status === 'processing' && 'Tu postal está siendo procesada para AR. Esto puede tomar unos minutos.'}
                          {postcard.processing_status === 'ready' && 'Tu postal está lista para compartir y ver en AR.'}
                          {postcard.processing_status === 'error' && 'Hubo un error procesando tu postal. Revisa los detalles abajo.'}
                          {postcard.processing_status === 'needs_better_image' && 'La imagen necesita mayor resolución para un mejor tracking AR.'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Image Preview */}
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                    {postcard.image_url ? (
                      <Image 
                        src={postcard.image_url} 
                        alt={postcard.title}
                        fill
                        className="object-cover"
                        onError={() => {
                          console.log('Error loading image:', postcard.image_url);
                        }}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Processing Progress */}
                  {postcard.processing_status === 'processing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Generando descriptores AR...</span>
                        <span className="text-gray-600">75%</span>
                      </div>
                      <Progress value={75} className="h-2" />
                      <p className="text-xs text-gray-500">
                        Creando archivos NFT para seguimiento AR. Este proceso optimiza tu imagen para la mejor experiencia AR posible.
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {postcard.processing_status === 'error' && postcard.error_message && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{postcard.error_message}</p>
                    </div>
                  )}

                  {/* Needs Better Image Message */}
                  {postcard.processing_status === 'needs_better_image' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700">
                        La calidad de la imagen es muy baja para el seguimiento AR. Por favor sube una imagen de mayor resolución.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {postcard.processing_status === 'ready' && (
                      <div className="flex-1">
                        <SharePostcard postcardId={postcard.id} title={postcard.title} />
                      </div>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(postcard.id);
                            setConfirmOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Eliminar postal permanentemente</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    <div className="flex justify-between">
                      <span>Creado: {new Date(postcard.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        {postcard.is_public ? (
                          <><ExternalLink className="h-3 w-3" /> Público</>
                        ) : (
                          'Privado'
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open && !isDeleting) { setConfirmOpen(open); setPendingDeleteId(null); } }}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Eliminar postal</DialogTitle>
            <DialogDescription>
              {selectedPostcard ? (
                <>¿Seguro que deseas eliminar &quot;{selectedPostcard.title}&quot;? Esta acción no se puede deshacer.</>
              ) : (
                <>¿Seguro que deseas eliminar esta postal? Esta acción no se puede deshacer.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { if (!isDeleting) { setConfirmOpen(false); setPendingDeleteId(null); } }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (pendingDeleteId) { handleDelete(pendingDeleteId); } }}
              disabled={!pendingDeleteId || isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  </TooltipProvider>
);
}