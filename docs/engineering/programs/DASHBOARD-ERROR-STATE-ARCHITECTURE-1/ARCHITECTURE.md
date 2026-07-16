# DASHBOARD-ERROR-STATE-ARCHITECTURE-1 — Architecture

**Classification:** Platform UX Architecture  
**Status:** Implementation  
**Date:** 2026-07-16  
**Related:** CHECK-MANAGEMENT-REGRESSION-FORENSICS-1, CHECK-MANAGEMENT-HOTFIX-1  

---

## 1. Problem

Backend failures were rendered as Empty States when Presentation inferred emptiness from missing React Query data (`!data?.length`) without evaluating `isError`.

This is an architectural ambiguity, not a one-off Dashboard bug.

---

## 2. Official UI State Architecture

Every asynchronous, query-driven screen must distinguish:

| Phase | Meaning |
|-------|---------|
| Loading | Auth bootstrap or initial query pending |
| Unauthorized | Authentication required / session missing |
| Forbidden | Authenticated but not allowed |
| Error | Backend / network / unknown failure |
| Success | Settled payload ready to render |
| Empty | Settled success with no items / no resource |

### Mandatory evaluation order

1. Loading  
2. Authentication  
3. Authorization  
4. Backend / Network Error  
5. Success  
6. Empty  

**Never evaluate Empty before Error.**

Canonical resolver: `client/src/lib/ui-state/resolveAsyncUiState.ts`

---

## 3. React Query policy

| Flag | Official use |
|------|----------------|
| `isPending` | Initial Loading (no settled data) |
| `isFetching` | Background refetch / disable Retry — never replace Error/Success with Loading |
| `isError` / `error` | Evaluated before Empty; feed classifiers only |
| `refetch` | Retry action for Error phase |
| Stale data | Never present as Empty while `isError` |
| `placeholderData` | Allowed only if Empty still gated by `!isError && isSuccess` |

Constants: `REACT_QUERY_UI_POLICY` in `client/src/lib/ui-state/reactQueryPolicy.ts`

---

## 4. Error classification

| Kind | User surface |
|------|----------------|
| `unauthorized` | Unauthorized state |
| `forbidden` | Forbidden state |
| `validation` | Safe short server message when clean |
| `business_rule` | Safe short server message when clean |
| `network` | Generic network copy |
| `database` | Generic data-load copy (never SQL) |
| `unknown` | Generic failure copy |

User messaging must never expose stack traces, SQL, ORM, or implementation details.

---

## 5. Shared presentation infrastructure

Platform components under `client/src/components/app-state/`:

- `AppLoadingState`
- `AppEmptyState`
- `AppErrorState`
- `AppUnauthorizedState`
- `AppForbiddenState`

They must not import Dashboard modules. They are reusable by Reports, Kitchen, Waiter, Kiosk, Customer Display, and future surfaces.

---

## 6. Non-goals (hard boundaries)

Do **not** modify:

- Order Domain, Operational Session, Check Management  
- Operational Runtime / Providers / Materializers  
- Business Identity  
- Dashboard business logic  
- API / tRPC contracts  
- Database  

Presentation architecture only.

---

## 7. Future adoption

Consumers adopt by:

1. Reading React Query flags per policy  
2. Calling `resolveAsyncUiState`  
3. Rendering the matching `App*State` component  
4. Supplying domain-specific Empty copy only after Success  

No redesign required per module.
