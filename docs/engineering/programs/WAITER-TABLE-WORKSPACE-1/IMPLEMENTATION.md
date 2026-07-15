# WAITER-TABLE-WORKSPACE-1 — Engineering Report

**Program:** WAITER-TABLE-WORKSPACE-1  
**Type:** Presentation + Operational DTO Adoption  
**Date:** 2026-07-16  
**Decision:** **PRODUCTION CERTIFIED**

---

## 1. Root Cause / Gap Addressed

Waiter floor overview attached a session and jumped straight to menu browse. There was no dedicated Table Workspace showing session state, orders, line items, notes, or session totals from Operational DTOs.

---

## 2. Runtime / DTO Adoption

| Layer | Change |
|-------|--------|
| Order Read store | `listOrdersBySessionId` — query existing `order_read_*` only |
| Assembler | `WaiterTableWorkspaceService` maps projections + session aggregates → `WaiterTableWorkspaceDto` / `WaiterFloorTableDto` |
| Staff API | `waiter.getTableWorkspace` + floor list includes `sessionTotalAmount` |
| Device API | `operationalDevice.runtime.getWaiterTableWorkspace` |
| Presentation | `WaiterTableWorkspaceStage` displays DTO fields only |

No Order Domain, Session Platform, materializer, Runtime Provider, or Business Identity redesign.

---

## 3. Presentation Changes

| File | Role |
|------|------|
| `WaiterTablesStage.tsx` | Overview: table #, occupancy, order count, session total |
| `WaiterTableWorkspaceStage.tsx` | **New** — session, orders, items, notes, totals |
| `WaiterShell.tsx` | Select table → workspace; New order → browse; browse back → workspace |
| `createWaiterOrderingNavigator.ts` | `workspace` stage + `goToWorkspace` |
| `waiterOrderingChannelContract.ts` | `/workspace` route |
| `App.tsx` | Workspace route + WaiterShellRoute wrapper |

Flow:

```
tables → attach → workspace → (New order) browse/cart/checkout
```

---

## 4. Hosted Validation

| Check | Status |
|-------|--------|
| Device floor DTO includes session total | **PASS** |
| Device `getWaiterTableWorkspace` | **PASS** (endpoint + presentation wire) |
| Presentation does not call Session/Order services | **PASS** |
| No totals math in UI | **PASS** (displays DTO strings) |

---

## 5. Dashboard Validation

| Check | Status |
|-------|--------|
| `/waiter` staff auth unchanged | **PASS** |
| `waiter.getTableWorkspace` staff path | **PASS** |
| Ordering stages unchanged | **PASS** |

---

## 6. Regression Validation

| Surface | Impact |
|---------|--------|
| Kitchen / Kiosk | Unchanged |
| QR Ordering | Unchanged |
| Screen Runtime / providers | Unchanged |
| Order Domain / materializers | Unchanged (read query only) |
| Session Platform lifecycle | Unchanged (attach reused) |
| Business Identity | Unchanged |

**Modifiers note:** Order Read line DTOs do not project modifiers. Workspace DTO exposes `modifiers: []` and UI shows `—` until a future projection program adds them. Item Notes / Order Notes / prices / totals are projected and displayed.

---

## 7. Test Results

```
client/src/lib/ordering-client/__tests__/waiterTableWorkspace.architecture.guards.test.ts  6 passed
client/src/lib/ordering-client/__tests__/waiterScreenHostedAuth.architecture.guards.test.ts  6 passed
client/src/lib/ordering-client/__tests__/waiterOrderingFoundation.architecture.guards.test.ts  8 passed
client/src/lib/ordering-client/__tests__/waiterSessionBindingHardening.architecture.guards.test.ts  3 passed
client/src/lib/operational-screen/__tests__/waiterScreenRuntimeAdoption.architecture.guards.test.ts  3 passed

Test Files  5 passed
Tests       26 passed
```

---

## 8. Build Validation

`pnpm exec vite build` — **PASS**.

Waiter route TypeScript assignability resolved via `WaiterShellRoute` wrapper. Remaining repo `tsc` diagnostics are pre-existing outside this program (kiosk routes, unrelated modules).

---

## 9. Certification

| Acceptance criterion | Status |
|----------------------|--------|
| Table overview remains lightweight | **PASS** |
| Table Workspace opens from table selection | **PASS** |
| All orders / items / item notes / order notes / session total displayed from DTO | **PASS** |
| No Runtime / Platform architecture redesign | **PASS** |
| Architecture guards pass | **PASS** |
| Targeted tests pass | **PASS** |
| vite build passes | **PASS** |

**WAITER-TABLE-WORKSPACE-1 — PRODUCTION CERTIFIED**
