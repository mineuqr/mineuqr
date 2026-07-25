# FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1 — Final Certification

**Program:** FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1  
**Status:** CERTIFIED  
**Date:** 2026-07-25  
**Scope:** Print presentation / print rendering architecture only  
**Authorized changes:** Client print host, print CSS, closing dialog print wiring  

---

## 1. Executive Summary

Shift Closing Report printing is isolated to a **single portal root** (`#shift-closing-print-root`) under a **scoped body class** (`printing-shift-closing`). `window.print()` no longer includes the Register Operations workspace. Tender and Drawer summary blocks use `break-inside: avoid`. Browser, PDF, and thermal all use one pipeline: stage report → `printShiftClosingReport()` → isolated DOM.

No Domain, Financial, API, or Database changes.

---

## 2. Root Cause Resolution Mapping

| Certified finding | Resolution |
|-------------------|------------|
| **RC#1** — `window.print()` prints full DOM (workspace + report) | Before print, add `body.printing-shift-closing`; `@media print` hides all, shows only `#shift-closing-print-root` |
| **RC#2** — Tender Summary may split across pages | `.shift-closing-print-block { break-inside / page-break-inside: avoid }` on tender (and peer sections) |
| **Secondary** — Dual mounts of `ShiftClosingPrintReport` | Removed dialog + panel mounts; one `ShiftClosingPrintHost` via `createPortal(document.body)` |

---

## 3. Print Architecture (Before → After)

### Before

```
Dialog → mount ShiftClosingPrintReport (print:block)
Panel  → mount ShiftClosingPrintReport (post-close)
         ↓
window.print() → entire document (Ops chrome + report(s))
```

### After

```
Dialog / Auto-print → onPrint(report) / runClosingPrint(report)
         ↓
ShiftClosingPrintHost (portal → body, #shift-closing-print-root)
         ↓
printShiftClosingReport() → body.printing-shift-closing + window.print()
         ↓
@media print: only #shift-closing-print-root visible
```

**One report · One print root · One rendering path · One template** (`ShiftClosingPrintReport`).

---

## 4. Print Isolation Verification

| Check | Result |
|-------|--------|
| Exactly one `<ShiftClosingPrintHost` in panel | ✓ |
| Dialog does not mount `ShiftClosingPrintReport` | ✓ |
| Panel does not mount `ShiftClosingPrintReport` | ✓ |
| Host portals to `document.body` with stable root id | ✓ |
| Isolation CSS gated on `body.printing-shift-closing` | ✓ |
| Settlement Receipt unaffected (no body class) | ✓ (scoped) |

---

## 5. Page Break Verification

| Block | Class | Rule |
|-------|-------|------|
| Report header / restaurant | `shift-closing-print-block` | avoid |
| Register / shift info | `shift-closing-print-block` | avoid |
| Drawer Summary | `shift-closing-print-block` | avoid |
| Tender Summary | `shift-closing-print-block` | avoid |
| Settlement / orders summary | `shift-closing-print-block` | avoid |
| Footer (generated at) | `shift-closing-print-block` | avoid |

---

## 6. Print CSS Verification

File: `client/src/index.css` (FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1)

- Hide shell: `body.printing-shift-closing > *:not(#shift-closing-print-root) { display: none }`  
  (**not** `visibility: hidden` — that reserved full layout height and produced trailing blank pages: thermal 3 / PDF 2)
- Show root: `#shift-closing-print-root { display: block; position: static; height: auto }`
- `html`/`body` height collapse under isolation class
- Document width: `max-width: 80mm` (thermal-first, A4-compatible)
- Blocks: `break-inside: avoid; page-break-inside: avoid`

No global `@media print` that would hide Settlement Receipt without the body class.

---

## 7. Thermal Printing Verification

| Target | Path | Expected |
|--------|------|----------|
| 80 mm | Same host + `max-w-[80mm]` document | One report |
| 58 mm | Same content; browser scale/margins | One report |
| Browser print → thermal | `window.print()` | One report |

No separate thermal template.

---

## 8. PDF Verification

| Target | Path | Expected |
|--------|------|----------|
| Chrome / Edge Save as PDF | Same isolated print | One report |
| Print Preview | Same | No Ops chrome |

---

## 9. Files Modified

| File | Change |
|------|--------|
| `client/src/lib/register-operations-presentation/shiftClosingPresentation.ts` | Body class constants + `printShiftClosingReport` cleanup |
| `client/src/lib/register-operations-presentation/index.ts` | Export print constants |
| `client/src/components/register-operations/ShiftClosingPrintHost.tsx` | **New** — single portal root |
| `client/src/components/register-operations/ShiftClosingPrintReport.tsx` | Page-break blocks; single template |
| `client/src/components/register-operations/ShiftClosingSummaryDialog.tsx` | `onPrint`; no report mount |
| `client/src/components/register-operations/RegisterOperationsPanel.tsx` | Host + `runClosingPrint` single path |
| `client/src/index.css` | Scoped isolation + break-inside |
| Guards / unit tests | Isolation + body-class behavior |
| `docs/.../CERTIFICATION.md` | This report |

**Not modified:** Domain, API, Database, Settlement, Reporting ownership, Expected Cash, Financial Shift aggregates.

---

## 10. Regression Results

| Flow | Impact |
|------|--------|
| Opening Register | Unchanged |
| Opening Shift | Unchanged |
| Closing Shift (confirm) | Unchanged command path; print staging only |
| Tender / Drawer cards (screen) | Unchanged; hidden during print only |
| Closing Dialog UX | Print button stages host then prints |
| Reporting / Financial Shift domain | Unchanged |

---

## 11. Test Results

| Suite | Result |
|-------|--------|
| `shiftClosingPrintIsolation.guards.test.ts` | PASS |
| `printShiftClosingReport.test.ts` | PASS (jsdom) |
| `shiftClosingPresentation.test.ts` | PASS |
| `shiftClosingUxLayout.guards.test.ts` | PASS |
| `registerOperationsPresentation.architecture.guards.test.ts` | PASS |

Covered: single host, no duplicate mounts, CSS scope, break-inside, body class add/remove, afterprint cleanup.

---

## 12. Production Readiness

- Client-only deploy  
- Manual UAT checklist: Print from dialog; Auto-print after close; Chrome + Edge preview; Save PDF; thermal 80 mm — **one report, no Ops chrome**, tender/drawer intact  
- Rollback: revert presentation/print files listed above  

---

## 13. Final Certification

**FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1 is CERTIFIED.**

Success criteria:

- [x] Exactly one printable report root  
- [x] Workspace never appears under isolated print  
- [x] One PDF / thermal / browser path  
- [x] Tender + Drawer blocks avoid page breaks  
- [x] No Domain / API / Database / Financial logic changes  
- [x] Tests pass  

---

*End of program.*
