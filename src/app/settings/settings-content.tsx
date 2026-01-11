'use client'

import { useState } from 'react'
import { User, Mail, Key, ExternalLink, LogOut, Bug, CheckCircle, Clock, AlertCircle, Copy, Sparkles, Image, ExternalLink as LinkIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import type { BugReport } from '@/types'

interface SettingsContentProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
  bugReports: BugReport[]
  isAdmin?: boolean
}

export function SettingsContent({ user, bugReports, isAdmin = false }: SettingsContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState(bugReports)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Generate Claude Code-ready prompt from bug report
  const generatePrompt = (report: BugReport) => {
    const pageContext = report.page_url ? `on the ${report.page_url} page` : ''

    return `Fix bug in itp-staff-app: "${report.title}"

**Issue:** ${report.title}
${report.description ? `**Details:** ${report.description}` : ''}
${report.page_url ? `**Page:** ${report.page_url}` : ''}
${report.screenshot_url ? `**Screenshot:** ${report.screenshot_url}` : ''}
**Reported by:** ${report.reporter_name || 'Unknown user'}
**Date:** ${new Date(report.created_at).toLocaleDateString()}

Please investigate this issue ${pageContext} and implement a fix.${report.screenshot_url ? ' Review the attached screenshot for visual context.' : ''} After fixing, briefly explain what was wrong and what you changed.`
  }

  const copyPromptToClipboard = async (report: BugReport) => {
    const prompt = generatePrompt(report)
    try {
      await navigator.clipboard.writeText(prompt)
      showToast('Prompt copied to clipboard!')
    } catch (err) {
      showToast('Failed to copy', 'error')
    }
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff Member'

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const updateReportStatus = async (id: string, status: BugReport['status']) => {
    setUpdatingId(id)
    const { error } = await supabase
      .from('bug_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
    setUpdatingId(null)
  }

  const statusConfig: Record<BugReport['status'], { label: string; variant: 'default' | 'warning' | 'success' | 'info' }> = {
    open: { label: 'Open', variant: 'warning' },
    in_progress: { label: 'In Progress', variant: 'info' },
    resolved: { label: 'Resolved', variant: 'success' },
    closed: { label: 'Closed', variant: 'default' },
  }

  const openReports = reports.filter(r => r.status === 'open' || r.status === 'in_progress')
  const closedReports = reports.filter(r => r.status === 'resolved' || r.status === 'closed')

  return (
    <div className="max-w-3xl space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={displayName} size="lg" />
            <div>
              <h3 className="font-semibold text-gray-900">{displayName}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Email Address"
              value={user.email || ''}
              disabled
              className="bg-gray-50"
            />
            <Input
              label="Display Name"
              value={displayName}
              disabled
              className="bg-gray-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Connected Apps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Connected Apps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Quick access to other ITP applications using the same account.
          </p>
          <div className="space-y-3">
            <a
              href={process.env.NEXT_PUBLIC_PLAYER_APP_URL || 'https://itp-player-app.vercel.app'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">Player App</p>
                <p className="text-sm text-gray-500">Daily operations for players</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Bug Reports - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Bug Reports (Admin)
              {openReports.length > 0 && (
                <Badge variant="warning" className="ml-2">{openReports.length} open</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No bug reports yet. Users can click the bug icon in the header to report issues.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Open Reports */}
                {openReports.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Open Issues</h4>
                    <div className="space-y-2">
                      {openReports.map((report) => (
                        <div key={report.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-gray-900">{report.title}</p>
                                <Badge variant={statusConfig[report.status].variant}>
                                  {statusConfig[report.status].label}
                                </Badge>
                              </div>
                              {report.description && (
                                <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                              )}
                              {report.screenshot_url && (
                                <a
                                  href={report.screenshot_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mb-2"
                                >
                                  <img
                                    src={report.screenshot_url}
                                    alt="Bug screenshot"
                                    className="max-h-32 rounded border border-gray-200 hover:border-gray-400 transition-colors"
                                  />
                                </a>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{report.reporter_name || 'Unknown'}</span>
                                <span>{formatDate(report.created_at)}</span>
                                {report.page_url && <span className="truncate max-w-[200px]">{report.page_url}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {report.screenshot_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(report.screenshot_url, '_blank')}
                                  title="View screenshot"
                                  className="text-blue-600 hover:text-blue-700 hover:border-blue-300"
                                >
                                  <Image className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyPromptToClipboard(report)}
                                title="Copy Claude Code prompt"
                                className="text-purple-600 hover:text-purple-700 hover:border-purple-300"
                              >
                                <Sparkles className="w-3 h-3" />
                              </Button>
                              {report.status === 'open' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateReportStatus(report.id, 'in_progress')}
                                  disabled={updatingId === report.id}
                                  title="Mark as in progress"
                                >
                                  <Clock className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReportStatus(report.id, 'resolved')}
                                disabled={updatingId === report.id}
                                title="Mark as resolved"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closed Reports */}
                {closedReports.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Resolved ({closedReports.length})</h4>
                    <div className="space-y-2">
                      {closedReports.slice(0, 5).map((report) => (
                        <div key={report.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <p className="text-sm text-gray-700">{report.title}</p>
                            </div>
                            <span className="text-xs text-gray-500">{formatDate(report.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sign Out */}
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Sign Out</h3>
              <p className="text-sm text-gray-500">Sign out of your account on this device</p>
            </div>
            <Button
              variant="danger"
              onClick={handleSignOut}
              disabled={loading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loading ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
