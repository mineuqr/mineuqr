# IMPLEMENTATION.md — COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1

## Summary

Implemented Catalog-owned public publishing: governance workflow overlay, public read model, public tRPC API, optional non-SSOT cache, and runtime validation tests. Foundation lifecycle (`draft | published | deprecated | retired`) unchanged — no commercial model / DB redesign.

---

## Inventory

### Shared contracts

| Path | Role |
|------|------|
| `shared/commercial-catalog/publishing/visibility.ts` | Workflow states, visibility matrix, `PublicCatalogOffering` DTO |
| `shared/commercial-catalog/publishing/index.ts` | Barrel |
| `shared/commercial-catalog/index.ts` | Re-exports publishing |

### Server publishing platform

| Path | Role |
|------|------|
| `server/commercial-catalog/publishing/catalogPublishingService.ts` | Canonical publishing authority |
| `server/commercial-catalog/publishing/publicationOverlay.ts` | Approved / Scheduled / Archived overlay (in-process) |
| `server/commercial-catalog/publishing/publicCatalogReadModel.ts` | Public browse / get projection |
| `server/commercial-catalog/publishing/publicCatalogCache.ts` | Optional read cache (env opt-in; not SSOT) |
| `server/commercial-catalog/publishing/index.ts` | Barrel |

### API

| Path | Role |
|------|------|
| `server/api/commercialCatalog/commercialCatalogPublicRouter.ts` | `public.*` + `publishing.*` routers |
| `server/api/commercialCatalog/commercialCatalogRouter.ts` | Mounts `public` + `publishing`; publish/deprecate/retire route through CatalogPublishingService |

### Validation

| Path | Role |
|------|------|
| `server/commercial-catalog/__tests__/commercialCatalogPublicPublishing.test.ts` | Workflow, visibility, isolation, public projection |

---

## Behavior delivered

1. **Catalog Publishing Service** — approve → schedule → publish (workflow-enforced); deprecate / retire; archive (retired only); `applyDueSchedules`.
2. **Publication workflow** — Draft · Approved · Scheduled · Published · Deprecated · Retired · Archived (Approved/Scheduled/Archived via overlay; foundation states unchanged).
3. **Public read model** — Published list; deprecated historically addressable by id; draft/approved/scheduled/retired/archived inaccessible.
4. **Public API** — `commercialCatalog.public.listOfferings | getOffering | getVersionVisibility` (no auth).
5. **Version visibility** — public metadata only; no draft revision internals.
6. **Catalog cache** — `PUBLIC_CATALOG_CACHE=1` optional; invalidated on lifecycle writes; never SSOT.
7. **Compat** — existing `commercialCatalog.publishVersion` still allows direct draft→published (`enforceWorkflow: false`) while clearing overlay + cache.

---

## Explicit non-goals (not implemented)

- Subscription Runtime / entitlement
- Billing, checkout, invoices, payment gateway
- Pricing engine
- Foundation enum / DB extension for Approved|Scheduled|Archived
- AI
