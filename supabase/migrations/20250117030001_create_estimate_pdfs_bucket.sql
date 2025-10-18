-- Create estimate-pdfs storage bucket with proper RLS policies

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('estimate-pdfs', 'estimate-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload estimate PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view estimate PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own estimate PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own estimate PDFs" ON storage.objects;

-- Allow authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload estimate PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'estimate-pdfs');

-- Allow public to view PDFs (needed for email links)
CREATE POLICY "Public can view estimate PDFs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'estimate-pdfs');

-- Allow users to update their own PDFs
CREATE POLICY "Users can update their own estimate PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'estimate-pdfs');

-- Allow users to delete their own PDFs
CREATE POLICY "Users can delete their own estimate PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'estimate-pdfs');
