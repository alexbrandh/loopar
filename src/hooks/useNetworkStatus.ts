'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { isAbortError as utilIsAbortError } from '@/lib/abort-controller-manager';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export interface UseNetworkStatusReturn {
  networkStatus: NetworkStatus;
  isOnline: boolean;
  isSlowConnection: boolean;
  waitForConnection: () => Promise<void>;
  retryWithConnection: <T>(fn: () => Promise<T>, maxRetries?: number) => Promise<T>;
}

const DEFAULT_NETWORK_STATUS: NetworkStatus = {
  isOnline: true,
  isSlowConnection: false,
  connectionType: 'unknown',
  effectiveType: '4g',
  downlink: 10,
  rtt: 100
};

/**
 * Hook para monitorear el estado de la conexión de red
 * Detecta cuando la conexión se pierde/restaura y permite pausar operaciones
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(DEFAULT_NETWORK_STATUS);

  const updateNetworkStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    
    // Obtener información de conexión si está disponible
    const connection = (navigator as { connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number }; mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number }; webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number } }).connection ||
      (navigator as { connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number }; mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number }; webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number } }).mozConnection ||
      (navigator as { connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number }; mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number }; webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number } }).webkitConnection;
    
    let connectionInfo = {
      connectionType: 'unknown',
      effectiveType: '4g',
      downlink: 10,
      rtt: 100
    };

    if (connection) {
      connectionInfo = {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100
      };
    }

    // Determinar si es una conexión lenta
    const isSlowConnection = 
      connectionInfo.effectiveType === 'slow-2g' ||
      connectionInfo.effectiveType === '2g' ||
      connectionInfo.downlink < 1.5 ||
      connectionInfo.rtt > 300;

    const newStatus: NetworkStatus = {
      isOnline,
      isSlowConnection,
      ...connectionInfo
    };

    setNetworkStatus(prev => {
      if (prev.isOnline !== newStatus.isOnline) {
        logger.info(`🌐 [NETWORK] Connection ${newStatus.isOnline ? 'restored' : 'lost'}`, {
          operation: 'network_status_change',
          metadata: {
            status: newStatus,
            timestamp: new Date().toISOString()
          }
        });
      }
      return newStatus;
    });
  }, []);

  useEffect(() => {
    // Actualizar estado inicial
    updateNetworkStatus();

    // Escuchar cambios de conexión
    const handleOnline = () => {
      logger.info('🌐 [NETWORK] Connection restored');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      logger.warn('🌐 [NETWORK] Connection lost');
      updateNetworkStatus();
    };

    // Escuchar cambios en la información de conexión
    const handleConnectionChange = () => {
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as { 
      connection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      }; 
      mozConnection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      }; 
      webkitConnection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      } 
    }).connection ||
    (navigator as { 
      connection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      }; 
      mozConnection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      }; 
      webkitConnection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      } 
    }).mozConnection ||
    (navigator as { 
      connection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      }; 
      mozConnection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      }; 
      webkitConnection?: { 
        type?: string; 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      } 
    }).webkitConnection;
    
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection && connection.removeEventListener) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  /**
   * Espera hasta que la conexión esté disponible
   */
  const waitForConnection = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (networkStatus.isOnline) {
        resolve();
        return;
      }

      logger.info('🌐 [NETWORK] Waiting for connection...');
      
      const checkConnection = () => {
        if (navigator.onLine) {
          logger.info('🌐 [NETWORK] Connection available, resuming...');
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };

      checkConnection();
    });
  }, [networkStatus.isOnline]);

  /**
   * Ejecuta una función con reintentos automáticos cuando hay conexión
   */
  const retryWithConnection = useCallback(async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 2 // ✅ Reducido de 3 a 2 para evitar reintentos excesivos
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Esperar conexión si no está disponible
        await waitForConnection();
        
        // Ejecutar la función
        const result = await fn();
        
        if (attempt > 1) {
          logger.info(`🌐 [NETWORK] Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Si es un error de red, esperar antes del siguiente intento
        if (isNetworkError(error)) {
          logger.warn(`🌐 [NETWORK] Network error on attempt ${attempt}/${maxRetries}`, {
            operation: 'network_retry',
            metadata: {
              attempt,
              maxRetries,
              error: error instanceof Error ? error.message : String(error)
            }
          });
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(1.5, attempt - 1), 3000); // ✅ Delays más largos: 1000ms, 1500ms, max 3000ms
            logger.info(`🌐 [NETWORK] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          // Si no es un error de red, no reintentar
          throw error;
        }
      }
    }
    
    logger.error(`🌐 [NETWORK] All ${maxRetries} attempts failed`);
    throw lastError!;
  }, [waitForConnection]);

  return {
    networkStatus,
    isOnline: networkStatus.isOnline,
    isSlowConnection: networkStatus.isSlowConnection,
    waitForConnection,
    retryWithConnection
  };
}

// Enhanced error detection
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  // Don't treat abort errors as network errors - they're intentional cancellations
  if (utilIsAbortError(error)) {
    return false;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    // Network-related error patterns (excluding abort errors)
    const networkPatterns = [
      'network',
      'fetch',
      'connection',
      'timeout',
      'offline',
      'no internet',
      'dns',
      'unreachable',
      'failed to fetch',
      'networkerror',
      'err_network',
      'err_internet_disconnected',
      'err_connection'
    ];
    
    return networkPatterns.some(pattern => 
      message.includes(pattern) || name.includes(pattern)
    );
  }
  
  return false;
}

/**
 * Utilidad para crear un AbortController con timeout
 */
export function createAbortControllerWithTimeout(timeoutMs: number = 30000): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
  }, timeoutMs);
  
  return { controller, timeoutId };
}