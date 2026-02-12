import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const ADMIN_PASSWORD = '6239';

interface PostcardRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  video_url: string;
  processing_status: string;
  error_message: string | null;
  is_public: boolean;
  nft_descriptors: unknown;
  created_at: string;
  updated_at: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await context.params;
    const postcardId = params.id;

    const formData = await request.formData();
    const password = formData.get('password') as string;
    const mediaType = formData.get('mediaType') as 'image' | 'video';
    const file = formData.get('file') as File | null;

    // Authenticate
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de media inválido' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Archivo requerido' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get existing postcard to find user_id and current files
    const { data: postcard, error: fetchError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single() as { data: PostcardRow | null; error: { message: string } | null };

    if (fetchError || !postcard) {
      return NextResponse.json(
        { success: false, error: 'Postal no encontrada' },
        { status: 404 }
      );
    }

    const userId = postcard.user_id;
    const folder = `${userId}/${postcardId}`;
    const bucketName = mediaType === 'image' ? 'postcard-images' : 'postcard-videos';

    // Delete existing files in the folder for this media type
    const { data: existingFiles } = await supabase.storage
      .from(bucketName)
      .list(folder);

    if (existingFiles && existingFiles.length > 0) {
      const pathsToDelete = existingFiles.map(f => `${folder}/${f.name}`);
      await supabase.storage.from(bucketName).remove(pathsToDelete);
      console.log(`🗑️ [ADMIN] Deleted ${pathsToDelete.length} existing ${mediaType} files`);
    }

    // Upload the new file
    const ext = file.name.split('.').pop() || (mediaType === 'image' ? 'png' : 'mp4');
    const fileName = mediaType === 'image' ? `image.${ext}` : `video.${ext}`;
    const filePath = `${folder}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error(`❌ [ADMIN] Upload error:`, uploadError);
      return NextResponse.json(
        { success: false, error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Generate a signed URL for the new file
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600);

    const newUrl = signedUrlData?.signedUrl || filePath;

    // Update the postcard record in the database
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (mediaType === 'image') {
      updateData.image_url = filePath;
    } else {
      updateData.video_url = filePath;
    }
    const { error: updateError } = await (supabase
      .from('postcards') as unknown as {
        update: (data: Record<string, string>) => {
          eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
        }
      })
      .update(updateData)
      .eq('id', postcardId);

    if (updateError) {
      console.error(`❌ [ADMIN] DB update error:`, updateError);
      return NextResponse.json(
        { success: false, error: `Error al actualizar postal: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If image was changed, reset processing status - client will compile MindAR target
    if (mediaType === 'image') {
      await (supabase
        .from('postcards') as unknown as {
          update: (data: Record<string, unknown>) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
          }
        })
        .update({ 
          processing_status: 'processing',
          nft_descriptors: null,
          error_message: null 
        })
        .eq('id', postcardId);

      console.log(`🔄 [ADMIN] Image updated for postcard ${postcardId} - needs client-side MindAR compilation`);
    }

    console.log(`✅ [ADMIN] ${mediaType} updated for postcard ${postcardId}`);

    return NextResponse.json({
      success: true,
      data: {
        postcardId,
        mediaType,
        newUrl,
        userId,
        needsReprocessing: mediaType === 'image',
      },
    });
  } catch (error) {
    console.error('❌ [ADMIN] Media update error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
