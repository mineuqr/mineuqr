# PRODUCTION POST VALIDATION

Read-only `2026-08-15T21:37:04.064Z` / server `18:36:59Z`. Mutation: NONE.

| Check | Before | After |
|-------|--------|--------|
| `DATABASE()` | mineuqr | mineuqr |
| Journal | 0090 `bd9989fa…` | 0090 `bd9989fa…` (id 6144102, count 1) |
| Concession table | present | present |
| Concession rows | 0 | **0** |
| Subscriptions | 7 | 7 |
| Bindings | 3 | 3 |
| Snapshots | 0 | 0 |
| Plans / prices | 3 / 10 | 3 / 10 |
| 780001 | active yearly unbound enterprise | unchanged |

Business-table INSERT/UPDATE/DELETE = **0**.

## HTTP smoke (GET only)

| Surface | Result |
|---------|--------|
| `https://www.mineuqr.com/` | 200, title MineuQR |
| `/pricing` | 200 |
| `/admin/platform/subscription` | 200 |
| `commercialCatalog.public.status` | 200, entitlementAuthority = subscription-runtime |
| `listOfferings` / `getOffering` | 200, Live Plan UUIDs + planCode + current USD prices |
| `analytics.getMRR` / `getARR` | 401 UNAUTHORIZED (loads; not 500) |
| Unique deploy URL | 401 SSO (expected) |

No payment. No subscription create. No concession grant.
