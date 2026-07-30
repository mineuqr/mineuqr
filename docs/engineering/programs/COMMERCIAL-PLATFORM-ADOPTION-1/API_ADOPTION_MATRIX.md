# API_ADOPTION_MATRIX.md — COMMERCIAL-PLATFORM-ADOPTION-1

| Consumer need | Before | After |
|---------------|--------|-------|
| Public plan browse | `subscription.listPlans` | `commercialCatalog.public.listOfferings` |
| Public version metadata | legacy plan name/description | `versionName` / `versionCode` on PublicCatalogOffering |
| Public capabilities | JSON feature strings on legacy DTO | `featureKeys` + catalog localization labels |
| Admin published plan picker | `subscription.listPlans` | `commercialCatalog.listPublishedOfferings` |
| Publish (admin) | `commercialCatalog.publishVersion` | `publishing.approveVersion` + `publishing.publishVersion` |
| Schedule | — | `publishing.schedulePublish` |
| Archive | — | `publishing.archiveVersion` |
| Deprecate / Retire | foundation mutations | `publishing.deprecateVersion` / `retireVersion` |
| Workflow status | foundation `state` only | `publishing.listStatuses` (+ foundation state) |
| Entitlements UI | `commercial.getEntitlements` | **Unchanged** (Runtime exclusive) |
| Checkout | `subscription.createCheckoutSession` / `createTapCheckout` | **Unchanged** (billing out of scope) |

## Isolation

| API family | May authorize runtime access? |
|------------|-------------------------------|
| `commercialCatalog.public.*` | **No** (I-CPP-01) |
| `commercialCatalog.publishing.*` | **No** |
| `commercial.getEntitlements` | Display of Runtime decisions only |
| Subscription Runtime | **Yes** — exclusive (I-SRE-01) |
