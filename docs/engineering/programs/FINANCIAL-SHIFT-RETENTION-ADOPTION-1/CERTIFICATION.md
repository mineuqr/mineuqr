# FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — Certification

**Status:** CERTIFIED  
**Date:** 2026-07-25  
**ADR:** ADR-ARCH-031 (DRAP)  
**Type:** Domain adoption (Financial Shift first consumer)

---

## 1. Executive Summary

Financial Shift adopts DRAP for display-window policy (30 days default). Human **Shift Number** is sequential per restaurant+register. **Shift Archive** browse/search/pagination + closing report view/reprint (existing print isolation). No Settlement/Reporting/ownership changes.

---

## 2. DRAP Adoption

- Global policy `drap.policy.financial_shift.global` via `getFinancialShiftDrapPlatform()`
- Adapter registered in Ops service constructor
- Display presets resolved through `resolveFinancialShiftDisplayWindow`
- Purge remains disabled

---

## 3. Human Shift Number

- Column `shiftNumber` + sequence table `crmp_register_shift_sequences` (migration `0081`)
- Allocated on open / handover successor
- Immutable; UUID remains internal id
- Display padded (`000001`)

---

## 4. Archive Design

- `crmp.financialShift.listArchive` / `archive` / `getClosingReport`
- Reads Shift aggregate directly
- UI: `FinancialShiftArchivePanel` (RTL-ready)

---

## 5. Search & Filters

Shift number, UUID substring, register, operator, status, period presets (today / 7 / 30 / 90 / all), pagination.

---

## 6. Report Access

`getClosingReport` composes stored amounts + certified tender compose; print via existing `ShiftClosingPrintHost` / `printShiftClosingReport` (PDF via browser print).

---

## 7. Files Modified / Created

Migration `0081`, schema, domain shiftNumber, repository allocate/listArchive, DRAP adoption module, Ops service/router/DTOs, Archive UI, copy, tests, this certification.

---

## 8–9. Regression / Tests

Domain open/close/archive unchanged in ownership. Vitest: shift number + retention adoption + prior CRMP suites targeted.

---

## 10. Performance

Archive indexes on `(restaurantId, closedAt)` / status; default 30-day window + limit 25.

---

## 11. Production Readiness

Requires migration `0081`. Purge off. Manual UAT: open shift → see number → close → archive list → reprint.

---

## 12. Final Certification

**FINANCIAL-SHIFT-RETENTION-ADOPTION-1 is CERTIFIED.**

- [x] DRAP adopted for Financial Shift  
- [x] Human Shift Number  
- [x] Shift Archive + report access  
- [x] No Settlement / Reporting / ownership redesign  
- [x] Tests for adoption path  

---

*End of program.*
