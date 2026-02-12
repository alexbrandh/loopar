'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  IoLockClosedOutline, 
  IoMailOutline, 
  IoCalendarOutline, 
  IoLinkOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoAlertCircleOutline,
  IoImageOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoRefreshOutline,
  IoStatsChartOutline,
  IoPersonOutline,
  IoCopyOutline,
  IoOpenOutline,
  IoCloseOutline,
  IoDownloadOutline,
  IoEyeOutline,
  IoVideocamOutline,
  IoPlayCircleOutline,
  IoCreateOutline,
  IoSwapHorizontalOutline,
  IoCloudUploadOutline,
} from 'react-icons/io5';

interface User {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Postcard {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  video_url: string;
  processing_status: 'processing' | 'ready' | 'error' | 'needs_better_image';
  error_message: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user: User;
  arLink: string;
}

interface Stats {
  total: number;
  ready: number;
  processing: number;
  error: number;
  needsBetterImage: number;
  uniqueUsers: number;
}

type FilterStatus = 'all' | 'ready' | 'processing' | 'error' | 'needs_better_image';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewPostcard, setPreviewPostcard] = useState<Postcard | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [editPostcard, setEditPostcard] = useState<Postcard | null>(null);
  const [editMediaType, setEditMediaType] = useState<'image' | 'video' | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditModal = (postcard: Postcard, mediaType: 'image' | 'video') => {
    setEditPostcard(postcard);
    setEditMediaType(mediaType);
    setEditFile(null);
    setEditPreview(null);
    setUploadProgress('');
  };

  const closeEditModal = () => {
    if (editPreview) URL.revokeObjectURL(editPreview);
    setEditPostcard(null);
    setEditMediaType(null);
    setEditFile(null);
    setEditPreview(null);
    setUploadProgress('');
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editPreview) URL.revokeObjectURL(editPreview);
    setEditFile(file);
    setEditPreview(URL.createObjectURL(file));
  };

  const handleEditUpload = async () => {
    if (!editPostcard || !editMediaType || !editFile) return;
    setUploading(true);
    setUploadProgress(editMediaType === 'image' 
      ? 'Paso 1/3: Subiendo imagen...' 
      : 'Subiendo video...');

    try {
      const savedPassword = sessionStorage.getItem('admin_auth');

      // Step 1: Upload the media file
      const formData = new FormData();
      formData.append('password', savedPassword || '');
      formData.append('mediaType', editMediaType);
      formData.append('file', editFile);

      const res = await fetch(`/api/admin/postcards/${editPostcard.id}/media`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setUploadProgress(`Error: ${data.error}`);
        return;
      }

      // For video uploads, we're done
      if (editMediaType !== 'image') {
        setUploadProgress('¡Video actualizado!');
        setTimeout(() => { closeEditModal(); refreshData(); }, 1500);
        return;
      }

      // Step 2: Compile MindAR target client-side
      setUploadProgress('Paso 2/3: Compilando target AR en el navegador... (puede tardar ~20s)');

      const mindBlob = await compileMindARInBrowser(editFile);

      // Step 3: Upload .mind file to admin endpoint
      setUploadProgress('Paso 3/3: Subiendo target AR...');

      const mindFormData = new FormData();
      mindFormData.append('password', savedPassword || '');
      mindFormData.append('mindFile', mindBlob, 'target.mind');
      mindFormData.append('userId', data.data.userId);

      const mindRes = await fetch(`/api/admin/postcards/${editPostcard.id}/mind-target`, {
        method: 'POST',
        body: mindFormData,
      });

      const mindData = await mindRes.json();

      if (mindData.success) {
        setUploadProgress('¡Imagen y target AR actualizados correctamente!');
      } else {
        setUploadProgress(`Imagen subida, pero error en AR: ${mindData.error}`);
      }

      setTimeout(() => { closeEditModal(); refreshData(); }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadProgress(`Error: ${err instanceof Error ? err.message : 'Error al subir el archivo'}`);
    } finally {
      setUploading(false);
    }
  };

  /** Compile a MindAR .mind target file in the browser */
  const compileMindARInBrowser = async (imageFile: File): Promise<Blob> => {
    // Load MindAR compiler via CDN
    const Compiler = await new Promise<any>((resolve, reject) => {
      const moduleScript = document.createElement('script');
      moduleScript.type = 'module';
      moduleScript.textContent = `
        import { Compiler } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
        window.__MindARCompiler = Compiler;
        window.dispatchEvent(new CustomEvent('mindar-compiler-ready'));
      `;
      const timeout = setTimeout(() => {
        moduleScript.remove();
        reject(new Error('Timeout cargando compilador MindAR'));
      }, 30000);

      const handleReady = () => {
        clearTimeout(timeout);
        window.removeEventListener('mindar-compiler-ready', handleReady);
        const C = (window as any).__MindARCompiler;
        if (C) resolve(C);
        else reject(new Error('Compilador MindAR no encontrado'));
      };
      window.addEventListener('mindar-compiler-ready', handleReady);
      document.head.appendChild(moduleScript);
    });

    // Load image into canvas
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => { URL.revokeObjectURL(i.src); resolve(i); };
      i.onerror = () => { URL.revokeObjectURL(i.src); reject(new Error('Error cargando imagen')); };
      i.src = URL.createObjectURL(imageFile);
    });

    const canvas = document.createElement('canvas');
    let { width, height } = img;
    const maxSize = 1024;
    if (width > maxSize || height > maxSize) {
      if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
      else { width = Math.round((width * maxSize) / height); height = maxSize; }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.drawImage(img, 0, 0, width, height);

    // Compile
    const compiler = new Compiler();
    await compiler.compileImageTargets([canvas], (progress: number) => {
      setUploadProgress(`Paso 2/3: Compilando AR... ${Math.round(progress * 100)}%`);
    });

    const exportedData = await compiler.exportData();
    return new Blob([exportedData], { type: 'application/octet-stream' });
  };

  const openPreview = (postcard: Postcard, type: 'image' | 'video') => {
    setMediaError(false);
    setPreviewPostcard(postcard);
    setPreviewType(type);
  };

  const closePreview = () => {
    setPreviewPostcard(null);
    setPreviewType(null);
    setMediaError(false);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(url, '_blank');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/postcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setPostcards(data.data.postcards);
        setStats(data.data.stats);
        sessionStorage.setItem('admin_auth', password);
      } else {
        setError(data.error || 'Error de autenticación');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const savedPassword = sessionStorage.getItem('admin_auth');
      const res = await fetch('/api/admin/postcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setPostcards(data.data.postcards);
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPassword = sessionStorage.getItem('admin_auth');
    if (savedPassword) {
      setPassword(savedPassword);
      fetch('/api/admin/postcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsAuthenticated(true);
            setPostcards(data.data.postcards);
            setStats(data.data.stats);
          }
        })
        .catch(console.error);
    }
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    // Remove any whitespace/newlines from URL before copying
    const cleanText = text.replace(/\s+/g, '').trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <IoCheckmarkCircleOutline className="text-green-500" />;
      case 'processing':
        return <IoTimeOutline className="text-yellow-500" />;
      case 'error':
        return <IoAlertCircleOutline className="text-red-500" />;
      case 'needs_better_image':
        return <IoImageOutline className="text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Lista';
      case 'processing':
        return 'Procesando';
      case 'error':
        return 'Error';
      case 'needs_better_image':
        return 'Necesita mejor imagen';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'needs_better_image':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const filteredPostcards = postcards.filter(postcard => {
    const matchesSearch = 
      postcard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      postcard.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (postcard.user.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (postcard.user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || postcard.processing_status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setPostcards([]);
    setStats(null);
    sessionStorage.removeItem('admin_auth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-linear-to-br from-[#F47B6B] to-[#F5B5B5] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <IoLockClosedOutline className="text-3xl text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Panel de Administración</h1>
              <p className="text-gray-400 text-sm">Ingresa la contraseña para acceder</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F47B6B] focus:border-transparent transition-all"
                  placeholder="••••••"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  <IoAlertCircleOutline className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 px-4 bg-linear-to-r from-[#F47B6B] to-[#F5B5B5] text-white font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <IoLockClosedOutline />
                    Acceder
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-[#F47B6B] to-[#F5B5B5] rounded-xl flex items-center justify-center">
              <IoStatsChartOutline className="text-xl text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
              <p className="text-gray-400 text-xs">Gestión de postales AR</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all disabled:opacity-50"
              title="Actualizar datos"
            >
              <IoRefreshOutline className={`text-xl ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
            >
              <IoCloseOutline className="text-xl" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <IoStatsChartOutline className="text-xl text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <IoCheckmarkCircleOutline className="text-xl text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.ready}</p>
                  <p className="text-xs text-gray-400">Listas</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <IoTimeOutline className="text-xl text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.processing}</p>
                  <p className="text-xs text-gray-400">Procesando</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <IoAlertCircleOutline className="text-xl text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.error}</p>
                  <p className="text-xs text-gray-400">Errores</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <IoImageOutline className="text-xl text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.needsBetterImage}</p>
                  <p className="text-xs text-gray-400">Mejor Img</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <IoPersonOutline className="text-xl text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.uniqueUsers}</p>
                  <p className="text-xs text-gray-400">Usuarios</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título, email o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F47B6B] focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <IoFilterOutline className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F47B6B] focus:border-transparent transition-all"
              >
                <option value="all">Todos los estados</option>
                <option value="ready">Listas</option>
                <option value="processing">Procesando</option>
                <option value="error">Error</option>
                <option value="needs_better_image">Necesita mejor imagen</option>
              </select>
            </div>
          </div>
        </div>

        {/* Postcards Table */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Postal</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredPostcards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'No se encontraron postales con los filtros aplicados'
                        : 'No hay postales registradas'}
                    </td>
                  </tr>
                ) : (
                  filteredPostcards.map((postcard) => (
                    <tr key={postcard.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-linear-to-br from-[#F47B6B]/20 to-[#F5B5B5]/20 rounded-full flex items-center justify-center">
                            <IoPersonOutline className="text-[#F47B6B]" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {postcard.user.firstName && postcard.user.lastName 
                                ? `${postcard.user.firstName} ${postcard.user.lastName}`
                                : 'Sin nombre'}
                            </p>
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <IoMailOutline className="shrink-0" />
                              <span className="truncate max-w-[200px]">{postcard.user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium text-sm truncate max-w-[200px]">{postcard.title}</p>
                          {postcard.description && (
                            <p className="text-gray-400 text-xs truncate max-w-[200px]">{postcard.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(postcard.processing_status)}`}>
                          {getStatusIcon(postcard.processing_status)}
                          {getStatusLabel(postcard.processing_status)}
                        </span>
                        {postcard.error_message && (
                          <p className="text-red-400 text-xs mt-1 truncate max-w-[150px]" title={postcard.error_message}>
                            {postcard.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <IoCalendarOutline className="shrink-0" />
                          <span>{formatDate(postcard.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {/* Preview Image */}
                          <button
                            onClick={() => openPreview(postcard, 'image')}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Ver imagen"
                            disabled={!postcard.image_url}
                          >
                            <IoImageOutline />
                          </button>
                          {/* Preview Video */}
                          <button
                            onClick={() => openPreview(postcard, 'video')}
                            className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                            title="Ver video"
                            disabled={!postcard.video_url}
                          >
                            <IoPlayCircleOutline />
                          </button>
                          {/* Download Image */}
                          <button
                            onClick={() => downloadFile(postcard.image_url, `${postcard.title}-imagen.jpg`)}
                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                            title="Descargar imagen"
                            disabled={!postcard.image_url}
                          >
                            <IoDownloadOutline />
                          </button>
                          {/* Download Video */}
                          <button
                            onClick={() => downloadFile(postcard.video_url, `${postcard.title}-video.mp4`)}
                            className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all"
                            title="Descargar video"
                            disabled={!postcard.video_url}
                          >
                            <IoVideocamOutline />
                          </button>
                          <div className="w-px h-5 bg-gray-700 mx-0.5" />
                          {/* Change Image */}
                          <button
                            onClick={() => openEditModal(postcard, 'image')}
                            className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                            title="Cambiar imagen"
                          >
                            <IoSwapHorizontalOutline />
                          </button>
                          {/* Change Video */}
                          <button
                            onClick={() => openEditModal(postcard, 'video')}
                            className="p-2 text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all"
                            title="Cambiar video"
                          >
                            <IoCreateOutline />
                          </button>
                          <div className="w-px h-5 bg-gray-700 mx-0.5" />
                          {/* Copy AR Link */}
                          <button
                            onClick={() => copyToClipboard(postcard.arLink, postcard.id)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                            title="Copiar enlace AR"
                          >
                            {copiedId === postcard.id ? (
                              <IoCheckmarkCircleOutline className="text-green-500" />
                            ) : (
                              <IoCopyOutline />
                            )}
                          </button>
                          {/* Open AR Experience */}
                          <a
                            href={postcard.arLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                            title="Abrir experiencia AR"
                          >
                            <IoOpenOutline />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Mostrando {filteredPostcards.length} de {postcards.length} postales
            </p>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewPostcard && previewType && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] bg-gray-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                {previewType === 'image' ? (
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <IoImageOutline className="text-xl text-blue-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <IoVideocamOutline className="text-xl text-purple-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">{previewPostcard.title}</h3>
                  <p className="text-sm text-gray-400">
                    {previewType === 'image' ? 'Imagen de la postal' : 'Video de la experiencia'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(
                    previewType === 'image' ? previewPostcard.image_url : previewPostcard.video_url,
                    `${previewPostcard.title}-${previewType === 'image' ? 'imagen.jpg' : 'video.mp4'}`
                  )}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-all"
                >
                  <IoDownloadOutline />
                  <span className="hidden sm:inline">Descargar</span>
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                >
                  <IoCloseOutline className="text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex items-center justify-center bg-gray-900/50 max-h-[calc(90vh-80px)] overflow-auto">
              {previewType === 'image' ? (
                !mediaError && previewPostcard.image_url ? (
                  <img
                    src={previewPostcard.image_url}
                    alt={previewPostcard.title}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    onError={() => setMediaError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                    <IoImageOutline className="text-6xl mb-4" />
                    <p>{mediaError ? 'Error al cargar la imagen' : 'Imagen no disponible'}</p>
                    {previewPostcard.image_url && (
                      <a 
                        href={previewPostcard.image_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        Abrir URL directamente
                      </a>
                    )}
                  </div>
                )
              ) : (
                !mediaError && previewPostcard.video_url ? (
                  <video
                    src={previewPostcard.video_url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                    onError={() => setMediaError(true)}
                  >
                    Tu navegador no soporta la reproducción de video.
                  </video>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                    <IoVideocamOutline className="text-6xl mb-4" />
                    <p>{mediaError ? 'Error al cargar el video' : 'Video no disponible'}</p>
                    {previewPostcard.video_url && (
                      <a 
                        href={previewPostcard.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        Abrir URL directamente
                      </a>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-800">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <IoPersonOutline />
                  <span>{previewPostcard.user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IoCalendarOutline />
                  <span>{formatDate(previewPostcard.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(previewPostcard.processing_status)}
                  <span>{getStatusLabel(previewPostcard.processing_status)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Media Modal */}
      {editPostcard && editMediaType && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeEditModal}
        >
          <div 
            className="relative max-w-lg w-full bg-gray-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  editMediaType === 'image' ? 'bg-cyan-500/10' : 'bg-pink-500/10'
                }`}>
                  {editMediaType === 'image' 
                    ? <IoImageOutline className="text-xl text-cyan-500" />
                    : <IoVideocamOutline className="text-xl text-pink-500" />
                  }
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Cambiar {editMediaType === 'image' ? 'Imagen' : 'Video'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {editPostcard.title}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
              >
                <IoCloseOutline className="text-xl" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Current media preview */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Actual:</p>
                <div className="bg-gray-900/50 rounded-lg overflow-hidden max-h-40 flex items-center justify-center">
                  {editMediaType === 'image' && editPostcard.image_url ? (
                    <img src={editPostcard.image_url} alt="Actual" className="max-h-40 object-contain" />
                  ) : editMediaType === 'video' && editPostcard.video_url ? (
                    <video src={editPostcard.video_url} className="max-h-40" muted autoPlay loop playsInline />
                  ) : (
                    <div className="py-8 text-gray-500 text-sm">Sin archivo actual</div>
                  )}
                </div>
              </div>

              {/* New file upload */}
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Nuevo {editMediaType === 'image' ? 'imagen' : 'video'}:
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={editMediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleEditFileChange}
                  className="hidden"
                />
                
                {editPreview ? (
                  <div className="space-y-3">
                    <div className="bg-gray-900/50 rounded-lg overflow-hidden max-h-48 flex items-center justify-center">
                      {editMediaType === 'image' ? (
                        <img src={editPreview} alt="Nuevo" className="max-h-48 object-contain" />
                      ) : (
                        <video src={editPreview} className="max-h-48" muted autoPlay loop playsInline />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300 truncate max-w-[200px]">
                        {editFile?.name}
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        Cambiar archivo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 transition-all flex flex-col items-center gap-2 text-gray-400 hover:text-gray-300"
                  >
                    <IoCloudUploadOutline className="text-3xl" />
                    <span className="text-sm">
                      Haz clic para seleccionar {editMediaType === 'image' ? 'una imagen' : 'un video'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {editMediaType === 'image' ? 'JPG, PNG, WebP' : 'MP4, MOV'}
                    </span>
                  </button>
                )}
              </div>

              {/* Warning for image changes */}
              {editMediaType === 'image' && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <IoAlertCircleOutline className="text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">
                    Al cambiar la imagen, se regenerará el target AR automáticamente. 
                    La postal estará en estado &quot;Procesando&quot; hasta que el nuevo target esté listo.
                  </p>
                </div>
              )}

              {/* Upload progress */}
              {uploadProgress && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  uploadProgress.startsWith('Error') 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : uploadProgress.includes('actualizado') || uploadProgress.includes('actualizada')
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                }`}>
                  {uploading && (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
                  )}
                  {uploadProgress.includes('actualizado') || uploadProgress.includes('actualizada') ? (
                    <IoCheckmarkCircleOutline className="shrink-0" />
                  ) : null}
                  <span>{uploadProgress}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleEditUpload}
                disabled={!editFile || uploading}
                className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-[#F47B6B] to-[#F5B5B5] text-white font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <IoCloudUploadOutline />
                    Guardar cambio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
