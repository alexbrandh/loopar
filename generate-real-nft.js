/**
 * Generador de NFT reales usando @webarkit/nft-marker-creator-app
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Supabase configuration
const supabaseUrl = 'https://qllfquoqrxvfgdudnrrr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbGZxdW9xcnh2ZmdkdWRucnJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIyNjg5NywiZXhwIjoyMDcwODAyODk3fQ.gPqdTeE35i23COXrwFce3V5ctYku2ABSWt4gaL6jRr4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const postcardId = '8e1c09ff-f545-4d32-a6f1-16ad52804451';

async function generateRealNFTDescriptors(imageUrl, postcardId, userId) {
  const tempDir = path.join(process.cwd(), 'temp');
  const imagePath = path.join(tempDir, `${postcardId}-image.jpg`);
  const outputDir = path.join(tempDir, `${postcardId}-nft`);

  try {
    // Crear directorios temporales
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Descargar la imagen
    console.log('📥 Descargando imagen desde:', imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error al descargar imagen: ${response.status}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
    console.log('✅ Imagen descargada a:', imagePath);

    // Verificar si existe el CLI de nft-marker-creator
    const nftCreatorPath = path.join(process.cwd(), 'node_modules', '.bin', 'nft-marker-creator.cmd');
    const nftCreatorPathUnix = path.join(process.cwd(), 'node_modules', '.bin', 'nft-marker-creator');
    
    let command;
    if (fs.existsSync(nftCreatorPath)) {
      command = `"${nftCreatorPath}" -i "${imagePath}" -o "${outputDir}" -n target`;
    } else if (fs.existsSync(nftCreatorPathUnix)) {
      command = `"${nftCreatorPathUnix}" -i "${imagePath}" -o "${outputDir}" -n target`;
    } else {
      // Intentar usar npx
      command = `npx @webarkit/nft-marker-creator-app -i "${imagePath}" -o "${outputDir}" -n target`;
    }
    
    console.log('🔧 Ejecutando comando NFT:', command);
    const { stdout, stderr } = await execAsync(command, { timeout: 60000 }); // 60 segundos timeout
    
    if (stderr) {
      console.warn('⚠️ NFT Creator stderr:', stderr);
    }
    console.log('📄 NFT Creator stdout:', stdout);

    // Verificar que los archivos se generaron
    const isetPath = path.join(outputDir, 'target.iset');
    const fsetPath = path.join(outputDir, 'target.fset');
    const fset3Path = path.join(outputDir, 'target.fset3');

    if (!fs.existsSync(isetPath) || !fs.existsSync(fsetPath) || !fs.existsSync(fset3Path)) {
      console.error('❌ Archivos faltantes:');
      console.error('- ISET:', fs.existsSync(isetPath) ? '✅' : '❌');
      console.error('- FSET:', fs.existsSync(fsetPath) ? '✅' : '❌');
      console.error('- FSET3:', fs.existsSync(fset3Path) ? '✅' : '❌');
      throw new Error('No se generaron todos los archivos NFT necesarios');
    }

    console.log('🎉 Archivos NFT generados exitosamente');
    console.log('- ISET:', fs.statSync(isetPath).size, 'bytes');
    console.log('- FSET:', fs.statSync(fsetPath).size, 'bytes');
    console.log('- FSET3:', fs.statSync(fset3Path).size, 'bytes');

    // Subir archivos a Supabase Storage
    const basePath = `${userId}/${postcardId}/nft`;
    
    const isetBuffer = fs.readFileSync(isetPath);
    const fsetBuffer = fs.readFileSync(fsetPath);
    const fset3Buffer = fs.readFileSync(fset3Path);

    console.log('📤 Subiendo archivos a Supabase Storage...');

    // Subir archivos
    const { error: isetError } = await supabase.storage
      .from('postcards')
      .upload(`${basePath}/target.iset`, isetBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    const { error: fsetError } = await supabase.storage
      .from('postcards')
      .upload(`${basePath}/target.fset`, fsetBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    const { error: fset3Error } = await supabase.storage
      .from('postcards')
      .upload(`${basePath}/target.fset3`, fset3Buffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (isetError || fsetError || fset3Error) {
      throw new Error(`Error subiendo archivos: ${isetError?.message || fsetError?.message || fset3Error?.message}`);
    }

    console.log('✅ Archivos NFT subidos a Supabase Storage');

    // Generar URLs firmadas
    const { data: isetData } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${basePath}/target.iset`, 3600 * 24 * 7); // 7 días

    const { data: fsetData } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${basePath}/target.fset`, 3600 * 24 * 7);

    const { data: fset3Data } = await supabase.storage
      .from('postcards')
      .createSignedUrl(`${basePath}/target.fset3`, 3600 * 24 * 7);

    // Limpiar archivos temporales
    try {
      fs.unlinkSync(imagePath);
      fs.unlinkSync(isetPath);
      fs.unlinkSync(fsetPath);
      fs.unlinkSync(fset3Path);
      fs.rmSync(outputDir, { recursive: true });
      console.log('🧹 Archivos temporales limpiados');
    } catch (cleanupError) {
      console.warn('⚠️ Error limpiando archivos temporales:', cleanupError);
    }

    return {
      descriptorsBasePath: basePath + '/target',
      isetUrl: isetData?.signedUrl || '',
      fsetUrl: fsetData?.signedUrl || '',
      fset3Url: fset3Data?.signedUrl || ''
    };

  } catch (error) {
    console.error('💥 Error generando descriptores NFT:', error);
    
    // Limpiar archivos temporales en caso de error
    try {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn('⚠️ Error limpiando archivos temporales:', cleanupError);
    }
    
    throw error;
  }
}

async function testRealNFTGeneration() {
  try {
    console.log('🚀 Iniciando prueba de generación de NFT reales...');
    
    // Get postcard data
    const { data: postcard, error } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();
    
    if (error) {
      console.error('❌ Error obteniendo postal:', error);
      return;
    }
    
    console.log('📮 Postal encontrada:', {
      id: postcard.id,
      processing_status: postcard.processing_status,
      image_url: postcard.image_url,
      nft_descriptors: postcard.nft_descriptors
    });
    
    // Extract user_id from image_url
    const pathParts = postcard.image_url.split('/');
    const userId = pathParts[0]; // Assuming format: user_id/postcard_id/image.jpg
    
    console.log('👤 Usuario ID extraído:', userId);
    
    // Generate signed URL for the image
    const { data: imageSignedData } = await supabase.storage
      .from('postcards')
      .createSignedUrl(postcard.image_url, 3600); // 1 hora
    
    if (!imageSignedData?.signedUrl) {
      console.error('❌ No se pudo generar URL firmada para la imagen');
      return;
    }
    
    console.log('🔗 URL firmada de imagen generada');
    
    // Generate real NFT descriptors
    console.log('🔧 Generando descriptores NFT reales...');
    const result = await generateRealNFTDescriptors(
      imageSignedData.signedUrl,
      postcard.id,
      userId
    );
    
    console.log('✅ Descriptores NFT generados exitosamente:', result);
    
    // Update postcard with new descriptors
    const { error: updateError } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: {
          base_path: result.descriptorsBasePath,
          iset_url: result.isetUrl,
          fset_url: result.fsetUrl,
          fset3_url: result.fset3Url
        },
        processing_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId);
    
    if (updateError) {
      console.error('❌ Error actualizando postal:', updateError);
      return;
    }
    
    console.log('🎉 Postal actualizada exitosamente con descriptores reales!');
    
  } catch (error) {
    console.error('💥 Error en la prueba:', error);
  }
}

// Run the test
testRealNFTGeneration();