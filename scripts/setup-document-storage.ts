import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const BUCKET_NAME = 'player-documents'

async function setupDocumentStorage() {
  console.log('Setting up document storage...\n')

  // Step 1: Check if bucket exists
  console.log('1. Checking for existing bucket...')
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('Error listing buckets:', listError)
    return
  }

  const existingBucket = buckets?.find(b => b.id === BUCKET_NAME)

  if (existingBucket) {
    console.log(`   Bucket '${BUCKET_NAME}' already exists!`)
  } else {
    // Create the bucket
    console.log(`   Creating bucket '${BUCKET_NAME}'...`)
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif'
      ]
    })

    if (createError) {
      console.error('   Error creating bucket:', createError)
      return
    }
    console.log(`   Bucket created successfully!`)
  }

  // Step 2: Check/create player_documents table
  console.log('\n2. Checking player_documents table...')
  const { data: tableCheck, error: tableError } = await supabase
    .from('player_documents')
    .select('id')
    .limit(1)

  if (tableError && tableError.code === '42P01') {
    console.log('   Table does not exist. Creating...')

    // Create the table via raw SQL
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS player_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER,
          category TEXT NOT NULL CHECK (category IN ('identity', 'contract', 'medical', 'performance', 'other')),
          document_type TEXT,
          expiry_date DATE,
          description TEXT,
          uploaded_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_documents_player ON player_documents(player_id);
        CREATE INDEX IF NOT EXISTS idx_documents_category ON player_documents(category);
        CREATE INDEX IF NOT EXISTS idx_documents_expiry ON player_documents(expiry_date);

        ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow authenticated access to player_documents"
          ON player_documents FOR ALL
          USING (auth.role() = 'authenticated');
      `
    })

    if (createTableError) {
      console.log('   Could not create via RPC, table may need manual creation')
      console.log('   Run migration 007_add_player_documents.sql manually')
    } else {
      console.log('   Table created!')
    }
  } else if (tableError) {
    console.error('   Error checking table:', tableError)
  } else {
    console.log('   Table exists!')
  }

  // Step 3: Set up storage policies via SQL
  console.log('\n3. Setting up storage policies...')

  // Storage policies need to be created via SQL
  const policies = [
    {
      name: 'Authenticated users can upload documents',
      sql: `
        CREATE POLICY "Authenticated users can upload documents"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated');
      `
    },
    {
      name: 'Authenticated users can view documents',
      sql: `
        CREATE POLICY "Authenticated users can view documents"
        ON storage.objects FOR SELECT
        USING (bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated');
      `
    },
    {
      name: 'Authenticated users can update documents',
      sql: `
        CREATE POLICY "Authenticated users can update documents"
        ON storage.objects FOR UPDATE
        USING (bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated');
      `
    },
    {
      name: 'Authenticated users can delete documents',
      sql: `
        CREATE POLICY "Authenticated users can delete documents"
        ON storage.objects FOR DELETE
        USING (bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated');
      `
    }
  ]

  for (const policy of policies) {
    try {
      // Try to create policy - will fail if already exists
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql })
      if (error) {
        if (error.message?.includes('already exists')) {
          console.log(`   Policy "${policy.name}" already exists`)
        } else {
          console.log(`   Note: ${policy.name} - may need manual setup`)
        }
      } else {
        console.log(`   Created: ${policy.name}`)
      }
    } catch (e) {
      // Policies may already exist or RPC may not be available
      console.log(`   Note: ${policy.name} - check Supabase Dashboard`)
    }
  }

  // Step 4: Test the setup
  console.log('\n4. Testing storage access...')
  const { data: files, error: listFilesError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 1 })

  if (listFilesError) {
    console.log('   Warning: Could not list files -', listFilesError.message)
  } else {
    console.log('   Storage bucket is accessible!')
    console.log(`   Current files: ${files?.length || 0}`)
  }

  console.log('\n========================================')
  console.log('DOCUMENT STORAGE SETUP COMPLETE')
  console.log('========================================')
  console.log(`Bucket: ${BUCKET_NAME}`)
  console.log('Max file size: 10MB')
  console.log('Allowed types: PDF, Word, Excel, Images')
  console.log('========================================')
  console.log('\nIf policies show warnings, add them manually:')
  console.log('Supabase Dashboard → Storage → Policies')
}

setupDocumentStorage()
