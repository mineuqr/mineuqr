# WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1 — Architecture

**Status:** Implemented  
**Depends on:** WAITER-SCREEN-ACTIVATION-FORENSICS-1 (Certified), OPERATIONAL-SCREEN-CATALOG-POLICY-1, WAITER-ORDERING-FOUNDATION-1  
**Date:** 2026-07-15  
**Type:** Presentation + Authentication Adoption  

---

## 1. Problem

Hosted Waiter Screen activation reached Screen Runtime correctly, then `WaiterShell` forced Dashboard staff login (`/login?returnTo=/screen`) via `useAuth({ redirectOnUnauthenticated: true })`.

Kitchen / Kiosk hosted shells do not require Dashboard auth after device activation.

---

## 2. Two execution modes

| Mode | Entry | Auth | APIs |
|------|-------|------|------|
| Dashboard | `/waiter` | Staff `useAuth` redirect (unchanged) | `trpc.waiter.*`, `order.placeAsWaiter` |
| Hosted Screen | `/screen` → `presentation_waiter` | Device credentials (Screen Runtime) | `screenTrpc.operationalDevice.runtime.listWaiterFloorTables / attachWaiterTable / placeWaiterOrder` |

One `WaiterShell` — hosted flag selects auth + transport.

---

## 3. Ownership (unchanged)

| Platform | Owns |
|----------|------|
| Screen Platform | Device activation, credentials, `/screen` runtime, deviceProcedure endpoints |
| Session Platform | `resolveOperationalSession` on attach / place |
| Ordering Platform | `IdentityPlaceOrderService` + WAITER BI scope |
| Business Identity | `WT` display numbers |
| Waiter channel | Tables UX, hosted vs dashboard chrome |

---

## 4. Hosted auth policy

When `activation` is set:

1. `redirectOnUnauthenticated: false` — no Dashboard login bounce  
2. Restaurant identity from Screen Runtime activation props  
3. Floor / attach / place via deviceProcedure (role `waiter_display` only)  
4. Session attach still Session Platform; place still Ordering Platform  

Dashboard mode keeps staff redirect and staff procedures.

---

## 5. Non-goals

- No new Waiter application  
- No Session / Ordering / BI redesign  
- No weakening of device credential checks  
- No shared `OrderingCheckoutProvider` dependency on `screenTrpc` (device place stays in hosted checkout stage)
