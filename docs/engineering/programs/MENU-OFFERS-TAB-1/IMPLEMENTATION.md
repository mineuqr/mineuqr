# MENU-OFFERS-TAB-1 — QR Menu Offers Tab

**Classification:** Product Readiness  
**Priority:** High  
**Status:** COMPLETE — awaiting certification

## Executive Summary

Customer-facing offers in the QR Menu are moved from a hero card above the menu into a dedicated **Offers** tab. The **Menu** tab remains focused on categories and items. The Offers tab appears only when `offer.listActive` returns at least one offer. Tab switching is instant client-side state with no navigation or extra API calls.

---

## UX Decision

| Before | After |
|--------|-------|
| Large offer cards rendered above menu categories | No offers above the menu |
| Offers mixed into menu scroll | Dedicated Offers browse surface |
| Full-width 16:10 cover images | Compact horizontal cards (`h-28` / `sm:w-40`) |

Offers are treated as an independent product domain with their own tab, not as menu items.

---

## Navigation Changes

- **Menu tab** (`menu.tabMenu`): categories, search, item grid (unchanged behavior).
- **Offers tab** (`menu.tabOffers`): active offers list only.
- Tab bar hidden when `activeOffers.length === 0`.
- If offers become empty while on Offers tab, `MenuView` resets to Menu.

State: `menuTab: 'menu' | 'offers'` in `MenuView.tsx`, passed to all 8 menu templates.

---

## Offers Tab Design

`OffersTabPanel` renders a vertically scrollable list of offer cards. Each card includes:

- Image (lazy-loaded) or `OfferImagePlaceholder`
- Title (AR/EN), description, offer type
- Original price, offer price, discount badge
- Validity period and countdown
- `AddToCartButton` when table ordering is enabled

Optional type filters (daily/weekly/monthly) when multiple offer types exist.

---

## Offer Card Design

- Layout: `flex-col sm:flex-row` — image left on larger screens
- Image: `h-28` mobile, `sm:w-40 md:w-44` — materially smaller than previous full-width hero
- Content-first: title, description, and pricing dominate visual weight

---

## Responsive Behavior

- Tab bar: full-width segmented control, touch-friendly targets
- Cards: stack vertically on mobile; horizontal on `sm+`
- All 8 menu templates use shared `MenuBrowseArea` for consistent behavior

---

## Performance Validation

| Check | Status |
|-------|--------|
| Reuse `offer.listActive` (single query in `MenuView`) | ✓ |
| No duplicate offer queries | ✓ |
| Lazy-loaded images | ✓ |
| Placeholder when no image | ✓ |
| Menu renders without waiting for offers tab | ✓ |
| Instant tab switch (no reload) | ✓ |

---

## Regression Validation

| Check | Status |
|-------|--------|
| Menu categories / search / items | ✓ unchanged path |
| Cart / `AddToCartButton` on offers | ✓ preserved |
| `tableNumber` ordering context | ✓ preserved |
| No server / schema / ORDER-READ changes | ✓ |
| Unit tests | ✓ `MenuOffersTabBar`, `OffersTabPanel` |

```bash
pnpm test client/src/components/menu/__tests__/MenuOffersTabBar.test.tsx client/src/components/menu/__tests__/OffersTabPanel.test.tsx
```

---

## Production Readiness

**Pending operator certification.**

- [ ] Verify Offers tab visible when active offers exist
- [ ] Verify tab hidden with zero active offers
- [ ] Verify multi-offer scroll on mobile and desktop
- [ ] Confirm menu categories unaffected

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/pages/MenuView.tsx` | `menuTab` state + props |
| `client/src/components/MenuTemplates.tsx` | Remove `OffersSection`; add `MenuBrowseArea` |
| `client/src/components/menu/MenuOffersTabBar.tsx` | **New** tab navigation |
| `client/src/components/menu/OffersTabPanel.tsx` | **New** offers browse panel |
| `client/src/components/menu/types.ts` | **New** `MenuBrowseTab` type |
| `client/src/locales/en.json`, `ar.json` | Tab labels |
| Tests + IMPLEMENTATION.md | Regression guards |

**Unchanged:** Orders, Cart, Kitchen, Runtime, Operational Platform, ORDER-READ, offer APIs.
