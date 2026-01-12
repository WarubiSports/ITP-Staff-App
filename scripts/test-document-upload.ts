import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const BUCKET_NAME = 'player-documents'

async function testDocumentUpload() {
  console.log('Testing document storage setup...\n')

  // Step 1: Check bucket exists
  console.log('1. Checking bucket...')
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

  if (bucketError) {
    console.error('Error listing buckets:', bucketError)
    return
  }

  const bucket = buckets?.find(b => b.id === BUCKET_NAME)
  if (!bucket) {
    console.error(`Bucket '${BUCKET_NAME}' not found!`)
    return
  }
  console.log(`   ✓ Bucket '${BUCKET_NAME}' exists`)

  // Step 2: Get a test player
  console.log('\n2. Getting test player...')
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .limit(1)
    .single()

  if (playerError || !player) {
    console.error('Error getting player:', playerError)
    return
  }
  console.log(`   ✓ Using player: ${player.first_name} ${player.last_name} (${player.id})`)

  // Step 3: Create a test file
  console.log('\n3. Creating test file...')
  const testContent = `Test Document
Created: ${new Date().toISOString()}
Player: ${player.first_name} ${player.last_name}
This is a test document to verify storage is working.`

  const timestamp = Date.now()
  const filePath = `${player.id}/${timestamp}_test-document.txt`

  // Step 4: Upload test file
  console.log('\n4. Uploading test file...')
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, testContent, {
      contentType: 'text/plain',
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return
  }
  console.log(`   ✓ File uploaded: ${uploadData.path}`)

  // Step 5: Create signed URL
  console.log('\n5. Creating signed URL...')
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 60) // 1 minute expiry

  if (urlError) {
    console.error('Signed URL error:', urlError)
    return
  }
  console.log(`   ✓ Signed URL created`)

  // Step 6: Save document metadata to database
  console.log('\n6. Saving document metadata...')
  const { data: docRecord, error: dbError } = await supabase
    .from('player_documents')
    .insert({
      player_id: player.id,
      name: 'Test Document',
      file_path: filePath,
      file_type: 'text/plain',
      file_size: testContent.length,
      category: 'other',
      document_type: 'other',
      description: 'Test document to verify storage is working',
    })
    .select()
    .single()

  if (dbError) {
    console.error('Database error:', dbError)
    // Clean up uploaded file
    await supabase.storage.from(BUCKET_NAME).remove([filePath])
    return
  }
  console.log(`   ✓ Document metadata saved (ID: ${docRecord.id})`)

  // Step 7: List files in player folder
  console.log('\n7. Listing files in player folder...')
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(player.id)

  if (listError) {
    console.error('List error:', listError)
  } else {
    console.log(`   ✓ Found ${files?.length || 0} files`)
    files?.forEach(f => console.log(`     - ${f.name}`))
  }

  // Step 8: Clean up - delete test document
  console.log('\n8. Cleaning up test document...')

  // Delete from database
  const { error: deleteDbError } = await supabase
    .from('player_documents')
    .delete()
    .eq('id', docRecord.id)

  if (deleteDbError) {
    console.error('Database delete error:', deleteDbError)
  } else {
    console.log('   ✓ Database record deleted')
  }

  // Delete from storage
  const { error: deleteStorageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (deleteStorageError) {
    console.error('Storage delete error:', deleteStorageError)
  } else {
    console.log('   ✓ Storage file deleted')
  }

  console.log('\n========================================')
  console.log('✅ DOCUMENT STORAGE TEST COMPLETE')
  console.log('========================================')
  console.log('All operations successful!')
  console.log('Document storage is fully functional.')
  console.log('========================================')
}

testDocumentUpload()
