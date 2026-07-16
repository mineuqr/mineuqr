# DASHBOARD-ERROR-STATE-ARCHITECTURE-1 — Components

Shared platform UI states live in `client/src/components/app-state/`.

They are **not** Dashboard components. Do not import from `@/components/dashboard` or `@/pages/Dashboard`.

---

## AppLoadingState

Initial wait for auth or primary query.

| Prop | Type | Notes |
|------|------|-------|
| `label?` | `string` | Optional status text |
| `className?` | `string` | Layout override |

`data-app-state="loading"`

---

## AppEmptyState

Confirmed success with no items / no resource.

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Required |
| `description?` | `string` | Supporting copy |
| `icon?` | `LucideIcon` | Defaults to Inbox |
| `action?` | `ReactNode` | Optional CTA |
| `className?` | `string` | |

Helper: `AppEmptyStateActionButton` for a standard primary CTA.

`data-app-state="empty"`

---

## AppErrorState

Backend / network / unknown failure after authentication.

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Sanitized title |
| `description` | `string` | Sanitized body |
| `retryLabel?` | `string` | With `onRetry` |
| `onRetry?` | `() => void` | Typically `refetch` |
| `isRetrying?` | `boolean` | Disables button while fetching |

`data-app-state="error"` · `role="alert"`

---

## AppUnauthorizedState

Authentication required.

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | |
| `description?` | `string` | |
| `loginLabel` | `string` | CTA label |
| `onLogin` | `() => void` | Navigate to login |

`data-app-state="unauthorized"`

---

## AppForbiddenState

Authenticated but not authorized.

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | |
| `description?` | `string` | |
| `action?` | `ReactNode` | Optional follow-up |

`data-app-state="forbidden"` · `role="alert"`

---

## Adoption recipe

```tsx
const phase = resolveAsyncUiState({ ... });

if (phase === "loading") return <AppLoadingState />;
if (phase === "unauthorized") return <AppUnauthorizedState ... />;
if (phase === "forbidden") return <AppForbiddenState ... />;
if (phase === "error") return <AppErrorState ... />;
if (phase === "empty") return <AppEmptyState ... />;
// success → domain UI
```
