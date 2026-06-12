# CUX-1A-POLISH-1 — Date/Time RTL Formatting

**Mode:** Implementation + Verification  
**Scope:** Customer-facing CUSTOMER-UX pages only (PR-CUX-1A / PR-CUX-1B)  
**Status:** Complete

---

## Objective

Unify date and time display on customer order pages for RTL readability, visual consistency, and cross-browser stability—without changing data source or storage.

---

## Before / After

### Before

- Single combined row: **التاريخ والوقت** / **Date & Time**
- One `formatRiyadhDateTime()` string with date + time merged
- Value forced `dir="ltr"` — awkward in RTL layout (overlap, mixed bidi)
- Arabic locale could emit Hijri + Arabic-Indic numerals depending on browser

### After

- Two separate rows:
  - **التاريخ** / **Date** → e.g. `12 يونيو 2026`
  - **الوقت** / **Time** → e.g. `01:09 م`
- Shared component: `CustomerOrderDateTimeFields`
- Values use `dir="auto"`, `lang`, `tabular-nums`, `unicode-bidi: isolate`
- Fixed formatter options: `calendar: gregory`, `numberingSystem: latn`, `Asia/Riyadh`

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/lib/customerOrderDateTime.ts` | **New** — customer date/time formatters |
| `client/src/lib/customerOrderDateTime.test.ts` | **New** — unit tests |
| `client/src/components/customer/CustomerOrderDateTimeFields.tsx` | **New** — shared UI rows |
| `client/src/pages/OrderConfirmationPage.tsx` | Replaced combined datetime row |
| `client/src/pages/OrderStatusPage.tsx` | Replaced combined datetime row |

**Unchanged:** Dashboard, Reports, Admin, notifications, `shared/utils/timezone.ts` storage semantics.

---

## CUSTOMER-UX Date Formatting Inventory

| Location | API | Locale | Notes |
|----------|-----|--------|-------|
| `OrderConfirmationPage` | `CustomerOrderDateTimeFields` → `formatCustomerOrderDate/Time` | `ar-SA` / `en-US` | **Updated** |
| `OrderStatusPage` | `CustomerOrderDateTimeFields` → `formatCustomerOrderDate/Time` | `ar-SA` / `en-US` | **Updated** |
| `orderConfirmationStorage.ts` | Stores raw `createdAt` ISO/DB string | — | No display formatting |
| `orderStatusDisplay.ts` | Status labels only | — | No dates |
| `orderWhatsApp.ts` | No order timestamp in message | — | N/A |

### Removed from CUSTOMER-UX

| Location | Previous API | Issue |
|----------|--------------|-------|
| `OrderConfirmationPage` | `formatRiyadhDateTime(..., { date + time })` + `dir="ltr"` | RTL overlap |
| `OrderStatusPage` | Same | Inconsistent with confirmation |

### Technical audit (requested APIs)

| API | Used in CUSTOMER-UX after polish |
|-----|----------------------------------|
| `toLocaleDateString` | No (direct) |
| `toLocaleTimeString` | No (direct) |
| `toLocaleString` | No |
| `Intl.DateTimeFormat` | Yes — via `formatInRestaurantTimezone` in `customerOrderDateTime.ts` |

Locale is **explicit** (`ar-SA` / `en-US`), not browser-default. Timezone is **fixed** `Asia/Riyadh` via `APP_TIMEZONE`.

---

## Verification

### Automated

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `customerOrderDateTime.test.ts` | PASS |
| `order-get-public-status.test.ts` | PASS (PR-CUX-1B regression) |
| `order-create-tracking.test.ts` | PASS (PR-CUX-1A regression) |

### Manual (operator)

Verify on Desktop Chrome, Mobile Chrome, Safari iPhone:

1. Place order → Confirmation page → separate Date + Time rows, RTL-aligned
2. Track Order → Status page → same date/time layout
3. Refresh / bookmark — display unchanged (server `createdAt`)
4. Switch EN ↔ AR — both rows update consistently

---

## Acceptance Criteria

| Criterion | Met |
|-----------|-----|
| Date clear and independent | Yes |
| Time clear and independent | Yes |
| RTL correct | Yes (`dir="auto"`, no forced LTR block) |
| No visual overlap | Yes |
| No PR-CUX-1A regression | Yes |
| No PR-CUX-1B regression | Yes |

---

## Findings

1. **Hijri vs Gregorian:** `ar-SA` without `calendar: "gregory"` can show Hijri dates in some browsers—customer UX now pins Gregorian for order timestamps.
2. **Arabic-Indic numerals:** `numberingSystem: "latn"` keeps digits readable alongside Arabic month names.
3. **Confirmation still uses sessionStorage** for snapshot data; date formatting is independent of storage (CUX-DATE-1 may address cross-page data authority).

---

## Recommendations for CUX-DATE-1

1. Promote `customerOrderDateTime.ts` pattern to a shared `@shared` customer display module if Dashboard/Reports adopt the same rules.
2. Audit Dashboard `OrdersTab` and Reports for `formatRiyadhDateTime` combined strings.
3. Document global locale policy (Gregorian vs Hijri, `latn` vs `arab`) per surface.
4. Add visual regression snapshots for AR confirmation + status pages on mobile widths.
5. Consider per-restaurant timezone when multi-region venues ship (still out of scope here).

---

## Out of Scope (deferred)

- Global locale change
- Miladi-only platform policy
- Dashboard / Admin / PDF date unification

→ **CUX-DATE-1 — Cross-Device Date Consistency Audit**
