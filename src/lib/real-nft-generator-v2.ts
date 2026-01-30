import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface RealNFTResult {
  isetUrl: string;
  fsetUrl: string;
  fset3Url: string;
}

/**
 * Genera descriptores NFT reales usando WebARKit NFT Marker Creator
 * Esta implementación usa herramientas nativas para generar descriptores válidos
 */
export async function generateRealNFTDescriptorsV2(
  supabase: SupabaseClient,
  imageUrl: string,
  postcardId: string,
  userId: string
): Promise<RealNFTResult> {
  console.log('🚀 Starting REAL NFT descriptor generation V2 for:', imageUrl);
  
  let tempDir: string | null = null;
  
  try {
    // 1. Crear directorio temporal
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `nft-${postcardId}-`));
    console.log('📁 Created temp directory:', tempDir);
    
    // 2. Descargar la imagen
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imagePath = path.join(tempDir, 'target.jpg');
    await fs.writeFile(imagePath, Buffer.from(imageBuffer));
    console.log('📥 Image downloaded to:', imagePath);
    
    // 3. Generar descriptores NFT usando WebARKit
    const outputDir = path.join(tempDir, 'output');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Usar npx para ejecutar el generador de NFT
    const nftCommand = `npx @webarkit/nft-marker-creator-app "${imagePath}" "${outputDir}"`;
    console.log('🔧 Executing NFT generation command:', nftCommand);
    
    const { stdout, stderr } = await execAsync(nftCommand, {
      cwd: tempDir,
      timeout: 60000 // 60 segundos timeout
    });
    
    console.log('✅ NFT generation completed');
    if (stdout) console.log('📄 stdout:', stdout);
    if (stderr) console.log('⚠️ stderr:', stderr);
    
    // 4. Verificar que se generaron los archivos
    const expectedFiles = ['target.iset', 'target.fset', 'target.fset3'];
    const generatedFiles: { [key: string]: string } = {};
    
    for (const fileName of expectedFiles) {
      const filePath = path.join(outputDir, fileName);
      try {
        await fs.access(filePath);
        generatedFiles[fileName] = filePath;
        console.log(`✅ Generated file found: ${fileName}`);
      } catch (error) {
        throw new Error(`Required NFT file not generated: ${fileName}`);
      }
    }
    
    // 5. Subir archivos a Supabase Storage
    const uploadResults: { [key: string]: string } = {};
    
    for (const [fileName, filePath] of Object.entries(generatedFiles)) {
      const fileBuffer = await fs.readFile(filePath);
      const storageFileName = fileName.replace('target', 'descriptors');
      const storagePath = `${userId}/${postcardId}/nft/${storageFileName}`;
      
      console.log(`📤 Uploading ${fileName} to ${storagePath}...`);
      
      const { error: uploadError } = await supabase.storage
        .from('postcards')
        .upload(storagePath, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`);
      }
      
      // Crear URL firmada
      const { data: signedUrlData, error: signError } = await supabase.storage
        .from('postcards')
        .createSignedUrl(storagePath, 3600); // 1 hora
      
      if (signError || !signedUrlData?.signedUrl) {
        throw new Error(`Failed to create signed URL for ${fileName}: ${signError?.message}`);
      }
      
      uploadResults[fileName] = signedUrlData.signedUrl;
      console.log(`✅ ${fileName} uploaded and signed URL created`);
    }
    
    console.log('🎉 Real NFT descriptors V2 generated and uploaded successfully!');
    
    return {
      isetUrl: uploadResults['target.iset'],
      fsetUrl: uploadResults['target.fset'],
      fset3Url: uploadResults['target.fset3']
    };
    
  } catch (error) {
    console.error('❌ Error generating real NFT descriptors V2:', error);
    throw error;
  } finally {
    // Limpiar archivos temporales
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log('🧹 Temporary files cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp files:', cleanupError);
      }
    }
  }
}

/**
 * Función principal para generar y actualizar descriptores NFT V2
 */
export async function generateAndUpdateNFTDescriptorsV2(
  postcardId: string,
  userId: string,
  imageUrl: string
): Promise<RealNFTResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('🔧 Generating real NFT descriptors V2...');
  
  // Generar descriptores reales
  const result = await generateRealNFTDescriptorsV2(
    supabase,
    imageUrl,
    postcardId,
    userId
  );
  
  // Actualizar la postal en la base de datos
  const nftDescriptors = {
    descriptorUrl: result.fsetUrl.replace('.fset', ''),
    generated: true,
    timestamp: new Date().toISOString(),
    files: {
      iset: result.isetUrl,
      fset: result.fsetUrl,
      fset3: result.fset3Url
    },
    metadata: {
      originalImageUrl: imageUrl,
      postcardId,
      userId,
      note: 'Generated using WebARKit NFT Marker Creator V2'
    }
  };
  
  const { error: updateError } = await supabase
    .from('postcards')
    .update({
      nft_descriptors: nftDescriptors,
      processing_status: 'ready',
      updated_at: new Date().toISOString()
    })
    .eq('id', postcardId);
  
  if (updateError) {
    console.error('❌ Error updating postcard with NFT descriptors:', updateError);
    throw updateError;
  }
  
  console.log('✅ Postcard updated with real NFT descriptors V2');
  
  return result;
}