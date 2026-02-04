'use client';

import { useOffline } from '@/hooks/useOffline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WifiOff, Download } from 'lucide-react';
import { useState } from 'react';

export function OfflineIndicator() {
  const { isOnline, isInstallable, installApp } = useOffline();
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);

  if (isOnline && (!isInstallable || !showInstallPrompt)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
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
                  onClick={() => setShowInstallPrompt(false)}
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Ahora no
                </Button>
                <Button
                  size="sm"
                  onClick={installApp}
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