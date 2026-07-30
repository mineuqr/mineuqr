# SCREEN_MAPPING.md — COMMERCIAL-PLATFORM-ADOPTION-1

| Screen | Route | Certified APIs |
|--------|-------|----------------|
| Pricing | `/pricing` | `commercialCatalog.public.listOfferings`, `localization.resolveVisitorContext`, `commercial.getEntitlements` (auth); checkout: `subscription.create*` (billing unchanged) |
| Catalog composition | `/admin/platform/commercial-catalog` | `commercialCatalog.*` CRUD + `publishing.*` |
| Versions panel | (catalog manage) | create/update draft + publishing approve/schedule/publish/deprecate/retire/archive |
| Publication panel | (catalog manage) | validatePublication + publishing.* + listStatuses |
| Plan wizard | (catalog experience) | create* + validatePublication + publishing publish |
| Bulk / Diff | (catalog experience) | publishing.* |
| Customer preview | (catalog experience) | Admin catalog lists (preview) |
| CS Accounts | admin CS | `listPublishedOfferings` + admin subscription mutations |
| Subscription Management | `/subscription` | `subscription.getCurrentSubscription` + `commercial.getEntitlements` |
| Subscription Success | `/subscription/success` | same |
| Payment History | `/payments` | invoices + entitlements for plan name |
| Commercial Diagnostics | `/commercial/diagnostics` | `commercial.getEntitlements` |
| Feature gates (Dashboard, Reports, Templates, …) | various | `useCommercialFeatureVisibility` → Runtime hub |
| Platform Ops Subscription | `/admin/platform/subscription` | none (placeholder) |
| Billing policy | `/billing` | static copy |
