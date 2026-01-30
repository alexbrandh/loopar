-- Check if postcard with specific ID exists and get its details
SELECT 
  id,
  user_id,
  title,
  description,
  processing_status,
  error_message,
  is_public,
  created_at,
  updated_at
FROM postcards 
WHERE id = '0cc071b8-5873-4290-967c-fea5e39cdea7';

-- Also check all postcards to see what exists
SELECT 
  id,
  user_id,
  title,
  processing_status,
  created_at
FROM postcards 
ORDER BY created_at DESC
LIMIT 10;