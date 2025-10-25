-- Create receipt-images bucket (PUBLIC for Edge Function access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  true,  -- PUBLIC so Edge Function can read images
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own folder
CREATE POLICY "Users can read own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow PUBLIC reads (so Edge Function can access)
CREATE POLICY "Allow public reads for processing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipt-images');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipt-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

SELECT 'Receipt bucket created with public read access!' as status;
