# src/common — Shared Module Context

## Directory Contents
```
components/   Shared layout & UI wrappers (app-shell, navbar, sidebar, theme-toggle, …)
errors/       AppError class
hooks/        use-auth.ts (re-exports from auth-provider), use-mobile.tsx, use-toast.ts
lib/
  supabase/
    client.ts   → createClient() — browser-side Supabase instance
    server.ts   → createServerClient() — server component / route handler instance
  db.ts         Sequelize/pg connection (legacy)
  utils.ts      cn() Tailwind class merger
providers/    AuthProvider, QueryProvider (TanStack), ThemeProvider (next-themes)
repository/   BaseRepository abstract class
services/     BaseService abstract class
styles/       Global design tokens
types/        index.ts — all domain types (source of truth)
ui/           shadcn/ui primitives (52 components — use these, don't install raw)
```

## Auth Hook Usage
```ts
import { useAuth } from "@/common/hooks/use-auth";
import { useRequiredAuth } from "@/common/hooks/use-auth";

// useAuth — may return nulls (use in loading-aware components)
const { authUser, user, workspace, isLoading, signOut } = useAuth();

// useRequiredAuth — throws if not authenticated; use inside protected pages
const { userId, workspaceId } = useRequiredAuth();
```

## Supabase Clients
```ts
// Client component / custom hook
import { createClient } from "@/common/lib/supabase/client";
const supabase = createClient();

// Server component / Route Handler / middleware
import { createServerClient } from "@supabase/ssr"; // see server.ts for cookie config
```

## Utility
```ts
import { cn } from "@/common/lib/utils";
// cn("base", condition && "extra", className)  — merges Tailwind classes safely
```

## UI Components
All shadcn/ui primitives live in `src/common/ui/`. Import from there, never from `shadcn` directly:
```ts
import { Button } from "@/common/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/common/ui/dialog";
import { Input } from "@/common/ui/input";
```

## AppError — Central Error Class
```ts
import { AppError } from "@/common/errors/AppError";
// Static factories: .badRequest() .notFound() .conflict() .internal()
// Properties: errorCode (string), errorMessage (string), httpStatusCode (number)
```
