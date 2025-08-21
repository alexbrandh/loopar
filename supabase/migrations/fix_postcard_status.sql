-- Fix postcard status from error to ready when image is loading correctly
-- This addresses the issue where postcards show error state despite images loading successfully

UPDATE postcards 
SET processing_status = 'ready',
    error_message = NULL,
    updated_at = NOW()
WHERE processing_status = 'error' 
  AND image_url IS NOT NULL 
  AND image_url != ''
  AND video_url IS NOT NULL 
  AND video_url != '';

-- Add a comment for future reference
COMMENT ON TABLE postcards IS 'Postcards table - stores user-generated AR postcards with processing status';