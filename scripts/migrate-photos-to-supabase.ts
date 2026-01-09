import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = 'player-photos'
const TEMP_DIR = '/tmp/player-photos'

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// Download file from URL with redirect handling
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'))
        return
      }

      const protocol = currentUrl.startsWith('https') ? https : http
      const request = protocol.get(currentUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            makeRequest(redirectUrl, redirectCount + 1)
            return
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }

        const fileStream = fs.createWriteStream(destPath)
        response.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          resolve()
        })
        fileStream.on('error', reject)
      })

      request.on('error', reject)
      request.setTimeout(30000, () => {
        request.destroy()
        reject(new Error('Request timeout'))
      })
    }

    makeRequest(url)
  })
}

// Extract Google Drive file ID from URL
function extractGoogleDriveId(url: string): string | null {
  // Handle direct export URLs: https://drive.google.com/uc?export=view&id=FILE_ID
  const exportMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (exportMatch) return exportMatch[1]

  // Handle file view URLs: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return fileMatch[1]

  return null
}

async function createBucketIfNotExists() {
  console.log('Checking/creating storage bucket...')

  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('Error listing buckets:', listError)
    return false
  }

  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    })

    if (createError) {
      console.error('Error creating bucket:', createError)
      return false
    }
    console.log(`Created bucket: ${BUCKET_NAME}`)
  } else {
    console.log(`Bucket already exists: ${BUCKET_NAME}`)
  }

  return true
}

async function migratePlayerPhotos() {
  console.log('Starting photo migration to Supabase Storage...\n')

  // Create bucket if needed
  const bucketReady = await createBucketIfNotExists()
  if (!bucketReady) {
    console.error('Failed to prepare storage bucket')
    return
  }

  // Get all players with Google Drive photo URLs
  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, photo_url')
    .not('photo_url', 'is', null)
    .like('photo_url', '%drive.google.com%')

  if (error) {
    console.error('Error fetching players:', error)
    return
  }

  if (!players || players.length === 0) {
    console.log('No players with Google Drive photos found')
    return
  }

  console.log(`Found ${players.length} players with Google Drive photos\n`)

  let successCount = 0
  let failCount = 0

  for (const player of players) {
    const playerName = `${player.first_name} ${player.last_name}`
    console.log(`Processing: ${playerName}`)

    try {
      const fileId = extractGoogleDriveId(player.photo_url)
      if (!fileId) {
        console.log(`  ⚠ Could not extract file ID from URL`)
        failCount++
        continue
      }

      // Download from Google Drive
      const googleUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
      const tempFilePath = path.join(TEMP_DIR, `${player.id}.jpg`)

      console.log(`  Downloading from Google Drive...`)
      await downloadFile(googleUrl, tempFilePath)

      // Check if file was downloaded
      if (!fs.existsSync(tempFilePath)) {
        console.log(`  ⚠ Download failed - file not created`)
        failCount++
        continue
      }

      const fileStats = fs.statSync(tempFilePath)
      if (fileStats.size < 1000) {
        console.log(`  ⚠ Downloaded file too small (${fileStats.size} bytes) - might be an error page`)
        fs.unlinkSync(tempFilePath)
        failCount++
        continue
      }

      // Read file and upload to Supabase
      const fileBuffer = fs.readFileSync(tempFilePath)
      const fileName = `${player.id}.jpg`

      console.log(`  Uploading to Supabase Storage...`)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) {
        console.log(`  ⚠ Upload failed: ${uploadError.message}`)
        fs.unlinkSync(tempFilePath)
        failCount++
        continue
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName)

      const newPhotoUrl = urlData.publicUrl

      // Update player record
      const { error: updateError } = await supabase
        .from('players')
        .update({ photo_url: newPhotoUrl })
        .eq('id', player.id)

      if (updateError) {
        console.log(`  ⚠ Database update failed: ${updateError.message}`)
        failCount++
      } else {
        console.log(`  ✓ Migrated successfully`)
        successCount++
      }

      // Cleanup temp file
      fs.unlinkSync(tempFilePath)

    } catch (err) {
      console.log(`  ⚠ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      failCount++
    }
  }

  console.log(`\n========== Migration Complete ==========`)
  console.log(`✓ Success: ${successCount}`)
  console.log(`✗ Failed: ${failCount}`)
  console.log(`Total: ${players.length}`)
}

migratePlayerPhotos()
