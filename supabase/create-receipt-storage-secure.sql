-- Create storage bucket for receipt images (SECURE VERSION)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  false,  -- NOT public - requires auth
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']  -- Only images
)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Users can UPLOAD to their own folder only
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can READ from their own folder only
CREATE POLICY "Users can read own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can UPDATE files in their own folder only
CREATE POLICY "Users can update own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can DELETE from their own folder only
CREATE POLICY "Users can delete own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

SELECT 'Secure receipt storage bucket created!' as status;
