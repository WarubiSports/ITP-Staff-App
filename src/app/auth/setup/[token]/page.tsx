'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInviteDetails, setupAccount } from '@/app/staff/actions'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function SetupAccountPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [inviteData, setInviteData] = useState<{
    email: string
    fullName: string
    expiresAt: string
  } | null>(null)
  const [invalidReason, setInvalidReason] = useState<'expired' | 'used' | 'invalid' | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    async function verifyToken() {
      const result = await getInviteDetails(token)

      if (result.error) {
        if (result.expired) {
          setInvalidReason('expired')
        } else if (result.alreadyUsed) {
          setInvalidReason('used')
        } else {
          setInvalidReason('invalid')
        }
        setError(result.error)
      } else if (result.success) {
        setInviteData({
          email: result.email!,
          fullName: result.fullName!,
          expiresAt: result.expiresAt!
        })
      }
      setLoading(false)
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)

    try {
      const result = await setupAccount(token, password)

      if (result.error) {
        setError(result.error)
        setSubmitting(false)
        return
      }

      if (result.success && result.email) {
        // Sign in the user
        const supabase = createClient()
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: password
        })

        if (signInError) {
          setError('Account activated! Please sign in with your new password.')
          setTimeout(() => router.push('/auth/login'), 2000)
        } else {
          // Redirect to dashboard
          router.push('/dashboard')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up account')
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  // Invalid token state
  if (invalidReason) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {invalidReason === 'expired' && 'Invitation Expired'}
            {invalidReason === 'used' && 'Already Activated'}
            {invalidReason === 'invalid' && 'Invalid Invitation'}
          </h1>
          <p className="text-gray-600 mb-6">
            {invalidReason === 'expired' && 'This invitation link has expired. Please contact your administrator for a new invitation.'}
            {invalidReason === 'used' && 'This account has already been activated. You can sign in with your password.'}
            {invalidReason === 'invalid' && 'This invitation link is not valid. Please check the link or contact your administrator.'}
          </p>
          <a
            href="/auth/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  // Setup form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {inviteData?.fullName}!
          </h1>
          <p className="text-gray-600">
            Set your password to activate your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900 font-medium">{inviteData?.email}</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
                required
                minLength={8}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
                required
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Activating...
              </>
            ) : (
              'Activate Account'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
