# WAITER-SCREEN-IDENTITY-PRESENTATION-1 — Engineering Report

**Program:** WAITER-SCREEN-IDENTITY-PRESENTATION-1  
**Type:** Presentation Adoption  
**Date:** 2026-07-16  
**Decision:** **PRODUCTION CERTIFIED**

---

## 1. Objective

Expose operational Screen Identity in Waiter UI while preserving Business Identity for the restaurant.

---

## 2. Runtime Adoption

| Field | Public API | Activation prop |
|-------|------------|-----------------|
| Business name | `useRuntimeBusiness().businessName` | `restaurantName` |
| Screen name | `useRuntimeIdentity().displayIdentity` | `screenName` |
| Role label | `useRuntimeRole().role` + `screenTypeLabel` | `roleLabel` |

Forwarded only in `WaiterRolePresentation` → `WaiterShell` activation. No reconstruction.

---

## 3. Presentation Changes

| File | Change |
|------|--------|
| `WaiterRolePresentation.tsx` | Consume identity/business/role Public APIs |
| `WaiterShell.tsx` | Pass hosted `screenName` / `roleLabel` |
| `WaiterScreenIdentityHeader.tsx` | **New** — business + screen + role chrome |
| `WaiterTablesStage.tsx` | Uses identity header |
| `WaiterTableWorkspaceStage.tsx` | Shows hosted identity strip |

Dashboard `/waiter` unchanged (no screen props).

---

## 4. Validation

| Check | Result |
|-------|--------|
| Architecture guards (identity + runtime + hosted-auth + foundation) | **20 passed** |
| `vite build` | **PASS** |
| Runtime / Platform / BI architecture | **Unchanged** |

---

## 5. Certification

| Acceptance criterion | Status |
|----------------------|--------|
| Business name remains visible | **PASS** |
| Screen name displayed from Runtime | **PASS** |
| Devices distinguishable via screen name | **PASS** |
| No Runtime / Platform changes | **PASS** |
| Architecture guards pass | **PASS** |
| vite build passes | **PASS** |

**WAITER-SCREEN-IDENTITY-PRESENTATION-1 — PRODUCTION CERTIFIED**
