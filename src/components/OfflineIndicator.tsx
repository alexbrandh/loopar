'use client';

import { useOffline } from '@/hooks/useOffline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WifiOff, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'regaliz_pwa_install_dismissed_at';
const DISMISS_DAYS = 14;

export function OfflineIndicator() {
  const { isOnline, isInstallable, installApp } = useOffline();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Defer the install prompt: only show after 25s, never on first visit if dismissed in last 14d
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    const ageDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    if (dismissedAt && ageDays < DISMISS_DAYS) return;

    const t = setTimeout(() => setShowInstallPrompt(true), 25000);
    return () => clearTimeout(t);
  }, []);

  const dismissInstall = () => {
    setShowInstallPrompt(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
  };

  if (isOnline && (!isInstallable || !showInstallPrompt)) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 z-60 max-w-sm">
      {!isOnline && (
        <Card className="mb-2 border-orange-200 bg-orange-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">
                Sin conexión - Modo offline activo
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isInstallable && showInstallPrompt && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-blue-800">
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Instalar Regaliz
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismissInstall}
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Ahora no
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    installApp();
                    dismissInstall();
                  }}
                  className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  Instalar
                </Button>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Accede rápidamente desde tu pantalla de inicio
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}