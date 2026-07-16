# MineuQR Global Numeric Presentation Policy

**Policy ID:** GLOBAL-NUMERIC-PRESENTATION-POLICY-1  
**Status:** Official  

---

## Statement

MineuQR displays all numeric values using **Western digits (0–9)** on every presentation surface, regardless of UI language.

Text localization is unchanged:

- Arabic UI stays Arabic  
- English UI stays English  

Only numeric glyphs and Arabic numeric separators are normalized.

---

## Required surfaces

Dashboard · Restaurant Settings · Waiter · Kitchen · Expo · Pickup · Kiosk · QR Ordering · Customer Display · Reports · Excel · PDF · Notifications · Receipts · Dialogs · Tables · Charts · Statistics · Business / Operational Metrics · Order / Session / Check / Table / Queue / Receipt numbers · Dates · Times · Percentages · Money

---

## Formatting rules

1. Prefer platform helpers from `@shared/utils/numericPresentation` (or `@/lib/numericPresentation`).  
2. Prefer `formatInRestaurantTimezone` / `formatRiyadh*` for dates (latn by default).  
3. Prefer `formatCurrencyAmount` for money.  
4. Do **not** convert Western digits to Eastern Arabic digits.  
5. Normalize `٫` → `.` and `٬` → `,` when presenting numeric strings.

---

## Examples

| Kind | Correct |
|------|---------|
| Money | `15,450.75 SAR` |
| Percent | `15%` |
| Date | `16/07/2026` (localized month names OK; Western digits) |
| Time | `18:41` |
| Order ID | `1254` |
| Table | `12` |

---

## Enforcement

Architecture guards assert:

- shared helper exists  
- timezone formatters force `latn`  
- currency / kitchen / exports consume Western digits  
