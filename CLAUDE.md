# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HomePilot is an AI-powered rental platform for first-time renters. It monitors listings, predicts approval odds, detects scams, and guides users through rental applications. The AI surfaces pre-built action buttons proactively rather than waiting for user input.

## Tech Stack

- **React 18 SPA** with **TypeScript** (NOT Next.js despite README — uses **Vite 6**)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config` file)
- **React Router v7** (`createBrowserRouter`)
- **Supabase** for auth, database (PostgreSQL), storage, and realtime
- **shadcn/ui** component library (Radix UI primitives)
- **Motion** (Framer Motion successor, import from `motion/react`)
- **Lucide React** for icons

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
```

No test, lint, or typecheck scripts are configured.

## Environment Variables

Create `.env` in project root with `VITE_` prefix (required for Vite client exposure):
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Architecture

### Routing (`src/app/routes.ts`)
- **Public routes** (no layout): `/`, `/login`, `/signup`, `/onboarding`
- **Protected routes** (wrapped in `Layout` + `ProtectedRoute`): `/home`, `/listings`, `/listing/:id`, `/passport`, `/profile`, `/alert`

### Auth (`src/contexts/AuthContext.tsx`)
- `AuthProvider` wraps the app in `main.tsx`
- Uses `supabase.auth.getSession()` + `onAuthStateChange` subscription
- Stores `user`, `session`, and `profile` (from `profiles` table) in context
- Sign-up passes `first_name`/`last_name` as `user_metadata`; a DB trigger auto-creates the profile row

### Data Fetching (`src/hooks/useSupabaseData.ts`)
Plain `useEffect` + `useState` pattern (no SWR/React Query). Hooks auto-seed default rows when none exist (e.g., `useUserDocuments` creates 6 document records on first load).

### Styling
- CSS custom properties in `src/styles/theme.css` for light (`:root`) and dark (`.dark`) modes
- `ThemeProvider` toggles `dark` class on `<html>`, persists to `localStorage`
- `cn()` utility at `src/app/components/ui/utils.ts` (clsx + tailwind-merge)
- `@` path alias resolves to `./src` (configured in `vite.config.ts`)
- Primary green: `#10B981`, warning amber: `#F59E0B`, danger red: `#EF4444`

### Layout
- Desktop: fixed left sidebar (240px), content offset with `lg:ml-[240px]`
- Mobile: top bar with hamburger, slide-down nav overlay
- Page content: `max-w-7xl mx-auto` with `px-6 lg:px-10`

### Component Patterns
- Motion entrance animations: `initial={{ opacity: 0, y: 20 }}` / `animate={{ opacity: 1, y: 0 }}`
- Loading states: `<Loader2 className="animate-spin" />` from lucide-react
- `ImageWithFallback` (`src/app/components/figma/`) wraps listing images
- Static fallback data in `src/app/components/data.ts` for when Supabase is unavailable

## Database Schema

All tables have Row Level Security (RLS). Migration scripts in `scripts/` (run 001-006 in order in Supabase SQL Editor).

| Table | Purpose |
|---|---|
| `profiles` | One row per user, FK to `auth.users` |
| `documents` | User's uploaded rental docs |
| `listings` | Property listings (public, all authenticated users can SELECT) |
| `user_listing_matches` | Per-user match %, saved/applied state |
| `profile_suggestions` | AI-ranked improvement actions with impact scores |
| `alerts` | AI-generated notifications linked to listings |

**Auto-provisioning triggers:** `on_auth_user_created` creates profile row; `on_profile_created` seeds default documents and suggestions.

## Renter Score

Scored out of 900 (not 100). Color thresholds: >=800 green, >=650 amber, <650 red. Rendered via `ScoreRing` SVG component.

## Known Issues

- `competition_level` is referenced in `ListingDetail.tsx` but the DB column is `competition_score` — field name mismatch
- README says Next.js but the project actually uses Vite
- Both `pnpm-lock.yaml` and `package-lock.json` exist — prefer pnpm
