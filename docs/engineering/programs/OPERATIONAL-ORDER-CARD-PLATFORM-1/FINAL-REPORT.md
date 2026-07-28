# FINAL REPORT — OPERATIONAL-ORDER-CARD-PLATFORM-1

**Date:** 2026-07-29  
**Type:** Presentation Platform Adoption  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Do not commit / push / deploy**

---

## 1. Executive implementation summary

MineuQR now has an official **Operational Order Card Platform** under `design-system/operational-order-card`. Feature modules still own workflow; the platform owns presentation hierarchy, item scan grammar, status badges, delay/priority chrome, density modes, and long-order scrolling.

Orders, Kitchen/Expo, Waiter, Dashboard Orders, Print list status, and session order rows adopt the platform. Business behavior is unchanged.

---

## 2. Migrated operational surfaces

- Orders Workspace (`OperationalCard` facade)  
- Kitchen + Expo (`KitchenExecutionCard` facade)  
- Waiter table workspace orders  
- Dashboard legacy Orders tab (presentation); status mutations preserved  
- Print Workspace list status  
- DiningSessionOrdersList status  

---

## 3. Removed duplicate presentation

Kitchen/Orders local ticket markup collapsed into platform primitives. Waiter and Dashboard local order article layouts replaced. Facades remain as thin API shims only.

---

## 4. Information hierarchy summary

**Header → Status/Priority/Time → Items (qty→name→modifiers→notes) → Notes/Delay → Financial → Actions**

Quantities use a fixed dominant column. Status uses `SemanticBadge` + `mapOrderStatusToBadgeTone` only.

---

## 5. Responsive / density summary

| Mode | Use |
|---|---|
| Compact | Waiter / dense lists |
| Comfortable | Orders / Dashboard |
| Kitchen | Kitchen + Expo (+ runtime density class merge) |
| Large Display | TV / wall ready tokens |

Item lists scroll inside a max-height viewport; footer/actions stay persistent.

---

## 6. Validation results

Architecture guards updated for platform ownership. Program guard:  
`operationalOrderCardPlatform.architecture.guards.test.ts`

Expected: platform exports, density scroll, SemanticBadge status, migrated call sites, docs present.

---

## 7. Remaining follow-up

| Item | Notes |
|---|---|
| Pickup / Register tickets | No surfaces yet — adopt platform when roles unblocked |
| Print detail pane | Still local detail layout; list status migrated |
| Complimentary/cancelled line projection | Presentation `lineState` ready; sources must project when available |
| Dashboard status buttons | Still feature-local (not OperationalActionId) — intentional |
| Delete thin facades later | Optional cleanup after import path standardization |

---

## 8. Architecture observations

- `OrderPresentationModel` remains the data presentation SSOT; the new platform is the **UI composition SSOT**.  
- Role composition is expressed via props (`density`, `actionMode`, `showFinancial`), not forked components.  
- Semantic Card surfaces (Reporting tint) and Operational Order Card hierarchy are complementary layers.

---

## Artifacts

- [IMPLEMENTATION.md](./IMPLEMENTATION.md)  
- Package: `client/src/design-system/operational-order-card/`  
- Guards: `.../__tests__/operationalOrderCardPlatform.architecture.guards.test.ts`

**Awaiting Architecture Authority approval.**
