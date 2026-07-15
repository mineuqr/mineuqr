# WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1 — Engineering Report

**Program:** WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1  
**Type:** Presentation + Authentication Adoption  
**Date:** 2026-07-15  
**Depends on:** WAITER-SCREEN-ACTIVATION-FORENSICS-1 (Certified)  
**Decision:** **CERTIFIED**

---

## 1. Root Cause

WAITER-SCREEN-ACTIVATION-FORENSICS-1 proved Screen activation, device credentials, Screen Runtime, and `presentation_waiter` → `WaiterRolePresentation` were correct.

The login bounce was caused by Dashboard auth inside the Waiter shell:

```ts
useAuth({ redirectOnUnauthenticated: true })
```

Hosted execution under `/screen` still redirected to `/login?returnTo=/screen`. Kitchen Display and Self Ordering Kiosk already skip Dashboard login after device activation; Waiter did not.

---

## 2. Hosted Runtime Adoption

One `WaiterShell` supports two modes via optional `activation` (no second Waiter app):

| Mode | Entry | Gate | Transport |
|------|-------|------|-----------|
| Dashboard | `/waiter` | Staff `useAuth` redirect **on** | `trpc.waiter.*`, `order.placeAsWaiter` |
| Hosted Screen | `/screen` → `presentation_waiter` | Device / activation context; redirect **off** | `screenTrpc.operationalDevice.runtime.*` |

Client adaptations:

| File | Change |
|------|--------|
| `WaiterShell.tsx` | `redirectOnUnauthenticated: !hosted`; hosted ready = slug + restaurantId; `authMode` / `placeAuth` = device vs staff |
| `WaiterRolePresentation.tsx` | Passes `restaurantName` from Screen Runtime business context |
| `WaiterTablesStage.tsx` | Staff vs device floor list / attach |
| `WaiterCheckoutStage.tsx` | Staff vs device place (device path only uses `screenTrpc` inside Screen Runtime) |
| `waiterTableIdentity.ts` / `checkoutTypes.ts` | `placeAuth: "staff" \| "device"` |

Server adaptations (Screen Platform deviceProcedure surface only):

| File | Change |
|------|--------|
| `deviceRoles.ts` | `rolePermitsWaiterOrdering` |
| `WaiterDeviceOrderingService.ts` | **New** — floor list, attach, place via Session + Ordering |
| `operationalDeviceRuntimeRouter.ts` | `listWaiterFloorTables`, `attachWaiterTable`, `placeWaiterOrder` |

Ownership preserved: attach → `resolveOperationalSession`; place → `identityPlaceOrderService` with `identityScope: "WAITER"`. No Session/Ordering/BI redesign. `OrderingCheckoutProvider` intentionally does **not** depend on `screenTrpc`.

---

## 3. Authentication Flow

### Hosted Screen Mode

```
Activation → Device credentials → Screen Runtime
  → presentation_waiter → WaiterRolePresentation
  → WaiterShell(activation) → Tables workspace
```

- No Dashboard login redirect.
- Restaurant identity from activation props (Screen Runtime).
- Floor / attach / place authenticated by `deviceProcedure` + waiter role gate.

### Dashboard Mode

```
/waiter → useAuth(redirectOnUnauthenticated: true) → staff procedures
```

Unchanged relative to pre-adoption Dashboard behavior.

---

## 4. Dashboard Preservation

| Check | Result |
|-------|--------|
| `/waiter` still calls `useAuth` | Yes |
| Unauthenticated redirect still uses `LOGIN_PATH` | Yes (`redirectOnUnauthenticated: !hosted` → `true` when no activation) |
| Staff APIs unchanged for dashboard path | Yes (`trpc.waiter.*`, `order.placeAsWaiter`) |
| Hosted-only device APIs not required for dashboard | Yes |

---

## 5. Runtime Validation

| Step | Expected | Status |
|------|----------|--------|
| Activation | Unchanged Screen Platform flow | **PASS** (unchanged) |
| Device credentials | Unchanged | **PASS** (unchanged) |
| Screen Runtime | Resolves `presentation_waiter` | **PASS** (unchanged) |
| WaiterShell hosted | No `/login?returnTo=/screen` | **PASS** (`redirectOnUnauthenticated: !hosted`) |
| Tables workspace | Device floor APIs when hosted | **PASS** |

---

## 6. Regression Validation

| Surface | Impact |
|---------|--------|
| Kitchen Display | Unchanged |
| Self Ordering Kiosk | Unchanged |
| QR Ordering | Unchanged (`OrderingCheckoutProvider` not tied to `screenTrpc`) |
| Ordering Platform | Reused only; no redesign |
| Operational Session Platform | Reused only; no redesign |
| Business Identity | WAITER scope forced on device place; no ownership move |
| Screen Provisioning / Activation | Unchanged |
| Runtime Materializer | Unchanged |
| Screen Platform ownership | Device endpoints added under existing runtime router |

---

## 7. Test Results

```
client/src/lib/ordering-client/__tests__/waiterScreenHostedAuth.architecture.guards.test.ts  6 passed
client/src/lib/ordering-client/__tests__/waiterOrderingFoundation.architecture.guards.test.ts  8 passed
client/src/lib/ordering-client/__tests__/waiterSessionBindingHardening.architecture.guards.test.ts  3 passed
client/src/lib/operational-screen/__tests__/operationalScreenCatalogPolicy.architecture.guards.test.ts  5 passed
client/src/lib/operational-screen/__tests__/architectureGuards.test.ts  43 passed
server/operational-device/__tests__/**  99 passed (17 files)
```

Hosted-auth guard file asserts: hosted disables login redirect; dashboard retains `useAuth`; device runtime endpoints; WAITER scope via Session/Ordering; `placeAuth: "device"`; presentation passes restaurant context.

---

## 8. Build Validation

`pnpm exec vite build` — **PASS** (built successfully).

---

## 9. Certification

| Acceptance criterion | Status |
|----------------------|--------|
| Hosted Waiter opens operational runtime (no Dashboard login bounce) | **PASS** |
| No redirect to `/login?returnTo=/screen` during hosted execution | **PASS** |
| Dashboard `/waiter` still requires restaurant authentication | **PASS** |
| Screen Runtime remains owner of hosted execution | **PASS** |
| Device activation unchanged | **PASS** |
| Session Platform unchanged (ownership) | **PASS** |
| Ordering Platform unchanged (ownership) | **PASS** |
| Business Identity unchanged (ownership) | **PASS** |
| Screen Platform unchanged (ownership; deviceProcedure surface extended) | **PASS** |
| Targeted tests pass | **PASS** |
| vite build passes | **PASS** |

**CERTIFIED** — Waiter is a first-class Operational Screen under `/screen` (device credentials, no Dashboard login redirect) while Dashboard `/waiter` retains staff `useAuth` authentication. Session, Ordering, Business Identity, and Screen Platform ownership boundaries are preserved.
