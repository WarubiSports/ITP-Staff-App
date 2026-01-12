-- Run this in Supabase Dashboard → SQL Editor
-- Storage Policies for player-documents bucket

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to view/download documents
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to update documents
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'player-documents' AND auth.role() = 'authenticated');
