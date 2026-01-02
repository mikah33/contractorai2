-- Fix RLS policy for room-scans storage bucket (includes floor plans)
-- The error "new row violates row-level security policy" indicates INSERT policy is missing or incorrect

-- First, ensure the room-scans bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-scans', 'room-scans', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies for room-scans bucket if they exist
DROP POLICY IF EXISTS "room_scans_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "room_scans_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "room_scans_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "room_scans_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "room_scans_public_select" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to room-scans" ON storage.objects;
DROP POLICY IF EXISTS "Users can view room-scans" ON storage.objects;
DROP POLICY IF EXISTS "Users can update room-scans" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete room-scans" ON storage.objects;

-- Create INSERT policy - allow authenticated users to upload to room-scans bucket
-- Users can only upload to their own folder (user_id/...)
CREATE POLICY "room_scans_insert_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'room-scans' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Create SELECT policy - allow authenticated users to view their own scans
CREATE POLICY "room_scans_select_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'room-scans' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Also allow public access since bucket is public
CREATE POLICY "room_scans_public_select" ON storage.objects
FOR SELECT TO anon
USING (
    bucket_id = 'room-scans'
);

-- Create UPDATE policy - users can update their own files
CREATE POLICY "room_scans_update_policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'room-scans' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'room-scans' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Create DELETE policy - users can delete their own files
CREATE POLICY "room_scans_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'room-scans' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
