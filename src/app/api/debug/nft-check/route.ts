import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postcardId = searchParams.get('postcardId');
  
  if (!postcardId) {
    return NextResponse.json({ error: 'postcardId required' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get postcard info
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();

    if (postcardError || !postcard) {
      return NextResponse.json({ error: 'Postcard not found' }, { status: 404 });
    }

    // List files in NFT directory
    const nftPath = `${postcard.user_id}/${postcardId}/nft`;
    const { data: fileList, error: listError } = await supabase.storage
      .from('postcards')
      .list(nftPath);

    // Try to download each expected file
    const fileChecks: Record<string, { exists: boolean; error?: string; size: number }> = {};
    const expectedFiles = ['descriptors.iset', 'descriptors.fset', 'descriptors.fset3'];
    
    for (const fileName of expectedFiles) {
      const filePath = `${nftPath}/${fileName}`;
      const { data, error } = await supabase.storage
        .from('postcards')
        .download(filePath);
      
      fileChecks[fileName] = {
        exists: !error && !!data,
        error: error?.message,
        size: data?.size || 0
      };
    }

    return NextResponse.json({
      postcardId,
      userId: postcard.user_id,
      nftPath,
      processingStatus: postcard.processing_status,
      hasDescriptorsInDB: !!postcard.nft_descriptors,
      listError: listError?.message,
      filesInDirectory: fileList?.map(f => ({ name: f.name, size: f.metadata?.size })) || [],
      fileChecks,
      descriptorsInDB: postcard.nft_descriptors
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
