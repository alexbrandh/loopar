/**
 * Storage utilities with retry logic for Supabase operations
 * Handles transient failures and provides robust file operations
 */

import { createServerClient } from './supabase';
import { withRetry, createDetailedError, logError, type ErrorContext } from './error-handler';
import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Create signed upload URL with retry logic
 */
export async function createSignedUploadUrlWithRetry(
  bucket: string,
  path: string,
  context: ErrorContext,
  options: RetryOptions = {}
): Promise<{ signedUrl: string; token: string; path: string }> {
  logger.debug('Creating signed upload URL with retry', { 
    bucket, 
    path, 
    ...context 
  });
  
  return withRetry(
    async () => {
      const supabase = createServerClient();
      
      logger.storage('create_signed_upload_url', bucket, path, context);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path, { upsert: true });
      
      if (error) {
        logger.error('Failed to create signed upload URL', {
          bucket,
          path,
          errors: [error.message],
          ...context
        }, new Error(error.message));
        const detailedError = createDetailedError(
          'SIGNED_URL_FAILED',
          context,
          error
        );
        logError(detailedError);
        throw detailedError;
      }
      
      if (!data?.signedUrl) {
        const detailedError = createDetailedError(
          'SIGNED_URL_FAILED',
          context,
          new Error('No signed URL returned')
        );
        logError(detailedError);
        throw detailedError;
      }
      
      logger.info('Signed upload URL created successfully', {
        bucket,
        path,
        ...context
      });
      
      return {
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path
      };
    },
    context,
    {
      maxAttempts: options.maxAttempts || 3,
      baseDelay: options.baseDelay || 1000,
      backoffMultiplier: options.backoffMultiplier || 2,
      onRetry: (attempt, error) => {
        logger.warn('Retry attempt for signed upload URL creation', {
          bucket,
          path,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          ...context
        });
      }
    }
  );
}

/**
 * Create signed URL for file access with retry logic
 */
export async function createSignedUrlWithRetry(
  bucket: string,
  path: string,
  context: ErrorContext,
  expiresIn: number = 3600,
  options: RetryOptions = {}
): Promise<string> {
  logger.debug('Creating signed URL with retry', { 
    bucket, 
    path, 
    ...context 
  });
  
  return withRetry(
    async () => {
      const supabase = createServerClient();
      
      logger.storage('create_signed_url', bucket, path, context);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      
      if (error) {
        logger.error('Failed to create signed URL', {
          bucket,
          path,
          errors: [error.message],
          ...context
        }, new Error(error.message));
        const detailedError = createDetailedError(
          'SIGNED_URL_FAILED',
          context,
          error
        );
        logError(detailedError);
        throw detailedError;
      }
      
      if (!data?.signedUrl) {
        const detailedError = createDetailedError(
          'SIGNED_URL_FAILED',
          context,
          new Error('No signed URL returned')
        );
        logError(detailedError);
        throw detailedError;
      }
      
      logger.info('Signed URL created successfully', {
        bucket,
        path,
        ...context
      });
      
      return data.signedUrl;
    },
    context,
    {
      maxAttempts: options.maxAttempts || 3,
      baseDelay: options.baseDelay || 1000,
      backoffMultiplier: options.backoffMultiplier || 2,
      onRetry: (attempt, error) => {
        logger.warn('Retry attempt for signed URL creation', {
          bucket,
          path,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          ...context
        });
      }
    }
  );
}