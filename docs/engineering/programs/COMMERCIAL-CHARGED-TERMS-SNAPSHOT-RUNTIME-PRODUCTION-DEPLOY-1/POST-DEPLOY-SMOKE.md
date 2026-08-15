# POST-DEPLOY SMOKE

Read-only GET probes at `2026-08-15T18:03:23.799Z`. No payment. No subscription create.

Live origin `https://www.mineuqr.com`:

| Probe | Result |
|-------|--------|
| `/` | HTTP 200 — title MineuQR; `x-vercel-id` present |
| `/pricing` | HTTP 200 — checkout offer page loads |
| `/admin/platform/subscription` | HTTP 200 — admin subscription SPA shell loads |
| `commercialCatalog.public.status` | HTTP 200 — `surface=public-catalog`; entitlements remain subscription-runtime |
| `commercialCatalog.public.listOfferings` | HTTP 200 — three Live Plan UUIDs |
| `getOffering` professional UUID | HTTP 200 — `planId=0ade795a-02fa-4d3e-b9b5-262515bade09` |
| `getOffering` enterprise UUID | HTTP 200 — `planId=d836bd10-9d9f-4408-a076-f921354d785a` |
| `getOffering` integer `30002` | HTTP 400 Invalid UUID (public catalog; webhook integer path unchanged) |
| `analytics.getMRR` | HTTP 401 UNAUTHORIZED — procedure loaded, not 500 |
| `analytics.getARR` | HTTP 401 UNAUTHORIZED — procedure loaded, not 500 |

Catalog prices matched Production `commercial_prices` (USD, `regionId` null):

| planCode | planId | monthly | yearly |
|----------|--------|---------|--------|
| basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | 19.00 | 199.00 |
| professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` | 29.00 | 349.00 |
| enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` | 99.00 | 999.00 |

Existing subscriptions remain the same seven rows with Live Plan UUID `planId`. Entitlement authority stays subscription-runtime → Live Plan hub. Catalog does not participate in entitlement.
