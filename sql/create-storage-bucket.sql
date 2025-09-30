-- Create storage bucket for progress photos
-- Run this in Supabase SQL Editor

-- Enable the storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Storage buckets must be created in the Supabase Dashboard
-- Go to Storage section and create a bucket called "progress-photos"
-- Set it to PUBLIC so images can be viewed

-- After creating the bucket, run this to set up policies:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket (allowing all operations for now)
-- You can modify these later for more security

-- Policy to allow uploads
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'progress-photos');

-- Policy to allow viewing
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT USING (bucket_id = 'progress-photos');

-- Policy to allow updates
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'progress-photos');

-- Policy to allow deletes
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'progress-photos');

SELECT 'Storage bucket setup complete! Create a bucket called "progress-photos" in the Supabase Dashboard Storage section.' AS message;