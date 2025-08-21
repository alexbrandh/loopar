/**
 * Enhanced AbortController management utility
 * Solves ERR_ABORTED issues by providing better timeout handling and cleanup
 */

export interface AbortControllerConfig {
  timeout?: number;
  onTimeout?: () => void;
  onAbort?: () => void;
  debugLabel?: string;
}

export interface ManagedAbortController {
  controller: AbortController;
  timeoutId?: NodeJS.Timeout;
  cleanup: () => void;
  isAborted: () => boolean;
  isTimedOut: () => boolean;
}

/**
 * Creates a managed AbortController with enhanced timeout and cleanup handling
 */
export function createManagedAbortController(config: AbortControllerConfig = {}): ManagedAbortController {
  const { timeout, onTimeout, onAbort, debugLabel } = config;
  
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | undefined;
  let isTimedOut = false;

  // Set up timeout if specified
  if (timeout && timeout > 0) {
    timeoutId = setTimeout(() => {
      isTimedOut = true;
      if (debugLabel) {
        console.warn(`⏰ [AbortController] Timeout reached for ${debugLabel} after ${timeout}ms`);
      }
      
      // Call timeout callback before aborting
      if (onTimeout) {
        try {
          onTimeout();
        } catch (error) {
          console.error('Error in timeout callback:', error);
        }
      }
      
      controller.abort(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
  }

  // Set up abort listener
  controller.signal.addEventListener('abort', () => {
    if (onAbort && !isTimedOut) {
      try {
        onAbort();
      } catch (error) {
        console.error('Error in abort callback:', error);
      }
    }
  });

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    
    if (!controller.signal.aborted) {
      controller.abort(new Error('Request cancelled during cleanup'));
    }
  };

  return {
    controller,
    timeoutId,
    cleanup,
    isAborted: () => controller.signal.aborted,
    isTimedOut: () => isTimedOut
  };
}

/**
 * Manager class for handling multiple AbortControllers
 */
export class AbortControllerManager {
  private controllers = new Map<string, ManagedAbortController>();
  private debugLabel: string;

  constructor(debugLabel = 'AbortControllerManager') {
    this.debugLabel = debugLabel;
  }

  /**
   * Creates and registers a new managed AbortController
   */
  create(id: string, config: AbortControllerConfig = {}): ManagedAbortController {
    // Clean up existing controller with same ID
    this.abort(id);

    const managedController = createManagedAbortController({
      ...config,
      debugLabel: config.debugLabel || `${this.debugLabel}-${id}`
    });

    this.controllers.set(id, managedController);
    return managedController;
  }

  /**
   * Gets an existing managed AbortController
   */
  get(id: string): ManagedAbortController | undefined {
    return this.controllers.get(id);
  }

  /**
   * Aborts and removes a specific controller
   */
  abort(id: string): boolean {
    const controller = this.controllers.get(id);
    if (controller) {
      controller.cleanup();
      this.controllers.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Aborts all controllers
   */
  abortAll(): void {
    console.log(`🧹 [${this.debugLabel}] Cleaning up ${this.controllers.size} controllers`);
    
    this.controllers.forEach((controller, id) => {
      console.log(`🚫 [${this.debugLabel}] Aborting controller: ${id}`);
      controller.cleanup();
    });
    
    this.controllers.clear();
  }

  /**
   * Gets the count of active controllers
   */
  getActiveCount(): number {
    return this.controllers.size;
  }

  /**
   * Gets all active controller IDs
   */
  getActiveIds(): string[] {
    return Array.from(this.controllers.keys());
  }
}

/**
 * Utility function to check if an error is an abort error
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message.includes('ERR_ABORTED') ||
      error.message.includes('aborted') ||
      error.message.includes('cancelled') ||
      error.message.includes('timeout')
    );
  }
  
  return false;
}

/**
 * Enhanced version of the original createAbortControllerWithTimeout
 * with better error handling and cleanup
 */
export function createAbortControllerWithTimeout(timeoutMs: number, debugLabel?: string) {
  return createManagedAbortController({
    timeout: timeoutMs,
    debugLabel,
    onTimeout: () => {
      console.warn(`⏰ Request timeout after ${timeoutMs}ms${debugLabel ? ` (${debugLabel})` : ''}`);
    }
  });
}