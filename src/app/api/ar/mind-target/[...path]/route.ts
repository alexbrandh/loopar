import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/ar/mind-target/[userId]/[postcardId]
 * Serves the compiled .mind file for MindAR tracking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    
    if (!path || path.length < 2) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const [userId, postcardId] = path;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the .mind file from Supabase Storage
    const storagePath = `${userId}/${postcardId}/target.mind`;
    console.log('🎯 Fetching .mind file from:', storagePath);
    
    const { data, error } = await supabase.storage
      .from('postcards')
      .download(storagePath);

    if (error) {
      console.error('❌ Error downloading .mind file:', error.message);
      return NextResponse.json({ error: 'Target file not found', details: error.message }, { status: 404 });
    }
    
    if (!data) {
      console.error('❌ No data returned for .mind file');
      return NextResponse.json({ error: 'Target file empty' }, { status: 404 });
    }
    
    console.log('✅ .mind file downloaded, size:', data.size);

    // Return the binary file with correct headers for MindAR
    const arrayBuffer = await data.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error serving .mind file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
