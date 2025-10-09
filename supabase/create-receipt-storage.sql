-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipt images
CREATE POLICY IF NOT EXISTS "Users can upload receipt images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipt-images');

-- Allow users to view receipt images
CREATE POLICY IF NOT EXISTS "Users can view receipt images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipt-images');

-- Allow users to delete their own receipt images
CREATE POLICY IF NOT EXISTS "Users can delete their receipt images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipt-images');
