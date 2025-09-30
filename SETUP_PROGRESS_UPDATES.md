# Setup Progress Updates Feature

## To enable progress updates with photo uploads, follow these steps:

### 1. Create the Database Table

Run this SQL in your Supabase SQL Editor:

```sql
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_progress_updates_project_id ON progress_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_date ON progress_updates(date DESC);

-- Enable RLS
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "public_access_progress_updates" ON progress_updates 
FOR ALL USING (true) WITH CHECK (true);
```

### 2. Create the Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to the Storage section
3. Click "Create a new bucket"
4. Name it: `progress-photos`
5. Set it to PUBLIC (toggle the "Public bucket" option ON)
6. Click "Create bucket"

### 3. Test the Feature

1. Go to the Projects page in your app
2. Select a project
3. Click on the Progress tab
4. Click "Upload Progress"
5. Add a description and select photos
6. Click Save
7. Reload the page - your progress updates should persist!

## Troubleshooting

If you see console errors:
- Check the browser console for detailed error messages
- Look for alerts that will tell you if the table or storage bucket is missing
- Ensure your Supabase project is running and accessible

The app now includes detailed logging:
- 🔍 When fetching progress updates
- 💾 When saving progress updates
- 📤 When uploading images
- ✅ Success messages
- ❌ Error messages with details