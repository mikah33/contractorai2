-- Create progress_updates table for storing project progress photos and updates
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_progress_updates_project_id ON progress_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_date ON progress_updates(date DESC);

-- Enable RLS
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (can be modified for authentication later)
CREATE POLICY "public_access_progress_updates" ON progress_updates 
FOR ALL USING (true) WITH CHECK (true);

-- Success message
SELECT 'Progress updates table created successfully!' AS message;