# WAITER-SCREEN-RUNTIME-ADOPTION-1 — Architecture

**Status:** Implemented  
**Depends on:** WAITER-SCREEN-RUNTIME-FORENSICS-1 (Certified)  
**Date:** 2026-07-15  
**Type:** Presentation Adoption  

---

## 1. Problem

`WaiterRolePresentation` read `context.business.businessName` from `useScreenRuntime().context` (`OperationalScreenRuntimeContext`), which has no `business` field → runtime TypeError.

---

## 2. Adoption rule

| Need | Source | API |
|------|--------|-----|
| Restaurant slug / id | Orchestrator identity | `useScreenRuntime().context.identity` (same as Kiosk) |
| Business display name | Runtime Instance business slice | Public API `useRuntimeBusiness()` |

Do **not** read `context.business` on `OperationalScreenRuntimeContext`.

---

## 3. Ownership (unchanged)

| Platform | Owns |
|----------|------|
| Screen Platform | Runtime, activation, device credentials |
| Runtime Instance Context | `business`, metadata (via Public Runtime selectors) |
| Session / Ordering / BI | Unchanged — not touched |

Presentation-only change in `WaiterRolePresentation`.

---

## 4. Non-goals

- No new Runtime contracts or providers  
- No Screen Platform / factory / selector changes  
- No Dashboard `/waiter` changes  
- No Kitchen / Kiosk presentation changes  
