# OPERATIONAL-SCREEN-CATALOG-POLICY-1 — Engineering Report

**Program:** OPERATIONAL-SCREEN-CATALOG-POLICY-1  
**Type:** Product Governance + Presentation Adoption  
**Date:** 2026-07-15  
**Decision:** **CATALOG POLICY CERTIFIED**  
**Depends on:** DEVICE-MANAGEMENT-1, WAITER-ORDERING-FOUNDATION-1, WAITER-NAVIGATION-ADOPTION-1  

---

## 1. Screen Catalog Audit

| Surface | Finding | Action |
|---------|---------|--------|
| `OPERATIONAL_DEVICE_ROLES` / DB enum | 6 roles; no waiter | Additive `waiter_display` |
| `SCREEN_TYPE_OPTIONS` | All types in create UI | Split visible vs full catalog |
| `ProvisioningWorkspacePanel` | Mapped full options | Use provisioning-visible options only |
| Fleet role filter | Lists types for filter | Keep full `SCREEN_TYPE_OPTIONS` (labels for existing devices) |
| Runtime roles / capabilities | Kiosk via `presentation_kiosk` | Mirror with `presentation_waiter` → WaiterShell |
| Dashboard Workspace nav | Standalone “طلب النادل” | **Removed** |

---

## 2. Product Catalog Changes

**Provisioning-visible:**

| Role id | Product label |
|---------|----------------|
| `kitchen_display` | Kitchen Display |
| `waiter_display` | Waiter Screen |
| `self_ordering_kiosk` | Self Ordering Kiosk |

**Hidden (remain in architecture):**

`expo_display`, `pickup_display`, `customer_display`, `print_monitor`

---

## 3. Files Modified

| Area | Files |
|------|--------|
| Schema | `drizzle/0067_operational_device_waiter_display.sql`, `drizzle/schema.ts` |
| Device roles | `server/operational-device/domain/deviceRoles.ts`, `deviceOrderExecution.ts`, management/fleet zod |
| Catalog labels | `client/src/lib/operational-screen/screenLabels.ts`, `deviceLabels.ts` |
| Provisioning UI | `ProvisioningWorkspacePanel.tsx` |
| Runtime role | `roleDefinitions.ts`, `registerRoles.ts`, `runtimeRoleContract.ts` |
| Capabilities | `runtimeCapabilityContract.ts`, `capabilityProviders.ts`, `resolveCapabilityPresentation.ts`, `runtimeCapabilityRegistry.ts` |
| Presentation | `WaiterRolePresentation.tsx`, `OperationalScreenShell.tsx`, `runtimeRolePresentations.ts` |
| Waiter host | `WaiterShell.tsx` (activation), navigator/host hosted stage |
| Dashboard cleanup | Sidebar / OperationsShell / Dashboard (remove standalone entry) |
| Guards + report | catalog policy tests; nav adoption tests updated |

---

## 4. Navigation Cleanup

- Removed Workspace item `waiter-ordering` / “طلب النادل”.
- Official path: **Screens → Create → Waiter Screen → activate device → `/screen` → WaiterShell**.
- `/waiter/*` routes remain for channel reuse / hosted shell internals; not a dashboard entry.

---

## 5. Screen Provisioning Validation

```
Create (waiter_display)
  → existing management.create / activation code
  → device activation + Screen Runtime
  → negotiate presentation_waiter
  → WaiterRolePresentation
  → WaiterShell(activation={ slug, restaurantId })
  → tables → session attach → Ordering Client Platform
```

No new App routes. No second waiter implementation.

**Ops note:** Migration `0067_operational_device_waiter_display` is certified on this environment (see `MIGRATION-CERTIFICATION.md`). Apply via governed `pnpm db:migrate` on other targets before creating Waiter screens.

---

## 6. Regression Analysis

| Area | Result |
|------|--------|
| Kitchen / Expo operational | Unchanged role defs |
| Kiosk `presentation_kiosk` | Unchanged; waiter checked first in presentation resolve |
| Hidden roles | Still in enum, labels, blocked defs, tests must not delete them |
| Dashboard | Screens entry remains; waiter shortcut gone |
| Ordering / Session / BI | Unchanged |

---

## 7. Acceptance Validation

| Criterion | Status |
|-----------|--------|
| Provisioning shows Kitchen / Waiter / Kiosk only | **PASS** |
| Waiter via Screen Management lifecycle | **PASS** |
| Dashboard standalone Waiter removed | **PASS** |
| Existing WaiterShell reused (activation host) | **PASS** |
| Hidden types not deleted | **PASS** |
| Kitchen / Kiosk behavior preserved | **PASS** |
| No ownership violations | **PASS** |

---

## 8. Certification

**CATALOG POLICY CERTIFIED.**  
**Migration CERTIFIED** — `0067_operational_device_waiter_display` applied via official `pnpm db:migrate`. See `MIGRATION-CERTIFICATION.md`.

Waiter is an officially provisioned Operational Screen (`waiter_display`). Screen Management exposes the simplified product catalog. The Dashboard no longer provides a standalone Waiter entry. Device Management / Screen Runtime architecture is extended additively only — hidden roles and contracts remain.
