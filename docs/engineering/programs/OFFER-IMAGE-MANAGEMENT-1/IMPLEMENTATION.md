# OFFER-IMAGE-MANAGEMENT-1 — Offer Image Management

**Classification:** Product Readiness  
**Priority:** High  
**Status:** COMPLETE — awaiting certification

## Executive Summary

First-class image management for restaurant **Offers** is implemented end-to-end: canonical `EntityImageMetadata` on the Offer entity, certified storage pipeline reuse (`putUploadedFile` → R2/local), full dashboard upload UX (create + edit, drag-drop, preview, replace, delete), offer list thumbnails with placeholders, and enhanced QR Menu offer cards with lazy-loaded cover images.

**Backward compatible:** existing `imageUrl`-only offers continue to work; new uploads populate both `imageUrl` and `image` JSON metadata.

---

## Architecture Decision

| Decision | Rationale |
|----------|-----------|
| `EntityImageMetadata` on `offers.image` (JSON) | Canonical metadata without redesigning Offer domain fields |
| Retain `imageUrl` | QR Menu / cart / legacy clients unchanged |
| `offers/{restaurantId}/{offerId}-…` storage keys | Tenant-isolated; mirrors menu item pattern |
| Reuse `putUploadedFile` | Single certified upload pipeline (no second system) |
| `offer.deleteImage` mutation | Parity with restaurant branding delete flow |

### EntityImageMetadata

```typescript
{
  storageKey, publicUrl, width, height,
  mimeType, fileSize, uploadedAt
}
```

---

## Storage Integration

| Layer | Path |
|-------|------|
| Upload facade | `server/local-uploads.ts` → `putUploadedFile` |
| Production | `server/storage/r2-provider.ts` |
| Validation | `server/media/entityImage.ts` |
| Router | `offer.uploadImage`, `offer.deleteImage` |

**Migration:** `0058_offer_image_metadata` — `ALTER TABLE offers ADD COLUMN image JSON NULL`

---

## Dashboard Changes

| Component | Change |
|-----------|--------|
| `OfferImageUpload` | Drag-drop, preview, replace, remove, progress |
| `OfferFormDialog` | Image at top; upload on create (pending file → post-create upload) |
| `OffersTab` | Thumbnail or `OfferImagePlaceholder` on every card |

---

## QR Menu Changes

| Enhancement | Detail |
|-------------|--------|
| Layout | Vertical card — large 16:10 cover on top |
| Placeholder | `OfferImagePlaceholder` when no image |
| Performance | `loading="lazy"` + `decoding="async"` |
| Content | Title, description, prices, discount badge, validity dates |
| Resolver | `resolveOfferImageUrl()` prefers `image.publicUrl` |

---

## Validation Results

| Check | Status |
|-------|--------|
| Upload / replace / delete | ✓ Router + UI |
| MIME + 5MB limit | ✓ Server + client |
| Dashboard thumbnails | ✓ |
| QR Menu rendering | ✓ |
| Legacy `imageUrl` only | ✓ `resolveOfferImageUrl` fallback |
| Tenant isolation | ✓ `assertRestaurantAccess` on upload/delete |
| Tests | ✓ `entityImage.test.ts`, `offerImage.test.ts`, `offers.test.ts` |

```bash
pnpm test server/media/__tests__/entityImage.test.ts server/offers.test.ts client/src/lib/offers/__tests__/offerImage.test.ts
```

---

## Security Review

| Control | Implementation |
|---------|----------------|
| Tenant isolation | Storage key includes `restaurantId`; access via offer ownership |
| Authorization | `verifiedProcedure` + `assertRestaurantAccess` |
| Validation | MIME allowlist, max 5MB, non-empty buffer |
| Cross-tenant | Upload/delete blocked when restaurant not owned |

---

## Performance Review

- Lazy-loaded offer cover images in QR Menu
- Browser caching via stable CDN/public URLs
- No blocking: placeholder renders immediately without image
- Thumbnail sizes in dashboard (80×80) vs cover (16:10)

---

## Regression Protection

- `resolveOfferImageUrl` unit tests (metadata vs legacy)
- `offer.uploadImage` / `offer.deleteImage` router tests with tenant denial
- `entityImage` validation + PNG dimension probe tests
- Journal entry `0058` registered for schema column

---

## Production Acceptance

**Pending operator certification.**

- [ ] Apply migration `0058_offer_image_metadata` on staging/production
- [ ] Verify R2 upload on production offer
- [ ] Verify QR Menu offer card with and without image
- [ ] Confirm existing offers without images unchanged

---

## Files Changed

| File | Change |
|------|--------|
| `shared/entityImage.ts` | **New** canonical metadata types |
| `server/media/entityImage.ts` | **New** validation + dimension probe |
| `drizzle/schema.ts` | `offers.image` JSON column |
| `drizzle/0058_offer_image_metadata.sql` | **New** migration |
| `drizzle/meta/_journal.json` | idx 58 |
| `server/routers.ts` | Enhanced upload + `deleteImage` |
| `client/src/components/offers/OfferImageUpload.tsx` | **New** |
| `client/src/components/offers/OfferImagePlaceholder.tsx` | **New** |
| `client/src/lib/offers/offerImage.ts` | **New** |
| `client/src/pages/Dashboard.tsx` | Offer form + list |
| `client/src/components/MenuTemplates.tsx` | QR offer cards |
| `client/src/locales/en.json`, `ar.json` | Image hint strings |
| Tests + IMPLEMENTATION.md | Regression guards |

**Unchanged:** ORDER-READ, Kitchen, Runtime, Operational Platform, menu item image model.
