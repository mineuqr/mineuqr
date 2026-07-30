# IMPLEMENTATION.md — COMMERCIAL-PLATFORM-ADOPTION-1

## Summary

Adoption-only migration of commercial UI onto certified APIs. No business rules, entitlement engine, billing, or DB redesign.

---

## Inventory

### Public website

| Path | Change |
|------|--------|
| `client/src/pages/Pricing.tsx` | `subscription.listPlans` → `commercialCatalog.public.listOfferings`; capabilities via Catalog feature keys + `catalogFeatureNameKey`; version metadata shown; checkout still uses legacyPlanId bridge (billing unchanged) |

### Admin publishing

| Path | Change |
|------|--------|
| `useCatalogPublishingMutations.ts` | **New** — canonical `commercialCatalog.publishing.*` (approve / schedule / publish / deprecate / retire / archive) |
| `CatalogManagementPanels.tsx` | Versions + Publication panels use publishing hook; Approve / Schedule / Archive actions |
| `ExperiencePanels.tsx` | Bulk + PublicationDiff use publishing hook |
| `PlanCreationWizard.tsx` | Publish via publishing hook |

### Admin / CS

| Path | Change |
|------|--------|
| `CustomerSuccessAccountsSection.tsx` | `subscription.listPlans` → `commercialCatalog.listPublishedOfferings` (mapped to admin plan picker shape) |

### Presentation helpers

| Path | Change |
|------|--------|
| `featureVisibility.ts` | `isCanonicalCurrentPlanByCode` for Public Catalog plan codes |
| `useCommercialFeatureVisibility.ts` | Exposes `isCurrentCatalogPlanByCode` |
| `en.json` / `ar.json` | Approve / Schedule / archive toasts |

### Validation

| Path | Change |
|------|--------|
| `commercialPlatformAdoption.guards.test.ts` | **New** adoption guards |
| Management / experience guard tests | Expect publishing hook (not foundation `publishVersion.useMutation`) |

---

## Explicit non-changes

- Subscription Runtime entitlement resolution (I-SRE-01)
- Checkout / payment gateway procedures
- Commercial Snapshot bind paths
- Foundation DB / lifecycle enum
- Server `subscription.listPlans` retained as **payment activation bridge** only (no UI callers)
