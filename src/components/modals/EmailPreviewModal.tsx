'use client'

import { useState } from 'react'
import { Mail, Send, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendProspectEmail } from '@/app/prospects/actions'

interface EmailPreviewModalProps {
  to: string
  subject: string
  body: string
  prospectId?: string
  emailType?: string
  onClose: () => void
  onSent?: () => void
}

export function EmailPreviewModal({
  to,
  subject: initialSubject,
  body: initialBody,
  prospectId,
  emailType,
  onClose,
  onSent,
}: EmailPreviewModalProps) {
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const hasEmail = !!to

  const handleSend = async () => {
    if (!hasEmail) return
    setSending(true)
    setError('')

    const result = await sendProspectEmail({ to, subject, body, prospectId, emailType })

    if (result.success) {
      onSent?.()
      onClose()
    } else {
      setError(result.error || 'Failed to send email')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Email Preview</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {!hasEmail && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>No email address on file for this prospect. Add an email first to send.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              {to || 'No email address'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
            Skip
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSend}
            disabled={sending || !hasEmail}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </div>
    </div>
  )
}
