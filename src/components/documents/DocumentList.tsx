'use client'

import { useState } from 'react'
import {
  File,
  FileText,
  Image,
  Video,
  Table,
  Download,
  Trash2,
  Calendar,
  AlertCircle,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/storage'
import { getDocumentUrlAction, deleteDocumentAction } from '@/app/actions/documents'
import { PlayerDocument } from '@/types'

interface DocumentListProps {
  documents: PlayerDocument[]
  onRefresh: () => void
}

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  identity: { label: 'Identity', color: 'text-purple-600', bg: 'bg-purple-100' },
  contract: { label: 'Contract', color: 'text-blue-600', bg: 'bg-blue-100' },
  medical: { label: 'Medical', color: 'text-red-600', bg: 'bg-red-100' },
  performance: { label: 'Performance', color: 'text-green-600', bg: 'bg-green-100' },
  other: { label: 'Other', color: 'text-gray-600', bg: 'bg-gray-100' },
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('image')) return Image
  if (fileType.includes('video')) return Video
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return Table
  return File
}

function getDaysUntilExpiry(expiryDate: string): number | null {
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = expiry.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function DocumentList({ documents, onRefresh }: DocumentListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDownload = async (doc: PlayerDocument) => {
    setLoading(doc.id)
    // Open window synchronously to avoid popup blocker
    const newWindow = window.open('about:blank', '_blank')
    try {
      const { url, error } = await getDocumentUrlAction(doc.file_path)
      if (error) {
        newWindow?.close()
        console.error('Download error:', error)
        return
      }
      if (url && newWindow) {
        newWindow.location.href = url
      }
    } catch (err) {
      newWindow?.close()
      console.error('Download error:', err)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (doc: PlayerDocument) => {
    if (!confirm(`Are you sure you want to delete "${doc.name}"? This cannot be undone.`)) {
      return
    }

    setDeleting(doc.id)
    try {
      const { success, error } = await deleteDocumentAction(doc.id, doc.file_path)

      if (!success) {
        console.error('Delete error:', error)
        return
      }

      onRefresh()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(null)
    }
  }

  // Group documents by category
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = []
    }
    acc[doc.category].push(doc)
    return acc
  }, {} as Record<string, PlayerDocument[]>)

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No documents uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(categoryConfig).map(([category, config]) => {
        const categoryDocs = groupedDocs[category]
        if (!categoryDocs || categoryDocs.length === 0) return null

        return (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              {config.label} ({categoryDocs.length})
            </h4>
            <div className="space-y-2">
              {categoryDocs.map((doc) => {
                const FileIcon = getFileIcon(doc.file_type)
                const daysUntilExpiry = doc.expiry_date
                  ? getDaysUntilExpiry(doc.expiry_date)
                  : null

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
                      <FileIcon className="w-5 h-5 text-gray-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                        {doc.document_type && (
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                            {doc.document_type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                        <span>
                          {new Date(doc.created_at).toLocaleDateString('de-DE')}
                        </span>
                        {doc.expiry_date && (
                          <span
                            className={`flex items-center gap-1 ${
                              daysUntilExpiry !== null && daysUntilExpiry < 0
                                ? 'text-red-600'
                                : daysUntilExpiry !== null && daysUntilExpiry < 30
                                ? 'text-orange-600'
                                : 'text-gray-500'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {daysUntilExpiry !== null && daysUntilExpiry < 0
                              ? 'Expired'
                              : `Expires ${new Date(doc.expiry_date).toLocaleDateString('de-DE')}`}
                            {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry < 30 && (
                              <AlertCircle className="w-3 h-3 ml-1" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        disabled={loading === doc.id}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc.id}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
