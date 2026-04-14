# Technology Stack

**Analysis Date:** 2026-04-15

## Languages

**Primary:**
- TypeScript 5 - All source code (`src/`, `app/`)
- JavaScript (ES6+) - Next.js config and scripts

**Secondary:**
- CSS (Tailwind) - Styling via `tailwind.config.ts`

## Runtime

**Environment:**
- Node.js 18+ - Firebase functions runtime defined in `firebase.json`

**Package Manager:**
- npm - Primary (uses `package-lock.json`)
- pnpm - Optional (lockfile present at `pnpm-lock.yaml`)

## Frameworks

**Core:**
- Next.js 15.2.4 - App Router with React 19 integration (`next.config.mjs`)
- React 19 - UI framework

**UI & Styling:**
- Radix UI - Base component library (27 packages: `@radix-ui/*` in `package.json`)
- shadcn/ui - Component abstraction layer (`src/common/ui/`)
- Tailwind CSS 3.4.17 - Utility-first CSS (`tailwind.config.ts`)
- tailwindcss-animate - Animation utilities
- Framer Motion 12.18.1 - Advanced animations and transitions
- Class Variance Authority 0.7.1 - Component style composition
- clsx 2.1.1 - Conditional CSS class merger

**Forms:**
- React Hook Form 7.54.1 - Form state management
- @hookform/resolvers 3.9.1 - Validation resolver support
- Zod 3.24.1 - Schema validation

**Server State:**
- TanStack React Query 5.81.0 - Server state management and caching (`src/common/providers/query-provider.tsx`)

**Development & Build:**
- TypeScript 5 - Type checking
- PostCSS 8 - CSS processing pipeline
- Autoprefixer 10.4.20 - CSS vendor prefixing

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.78.0 - Supabase client SDK for browser
- @supabase/ssr 0.8.0 - Supabase SSR helpers for Next.js middleware/servers
- next-themes latest - Dark mode support

**UI & Interactions:**
- lucide-react 0.454.0 - Icon library
- @fortawesome/react-fontawesome 3.0.0 - Font Awesome icons (supporting solid, brand, regular)
- emoji-picker-react 4.15.0 - Emoji selection UI
- sonner 1.7.1 - Toast notifications
- lottie-react 2.4.1 - Animation library
- cmdk latest - Command menu/search UI
- embla-carousel-react 8.5.1 - Carousel component
- react-resizable-panels 2.1.7 - Resizable panel layouts
- recharts latest - Chart and visualization library

**Date/Time:**
- date-fns 4.1.0 - Date formatting and manipulation
- react-day-picker 8.10.1 - Calendar date picker

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Headless drag-and-drop foundation
- @dnd-kit/sortable 10.0.0 - Sortable extension
- @dnd-kit/utilities 3.2.2 - Utilities

**Database (Legacy):**
- sequelize 6.37.7 - ORM (for Sequelize/PostgreSQL connection)
- pg 8.19.0 - PostgreSQL driver
- pg-hstore 2.3.4 - hstore type support for PostgreSQL

**Miscellaneous:**
- input-otp 1.4.1 - OTP input component
- tailwind-merge 2.5.5 - Merge Tailwind class conflicts
- vaul 0.9.6 - Drawer/modal component primitives

## Configuration

**Environment:**
- `.env.example` - Template for required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anon key
  - `NEXT_PUBLIC_API_BASE_URL` - Backend API URL (defaults to `http://localhost:3001/api`)
  - `NEXT_PUBLIC_SITE_URL` - Site URL for auth callbacks (optional, defaults to localhost:3311)
  - `NODE_ENV` - Set automatically by Next.js
  - `SUPABASE_DB_URL` - PostgreSQL connection string (server-side only, for Sequelize)

**Build:**
- `tsconfig.json` - Path aliases (`@/*` → `./src/*`), ES6 target, strict mode
- `tailwind.config.ts` - Extends default theme with custom colors, animations, typography
- `next.config.mjs` - Build optimizations:
  - Webpack build worker enabled
  - Parallel server build traces and compiles
  - ESLint and TypeScript errors ignored during builds
  - Images unoptimized for static export
  - Loads v0-generated user config if present

**Middleware:**
- `middleware.ts` - Route protection and auth flow:
  - Redirects unauthenticated users to `/auth/signin`
  - Redirects authenticated users away from auth routes
  - Handles Supabase PKCE password reset callback flow
  - Uses Supabase SSR client with Next.js cookies

## Platform Requirements

**Development:**
- Node.js 18+ (npm or pnpm)
- TypeScript knowledge required
- Supabase account with API keys

**Production:**
- Firebase Hosting (configured in `firebase.json`)
- Supabase project (PostgreSQL database with RLS)
- Port 3311 expected (next.js dev server and production server use `-p 3311`)

**CLI Tools (optional):**
- Supabase CLI - For local development (`db:push`, `db:migrate`, `db:reset`, `db:status` scripts)
- Firebase CLI - For deployment (`deploy` script)

---

*Stack analysis: 2026-04-15*
