import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PASSWORD = '6239';

/**
 * POST /api/admin/postcards/[id]/mind-target
 * Receives compiled MindAR .mind file from admin client-side compilation
 * Uses password auth instead of Clerk auth
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const postcardId = params.id;

    const formData = await request.formData();
    const password = formData.get('password') as string;
    const mindFile = formData.get('mindFile') as File | null;
    const userId = formData.get('userId') as string;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    if (!mindFile || !userId) {
      return NextResponse.json(
        { success: false, error: 'Archivo .mind y userId requeridos' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify postcard exists
    const { data: postcard, error: fetchError } = await supabase
      .from('postcards')
      .select('id, user_id')
      .eq('id', postcardId)
      .single();

    if (fetchError || !postcard) {
      return NextResponse.json(
        { success: false, error: 'Postal no encontrada' },
        { status: 404 }
      );
    }

    // Upload .mind file to Supabase Storage
    const storagePath = `${userId}/${postcardId}/target.mind`;
    const buffer = await mindFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('postcards')
      .upload(storagePath, buffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ [ADMIN] Error uploading .mind file:', uploadError);
      return NextResponse.json(
        { success: false, error: `Error al subir target: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Update postcard with MindAR target info and set to ready
    const mindTargetInfo = {
      type: 'mindar',
      targetUrl: `/api/ar/mind-target/${userId}/${postcardId}`,
      generated: true,
      timestamp: new Date().toISOString(),
      generatedBy: 'admin-client',
      fileSize: buffer.byteLength
    };

    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: mindTargetInfo,
        processing_status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);

    if (updateError) {
      console.error('❌ [ADMIN] Error updating postcard:', updateError);
      return NextResponse.json(
        { success: false, error: `Error al actualizar postal: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log(`🎉 [ADMIN] MindAR target uploaded for postcard ${postcardId}`);

    return NextResponse.json({
      success: true,
      data: {
        postcardId,
        targetUrl: mindTargetInfo.targetUrl,
        fileSize: buffer.byteLength,
      },
    });
  } catch (error) {
    console.error('❌ [ADMIN] Mind target upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
