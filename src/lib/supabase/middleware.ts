import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Helper to check user role - single source of truth
async function getUserRole(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const [{ data: staffProfile }, { data: playerProfile }] = await Promise.all([
    supabase.from('staff_profiles').select('id').eq('id', userId).single(),
    supabase.from('players').select('id').eq('user_id', userId).single(),
  ])

  return {
    isStaff: !!staffProfile,
    isPlayer: !!playerProfile,
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Route definitions
  const staffPaths = ['/dashboard', '/players', '/operations', '/tasks', '/calendar', '/attendance', '/prospects', '/staff', '/settings', '/grocery-orders']
  const playerPaths = ['/player']

  const isStaffPath = staffPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isPlayerPath = playerPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isProtectedPath = isStaffPath || isPlayerPath
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isRootPage = request.nextUrl.pathname === '/'

  // No user - redirect protected routes to login
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // User exists - check role and route accordingly
  if (user && (isProtectedPath || isLoginPage || isRootPage)) {
    const { isStaff, isPlayer } = await getUserRole(supabase, user.id)

    // Neither role - sign out and redirect
    if (!isStaff && !isPlayer) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'no_profile')
      return NextResponse.redirect(url)
    }

    // Player trying to access staff routes
    if (isStaffPath && isPlayer) {
      const url = request.nextUrl.clone()
      url.pathname = '/player/dashboard'
      return NextResponse.redirect(url)
    }

    // Staff trying to access player routes
    if (isPlayerPath && isStaff) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Redirect from login/root to appropriate dashboard
    if (isLoginPage || isRootPage) {
      const url = request.nextUrl.clone()
      url.pathname = isStaff ? '/dashboard' : '/player/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
