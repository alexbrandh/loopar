/**
 * Real NFT Descriptor Generator using @webarkit/nft-marker-creator-app
 * Generates actual .iset, .fset, and .fset3 files from target images
 * Uses the official AR.js WASM module for real feature detection
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface RealNFTDescriptors {
  isetUrl: string;
  fsetUrl: string;
  fset3Url: string;
}

/**
 * Generate real NFT descriptors using the official AR.js NFT Marker Creator
 * This runs the WASM-based generator from @webarkit/nft-marker-creator-app
 */
export async function generateRealNFTDescriptors(
  imageUrl: string,
  supabaseClient: SupabaseClient,
  postcardId: string,
  userId: string
): Promise<RealNFTDescriptors> {
  console.log('🚀 Starting REAL NFT descriptor generation for:', imageUrl);
  
  // Create temporary directory
  const tempDir = path.join(os.tmpdir(), `nft-${postcardId}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  const outputDir = path.join(tempDir, 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  
  try {
    // Download image to temporary file
    console.log('📥 Downloading image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imagePath = path.join(tempDir, 'target.jpg');
    fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
    console.log('✅ Image downloaded to:', imagePath);
    
    // Run the NFT Marker Creator CLI
    console.log('🔧 Running NFT Marker Creator WASM module...');
    
    const nftCreatorPath = path.join(
      process.cwd(),
      'node_modules',
      '@webarkit',
      'nft-marker-creator-app',
      'src',
      'NFTMarkerCreator.js'
    );
    
    // Check if the creator exists
    if (!fs.existsSync(nftCreatorPath)) {
      console.error('❌ NFT Marker Creator not found at:', nftCreatorPath);
      throw new Error('NFT Marker Creator not installed');
    }
    
    // Run the generator
    await runNFTGenerator(nftCreatorPath, imagePath, outputDir);
    
    // Find generated files (they may have different names based on input)
    const outputFiles = fs.readdirSync(outputDir);
    console.log('📁 Files in output dir:', outputFiles);
    
    let isetFile = outputFiles.find(f => f.endsWith('.iset'));
    let fsetFile = outputFiles.find(f => f.endsWith('.fset') && !f.endsWith('.fset3'));
    let fset3File = outputFiles.find(f => f.endsWith('.fset3'));
    
    if (!isetFile || !fsetFile || !fset3File) {
      console.error('❌ Generated files not found');
      throw new Error('NFT descriptor files were not generated');
    }
    
    // Rename files to standard names
    const isetPath = path.join(outputDir, 'descriptors.iset');
    const fsetPath = path.join(outputDir, 'descriptors.fset');
    const fset3Path = path.join(outputDir, 'descriptors.fset3');
    
    fs.renameSync(path.join(outputDir, isetFile), isetPath);
    fs.renameSync(path.join(outputDir, fsetFile), fsetPath);
    fs.renameSync(path.join(outputDir, fset3File), fset3Path);
    
    console.log('✅ NFT descriptor files generated successfully:');
    console.log(`   - ISET: ${fs.statSync(isetPath).size} bytes`);
    console.log(`   - FSET: ${fs.statSync(fsetPath).size} bytes`);
    console.log(`   - FSET3: ${fs.statSync(fset3Path).size} bytes`);
    
    // Upload files to Supabase Storage
    console.log('📤 Uploading NFT descriptors to Supabase Storage...');
    const storagePath = `${userId}/${postcardId}/nft`;
    
    const uploads = [
      { file: isetPath, name: 'descriptors.iset' },
      { file: fsetPath, name: 'descriptors.fset' },
      { file: fset3Path, name: 'descriptors.fset3' }
    ];
    
    const uploadResults: RealNFTDescriptors = {
      isetUrl: '',
      fsetUrl: '',
      fset3Url: ''
    };
    
    for (const upload of uploads) {
      const fileBuffer = fs.readFileSync(upload.file);
      const uploadPath = `${storagePath}/${upload.name}`;
      
      console.log(`📤 Uploading ${upload.name}...`);
      const { error: uploadError } = await supabaseClient.storage
        .from('postcards')
        .upload(uploadPath, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`❌ Error uploading ${upload.name}:`, uploadError);
        throw uploadError;
      }
      
      // Generate signed URL
      const { data: signedUrlData, error: urlError } = await supabaseClient.storage
        .from('postcards')
        .createSignedUrl(uploadPath, 3600); // 1 hour expiry
      
      if (urlError || !signedUrlData) {
        console.error(`❌ Error creating signed URL for ${upload.name}:`, urlError);
        throw urlError || new Error('Failed to create signed URL');
      }
      
      // Assign to results
      if (upload.name === 'descriptors.iset') {
        uploadResults.isetUrl = signedUrlData.signedUrl;
      } else if (upload.name === 'descriptors.fset') {
        uploadResults.fsetUrl = signedUrlData.signedUrl;
      } else if (upload.name === 'descriptors.fset3') {
        uploadResults.fset3Url = signedUrlData.signedUrl;
      }
      
      console.log(`✅ ${upload.name} uploaded and signed URL created`);
    }
    
    console.log('🎉 Real NFT descriptors generated and uploaded successfully!');
    return uploadResults;
    
  } catch (error) {
    console.error('❌ Error generating real NFT descriptors:', error);
    throw error;
  } finally {
    // Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🧹 Temporary files cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Error cleaning up temporary files:', cleanupError);
    }
  }
}

/**
 * Run the NFT Marker Creator as a subprocess
 * Uses execSync for simplicity and reliability
 * IMPORTANT: Image must be placed in src/ directory for the generator to find it
 */
function runNFTGenerator(creatorPath: string, imagePath: string, outputDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const packageDir = path.join(
      process.cwd(),
      'node_modules',
      '@webarkit',
      'nft-marker-creator-app'
    );
    const srcDir = path.join(packageDir, 'src');
    
    // IMPORTANT: Image must be in src/ directory for the generator to find it
    const targetImagePath = path.join(srcDir, 'target-image.jpg');
    fs.copyFileSync(imagePath, targetImagePath);
    console.log(`📋 Copied image to: ${targetImagePath}`);
    
    // Create output directory in package folder
    const pkgOutputDir = path.join(packageDir, 'output');
    if (!fs.existsSync(pkgOutputDir)) {
      fs.mkdirSync(pkgOutputDir, { recursive: true });
    }
    
    // Clean any previous output files
    try {
      const existingFiles = fs.readdirSync(pkgOutputDir);
      for (const f of existingFiles) {
        if (f.startsWith('target-image')) {
          fs.unlinkSync(path.join(pkgOutputDir, f));
        }
      }
    } catch (e) { /* ignore */ }
    
    console.log(`📦 Running NFT Generator...`);
    
    try {
      // Use spawn for better control on Windows
      const { spawnSync } = require('child_process');
      
      // The CLI expects the image path relative to src/ directory
      console.log(`🔧 Running: node src/NFTMarkerCreator.js -i target-image.jpg -o ../output/ -NoConf`);
      
      const result = spawnSync('node', [
        'src/NFTMarkerCreator.js',
        '-i', 'target-image.jpg',
        '-o', '../output/',
        '-NoConf'
      ], {
        cwd: packageDir,
        timeout: 180000, // 3 minutes
        input: 'Y\n',
        encoding: 'utf-8',
        shell: true
      });
      
      if (result.error) {
        console.error('❌ Spawn error:', result.error);
        throw result.error;
      }
      
      if (result.status !== 0) {
        console.error('❌ NFT Generator failed with status:', result.status);
        console.error('stdout:', result.stdout?.slice(-1000));
        console.error('stderr:', result.stderr?.slice(-500));
        throw new Error(`NFT Generator exited with code ${result.status}`);
      }
      
      console.log('✅ NFT Generator completed');
      
      // Find and copy generated files
      const generatedFiles = fs.readdirSync(pkgOutputDir);
      console.log('📁 Files in output:', generatedFiles);
      
      let foundFiles = 0;
      for (const file of generatedFiles) {
        if (file.startsWith('target-image') && 
            (file.endsWith('.iset') || file.endsWith('.fset') || file.endsWith('.fset3'))) {
          const srcFile = path.join(pkgOutputDir, file);
          // Rename to standard names
          let dstName = file;
          if (file.endsWith('.iset')) dstName = 'descriptors.iset';
          else if (file.endsWith('.fset3')) dstName = 'descriptors.fset3';
          else if (file.endsWith('.fset')) dstName = 'descriptors.fset';
          
          const dstFile = path.join(outputDir, dstName);
          fs.copyFileSync(srcFile, dstFile);
          console.log(`📋 Copied ${file} -> ${dstName}`);
          foundFiles++;
        }
      }
      
      // Clean up temp image
      try { fs.unlinkSync(targetImagePath); } catch (e) { /* ignore */ }
      
      if (foundFiles >= 3) {
        resolve();
      } else {
        reject(new Error(`Only found ${foundFiles}/3 descriptor files`));
      }
      
    } catch (execError: any) {
      console.error('❌ NFT Generator failed:', execError.message);
      if (execError.stdout) console.error('stdout:', execError.stdout.toString().slice(-500));
      if (execError.stderr) console.error('stderr:', execError.stderr.toString().slice(-500));
      // Clean up
      try { fs.unlinkSync(targetImagePath); } catch (e) { /* ignore */ }
      reject(execError);
    }
  });
}

/**
 * Alternative: Generate using the WASM module directly (programmatic API)
 * This is a fallback if the CLI approach doesn't work
 */
export async function generateWithWASM(
  imageUrl: string,
  supabaseClient: SupabaseClient,
  postcardId: string,
  userId: string
): Promise<RealNFTDescriptors> {
  console.log('🚀 Starting WASM-based NFT descriptor generation...');
  
  const tempDir = path.join(os.tmpdir(), `nft-wasm-${postcardId}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  try {
    // Download image
    console.log('📥 Downloading image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    // Use sharp to process the image
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(imageBuffer).metadata();
    const rawData = await sharp(imageBuffer).raw().toBuffer();
    
    console.log('📊 Image metadata:', {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      dpi: metadata.density || 150
    });
    
    // Load the WASM module
    const wasmModulePath = path.join(
      process.cwd(),
      'node_modules',
      '@webarkit',
      'nft-marker-creator-app',
      'build',
      'NftMarkerCreator_wasm.js'
    );
    
    // We need to create the descriptors programmatically
    // For now, use the CLI approach as the main method
    throw new Error('WASM direct API not implemented, use CLI method');
    
  } catch (error) {
    console.error('❌ WASM generation failed:', error);
    throw error;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}
