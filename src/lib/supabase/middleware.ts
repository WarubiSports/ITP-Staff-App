import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/players', '/operations', '/tasks', '/calendar', '/attendance', '/prospects', '/staff', '/settings']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check if authenticated user is a staff member
  if (isProtectedPath && user) {
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!staffProfile) {
      // User is not a staff member - sign them out and redirect
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'not_staff')
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login
  if (request.nextUrl.pathname === '/login' && user) {
    // Check if they're staff before redirecting to dashboard
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (staffProfile) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
