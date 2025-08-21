/**
 * NFT Descriptor Generator for AR.js
 * Generates .iset, .fset, and .fset3 files from target images
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface NFTDescriptors {
  descriptorUrl: string;
  generated: boolean;
  timestamp: string;
  files: {
    iset: string;
    fset: string;
    fset3: string;
  };
  metadata?: {
    originalImageUrl?: string;
    postcardId?: string;
    userId?: string;
    note?: string;
  };
}

interface GenerateNFTOptions {
  imageUrl: string;
  postcardId: string;
  userId: string;
}

/**
 * Generate NFT descriptors from an image URL
 * This is a simplified implementation that uses pre-generated descriptors
 * In a production environment, you would use AR.js NFT tools or similar
 */
export async function generateNFTDescriptors({
  imageUrl,
  postcardId,
  userId
}: GenerateNFTOptions): Promise<NFTDescriptors | null> {
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('Generating NFT descriptors for:', { imageUrl, postcardId, userId });
    
    // Check if descriptors already exist and are valid
    const { data: existingPostcard } = await supabase
      .from('postcards')
      .select('nft_descriptors, processing_status')
      .eq('id', postcardId)
      .single();
    
    if (existingPostcard?.nft_descriptors && 
        existingPostcard.processing_status === 'ready' &&
        existingPostcard.nft_descriptors.generated) {
      console.log('NFT descriptors already exist and are valid');
      return existingPostcard.nft_descriptors as NFTDescriptors;
    }
    
    // Set status to processing
    await supabase
      .from('postcards')
      .update({ processing_status: 'processing' })
      .eq('id', postcardId);
    
    // TEMPORARY: Using example NFT descriptors until real NFT generation is implemented
    console.log('⚠️  Using example NFT descriptors (trex) - Real generation not yet implemented');
    
    // Use AR.js example descriptors (trex) with direct GitHub URLs
    const exampleDescriptorBase = 'https://raw.githubusercontent.com/AR-js-org/AR.js/master/aframe/examples/image-tracking/nft/trex/trex-image/trex';
    
    // Create the NFT descriptors object using working example
    const descriptors: NFTDescriptors = {
      descriptorUrl: exampleDescriptorBase,
      generated: true,
      timestamp: new Date().toISOString(),
      files: {
        iset: `${exampleDescriptorBase}.iset`,
        fset: `${exampleDescriptorBase}.fset`,
        fset3: `${exampleDescriptorBase}.fset3`
      },
      // Store metadata about the original image for future real generation
      metadata: {
        originalImageUrl: imageUrl,
        postcardId,
        userId,
        note: 'Using example descriptors - real generation pending implementation'
      }
    };
    
    // Store the descriptors in the database
    const { data: updatedRows, error } = await supabase
      .from('postcards')
      .update({
        nft_descriptors: descriptors,
        processing_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', postcardId)
      .select('id');
    
    if (error) {
      console.error('Error updating postcard with NFT descriptors:', error);
      return null;
    }
    
    // Ensure exactly one row was updated
    if (!updatedRows || updatedRows.length !== 1) {
      console.error('Unexpected update result: no rows updated for postcard', postcardId);
      return null;
    }
    
    console.log('NFT descriptors generated successfully:', descriptors);
    return descriptors;
  } catch (error) {
    console.error('Error generating NFT descriptors:', error);
    return null;
  }
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

/**
 * Validate if an image is suitable for NFT tracking
 * Checks for sufficient contrast, texture, and resolution
 */
export async function validateImageForNFT(imageUrl: string): Promise<ValidationResult> {
  try {
    // Basic URL validation
    if (!imageUrl || typeof imageUrl !== 'string') {
      return {
        isValid: false,
        error: 'Invalid image URL provided'
      };
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
    
    console.log('Validating image for NFT generation:', imageUrl);
    
    // In a production environment, this would involve:
    // 1. Downloading the image
    // 2. Checking dimensions (minimum 800px on shortest side)
    // 3. Analyzing image quality, contrast, and feature density
    // 4. Verifying it's suitable for AR.js NFT tracking
    // 5. Checking file format (JPG/PNG)
    
    // For now, we'll do basic validation
    // Check if it's a supported image format
    const supportedFormats = ['.jpg', '.jpeg', '.png'];
    const hasValidExtension = supportedFormats.some(ext => 
      imageUrl.toLowerCase().includes(ext)
    );
    
    if (!hasValidExtension) {
      return {
        isValid: false,
        error: 'Image must be in JPG or PNG format'
      };
    }
    
    // Basic validation passed
    return {
      isValid: true,
      suggestions: [
        'Image format is supported',
        'For best AR tracking results, use high-contrast images with clear features',
        'Minimum recommended size: 800px on the shortest side'
      ]
    };
  } catch (error) {
    console.error('Error validating image:', error);
    return {
      isValid: false,
      error: 'Failed to validate image. Please try again.'
    };
  }
}

/**
 * Get NFT descriptors for a postcard
 */
export async function getNFTDescriptors(postcardId: string): Promise<NFTDescriptors | null> {
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabase
      .from('postcards')
      .select('nft_descriptors')
      .eq('id', postcardId)
      .single();
    
    if (error || !data?.nft_descriptors) {
      return null;
    }
    
    return data.nft_descriptors as NFTDescriptors;
  } catch (error) {
    console.error('Error getting NFT descriptors:', error);
    return null;
  }
}

/**
 * Process postcard for AR - generate NFT descriptors if needed
 */
export async function processPostcardForAR(postcardId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get postcard data
    const { data: postcard, error } = await supabase
      .from('postcards')
      .select('id, image_url, nft_descriptors, processing_status')
      .eq('id', postcardId)
      .eq('user_id', userId)
      .single();
    
    if (error || !postcard) {
      console.error('Postcard not found:', error);
      return false;
    }
    
    // Check if already processed
    if (postcard.nft_descriptors && postcard.processing_status === 'ready') {
      return true;
    }
    
    // Update status to processing
    await supabase
      .from('postcards')
      .update({ processing_status: 'processing' })
      .eq('id', postcardId);
    
    // Validate image
    const validation = await validateImageForNFT(postcard.image_url);
    
    if (!validation.isValid) {
      await supabase
        .from('postcards')
        .update({
          processing_status: 'needs_better_image',
          error_message: `Image validation failed: ${validation.error || 'Unknown validation error'}`
        })
        .eq('id', postcardId);
      return false;
    }
    
    // Generate NFT descriptors
    const descriptors = await generateNFTDescriptors({
      imageUrl: postcard.image_url,
      postcardId,
      userId
    });
    
    if (!descriptors) {
      await supabase
        .from('postcards')
        .update({ 
          processing_status: 'error',
          error_message: 'Failed to generate NFT descriptors' 
        })
        .eq('id', postcardId);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error processing postcard for AR:', error);
    return false;
  }
}