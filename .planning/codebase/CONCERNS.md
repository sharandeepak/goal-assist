# Concerns & Technical Debt

## Overview

Analysis of Goal Assist codebase (16,569 lines across 153 source files) revealing technical debt, known issues, and areas requiring attention.

## Severity Legend

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Blocks functionality or causes data loss |
| **HIGH** | Security risk or significant UX impact |
| **MEDIUM** | Technical debt affecting maintainability |
| **LOW** | Minor improvements or cleanup |

---

## Technical Debt

### Dead Code

**Severity:** MEDIUM

| Issue | Location | Impact |
|-------|----------|--------|
| Sequelize ORM unused | `src/common/lib/sequelize/` | ~200 lines of dead code, confusing for contributors |

**Fix:** Remove entire Sequelize directory and related dependencies.

### Incomplete Features

**Severity:** HIGH

| Feature | Location | Status |
|---------|----------|--------|
| Settings page | `src/features/settings/` | 4 TODO comments blocking critical features |
| Reminder scheduling | Settings | Incomplete implementation |
| Account deletion | Settings | Missing selective localStorage cleanup |

### Type Safety Bypasses

**Severity:** MEDIUM

```typescript
// src/features/auth/services/authService.ts
// Multiple `as any` casts on Supabase RPC calls
```

**Fix:** Create proper TypeScript types for RPC responses.

---

## Known Bugs

### Data Integrity

**Severity:** HIGH

| Bug | Location | Description |
|-----|----------|-------------|
| localStorage.clear() on deletion | `src/features/settings/components/settings-page.tsx:67` | Destroys ALL localStorage, not just app data |
| Full page reload | Same file | Uses `window.location.reload()` instead of Next.js router |

### Race Conditions

**Severity:** HIGH

| Bug | Location | Description |
|-----|----------|-------------|
| Auth cache race | `src/common/providers/auth-provider.tsx:452-462` | Concurrent workspace switches can corrupt profile cache |

### Navigation Issues

**Severity:** MEDIUM

| Bug | Location | Description |
|-----|----------|-------------|
| Lost redirect param | `middleware.ts` | Password-reset redirects don't preserve `next` param |

---

## Security Concerns

### Client-Side Storage

**Severity:** HIGH

| Issue | Risk | Mitigation |
|-------|------|------------|
| localStorage for auth state | XSS can steal tokens | Use httpOnly cookies |
| Direct window.location | Open redirect potential | Validate redirect URLs |

### Information Disclosure

**Severity:** MEDIUM

| Issue | Location |
|-------|----------|
| RPC method names in console errors | Service layer catch blocks |

### Permission Handling

**Severity:** MEDIUM

| Issue | Description |
|-------|-------------|
| Notification API | Doesn't validate runtime permission revocation |

---

## Performance Bottlenecks

### Data Loading

**Severity:** HIGH

| Issue | Location | Impact |
|-------|----------|--------|
| 180-day task history | Dashboard | No pagination, slow for large workspaces |
| No batch operations | Account deletion | 1000+ tasks takes 30+ seconds |

### Component Size

**Severity:** MEDIUM

| Component | Lines | Issue |
|-----------|-------|-------|
| `app-sidebar.tsx` | 763 | Should be split into smaller components |
| `dashboard-page.tsx` | 586 | Complex rendering logic |
| `auth-provider.tsx` | 504 | Cache management complexity |

### Resource Leaks

**Severity:** MEDIUM

| Issue | Location | Impact |
|-------|----------|--------|
| Real-time subscriptions | Various | May leak if unmount before cleanup |
| Timer setInterval | Standup/timesheet | Runs every second even when tab not visible |

---

## Scaling Limits

### Architecture

| Limit | Current State | Breaking Point |
|-------|---------------|----------------|
| Multi-device sessions | Not supported | Single device assumed |
| Real-time sync | Polling-based | Should use Supabase Realtime WebSocket |
| Batch operations | Not implemented | Slow for bulk actions |

---

## Dependencies at Risk

### Unused/Bloat

**Severity:** LOW

| Package | Issue |
|---------|-------|
| FontAwesome | ~200KB of unused icons |
| Sequelize | Completely unused |

### Version Risks

**Severity:** MEDIUM

| Package | Issue |
|---------|-------|
| Recharts | Pinned to "latest" — unpredictable breaking changes |
| emoji-picker-react | Not actively maintained |

---

## Test Coverage Gaps

### Critical Paths Without Tests

| Area | Risk Level |
|------|------------|
| Auth provider cache versioning | HIGH |
| Auth provider race conditions | HIGH |
| Settings reminder edge cases | MEDIUM |
| Settings account deletion flow | HIGH |
| Middleware route matching regex | MEDIUM |
| Dashboard timezone handling | MEDIUM |

---

## Fragile Areas

### High-Risk Files

Files that are complex and frequently touched:

| File | Risk | Reason |
|------|------|--------|
| `auth-provider.tsx` | HIGH | Complex caching, no tests, race conditions |
| `middleware.ts` | MEDIUM | Route matching regex, auth flow |
| `app-sidebar.tsx` | MEDIUM | Monolithic, many responsibilities |
| `dashboard-page.tsx` | MEDIUM | Large component, complex state |

### Coupling Issues

| Area | Description |
|------|-------------|
| Auth + Workspace | Tightly coupled in auth-provider |
| Settings + localStorage | Direct manipulation scattered |

---

## Recommended Actions

### Immediate (Before New Features)

1. Fix `localStorage.clear()` in account deletion
2. Add proper error boundaries with logging
3. Remove dead Sequelize code

### Short-term (Next Sprint)

1. Split large components (sidebar, dashboard)
2. Add tests for auth-provider critical paths
3. Implement batch operations for bulk actions

### Long-term (Technical Investment)

1. Migrate to Supabase Realtime WebSocket
2. Set up structured logging (Sentry/LogRocket)
3. Comprehensive test coverage for auth flows

---
*Generated: 2025-04-15*
