'use client'

import { useState, useRef } from 'react'
import { Loader2, Bug, ImagePlus, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

// Direct fetch helper to bypass Supabase SSR client issues
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  // Supabase SSR stores auth in cookies, not localStorage
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  // Get all cookies and find the auth token parts
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    if (key) acc[key] = value
    return acc
  }, {} as Record<string, string>)

  // Supabase splits large tokens across multiple cookies (.0, .1, etc.)
  let base64Token = ''
  let i = 0
  while (cookies[`${cookieName}.${i}`]) {
    base64Token += cookies[`${cookieName}.${i}`]
    i++
  }

  if (!base64Token) return null

  try {
    // Decode base64 and parse JSON
    const decoded = atob(base64Token.replace('base64-', ''))
    const parsed = JSON.parse(decoded)
    return parsed.access_token || null
  } catch {
    return null
  }
}

async function supabaseInsert(table: string, data: Record<string, unknown>): Promise<{ error: Error | null }> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

interface ReportBugModalProps {
  isOpen: boolean
  onClose: () => void
  currentUrl?: string
  userName?: string
  userId?: string
}

export function ReportBugModal({ isOpen, onClose, currentUrl, userName, userId }: ReportBugModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error')
        return
      }
      setScreenshot(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeScreenshot = () => {
    setScreenshot(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `bug-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `bug-screenshots/${fileName}`

    try {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file)

      if (error) {
        console.error('Upload error:', error)
        return null
      }

      // Return the public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Upload screenshot if provided
      let screenshotUrl: string | null = null
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot)
        if (!screenshotUrl) {
          // Continue without screenshot if upload fails
          console.warn('Screenshot upload failed, continuing without it')
        }
      }

      const { error: insertError } = await supabaseInsert('bug_reports', {
        title: formData.title,
        description: formData.description || null,
        page_url: currentUrl || null,
        reporter_id: userId || null,
        reporter_name: userName || null,
        screenshot_url: screenshotUrl,
        status: 'open',
        priority: 'medium',
      })

      if (insertError) throw insertError

      showToast('Bug report submitted. Thank you!')
      setFormData({ title: '', description: '' })
      removeScreenshot()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
      showToast('Failed to submit report', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({ title: '', description: '' })
    removeScreenshot()
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Report a Bug" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <Bug className="w-4 h-4 flex-shrink-0" />
          <span>Help us improve! Describe what went wrong or what you expected to happen.</span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Input
          label="What's the issue? *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Calendar events not showing correctly"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            More details (optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What were you trying to do? What happened instead?"
          />
        </div>

        {/* Screenshot upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Screenshot (optional)
          </label>

          {screenshotPreview ? (
            <div className="relative inline-block">
              <img
                src={screenshotPreview}
                alt="Screenshot preview"
                className="max-h-40 rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={removeScreenshot}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <ImagePlus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to add a screenshot</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotChange}
            className="hidden"
          />
        </div>

        {currentUrl && (
          <p className="text-xs text-gray-500">
            Page: {currentUrl}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.title.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
