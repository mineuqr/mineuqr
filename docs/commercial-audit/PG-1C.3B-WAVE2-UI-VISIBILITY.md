# PG-1C.3B — Feature Visibility Replacement

**Status:** Implemented (visibility only)  
**Date:** 2026-06-07  

## Deliverables

1. **Inventory:** [`PG-1C.3B-VISIBILITY-INVENTORY.md`](./PG-1C.3B-VISIBILITY-INVENTORY.md)
2. **Visibility helpers:** `client/src/lib/commercial/featureVisibility.ts`
3. **UI updates:** TemplateSelector, ColorCustomizer, FontCustomizer, Pricing, Dashboard, SubscriptionManagement
4. **Diagnostics:** `CommercialVisibilityDiagnostics` on `/commercial/diagnostics`
5. **Tests:** `featureVisibility.test.ts` (6 plan states)

## Safety

- No router, billing, or subscription lifecycle changes
- Excel export and template apply mutations unchanged
- Server gates (`isSubscriptionActive`, `order.canOrder`) remain authoritative

---

*See PG-1C.3B-VISIBILITY-INVENTORY.md for per-file mapping.*
