/**
 * Enhanced logging utility for debugging and monitoring
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  postcardId?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  // Optional fields used in specific logger helpers
  statusCode?: number;
  bucket?: string;
  path?: string;
  table?: string;
  errors?: string[];
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugEnabled = process.env.DEBUG === 'true' || this.isDevelopment;

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    const errorStr = error ? ` Error: ${error.message}${error.stack ? '\n' + error.stack : ''}` : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'debug' && !this.isDebugEnabled) {
      return false;
    }
    return true;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context, error);
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * Log API request start
   */
  apiStart(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path} - Started`, {
      ...context,
      operation: `${method} ${path}`
    });
  }

  /**
   * Log API request completion
   */
  apiEnd(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    this.log(level, `API ${method} ${path} - Completed`, {
      ...context,
      operation: `${method} ${path}`,
      duration,
      statusCode
    });
  }

  /**
   * Log storage operation
   */
  storage(operation: string, bucket: string, path: string, context?: LogContext): void {
    this.debug(`Storage ${operation}`, {
      ...context,
      operation: `storage_${operation}`,
      bucket,
      path
    });
  }

  /**
   * Log database operation
   */
  database(operation: string, table: string, context?: LogContext): void {
    this.debug(`Database ${operation}`, {
      ...context,
      operation: `db_${operation}`,
      table
    });
  }

  /**
   * Log NFT generation process
   */
  nft(stage: string, postcardId: string, context?: LogContext): void {
    this.info(`NFT Generation - ${stage}`, {
      ...context,
      postcardId,
      operation: `nft_${stage.toLowerCase().replace(' ', '_')}`
    });
  }

  /**
   * Log validation results
   */
  validation(type: string, isValid: boolean, errors?: string[], context?: LogContext): void {
    const level = isValid ? 'debug' : 'warn';
    const message = `Validation ${type} - ${isValid ? 'Passed' : 'Failed'}`;
    
    this.log(level, message, {
      ...context,
      operation: `validation_${type}`,
      errors: errors?.length ? errors : undefined
    });
  }

  /**
   * Create a timer for measuring operation duration
   */
  timer(operation: string): () => number {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.debug(`Timer: ${operation} completed in ${duration}ms`, {
        operation,
        duration
      });
      return duration;
    };
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug';
    this.log(level, `Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation: `perf_${operation}`,
      duration
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logApiStart = (method: string, path: string, context?: LogContext) => 
  logger.apiStart(method, path, context);

export const logApiEnd = (method: string, path: string, statusCode: number, duration: number, context?: LogContext) => 
  logger.apiEnd(method, path, statusCode, duration, context);

export const logStorage = (operation: string, bucket: string, path: string, context?: LogContext) => 
  logger.storage(operation, bucket, path, context);

export const logDatabase = (operation: string, table: string, context?: LogContext) => 
  logger.database(operation, table, context);

export const logNFT = (stage: string, postcardId: string, context?: LogContext) => 
  logger.nft(stage, postcardId, context);

export const logValidation = (type: string, isValid: boolean, errors?: string[], context?: LogContext) => 
  logger.validation(type, isValid, errors, context);

export const createTimer = (operation: string) => logger.timer(operation);

export const logPerformance = (operation: string, duration: number, context?: LogContext) => 
  logger.performance(operation, duration, context);