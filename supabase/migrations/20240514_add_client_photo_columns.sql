-- 1. Add profile photo columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create storage bucket for client assets
-- Note: This might need to be done via the Supabase UI if your service role doesn't have permissions, 
-- but here is the SQL for the policies.

-- Create the bucket if it doesn't exist (using Supabase Storage API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-assets', 'client-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage RLS Policies

-- Policy: Allow public to view client assets (if public=true)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'client-assets' );

-- Policy: Allow authenticated users to upload client assets
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK ( bucket_id = 'client-assets' );

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'client-assets' );

-- Policy: Allow authenticated users to delete client assets
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'client-assets' );
