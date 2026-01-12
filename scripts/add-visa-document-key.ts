import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addVisaDocumentKeyColumn() {
  console.log('Adding visa_document_key column to player_documents table...\n')

  // Check if column already exists by trying to query it
  const { data, error: checkError } = await supabase
    .from('player_documents')
    .select('visa_document_key')
    .limit(1)

  if (!checkError) {
    console.log('✓ Column visa_document_key already exists')
    return
  }

  // Column doesn't exist, need to add it
  // Unfortunately we can't run ALTER TABLE via the API, so we'll document what's needed
  console.log('Column needs to be added. Run this SQL in Supabase Dashboard:')
  console.log('')
  console.log('ALTER TABLE player_documents ADD COLUMN visa_document_key TEXT;')
  console.log('')
  console.log('This column links uploaded documents to specific visa requirements')
  console.log('(e.g., "passport", "birth_certificate", "visa_application_form")')
}

addVisaDocumentKeyColumn()
