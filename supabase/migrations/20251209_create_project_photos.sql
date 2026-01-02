-- Create project_photos table for storing photo references
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_project_photos_user_id ON project_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_project_id ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_created_at ON project_photos(created_at DESC);

-- Enable RLS
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own photos"
    ON project_photos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos"
    ON project_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
    ON project_photos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
    ON project_photos FOR DELETE
    USING (auth.uid() = user_id);

-- Create storage bucket for project photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-photos bucket
CREATE POLICY "Users can upload project photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'project-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view project photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'project-photos');

CREATE POLICY "Users can delete their project photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'project-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
