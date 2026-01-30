'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostcardCard } from '@/components/PostcardCard';
import { DashboardStats } from '@/components/DashboardStats';
import { Plus, Camera, Search, Filter, RefreshCw, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePostcards } from '@/hooks/usePostcards';
import { ProcessingStatus } from '@/types/database';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { postcards, loading, error, deletePostcard, fetchPostcards, refreshAllPostcards } = usePostcards();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | 'all'>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debug logging removed for performance - was causing unnecessary re-renders

  // Debug logging removed for performance - was mapping all postcards on every state change

  // Handle visibility change for refresh when navigating back
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Visibility change detected - scheduling refresh
        // Clear any existing timeout to prevent multiple calls
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        // Delay the refresh to avoid conflicts with other ongoing requests
        visibilityTimeout = setTimeout(() => {
          // Only refresh if user is authenticated and not currently loading
          if (isLoaded && user && !loading) {
            // Executing delayed refresh
            fetchPostcards(false); // Use non-cache-busting fetch
          }
        }, 2000); // ✅ Aumentado a 2000ms para evitar conflictos
      }
    };

    // ✅ Solo agregar listener si el usuario está autenticado
    if (isLoaded && user) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [isLoaded, user]); // ✅ Removido loading y fetchPostcards de las dependencias

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



  const handleNavigateToPostcard = useCallback((id: string) => {
    window.location.href = `/dashboard/postcard/${id}`;
  }, []);

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
        <DashboardStats postcards={postcards} />

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
            <PostcardCard
              key={postcard.id}
              postcard={postcard}
              onDelete={deletePostcard}
              onNavigate={handleNavigateToPostcard}
            />
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