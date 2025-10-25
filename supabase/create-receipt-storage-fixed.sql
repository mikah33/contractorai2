-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view receipt images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their receipt images" ON storage.objects;

-- Allow ANYONE to upload (no auth required)
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipt-images');

-- Allow ANYONE to view
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipt-images');

-- Allow ANYONE to delete (optional - can remove if you don't want this)
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipt-images');

SELECT 'Receipt storage bucket created successfully!' as status;
