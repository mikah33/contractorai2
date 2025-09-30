-- Complete setup for progress updates feature
-- Run this entire script in Supabase SQL Editor

-- 1. Create the progress_updates table
CREATE TABLE IF NOT EXISTS progress_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID,
    description TEXT,
    photos TEXT[], -- Array of photo URLs
    posted_by TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_progress_updates_project_id ON progress_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_date ON progress_updates(date DESC);

-- 3. Enable RLS
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;

-- 4. Create policy for public access
DROP POLICY IF EXISTS "public_access_progress_updates" ON progress_updates;
CREATE POLICY "public_access_progress_updates" ON progress_updates 
FOR ALL USING (true) WITH CHECK (true);

-- 5. Insert storage bucket (Note: The actual bucket must be created in the Dashboard)
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('progress-photos', 'progress-photos', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Create storage policies
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'progress-photos');

DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
CREATE POLICY "Allow public viewing" ON storage.objects
FOR SELECT USING (bucket_id = 'progress-photos');

DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'progress-photos');

DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'progress-photos');

-- Success message
SELECT 'Setup complete! Now go to Storage section in Supabase Dashboard and create a bucket called "progress-photos" set to PUBLIC' AS message;