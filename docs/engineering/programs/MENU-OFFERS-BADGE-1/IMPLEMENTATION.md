# MENU-OFFERS-BADGE-1 — Offers Tab Count Badge

**Classification:** Product Readiness  
**Priority:** Medium  
**Status:** COMPLETE — awaiting certification

## Executive Summary

The QR Menu **Offers** tab now displays a compact count badge sourced from `activeOffers.length` — the same `offer.listActive` data already loaded in `MenuView`. No backend, API, or query changes.

---

## UX Enhancement

| State | Behavior |
|-------|----------|
| `activeOffers.length === 0` | Offers tab hidden (unchanged from MENU-OFFERS-TAB-1) |
| `activeOffers.length > 0` | Offers tab shows label + pill badge, e.g. `Offers` `4` |

The badge updates automatically when the existing React Query result changes.

---

## Badge Design

- Pill shape: `rounded-full`, `h-5`, `text-[11px]`, `tabular-nums`
- Active tab: subtle dark overlay on accent (`rgba(0,0,0,0.18)`)
- Inactive tab: accent fill, black text for contrast
- Placed after the Offers label; does not enlarge touch targets

---

## Accessibility Validation

| Check | Implementation |
|-------|----------------|
| Screen reader count | `aria-label` on Offers tab via `menu.offersTabAria` (`Offers, {count} active offers`) |
| Decorative badge | `aria-hidden` on visual count pill |
| Contrast | Black text on accent / dark overlay |
| Touch targets | Unchanged tab button padding |

---

## Performance Validation

| Check | Status |
|-------|--------|
| No new API calls | ✓ `offerCount={offers.length}` only |
| No new queries | ✓ |
| Extra renders | ✓ Same as parent re-render on list change |

---

## Regression Validation

| Check | Status |
|-------|--------|
| Zero offers → tab hidden | ✓ `visible={hasOffers}` |
| Menu tab unchanged | ✓ |
| MENU-OFFERS-TAB-1 behavior | ✓ |
| Unit tests | ✓ 3 tests in `MenuOffersTabBar.test.tsx` |

```bash
pnpm test client/src/components/menu/__tests__/MenuOffersTabBar.test.tsx
```

---

## Production Readiness

**Pending operator certification.**

- [ ] Confirm badge `1` with single active offer
- [ ] Confirm badge `N` with multiple offers
- [ ] Confirm tab hidden with zero offers

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/components/menu/MenuOffersTabBar.tsx` | `offerCount` prop + badge UI |
| `client/src/components/MenuTemplates.tsx` | Pass `offers.length` |
| `client/src/locales/en.json`, `ar.json` | `offersTabAria` string |
| `client/src/components/menu/__tests__/MenuOffersTabBar.test.tsx` | Badge + a11y tests |
| `IMPLEMENTATION.md` | This document |

**Unchanged:** Server, database, `offer.listActive` API, ORDER-READ, Runtime, Operational Platform.
