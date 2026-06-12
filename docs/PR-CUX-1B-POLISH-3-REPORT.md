# PR-CUX-1B-POLISH-3 — Special Offer Add-To-Cart Consistency

**Mode:** Audit → Fix → Verify  
**Status:** Complete

---

## 1. Audit Findings

### Offer source model

| Question | Answer |
|----------|--------|
| Offer → linked product? | **No** — `offers` table has no `menuItemId` |
| Model | **Standalone orderable promotion** (title, offerPrice, image, dates) |
| Active list API | `offer.listActive` (public) |

### Current add-to-cart path (before)

| Check | Result |
|-------|--------|
| Has productId? | No — offer is the product |
| Uses CartContext? | **No** |
| Uses AddToCartButton? | **No** |
| Blocker | `OffersSection` never received `tableNumber` and had **no** add button |

Regular menu items show `AddToCartButton` only when `tableNumber > 0`. Offers section omitted both.

---

## 2. Root Cause

1. **UI gap:** `OffersSection` was display-only (name, discount, price, countdown).
2. **Missing prop:** `tableNumber` not passed to `OffersSection` across menu templates.
3. **Order pipeline:** `order.create` only resolved `menuItemId` lines — offers had no cart encoding.

---

## 3. Solution

### Customer UI

- Pass `tableNumber` to all `OffersSection` instances (8 templates).
- Add `AddToCartButton` on offer cards when `tableNumber > 0`.
- Reuse same button UX: **أضف** / **تمت الإضافة** / quantity badge.

### Cart encoding (no separate order path)

- `client/src/lib/offerCart.ts` — synthetic cart id: `1_000_000_000 + offerId`
- `AddToCartButton` accepts optional `offerId`
- Same `CartContext` → `CartDrawer` → `order.create` flow

### Server pricing

- `resolveAuthoritativeOrderLines` detects synthetic ids
- Validates offer (restaurant, active, date window)
- Prices from **`offer.offerPrice`** (authoritative)
- Persists `order_items` with `menuItemId: 0`, `nameAr` from offer title

---

## 4. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/offerCart.ts` | Synthetic cart id helpers |
| `client/src/lib/offerCart.test.ts` | Unit tests |
| `client/src/components/AddToCartButton.tsx` | Optional `offerId` |
| `client/src/components/MenuTemplates.tsx` | `tableNumber` + Add button on offers |
| `server/orderPricing.ts` | Offer line resolution |
| `server/order-create-offer-pricing.test.ts` | Offer order test |

**Unchanged:** Dashboard offer management, schema, notifications, confirmation/tracking pages.

---

## 5. Screenshots

Capture on production/staging menu with active offer + table QR:

1. Offer card showing **+ أضف**
2. Cart with offer + regular item
3. Confirmation after submit

_(Operator: screenshot after deploy with live offer.)_

---

## 6. Test Results

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `offerCart.test.ts` | PASS |
| `order-create-offer-pricing.test.ts` | PASS |
| `order-create-pricing.test.ts` | PASS (regression) |

### Manual verification

- [ ] Offer → أضف → cart → submit → confirmation
- [ ] Mixed cart (product + offer)
- [ ] Quantity +/- in CartDrawer
- [ ] Mobile Safari / Chrome

---

## 7. Production Impact

| Area | Impact |
|------|--------|
| Database | None — no migration |
| API | `order.create` accepts existing synthetic cart ids from new clients |
| Deploy | App-only |
| Risk | Low — additive client + server resolution branch |
| Owner dashboard | Orders show offer lines by `nameAr` + `offerPrice` (`menuItemId` 0) |

---

## 8. Acceptance Criteria

| Criterion | Met |
|-----------|-----|
| Orderable offers show **أضف** | Yes |
| Same cart flow | Yes |
| No separate order path | Yes (`order.create`) |
| No CUSTOMER-UX regression | Yes |
| No ordering regression | Yes (menu items unchanged) |

---

## 9. Future (CUSTOMER-UX-1D)

Offer cards can later open a product modal; `AddToCartButton` on offer cards remains compatible.

Optional future: `menuItemId` on offers for linked-product model (dashboard + migration).
