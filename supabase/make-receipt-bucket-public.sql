-- Make receipt-images bucket public so Edge Function can read images
UPDATE storage.buckets
SET public = true
WHERE id = 'receipt-images';

-- Keep the user-specific folder policies for uploads/deletes
-- But allow public reads so Edge Function can access images

SELECT 'Receipt bucket is now public for reads!' as status;
