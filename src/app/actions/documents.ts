'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'player-documents'

export interface DocumentUploadResult {
  path: string
  error?: string
}

export interface DocumentMetadata {
  player_id: string
  name: string
  file_path: string
  file_type: string
  file_size: number
  category: string
  document_type?: string // For visa docs, this stores the visa requirement key (e.g., 'passport', 'birth_certificate')
  expiry_date?: string
  description?: string
}

/**
 * Upload a document to storage (server action using service role)
 */
export async function uploadDocumentAction(
  formData: FormData
): Promise<DocumentUploadResult> {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { path: '', error: 'Unauthorized' }
    }

    const file = formData.get('file') as File
    const playerId = formData.get('playerId') as string

    if (!file || !playerId) {
      return { path: '', error: 'Missing file or player ID' }
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return { path: '', error: 'File size must be less than 10MB' }
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${playerId}/${timestamp}_${sanitizedName}`

    // Upload using admin client (bypasses RLS)
    const adminClient = createAdminClient()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { path: '', error: error.message }
    }

    return { path: data.path }
  } catch (err) {
    console.error('Upload error:', err)
    return { path: '', error: err instanceof Error ? err.message : 'Upload failed' }
  }
}

/**
 * Save document metadata to database
 */
export async function saveDocumentMetadata(
  metadata: DocumentMetadata
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient.from('player_documents').insert({
      player_id: metadata.player_id,
      name: metadata.name,
      file_path: metadata.file_path,
      file_type: metadata.file_type,
      file_size: metadata.file_size,
      category: metadata.category,
      document_type: metadata.document_type || null,
      expiry_date: metadata.expiry_date || null,
      description: metadata.description || null,
      uploaded_by: user.id,
    })

    if (error) {
      console.error('Database insert error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Save metadata error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Save failed' }
  }
}

/**
 * Get a signed URL for downloading a document
 */
export async function getDocumentUrlAction(
  filePath: string
): Promise<{ url: string | null; error?: string }> {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { url: null, error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) {
      console.error('Get URL error:', error)
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl }
  } catch (err) {
    console.error('Get URL error:', err)
    return { url: null, error: err instanceof Error ? err.message : 'Failed to get URL' }
  }
}

/**
 * Delete a document from storage and database
 */
export async function deleteDocumentAction(
  documentId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()

    // Delete from storage
    const { error: storageError } = await adminClient.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue anyway to clean up database record
    }

    // Delete from database
    const { error: dbError } = await adminClient
      .from('player_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return { success: false, error: dbError.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Delete error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Delete failed' }
  }
}

/**
 * Get all documents for a player
 */
export async function getPlayerDocuments(playerId: string) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { documents: [], error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('player_documents')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get documents error:', error)
      return { documents: [], error: error.message }
    }

    return { documents: data || [] }
  } catch (err) {
    console.error('Get documents error:', err)
    return { documents: [], error: err instanceof Error ? err.message : 'Failed to get documents' }
  }
}

/**
 * Get visa documents for a player (category = 'identity', grouped by document_type)
 */
export async function getPlayerVisaDocuments(playerId: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { documents: [], error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('player_documents')
      .select('*')
      .eq('player_id', playerId)
      .eq('category', 'identity')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get visa documents error:', error)
      return { documents: [], error: error.message }
    }

    return { documents: data || [] }
  } catch (err) {
    console.error('Get visa documents error:', err)
    return { documents: [], error: err instanceof Error ? err.message : 'Failed to get documents' }
  }
}

/**
 * Quick upload for visa documents - simplified flow
 */
export async function uploadVisaDocumentAction(
  formData: FormData
): Promise<DocumentUploadResult & { documentId?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { path: '', error: 'Unauthorized' }
    }

    const file = formData.get('file') as File
    const playerId = formData.get('playerId') as string
    const documentType = formData.get('documentType') as string // e.g., 'passport', 'birth_certificate'
    const documentName = formData.get('documentName') as string

    if (!file || !playerId || !documentType) {
      return { path: '', error: 'Missing required fields' }
    }

    if (file.size > 10 * 1024 * 1024) {
      return { path: '', error: 'File size must be less than 10MB' }
    }

    // Upload file
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${playerId}/${timestamp}_${sanitizedName}`

    const adminClient = createAdminClient()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return { path: '', error: uploadError.message }
    }

    // Save metadata with document_type as the visa requirement key
    const { data: docRecord, error: dbError } = await adminClient
      .from('player_documents')
      .insert({
        player_id: playerId,
        name: documentName || file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        category: 'identity', // All visa docs go in identity category
        document_type: documentType, // This is the visa requirement key
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file
      await adminClient.storage.from(BUCKET_NAME).remove([filePath])
      return { path: '', error: dbError.message }
    }

    return { path: uploadData.path, documentId: docRecord.id }
  } catch (err) {
    return { path: '', error: err instanceof Error ? err.message : 'Upload failed' }
  }
}
