# DASHBOARD-ERROR-STATE-ARCHITECTURE-1 — Implementation

**Date:** 2026-07-16  

---

## 1. Delivered surface

| Area | Path |
|------|------|
| UI state policy | `client/src/lib/ui-state/` |
| Shared components | `client/src/components/app-state/` |
| Locale keys | `uiState.*` in `en.json` / `ar.json` |
| Dashboard adoption | `client/src/pages/Dashboard.tsx` |
| Guards / unit tests | `client/src/lib/ui-state/__tests__/` |

---

## 2. Policy modules

| Module | Responsibility |
|--------|----------------|
| `resolveAsyncUiState` | Ordered lifecycle: Loading → Auth → Authz → Error → Success → Empty |
| `classifyQueryError` | Map TRPC / transport failures to `QueryErrorKind` |
| `formatUserFacingQueryError` | Sanitize user copy (strip SQL / stacks) |
| `reactQueryPolicy` | Official React Query flag meanings + list helpers |

---

## 3. Dashboard adoption

### Restaurant list (`RestaurantsList`)

- Reads `isPending`, `isError`, `error`, `isFetching`, `refetch`
- Resolves `listPhase` via `resolveAsyncUiState`
- Renders `AppErrorState` on backend failure (never “No restaurants yet”)
- Renders `AppEmptyState` only for successful empty collections

### Restaurant settings bootstrap (`RestaurantDetail` / `getById`)

- Distinguishes Loading / Unauthorized / Forbidden / Error / Empty(not found) / Success
- Settings tab only mounts after successful restaurant load

### Auth shell

- Login-required path uses `AppUnauthorizedState`

---

## 4. Explicit non-changes

- No tRPC / API contract edits  
- No database / migration edits  
- No Check / Session / Runtime / Order Domain edits  
- Dashboard business mutations unchanged (create/delete/update still use existing toasts)
