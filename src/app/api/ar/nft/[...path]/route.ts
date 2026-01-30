import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Proxy endpoint for NFT descriptor files
// AR.js expects to be able to fetch .iset, .fset, .fset3 files by appending extensions to a base URL
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const params = await context.params;
    // Parse the path to extract userId, postcardId, and filename
    const pathParts = params.path.join('/');
    const [userId, postcardId, filename] = pathParts.split('/');

    if (!userId || !postcardId || !filename) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 });
    }

    console.log('[NFT Proxy] Requested path:', pathParts);
    console.log('[NFT Proxy] Parsed:', { userId, postcardId, filename });

    // AR.js requests files by appending extensions to the base URL
    // So if filename is "descriptors", AR.js will request:
    // - descriptors.iset
    // - descriptors.fset  
    // - descriptors.fset3
    // We need to handle both cases: with and without extension
    let actualFilename = filename;
    
    // If filename doesn't have an extension, check if it's a base name request
    // In that case, return info about available files (for debugging)
    if (!filename.includes('.')) {
      console.log('[NFT Proxy] Base name requested without extension:', filename);
      // This shouldn't happen in normal AR.js flow, but log it for debugging
    }


    // Check env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[NFT Proxy] Missing Supabase environment variables');
      return new NextResponse('Configuration error', { status: 500 });
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Construct the storage path dynamically but carefully
    const storagePath = `${userId}/${postcardId}/nft/${actualFilename}`;
    console.log('[NFT Proxy] Storage path:', storagePath);

    // First, check if the file exists
    const { data: fileList, error: listError } = await supabase.storage
      .from('postcards')
      .list(`${userId}/${postcardId}/nft`);

    if (listError) {
      console.error('[NFT Proxy] Error listing directory:', listError);
      // Don't fail immediately - try to download anyway
      console.log('[NFT Proxy] Attempting direct download despite list error...');
    } else {
      console.log('[NFT Proxy] Files in directory:', fileList?.map(f => f.name) || []);
      console.log('[NFT Proxy] Looking for:', actualFilename);
      
      const fileExists = fileList?.some(f => f.name === actualFilename);
      console.log('[NFT Proxy] File exists in list:', fileExists);
      
      if (!fileExists) {
        console.warn('[NFT Proxy] File not in list, attempting direct download...');
      }
    }

    // Try to download the file from Supabase Storage
    const { data: fileData, error: downloadError} = await supabase.storage
      .from('postcards')
      .download(storagePath);

    if (downloadError) {
      console.error('[NFT Proxy] Error downloading file:', downloadError);
      return new NextResponse(`File not found: ${downloadError.message}`, { status: 404 });
    }

    if (!fileData) {
      console.error('[NFT Proxy] File data is null');
      return new NextResponse('File not found', { status: 404 });
    }

    console.log('[NFT Proxy] Successfully downloaded file:', actualFilename);

    // Determine content type based on file extension
    const getContentType = (fname: string): string => {
      if (fname.endsWith('.iset')) return 'application/octet-stream';
      if (fname.endsWith('.fset')) return 'application/octet-stream';
      if (fname.endsWith('.fset3')) return 'application/octet-stream';
      return 'application/octet-stream';
    };

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Return the file data directly with proper CORS headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': getContentType(actualFilename),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[NFT Proxy] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new NextResponse(`Internal server error: ${errorMessage}`, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}