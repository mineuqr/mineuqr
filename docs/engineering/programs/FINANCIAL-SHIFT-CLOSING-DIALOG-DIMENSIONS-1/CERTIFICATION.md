# FINANCIAL-SHIFT-CLOSING-DIALOG-DIMENSIONS-1 — Certification

**Status:** CERTIFIED  
**Date:** 2026-07-25  
**Type:** Presentation refinement (dialog dimensions only)  

---

## 1. Executive Summary

The Shift Closing Summary dialog is resized to a **content-height reconciliation window**: wider on desktop (`max-w-6xl` / 72rem), shorter max height (`40rem` / `88dvh`), equal-weight Drawer/Tender cards from `md`, and a **compact single-row footer** on `sm+`. Scroll remains body-only when the viewport is short. No business, API, print, or Domain changes.

---

## 2. Before vs After Layout Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Width | `56rem` / `max-w-4xl` | `72rem` / `max-w-6xl` |
| Max height | `92dvh` / `52rem` | `88dvh` / `40rem` + `h-auto` |
| Cards | `lg:grid-cols-2`, uneven feel | `md:grid-cols-2` + `items-stretch` |
| Header | `py-4`, larger title | Compact `py-3` / `text-base→lg` |
| Footer | 2 stacked rows, heavy `py-4` | One row `sm+`, `py-2.5` |
| Scroll | Body only | Unchanged governance; less need when content fits |

---

## 3. Dialog Dimension Improvements

- Proportional desktop width uses available space without full-bleed.
- Height follows content; empty vertical chrome reduced.
- Cards share equal columns and stretch for balanced visual weight.
- Footer no longer dominates; Confirm remains the primary destructive action.
- Section spacing tightened (`gap-3` / denser card padding).

---

## 4. Responsive Validation Matrix

| Viewport | Expectation |
|----------|-------------|
| 1920 / 1600 / 1440 | Wide two-column reconciliation window |
| 1366 / 1280 | Two columns from `md`, compact height |
| 1024 / tablet landscape | Two columns, footer row |
| Tablet / portrait | Stacked cards, full-width footer stack |
| Zoom 80–150% | Scroll only when content exceeds `max-h` |

---

## 5. Accessibility Validation

- Focusable actual-cash input unchanged  
- `role="alert"` on validation errors  
- Mobile footer targets `min-h-11`; desktop `sm:min-h-10`  
- RTL via `dir`  
- Section `aria-label`s preserved  

---

## 6. Files Modified

- `client/src/components/register-operations/ShiftClosingSummaryDialog.tsx`  
- `client/src/lib/register-operations-presentation/__tests__/shiftClosingUxLayout.guards.test.ts`  
- `docs/engineering/programs/FINANCIAL-SHIFT-CLOSING-DIALOG-DIMENSIONS-1/CERTIFICATION.md`  

---

## 7. Regression Results

| Area | Result |
|------|--------|
| Open/Close Register & Shift | Unaffected |
| Closing confirm / print callbacks | Unchanged |
| Tender / Drawer data binding | Unchanged |
| Print isolation host | Unchanged |
| Dark theme / RTL | Preserved classes |

---

## 8. Test Results

Layout dimension guards: PASS.

---

## 9. Production Readiness

Client-only CSS/layout. Manual UAT: open closing dialog on 1440/1366/mobile — balanced width, no tall empty frame, footer one row on desktop.

---

## 10. Final Certification

**FINANCIAL-SHIFT-CLOSING-DIALOG-DIMENSIONS-1 is CERTIFIED.**

- [x] Balanced dimensions  
- [x] Equal cards, efficient width  
- [x] Compact footer  
- [x] Scroll only when needed  
- [x] No Domain / API / DB / Financial / Print architecture changes  
- [x] Tests pass  

---

*End of program.*
