-- Player documents management
-- Store document metadata (files stored in Supabase Storage)

CREATE TABLE IF NOT EXISTS player_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- File info
  name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_type TEXT NOT NULL, -- MIME type
  file_size INTEGER, -- Size in bytes

  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('identity', 'contract', 'medical', 'performance', 'other')),
  document_type TEXT, -- e.g., 'passport', 'visa', 'contract', 'evaluation'

  -- Additional info
  expiry_date DATE, -- For documents that expire (visas, insurance, etc.)
  description TEXT,

  -- Metadata
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_player ON player_documents(player_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON player_documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON player_documents(expiry_date);

-- Enable RLS
ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access to player_documents"
  ON player_documents FOR ALL
  USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_player_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_documents_updated_at
  BEFORE UPDATE ON player_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_player_documents_updated_at();

-- Create Storage bucket for player documents
-- NOTE: This needs to be run via Supabase Dashboard or using service role
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('player-documents', 'player-documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies (run in Supabase Dashboard)
-- CREATE POLICY "Authenticated users can upload documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'player-documents' AND auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can view documents"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'player-documents' AND auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can delete documents"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'player-documents' AND auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE player_documents IS 'Metadata for player documents stored in Supabase Storage';
COMMENT ON COLUMN player_documents.file_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN player_documents.category IS 'Document category: identity, contract, medical, performance, other';
