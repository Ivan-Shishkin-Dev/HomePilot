-- Renter passport document storage: RLS policies for bucket "documents".
-- Step 1: In Supabase Dashboard > Storage, create a bucket named "documents" (Private).
-- Step 2: Run this script in the SQL Editor.

-- RLS policies so users can only access their own files (path prefix = auth.uid()).
-- Path format in app: {user_id}/{document_id}/{filename}

-- Allow authenticated users to upload only to their own folder
CREATE POLICY "documents_upload_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files (for signed URLs / download)
CREATE POLICY "documents_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files (for replace)
CREATE POLICY "documents_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "documents_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
