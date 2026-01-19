-- Add scan_path field to insurance_claims table for document attachments
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS scan_path TEXT;

-- Add comment for clarity
COMMENT ON COLUMN insurance_claims.scan_path IS 'Path to uploaded invoice/receipt scan in storage';
