# ITP Staff App - Project Context

## Architecture

Two apps sharing a single Supabase backend:

| App | Stack | Path | Deployment |
|-----|-------|------|------------|
| Staff App | Next.js | `/Applications/Apps/itp-staff-app` | `itp-staff-app.vercel.app` |
| Player App | React/Vite | `/Applications/Apps/ITP-Player-App` | `itp-player-app.vercel.app` |

## SSO Flow (Staff → Player App)

1. Staff App sidebar button opens Player App with auth tokens in URL
2. Player App `/auth/sso` page receives tokens, decodes JWT to get userId
3. Sets `localStorage.setItem('itp_password_setup_dismissed', userId)` BEFORE calling `setSession()`
4. This prevents the password setup modal from showing for SSO users

Key files:
- `itp-staff-app/src/components/layout/sidebar.tsx` - `handleOpenPlayerApp()`
- `ITP-Player-App/src/pages/auth/SSO.jsx` - SSO handler

## Data Cleanup Rules

| Data | Rule | Location |
|------|------|----------|
| Grocery Orders | Keep 1 per player | `ITP-Player-App/src/lib/supabase-queries.js` - `createGroceryOrder()` |
| Chores | Keep 3 per house | `itp-staff-app/src/app/operations/operations-content.tsx` |

## Key Directories

- `/src/app/operations/` - Operations hub (Visa, Housing, Grocery, Chores, etc.)
- `/src/app/players/` - Player management
- `/src/app/prospects/` - Trial prospects
- `/src/components/layout/` - Sidebar, app layout
- `/supabase/migrations/` - Database migrations
- `/scripts/` - Utility scripts (test data creation, cleanup)

## Supabase

- Project: `umblyhwumtadlvgccdwg`
- Service role key: See `/scripts/create-test-player.cjs`
