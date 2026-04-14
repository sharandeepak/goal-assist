# Directory Structure

## Overview

Goal Assist follows a feature-driven architecture with clear separation between Next.js routing (`app/`) and application logic (`src/`).

## Root Layout

```
Goal_Assist/
├── app/                    # Next.js 15 App Router
├── src/
│   ├── common/             # Shared infrastructure
│   └── features/           # Feature modules (12 total)
├── public/                 # Static assets
├── middleware.ts           # Route protection + auth
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies
```

## App Directory (Routes)

```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home redirect to /planner
├── loading.tsx             # Global loading state
├── error.tsx               # Global error boundary
├── globals.css             # Global styles
├── auth/
│   ├── signin/page.tsx
│   ├── signup/page.tsx
│   ├── reset-password/page.tsx
│   └── callback/page.tsx
├── calendar/page.tsx
├── matrix/page.tsx
├── milestones/page.tsx
├── onboarding/page.tsx
├── planner/page.tsx
├── settings/page.tsx
├── timesheet/page.tsx
├── voice-log/page.tsx
└── workspaces/page.tsx
```

**Pattern:** Each route has `page.tsx` + optional `loading.tsx`

## Source Directory

### Common (`src/common/`)

```
src/common/
├── components/             # Shared UI components
│   ├── app-sidebar.tsx     # Main navigation (763 lines)
│   ├── dashboard-layout.tsx
│   ├── nav-menu.tsx
│   └── ...
├── hooks/                  # Shared React hooks
│   ├── use-debounce.ts
│   ├── use-local-storage.ts
│   └── ...
├── providers/              # Context providers
│   ├── auth-provider.tsx   # Auth context (504 lines)
│   ├── query-provider.tsx  # TanStack Query
│   └── theme-provider.tsx
├── lib/                    # Utilities
│   ├── supabase/
│   │   ├── client.ts       # Browser client
│   │   └── server.ts       # Server client
│   └── utils.ts            # cn() helper
├── types/                  # TypeScript types
│   └── index.ts            # All domain types
├── errors/                 # Error handling
│   └── AppError.ts         # Centralized error class
├── ui/                     # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ... (30+ components)
└── CLAUDE.md               # Common module docs
```

### Features (`src/features/`)

```
src/features/
├── auth/                   # Authentication
├── calendar/               # Calendar view
├── dashboard/              # Dashboard analytics (586 lines)
├── matrix/                 # Eisenhower priority matrix
├── milestones/             # Goal milestones
├── satisfaction/           # Daily satisfaction tracking
├── settings/               # User/workspace settings
├── standup/                # Daily standup
├── tasks/                  # Core task management
├── timesheet/              # Time tracking
├── voice-log/              # Voice notes
└── workspace/              # Workspace management
```

### Feature Module Pattern

Each feature follows consistent structure:

```
src/features/{name}/
├── components/             # UI components (React)
├── services/               # Business logic + validation
├── repository/             # Data access (Supabase)
│   ├── {name}Repository.interface.ts
│   └── supabase{Name}Repository.ts
├── types/                  # Feature-specific types
└── styles/                 # Tailwind style objects
```

**Example:** `src/features/tasks/`
```
tasks/
├── components/
│   ├── task-card.tsx
│   ├── task-list.tsx
│   └── task-form.tsx
├── services/
│   └── taskService.ts
├── repository/
│   ├── taskRepository.interface.ts
│   └── supabaseTaskRepository.ts
├── types/
│   └── index.ts
└── styles/
    └── taskStyles.ts
```

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `middleware.ts` | Auth + route protection | ~150 |
| `src/common/providers/auth-provider.tsx` | Auth context | 504 |
| `src/common/components/app-sidebar.tsx` | Navigation | 763 |
| `src/features/dashboard/components/dashboard-page.tsx` | Main dashboard | 586 |
| `src/common/types/index.ts` | All domain types | ~300 |
| `src/common/errors/AppError.ts` | Error handling | ~100 |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskCard.tsx`, `task-card.tsx` |
| Services | camelCase + Service | `taskService.ts` |
| Repositories | camelCase + Repository | `taskRepository.interface.ts` |
| Types | PascalCase | `SupabaseTask`, `AuthContext` |
| Hooks | use + PascalCase | `useDebounce.ts` |
| Styles | camelCase + Styles | `taskStyles.ts` |

## Path Aliases

Configured in `tsconfig.json`:

```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

**Usage:**
- `@/common/...` — Shared infrastructure
- `@/features/...` — Feature modules
- `@/app/...` — Route components

---
*Generated: 2025-04-15*
