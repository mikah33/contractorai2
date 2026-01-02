-- Vision Cam Setup - Ensure project_photos table and storage are configured
-- This migration is idempotent - safe to run multiple times

-- ============================================
-- 1. CREATE TABLE IF NOT EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS project_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    category TEXT DEFAULT 'general',
    is_progress_photo BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_photos_user_id ON project_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_project_id ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_created_at ON project_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_photos_category ON project_photos(category);

-- ============================================
-- 3. ENABLE RLS
-- ============================================
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. DROP EXISTING POLICIES (to recreate cleanly)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own photos" ON project_photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON project_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON project_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON project_photos;
DROP POLICY IF EXISTS "Service role can manage all photos" ON project_photos;

-- ============================================
-- 5. CREATE RLS POLICIES - User-based access
-- ============================================

-- Users can only SELECT their own photos
CREATE POLICY "Users can view their own photos"
    ON project_photos FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only INSERT photos for themselves
CREATE POLICY "Users can insert their own photos"
    ON project_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own photos
CREATE POLICY "Users can update their own photos"
    ON project_photos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own photos
CREATE POLICY "Users can delete their own photos"
    ON project_photos FOR DELETE
    USING (auth.uid() = user_id);

-- Service role (Edge Functions) can manage all photos
CREATE POLICY "Service role can manage all photos"
    ON project_photos FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 6. STORAGE BUCKET SETUP
-- ============================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-photos',
    'project-photos',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ============================================
-- 7. STORAGE POLICIES - User-based access
-- ============================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to project photos" ON storage.objects;

-- Users can upload to their own folder (folder name = user_id)
CREATE POLICY "Users can upload project photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'project-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Anyone can view photos (public bucket for sharing)
CREATE POLICY "Users can view project photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'project-photos');

-- Users can only delete their own photos
CREATE POLICY "Users can delete their project photos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'project-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own photos
CREATE POLICY "Users can update their project photos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'project-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Service role has full access (for Edge Functions)
CREATE POLICY "Service role full access to project photos"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'project-photos'
        AND auth.jwt() ->> 'role' = 'service_role'
    );

-- ============================================
-- 8. VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT * FROM pg_policies WHERE tablename = 'project_photos';
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%project photos%';
-- SELECT * FROM storage.buckets WHERE id = 'project-photos';
