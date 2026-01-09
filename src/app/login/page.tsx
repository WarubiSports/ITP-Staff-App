'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for error parameter
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'no_profile') {
      setError('No profile found for this account. Contact admin for access.')
    } else if (errorParam === 'auth_error') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Check if staff
        const { data: staffProfile } = await supabase
          .from('staff_profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        // Check if player
        const { data: playerProfile } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', data.user.id)
          .single()

        if (staffProfile) {
          router.push('/dashboard')
        } else if (playerProfile) {
          router.push('/player/dashboard')
        } else {
          // No profile - sign out
          await supabase.auth.signOut()
          setError('No profile found for this account. Contact admin for access.')
          setLoading(false)
          return
        }

        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">FC</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ITP Hub</h1>
          <p className="text-slate-400 mt-1">International Talent Pathway</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
              />

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          1.FC Köln International Talent Pathway
        </p>
      </div>
    </div>
  )
}
