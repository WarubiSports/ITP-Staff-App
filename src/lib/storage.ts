import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'player-documents'

export interface UploadResult {
  path: string
  error?: string
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadDocument(
  file: File,
  playerId: string
): Promise<UploadResult> {
  const supabase = createClient()

  // Generate unique file path: player_id/timestamp_filename
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${playerId}/${timestamp}_${sanitizedName}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { path: '', error: error.message }
  }

  return { path: data.path }
}

/**
 * Get a signed URL for downloading a document
 */
export async function getDocumentUrl(filePath: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error) {
    console.error('Error getting document URL:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Delete a document from storage
 */
export async function deleteDocument(filePath: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])

  if (error) {
    console.error('Error deleting document:', error)
    return false
  }

  return true
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return 'file-text'
  if (fileType.includes('image')) return 'image'
  if (fileType.includes('video')) return 'video'
  if (fileType.includes('word') || fileType.includes('document')) return 'file-text'
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'table'
  return 'file'
}
