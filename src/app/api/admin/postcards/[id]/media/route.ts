import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Jimp } from 'jimp';

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

    // If image was changed, compile new MindAR target server-side
    if (mediaType === 'image') {
      // Set processing status
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

      console.log(`🔄 [ADMIN] Compiling new MindAR target for postcard ${postcardId}...`);

      try {
        // Use service role client for storage operations on 'postcards' bucket
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Process the uploaded image with Jimp
        const imageBuffer = Buffer.from(arrayBuffer);
        const image = await Jimp.read(imageBuffer);

        // Resize if needed (MindAR works best with images < 1024px)
        const maxSize = 1024;
        if (image.width > maxSize || image.height > maxSize) {
          image.scaleToFit({ w: maxSize, h: maxSize });
        }

        const width = image.width;
        const height = image.height;

        // Create ImageData-like object for MindAR
        const imageData = {
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height
        };

        const bitmap = image.bitmap;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            imageData.data[idx] = bitmap.data[idx];
            imageData.data[idx + 1] = bitmap.data[idx + 1];
            imageData.data[idx + 2] = bitmap.data[idx + 2];
            imageData.data[idx + 3] = bitmap.data[idx + 3];
          }
        }

        console.log(`⚙️ [ADMIN] Compiling MindAR target (${width}x${height})...`);

        // @ts-ignore - MindAR doesn't have types
        const { Compiler } = await import('mind-ar/dist/mindar-image.prod.js');
        const compiler = new Compiler();

        await compiler.compileImageTargets([imageData], (progress: number) => {
          if (progress % 0.1 < 0.01) {
            console.log(`⚙️ [ADMIN] MindAR progress: ${Math.round(progress * 100)}%`);
          }
        });

        const exportedBuffer = await compiler.exportData();
        console.log(`✅ [ADMIN] MindAR target compiled, size: ${exportedBuffer.byteLength} bytes`);

        // Upload .mind file
        const mindPath = `${userId}/${postcardId}/target.mind`;
        const { error: mindUploadError } = await serviceSupabase.storage
          .from('postcards')
          .upload(mindPath, Buffer.from(exportedBuffer), {
            contentType: 'application/octet-stream',
            upsert: true
          });

        if (mindUploadError) {
          throw new Error(`Failed to upload .mind file: ${mindUploadError.message}`);
        }

        // Update postcard with MindAR target info and set ready
        const mindTargetInfo = {
          type: 'mindar',
          targetUrl: `/api/ar/mind-target/${userId}/${postcardId}`,
          generated: true,
          timestamp: new Date().toISOString(),
          generatedBy: 'admin-server',
          fileSize: exportedBuffer.byteLength
        };

        await serviceSupabase
          .from('postcards')
          .update({
            nft_descriptors: mindTargetInfo,
            processing_status: 'ready',
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', postcardId);

        console.log(`🎉 [ADMIN] MindAR target compilation complete for postcard ${postcardId}`);
      } catch (compileError) {
        const errorMsg = compileError instanceof Error ? compileError.message : 'Error desconocido en compilación AR';
        console.error(`❌ [ADMIN] MindAR compilation failed:`, compileError);

        // Mark as error so admin can see it failed
        await (supabase
          .from('postcards') as unknown as {
            update: (data: Record<string, unknown>) => {
              eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
            }
          })
          .update({ 
            processing_status: 'error',
            error_message: `Error al regenerar AR: ${errorMsg}`
          })
          .eq('id', postcardId);

        // Still return success for the image upload, but note the AR error
        return NextResponse.json({
          success: true,
          data: {
            postcardId,
            mediaType,
            newUrl,
            needsReprocessing: false,
            arError: errorMsg,
          },
        });
      }
    }

    console.log(`✅ [ADMIN] ${mediaType} updated for postcard ${postcardId}`);

    return NextResponse.json({
      success: true,
      data: {
        postcardId,
        mediaType,
        newUrl,
        needsReprocessing: false,
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
