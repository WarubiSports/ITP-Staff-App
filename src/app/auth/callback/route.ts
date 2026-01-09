import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  // Get the origin for redirects
  const origin = requestUrl.origin

  if (code) {
    // Handle OAuth code exchange
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_error`)
    }

    // Successful auth - redirect to dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  if (token_hash && type) {
    // Handle email invite/magic link verification
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change',
    })

    if (error) {
      console.error('OTP verification error:', error)
      return NextResponse.redirect(`${origin}/login?error=verification_failed`)
    }

    // For invite type, redirect to set password page
    if (type === 'invite') {
      return NextResponse.redirect(`${origin}/auth/set-password`)
    }

    // For recovery (password reset), also go to set password
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/set-password`)
    }

    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // No code or token - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
