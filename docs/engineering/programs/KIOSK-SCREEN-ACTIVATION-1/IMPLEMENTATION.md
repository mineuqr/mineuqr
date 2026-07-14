# KIOSK-SCREEN-ACTIVATION-1 — Implementation
## Certification Report

**Program:** KIOSK-SCREEN-ACTIVATION-1  
**Type:** Architecture Implementation (Screen Platform Activation)  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

A provisioned `self_ordering_kiosk` screen now launches `KioskShell` from Screen Runtime instead of the generic blocked/waiting page. Activation is capability-driven (`presentation_kiosk`). Existing `KioskOrderingClientHost` is reused; QR and kitchen/expo paths are unchanged.

---

## 2. Root cause

`selfOrderingKioskRole` used `createBlockedRoleDefinition` → `isBlockedRole` → `RUN_BLOCKED` → `BlockedRolePresentation`. Kiosk host was never in the presentation graph.

---

## 3. Activation flow

See `ARCHITECTURE.md` §3.

---

## 4. Files changed

| Area | Files |
|------|--------|
| Role | `roleDefinitions.ts`, `runtimeRoleContract.ts` |
| Capabilities | `runtimeCapabilityContract.ts`, `capabilityProviders.ts`, `runtimeCapabilityRegistry.ts`, `resolveCapabilityPresentation.ts` |
| Presentation | `KioskRolePresentation.tsx`, `OperationalScreenShell.tsx` (kiosk chrome) |
| Kiosk shell host mode | `KioskShell.tsx`, `KioskOrderingClientHost.tsx`, `createKioskOrderingNavigator.ts` |
| Runtime identity | `getStatus` + `restaurantSlug`, `runtimeTypes.ts`, `runtimeInstanceContext.ts`, `RuntimeContextFactory.ts` |
| Tests / docs | architecture guards, registry, negotiator, program docs |

---

## 5. Runtime ownership verification

| Concern | Owner after change |
|---------|-------------------|
| Activation | Screen Platform ✓ |
| Idle / language / reset | KioskShell ✓ |
| Browse / cart / checkout | Ordering Client Platform ✓ |

---

## 6. Routing verification

- No new App routes; no redirect from `/screen` → `/kiosk`.
- Screen-hosted stages use host state via `onHostStageNavigate`.
- Standalone `/kiosk/:slug/*` routes unchanged.

---

## 7–9. Validation / build / documentation

| Gate | Result |
|------|--------|
| Scoped activation suites | **99/99 PASS** |
| `vite build` | **PASS** |
| Docs | ARCHITECTURE.md + IMPLEMENTATION.md |

---

## 10. Certification

**CERTIFIED** — kiosk role operational; `presentation_kiosk` resolves to `KioskShell`; blocked waiting page no longer used for this role; QR/`/kiosk` channel path preserved.
