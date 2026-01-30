import { logger } from './logger';

// Tipos para el sistema de debugging
export interface NetworkError {
  id: string;
  timestamp: number;
  type: 'network' | 'timeout' | 'abort' | 'unknown';
  message: string;
  url?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  retryCount?: number;
  userAgent?: string;
  connectionType?: string;
}

export interface RequestMetrics {
  id: string;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'aborted';
  statusCode?: number;
  errorType?: string;
  retryCount: number;
}

export interface ErrorPattern {
  type: string;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  urls: string[];
  messages: string[];
}

// Storage para errores y métricas
class DebugStorage {
  private errors: NetworkError[] = [];
  private requests: Map<string, RequestMetrics> = new Map();
  private maxErrors = 100;
  private maxRequests = 50;

  addError(error: NetworkError) {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    // Logging removed for performance - was causing excessive console output
  }

  addRequest(request: RequestMetrics) {
    this.requests.set(request.id, request);
    if (this.requests.size > this.maxRequests) {
      const oldestKey = this.requests.keys().next().value;
      if (oldestKey) {
        this.requests.delete(oldestKey);
      }
    }
  }

  updateRequest(id: string, updates: Partial<RequestMetrics>) {
    const request = this.requests.get(id);
    if (request) {
      Object.assign(request, updates);
      if (updates.endTime && request.startTime) {
        request.duration = updates.endTime - request.startTime;
      }
    }
  }

  getErrors(limit?: number): NetworkError[] {
    return limit ? this.errors.slice(0, limit) : [...this.errors];
  }

  getRequests(): RequestMetrics[] {
    return Array.from(this.requests.values());
  }

  getActiveRequests(): RequestMetrics[] {
    return this.getRequests().filter(r => r.status === 'pending');
  }

  clear() {
    this.errors = [];
    this.requests.clear();
    logger.info('Debug storage cleared');
  }
}

const debugStorage = new DebugStorage();

// Tipo de utilidades expuestas en window para debugging en desarrollo
export interface DebugUtils {
  getErrors: () => NetworkError[];
  getRequests: () => RequestMetrics[];
  analyzePatterns: typeof analyzeErrorPatterns;
  generateReport: typeof generateDebugReport;
  clear: typeof clearDebugData;
  detectIssues: typeof detectConnectivityIssues;
}

declare global {
  interface Window {
    debugUtils?: DebugUtils;
  }
}

// Utilidades para generar IDs únicos
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Detectar tipo de error de red
export function detectNetworkErrorType(error: unknown): NetworkError['type'] {
  if (!error) return 'unknown';
  
  const errorObj = error as { message?: string; name?: string };
  const message = errorObj.message?.toLowerCase() || '';
  const name = errorObj.name?.toLowerCase() || '';
  
  if (name === 'aborterror' || message.includes('abort')) {
    return 'abort';
  }
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('err_network') ||
    message.includes('err_internet_disconnected')
  ) {
    return 'network';
  }
  
  return 'unknown';
}

// Obtener información de conexión
export function getConnectionInfo(): { type: string; effectiveType?: string } {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as { connection?: { type?: string; effectiveType?: string } }).connection;
    return {
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown'
    };
  }
  return { type: 'unknown' };
}

// Logging detallado de errores de red
export function logNetworkError(
  error: unknown,
  context: {
    url?: string;
    method?: string;
    duration?: number;
    retryCount?: number;
  } = {}
): string {
  const errorId = generateRequestId();
  const connectionInfo = getConnectionInfo();
  
  const errorObj = error as { message?: string; status?: number; statusCode?: number };
  
  const networkError: NetworkError = {
    id: errorId,
    timestamp: Date.now(),
    type: detectNetworkErrorType(error),
    message: errorObj?.message || 'Unknown error',
    url: context.url,
    method: context.method,
    statusCode: errorObj?.status || errorObj?.statusCode,
    duration: context.duration,
    retryCount: context.retryCount || 0,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    connectionType: `${connectionInfo.type}${connectionInfo.effectiveType ? `/${connectionInfo.effectiveType}` : ''}`
  };
  
  debugStorage.addError(networkError);
  
  // Log adicional para errores críticos
  if (networkError.type === 'abort' && (context.retryCount || 0) > 2) {
    logger.warn('Repeated abort errors detected', {
      operation: 'network_error_analysis',
      metadata: {
        url: context.url,
        retryCount: context.retryCount,
        pattern: 'potential_connection_issue'
      }
    });
  }
  
  return errorId;
}

// Monitorear estado de requests
export function startRequestMonitoring(
  url: string,
  method: string = 'GET'
): string {
  const requestId = generateRequestId();
  
  const request: RequestMetrics = {
    id: requestId,
    url,
    method,
    startTime: Date.now(),
    status: 'pending',
    retryCount: 0
  };
  
  debugStorage.addRequest(request);
  // Logging removed for performance
  return requestId;
}

export function endRequestMonitoring(
  requestId: string,
  status: 'success' | 'error' | 'aborted',
  statusCode?: number,
  errorType?: string
) {
  const endTime = Date.now();
  
  debugStorage.updateRequest(requestId, {
    endTime,
    status,
    statusCode,
    errorType
  });
  
  // Logging removed for performance
}

export function incrementRetryCount(requestId: string) {
  const request = debugStorage.getRequests().find(r => r.id === requestId);
  if (request) {
    request.retryCount++;
    // Logging removed for performance
  }
}

// Análisis de patrones de error
export function analyzeErrorPatterns(timeWindow: number = 300000): ErrorPattern[] {
  const now = Date.now();
  const recentErrors = debugStorage.getErrors().filter(
    error => now - error.timestamp <= timeWindow
  );
  
  const patterns = new Map<string, ErrorPattern>();
  
  recentErrors.forEach(error => {
    const key = `${error.type}_${error.url || 'unknown'}`;
    
    if (patterns.has(key)) {
      const pattern = patterns.get(key)!;
      pattern.count++;
      pattern.lastOccurrence = error.timestamp;
      if (!pattern.messages.includes(error.message)) {
        pattern.messages.push(error.message);
      }
    } else {
      patterns.set(key, {
        type: error.type,
        count: 1,
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp,
        urls: [error.url || 'unknown'],
        messages: [error.message]
      });
    }
  });
  
  return Array.from(patterns.values())
    .sort((a, b) => b.count - a.count);
}

// Detectar problemas de conectividad
export function detectConnectivityIssues(): {
  hasIssues: boolean;
  issues: string[];
  recommendations: string[];
} {
  const patterns = analyzeErrorPatterns();
  const activeRequests = debugStorage.getActiveRequests();
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Detectar muchos errores de abort
  const abortPattern = patterns.find(p => p.type === 'abort');
  if (abortPattern && abortPattern.count > 3) {
    issues.push(`Múltiples errores de abort detectados (${abortPattern.count})`);
    recommendations.push('Verificar estabilidad de la conexión a internet');
    recommendations.push('Considerar aumentar los timeouts de las requests');
  }
  
  // Detectar requests colgadas
  const hangingRequests = activeRequests.filter(
    req => Date.now() - req.startTime > 60000
  );
  if (hangingRequests.length > 0) {
    issues.push(`${hangingRequests.length} requests colgadas detectadas`);
    recommendations.push('Implementar timeouts más agresivos');
  }
  
  // Detectar patrones de timeout
  const timeoutPattern = patterns.find(p => p.type === 'timeout');
  if (timeoutPattern && timeoutPattern.count > 2) {
    issues.push(`Múltiples timeouts detectados (${timeoutPattern.count})`);
    recommendations.push('Verificar latencia de red');
    recommendations.push('Considerar optimizar el tamaño de las requests');
  }
  
  return {
    hasIssues: issues.length > 0,
    issues,
    recommendations
  };
}

// Generar reporte de debugging
export function generateDebugReport(): {
  summary: {
    totalErrors: number;
    totalRequests: number;
    activeRequests: number;
    errorRate: number;
  };
  recentErrors: NetworkError[];
  errorPatterns: ErrorPattern[];
  connectivityIssues: ReturnType<typeof detectConnectivityIssues>;
  recommendations: string[];
} {
  const errors = debugStorage.getErrors();
  const requests = debugStorage.getRequests();
  const activeRequests = debugStorage.getActiveRequests();
  const patterns = analyzeErrorPatterns();
  const connectivityIssues = detectConnectivityIssues();
  
  const errorRate = requests.length > 0 ? (errors.length / requests.length) * 100 : 0;
  
  const recommendations: string[] = [];
  
  if (errorRate > 20) {
    recommendations.push('Alta tasa de errores detectada - revisar conectividad');
  }
  
  if (activeRequests.length > 5) {
    recommendations.push('Muchas requests activas - considerar limitar concurrencia');
  }
  
  if (patterns.some(p => p.count > 5)) {
    recommendations.push('Patrones de error repetitivos - implementar circuit breaker');
  }
  
  return {
    summary: {
      totalErrors: errors.length,
      totalRequests: requests.length,
      activeRequests: activeRequests.length,
      errorRate: Math.round(errorRate * 100) / 100
    },
    recentErrors: errors.slice(0, 10),
    errorPatterns: patterns.slice(0, 5),
    connectivityIssues,
    recommendations: [...recommendations, ...connectivityIssues.recommendations]
  };
}

// Limpiar datos de debugging
export function clearDebugData() {
  debugStorage.clear();
}

// Hook para debugging en desarrollo
export function useDebugConsole() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.debugUtils = {
      getErrors: () => debugStorage.getErrors(),
      getRequests: () => debugStorage.getRequests(),
      analyzePatterns: analyzeErrorPatterns,
      generateReport: generateDebugReport,
      clear: clearDebugData,
      detectIssues: detectConnectivityIssues
    };
    
    logger.info('Debug utilities available at window.debugUtils');
  }
}

// Exportar storage para uso interno
export { debugStorage };