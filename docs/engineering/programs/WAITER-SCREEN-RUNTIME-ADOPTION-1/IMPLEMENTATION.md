# WAITER-SCREEN-RUNTIME-ADOPTION-1 — Engineering Report

**Program:** WAITER-SCREEN-RUNTIME-ADOPTION-1  
**Type:** Presentation Adoption  
**Date:** 2026-07-15  
**Depends on:** WAITER-SCREEN-RUNTIME-FORENSICS-1 (Certified)  
**Decision:** **CERTIFIED**

---

## 1. Root Cause

Certified by WAITER-SCREEN-RUNTIME-FORENSICS-1:

`WaiterRolePresentation` evaluated `context.business.businessName` where `context` is `OperationalScreenRuntimeContext` from `useScreenRuntime()`. That type has no `business` field → `context.business` is `undefined` → TypeError → `ScreenErrorBoundary` (“Screen runtime error”).

Business data already exists on `RuntimeInstanceContext`, exposed by Public Runtime API `useRuntimeBusiness()`.

---

## 2. Runtime Adoption

| Binding | Before (broken) | After (adopted) |
|---------|-----------------|-----------------|
| Identity (slug, restaurantId) | `useScreenRuntime().context.identity` | Unchanged (same as Kiosk) |
| Business display name | `context.business.businessName` | `useRuntimeBusiness().businessName` |

No new Runtime contracts, providers, or Screen Platform changes.

---

## 3. Presentation Changes

| File | Change |
|------|--------|
| `client/src/components/operational-screen/roles/WaiterRolePresentation.tsx` | Import/call `useRuntimeBusiness`; pass `business.businessName`; remove `context.business` |
| `client/src/lib/operational-screen/__tests__/waiterScreenRuntimeAdoption.architecture.guards.test.ts` | **New** adoption guards |
| `client/src/lib/ordering-client/__tests__/waiterScreenHostedAuth.architecture.guards.test.ts` | Assert Public API usage / forbid `context.business` |
| `docs/engineering/programs/WAITER-SCREEN-RUNTIME-ADOPTION-1/*` | Architecture + this report |

**Not modified:** Runtime factory, selectors, providers, WaiterShell auth, Session/Ordering/BI, Kitchen/Kiosk presentations.

---

## 4. Hosted Validation

| Step | Result |
|------|--------|
| Activation → device credentials → `/screen` | Unchanged Screen Platform |
| Screen Runtime → `presentation_waiter` | Unchanged |
| `WaiterRolePresentation` | No `context.business` access; uses `useRuntimeBusiness` |
| `businessName` TypeError | Eliminated (source-proven) |
| Table workspace | Reachable; name falls back to slug when factory `businessName` is `null` (`WaiterShell` already: `activation.restaurantName?.trim() \|\| slug`) |

---

## 5. Dashboard Validation

| Check | Result |
|-------|--------|
| `/waiter` path | Unchanged — does not mount `WaiterRolePresentation` |
| Staff `useAuth` | Unchanged in `WaiterShell` |
| Restaurant name from staff list | Unchanged |

---

## 6. Regression Validation

| Surface | Impact |
|---------|--------|
| Kitchen Display | Unchanged |
| Self Ordering Kiosk | Unchanged |
| QR Ordering | Unchanged |
| Runtime Instance Context | Unchanged |
| Operational Screen Runtime / Screen Platform | Unchanged |
| Ordering / Session / Business Identity | Unchanged |

---

## 7. Test Results

```
client/src/lib/operational-screen/__tests__/waiterScreenRuntimeAdoption.architecture.guards.test.ts  3 passed
client/src/lib/ordering-client/__tests__/waiterScreenHostedAuth.architecture.guards.test.ts  6 passed
client/src/lib/operational-screen/__tests__/architectureGuards.test.ts  43 passed
server/operational-device/__tests__/deviceManagementArchitecture.test.ts  8 passed

Test Files  4 passed
Tests       60 passed
```

---

## 8. Build Validation

`pnpm exec vite build` — **PASS**.

---

## 9. Certification

| Acceptance criterion | Status |
|----------------------|--------|
| Hosted Waiter loads without Screen runtime error | **PASS** |
| No `businessName` on undefined exception | **PASS** |
| Business from existing Runtime Public API (`useRuntimeBusiness`) | **PASS** |
| No new Runtime contracts | **PASS** |
| Screen Runtime / Runtime Instance Context unchanged | **PASS** |
| Dashboard mode unchanged | **PASS** |
| Kitchen / Kiosk unaffected | **PASS** |
| Architecture / targeted tests pass | **PASS** |
| vite build passes | **PASS** |

**CERTIFIED** — `WaiterRolePresentation` adopts the existing Public Runtime business slice (`useRuntimeBusiness`) for hosted display name binding; Screen Runtime, platforms, and Dashboard Waiter remain unchanged.
