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

  // Staff-only routes
  const staffPaths = ['/dashboard', '/players', '/operations', '/tasks', '/calendar', '/attendance', '/prospects', '/staff', '/settings', '/grocery-orders']
  const isStaffPath = staffPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Player-only routes
  const playerPaths = ['/player']
  const isPlayerPath = playerPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // All protected paths
  const isProtectedPath = isStaffPath || isPlayerPath

  // Redirect to login if not authenticated
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check user role and route accordingly
  if (isProtectedPath && user) {
    // Check if staff
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    // Check if player
    const { data: playerProfile } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    const isStaff = !!staffProfile
    const isPlayer = !!playerProfile

    // Staff trying to access player routes - redirect to staff dashboard
    if (isPlayerPath && isStaff && !isPlayer) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Player trying to access staff routes - redirect to player dashboard
    if (isStaffPath && isPlayer && !isStaff) {
      const url = request.nextUrl.clone()
      url.pathname = '/player/dashboard'
      return NextResponse.redirect(url)
    }

    // Neither staff nor player - sign out
    if (!isStaff && !isPlayer) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'no_profile')
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login to appropriate dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    const { data: playerProfile } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const url = request.nextUrl.clone()

    if (staffProfile) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    } else if (playerProfile) {
      url.pathname = '/player/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect root to appropriate dashboard
  if (request.nextUrl.pathname === '/' && user) {
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = staffProfile ? '/dashboard' : '/player/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
