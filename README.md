# ITP Staff Hub

Staff operations management app for the 1.FC Köln International Talent Pathway program.

## Overview

This app serves as a **connector** between:
- **Player App** (https://itp-player-app.vercel.app) - Daily operations for players
- **Management App** (https://itp-pink.vercel.app) - Full player profiles and leads for top management

The Staff Hub provides staff members with quick access to operational tasks, player information, and administrative functions.

## Features

- **Dashboard** - Overview of active players, pending tasks, and alerts
- **Players** - Quick view of all players with links to full profiles
- **Operations** - Training schedules, visa tracking, housing, and insurance management
- **Tasks** - Staff task management with priorities and categories
- **Settings** - Account management and app connections

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Update `.env.local` with your Supabase credentials:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App URLs (optional - defaults are set)
NEXT_PUBLIC_PLAYER_APP_URL=https://itp-player-app.vercel.app
NEXT_PUBLIC_MANAGEMENT_APP_URL=https://itp-pink.vercel.app
```

**Important:** Use the same Supabase project as the Player App and Management App to share authentication and data.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Tables

The app expects the following Supabase tables (shared with other ITP apps):

- `players` - Player profiles and information
- `tasks` - Staff tasks and to-dos
- `calendar_events` - Training sessions, matches, and events

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to configure the environment variables in your Vercel project settings.

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Icons:** Lucide React

## License

Private - 1.FC Köln International Talent Pathway
