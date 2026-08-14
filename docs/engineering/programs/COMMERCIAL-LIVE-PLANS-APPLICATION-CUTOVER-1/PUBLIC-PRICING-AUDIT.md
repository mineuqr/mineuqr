# PUBLIC-PRICING-AUDIT.md

Path:

Admin `saveLive` → durable `commercial_*` → `ensureCatalogReady` hydrate → `projectPublicCatalogOfferings` → `commercialCatalog.public.listOfferings`

## Not present

- In-memory-only publication as SSOT
- `catalogPublishingService.publish` (file does not exist; `publishing/` is live read-model + optional cache)
- Version / published-version lookup
- Bootstrap-as-publication (`bootstrapPersistentCommercialCatalog` seeds live rows only when store empty)

Public catalog is **not** entitlement authority.

## Production Live Plans (read-only 2026-08-15)

| code | name | USD monthly | public |
|------|------|-------------|--------|
| basic | Basic | 0.00 | yes (`isHidden=0`) |
| professional | Professional | 26.40 | yes |
| enterprise | Enterprise | 79.73 | yes |

`listPublicCatalogOfferings` lists non-hidden live plans after hydrate. After deploy, Pricing.tsx reads this API.

Checkout buttons still pass `offering.legacyPlanId` (30001–30003) into `createCheckoutSession` / `createTapCheckout`. Display book ≠ charge book (see checkout audit).

## Tests

Bootstrap exposes three live plans on public catalog immediately: **PASS**.  
Live edit propagates after `saveLive`: **PASS**.
