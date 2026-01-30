import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase';
import { 
  createApiResponse, 
  type ApiResponse 
} from '@/lib/api-middleware';
// Removed createSignedUrlWithRetry import (no longer needed)
import { handleError, createDetailedError, logError, type ErrorContext } from '@/lib/error-handler';
import { validateUUID, validatePostcardAccess } from '@/lib/validation';
import { logger, createTimer, logApiStart, logApiEnd } from '@/lib/logger';
import type { Database } from '@/types/database';

type PostcardRow = Database['public']['Tables']['postcards']['Row'];

interface PostcardResponse {
  id: string;
  status: string;
  image_url?: string;
  video_url?: string;
  title?: string;
  description?: string;
  nft_descriptors?: {
    generated?: boolean;
    timestamp?: string;
    files?: {
      iset?: string;
      fset?: string;
      fset3?: string;
    }
    metadata?: {
      originalImageUrl?: string;
      postcardId?: string;
      userId?: string;
      note?: string;
    };
  };
  created_at: string;
  message?: string;
}

async function handleGetPostcard(
  req: NextRequest,
  params: Record<string, string>,
  context: ErrorContext
): Promise<NextResponse<ApiResponse<PostcardResponse>>> {
  const postcardId = params.id;
  logger.debug('Starting postcard retrieval from database', { postcardId });
  
  // Validate UUID format
  const uuidValidation = validateUUID(params.id, 'id');
  if (!uuidValidation.isValid) {
    const detailedError = createDetailedError(
      'VALIDATION_ERROR',
      context,
      new Error(`Invalid postcard ID: ${uuidValidation.errors.map(e => e.message).join(', ')}`)
    );
    logError(detailedError);
    throw detailedError;
  }
  
  const supabase = createServerClient();

  // Get postcard data
  logger.database('select', 'postcards', { postcardId });
  
  const { data: postcard, error } = await supabase
    .from('postcards')
    .select('*')
    .eq('id', postcardId)
    .single() as { data: PostcardRow | null; error: { code?: string; message: string } | null };

  if (error || !postcard) {
    if (error?.code === 'PGRST116') {
      logger.warn('Postcard not found', { postcardId });
    } else if (error) {
      logger.error('Database error fetching postcard', { 
        postcardId
      }, new Error(error.message));
    }
    const detailedError = createDetailedError('POSTCARD_NOT_FOUND', context);
    logError(detailedError);
    throw detailedError;
  }
  
  logger.info('Postcard fetched from database', { 
    postcardId
  });

  // Check if postcard is ready
  if (postcard.processing_status !== 'ready') {
    return createApiResponse(
      true,
      {
        id: postcard.id,
        status: postcard.processing_status,
        message: postcard.processing_status === 'processing' 
          ? 'Postcard is still being processed' 
          : 'Postcard is not ready for AR viewing',
        created_at: postcard.created_at
      }
    );
  }

  // Generate signed URLs dynamically for image and video
  logger.debug('Generating signed URLs for postcard assets', { postcardId });
  
  let imageUrl = '';
  let videoUrl = '';
  
  // Generate signed URL for image
  if (postcard.image_url || true) { // Always try to generate for existing postcards
    // Extract just the path from the existing URL if it's already a signed URL
    let imagePath = `${postcard.user_id}/${postcard.id}/image.JPG`; // Use JPG extension
    
    try {
      const { createSignedUrlWithRetry } = await import('@/lib/storage-utils');
      imageUrl = await createSignedUrlWithRetry(
        'postcard-images',
        imagePath,
        {
          operation: `GET /api/postcards/${postcardId}`,
          timestamp: new Date().toISOString(),
          postcardId,
          userId: postcard.user_id
        },
        3600
      );
    } catch (_err) {
      logger.warn('Failed to generate signed URL for image', { postcardId }, _err instanceof Error ? _err : new Error(String(_err)));
      imageUrl = postcard.image_url || '';
    }
  }
  
  // Generate signed URL for video
  if (postcard.video_url || true) { // Always try to generate for existing postcards
    // Use existing video_url as path if it's a storage path (not a signed URL)
    // The video_url should contain the full path with correct extension (e.g., video.mp4, video.mov)
    let videoPath = postcard.video_url;
    
    // If video_url is a signed URL, extract the path
    if (videoPath && videoPath.includes('supabase.co')) {
      // Extract path from signed URL: .../postcard-videos/user_id/postcard_id/video.ext?token=...
      const match = videoPath.match(/postcard-videos\/([^?]+)/);
      if (match) {
        videoPath = match[1];
      }
    }
    
    // Fallback: try common extensions if path is not set
    if (!videoPath) {
      videoPath = `${postcard.user_id}/${postcard.id}/video.mp4`;
    }
    
    try {
      console.log('📹 [API-GET] Generating signed URL for video:', { videoPath, postcardId });
      const { createSignedUrlWithRetry } = await import('@/lib/storage-utils');
      videoUrl = await createSignedUrlWithRetry(
        'postcard-videos',
        videoPath,
        {
          operation: `GET /api/postcards/${postcardId}`,
          timestamp: new Date().toISOString(),
          postcardId,
          userId: postcard.user_id
        },
        3600
      );
      console.log('✅ [API-GET] Video signed URL generated successfully');
    } catch (_err) {
      console.error('❌ [API-GET] Failed to generate signed URL for video:', _err);
      logger.warn('Failed to generate signed URL for video', { postcardId }, _err instanceof Error ? _err : new Error(String(_err)));
      // If generation fails, just use the path stored in the database
      videoUrl = postcard.video_url || '';
    }
  }

  // Generate signed URLs for NFT descriptors
  let nftDescriptors = postcard.nft_descriptors;
  if (nftDescriptors && postcard.processing_status === 'ready') {
    try {
      const { createSignedUrlWithRetry } = await import('@/lib/storage-utils');
      const basePath = `${postcard.user_id}/${postcard.id}/nft/descriptors`;
      
      // Generate signed URLs for each descriptor file
      const descriptorFiles = {
        iset: '',
        fset: '',
        fset3: ''
      };
      
      // Generate signed URLs for each file type
      for (const fileType of ['iset', 'fset', 'fset3']) {
        const filePath = `${basePath}.${fileType}`;
        try {
          descriptorFiles[fileType as keyof typeof descriptorFiles] = await createSignedUrlWithRetry(
            'postcards', // Using postcards bucket for NFT descriptors
            filePath,
            {
              operation: `GET /api/postcards/${postcardId}`,
              timestamp: new Date().toISOString(),
              postcardId,
              userId: postcard.user_id
            },
            3600
          );
        } catch (fileErr) {
          logger.warn(`Failed to generate signed URL for ${fileType} descriptor`, { 
            postcardId
          }, fileErr instanceof Error ? fileErr : new Error(String(fileErr)));
        }
      }
      
      // Update nft_descriptors with signed URLs (only new format)
      nftDescriptors = {
        ...(typeof nftDescriptors === 'object' && nftDescriptors !== null && !Array.isArray(nftDescriptors) ? nftDescriptors : {}),
        files: descriptorFiles
        // Removed descriptorUrl to force use of new proxy format
      };
      
      logger.debug('Generated signed URLs for NFT descriptors', { 
        postcardId
      });
    } catch (err) {
      logger.warn('Failed to generate signed URLs for NFT descriptors', { postcardId }, err instanceof Error ? err : new Error(String(err)));
    }
  }

  console.log('✅ [API-GET] Postcard fetched successfully:', {
    id: postcard.id,
    status: postcard.processing_status,
    image_url: imageUrl,
    video_url: videoUrl,
    nft_descriptors: nftDescriptors
  });

  return createApiResponse(
    true,
    {
      id: postcard.id,
      user_id: postcard.user_id, // Include user_id for client-side path construction
      status: postcard.processing_status,
      image_url: imageUrl,
      video_url: videoUrl,
      nft_descriptors: nftDescriptors as PostcardResponse['nft_descriptors'],
      title: postcard.title,
      description: postcard.description || undefined,
      created_at: postcard.created_at
    }
  );
}

export async function GET(req: NextRequest, context: { params: Promise<Record<string, string>> }) {
  const timer = createTimer('GET /api/postcards/[id]');
  const startTime = Date.now();
  const params = await context.params;
  const postcardId = params.id;
  
  const errorContext: ErrorContext = {
    operation: `GET /api/postcards/${postcardId}`,
    timestamp: new Date().toISOString(),
    postcardId: postcardId,
    userAgent: req.headers.get('user-agent') || undefined
  };
  
  try {
    logApiStart('GET', `/api/postcards/${postcardId}`);
    
    // Validate method
    if (req.method !== 'GET') {
      const duration = timer();
      logApiEnd('GET', `/api/postcards/${postcardId}`, 405, duration, { postcardId });
      return createApiResponse(
        false,
        undefined,
        {
          message: `Method ${req.method} not allowed`,
          code: 'METHOD_NOT_ALLOWED'
        }
      );
    }
    
    // Validate params
    const validation = validateUUID(postcardId, 'id');
    if (!validation.isValid) {
      const duration = timer();
      logApiEnd('GET', `/api/postcards/${postcardId}`, 400, duration, { postcardId });
      return createApiResponse(
        false,
        undefined,
        {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR'
        },
        validation.errors,
        validation.warnings
      );
    }
    
    logger.info('Fetching postcard', { postcardId });
    const result = await handleGetPostcard(req, params, errorContext);
    const duration = timer();
    
    logger.info('Postcard retrieved successfully', { 
      postcardId,
      duration 
    });
    
    logApiEnd('GET', `/api/postcards/${postcardId}`, 200, duration, { postcardId });
    
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    
    logger.error('Failed to retrieve postcard', {
      postcardId,
      duration
    }, err instanceof Error ? err : undefined);
    
    logApiEnd('GET', `/api/postcards/${postcardId}`, 500, duration, { postcardId });
    const { response } = handleError(err, errorContext, 'INTERNAL_SERVER_ERROR');
    return response;
  }
}

async function handleDeletePostcard(
  req: NextRequest,
  params: Record<string, string>,
  userId: string,
  context: ErrorContext
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  const postcardId = params.id;
  logger.debug('Starting postcard deletion process', { postcardId });
  
  // Validate UUID format
  const uuidValidation = validateUUID(params.id, 'id');
  if (!uuidValidation.isValid) {
    const detailedError = createDetailedError(
      'VALIDATION_ERROR',
      context,
      new Error(`Invalid postcard ID: ${uuidValidation.errors.map(e => e.message).join(', ')}`)
    );
    logError(detailedError);
    throw detailedError;
  }
  
  // Validate postcard access
  const accessValidation = await validatePostcardAccess(params.id, userId);
  if (!accessValidation.isValid) {
    const errorCode = accessValidation.errors.find(e => e.code === 'POSTCARD_NOT_FOUND') 
      ? 'POSTCARD_NOT_FOUND' 
      : 'ACCESS_DENIED';
    const detailedError = createDetailedError(errorCode, context);
    logError(detailedError);
    throw detailedError;
  }
  
  const supabase = createServerClient();

  // Get postcard data for file deletion
  logger.database('select', 'postcards', { postcardId });
  
  const { data: postcard, error: postcardError } = await supabase
    .from('postcards')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single() as { data: PostcardRow | null; error: { code?: string; message: string } | null };

  if (postcardError || !postcard) {
    if (postcardError?.code === 'PGRST116') {
      logger.warn('Postcard not found for deletion', { postcardId });
    } else if (postcardError) {
      logger.error('Database error fetching postcard for deletion', {
         postcardId
       }, new Error(postcardError.message));
    }
    const detailedError = createDetailedError('POSTCARD_NOT_FOUND', context);
    logError(detailedError);
    throw detailedError;
  }
  
  logger.info('Postcard found for deletion', {
    postcardId
  });

  // Derive deterministic storage folder and delete any objects found
  logger.debug('Preparing storage cleanup by folder derivation', { postcardId });
  const folder = `${postcard.user_id}/${postcard.id}`;
  const buckets = ['postcard-images', 'postcard-videos', 'nft-descriptors'] as const;

  const deletionResults: { path: string; bucket: string; success: boolean }[] = [];

  for (const bucketName of buckets) {
    // List objects under the folder (non-recursive; our files live directly under this folder)
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list(folder);

    if (listError) {
      logger.warn('Failed to list storage folder for deletion', {
        postcardId,
        metadata: { bucket: bucketName, folder, error: listError.message }
      });
      continue;
    }

    const paths = (files || [])
      .filter((f) => !!f?.name)
      .map((f) => `${folder}/${f.name}`);

    if (paths.length === 0) {
      logger.debug('No files found to delete in bucket', {
        postcardId,
        metadata: { bucket: bucketName, folder }
      });
      continue;
    }

    logger.storage('delete', bucketName, paths.join(', '), { postcardId });
    const { error: removeError } = await supabase.storage
      .from(bucketName)
      .remove(paths);

    paths.forEach((p) => deletionResults.push({ path: p, bucket: bucketName, success: !removeError }));

    if (removeError) {
      logger.warn('Failed to delete some files from storage', {
        postcardId,
        metadata: { bucket: bucketName, folder, error: removeError.message }
      });
    } else {
      logger.debug('Files deleted successfully from storage', {
        postcardId,
        metadata: { fileCount: paths.length, bucket: bucketName }
      });
    }
  }

  // Delete the postcard record
  logger.database('delete', 'postcards', { postcardId });
  
  const { error: deleteError } = await supabase
    .from('postcards')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId);

  if (deleteError) {
    logger.error('Database error deleting postcard', { 
      postcardId, 
      metadata: { error: deleteError.message } 
    }, new Error(deleteError.message));
    return createApiResponse(
      false,
      { message: 'Failed to delete postcard from database' },
      {
        message: 'Failed to delete postcard from database',
        code: 'DATABASE_ERROR',
        details: deleteError
      }
    );
  }
  
  logger.info('Postcard deleted successfully', { postcardId });

  console.log('✅ [API-DELETE] Postcard deleted successfully:', {
    id: params.id,
    deleted_files: deletionResults.length,
    buckets_cleaned: Array.from(new Set(deletionResults.map((r) => r.bucket)))
  });

  return createApiResponse(
    true,
    {
      deleted_files: deletionResults,
      message: 'Postcard deleted successfully'
    }
  );
}

export async function DELETE(req: NextRequest, context: { params: Promise<Record<string, string>> }) {
  const timer = createTimer('DELETE /api/postcards/[id]');
  const startTime = Date.now();
  const params = await context.params;
  const postcardId = params.id;
  
  const errorContext: ErrorContext = {
    operation: `DELETE /api/postcards/${postcardId}`,
    timestamp: new Date().toISOString(),
    postcardId: postcardId,
    userAgent: req.headers.get('user-agent') || undefined
  };
  
  try {
    logApiStart('DELETE', `/api/postcards/${postcardId}`);
    
    // Validate method
    if (req.method !== 'DELETE') {
      const duration = timer();
      logApiEnd('DELETE', `/api/postcards/${postcardId}`, 405, duration, { postcardId });
      return createApiResponse(
        false,
        undefined,
        {
          message: `Method ${req.method} not allowed`,
          code: 'METHOD_NOT_ALLOWED'
        }
      );
    }
    
    // Validate params
    const validation = validateUUID(postcardId, 'id');
    if (!validation.isValid) {
      const duration = timer();
      logApiEnd('DELETE', `/api/postcards/${postcardId}`, 400, duration, { postcardId });
      return createApiResponse(
        false,
        undefined,
        {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR'
        },
        validation.errors,
        validation.warnings
      );
    }
    
    const { userId } = await auth();
    
    if (!userId) {
      const duration = timer();
      logApiEnd('DELETE', `/api/postcards/${postcardId}`, 401, duration, { 
        userId: 'anonymous', 
        postcardId 
      });
      const detailedError = createDetailedError('UNAUTHORIZED', errorContext);
      logError(detailedError);
      return createApiResponse(
        false,
        undefined,
        {
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        }
      );
    }

    logger.info('User authenticated for postcard deletion', { userId, postcardId });
    errorContext.userId = userId;
    const result = await handleDeletePostcard(req, params, userId, errorContext);
    const duration = timer();
    
    logger.info('Postcard deleted successfully', { 
      userId, 
      postcardId,
      duration 
    });
    
    logApiEnd('DELETE', `/api/postcards/${postcardId}`, 200, duration, { 
      userId, 
      postcardId 
    });
    
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    
    logger.error('Error deleting postcard', { 
      userId: errorContext.userId || 'unknown',
      postcardId,
      duration,
      metadata: { errorMessage: err instanceof Error ? err.message : 'Unknown error' }
    }, err instanceof Error ? err : undefined);
    
    logApiEnd('DELETE', `/api/postcards/${postcardId}`, 500, duration, { postcardId });
    const { response } = handleError(err, errorContext, 'INTERNAL_SERVER_ERROR');
    return response;
  }
}