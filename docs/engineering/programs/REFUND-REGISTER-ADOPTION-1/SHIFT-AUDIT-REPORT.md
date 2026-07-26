# REFUND-REGISTER-ADOPTION-1 — Shift Audit Report

| Field | Value |
|---|---|
| **Program** | REFUND-REGISTER-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Shift calculations

| Concern | Result |
|---------|--------|
| Refunds participate | Via Attribution `cashTenderAmount` (signed for cash) |
| Expected Cash formula | Unchanged: float + movements + Σ attributions |
| Opening balances | Unchanged |
| Closing balances | Deterministic from same formula |
| Historical mutation | None — attributions append-only |
| Shift history immutability | Preserved (ADR-030) |

## Tender summary

Existing `crmpFinancialShiftTenderSummary` already sums attributed refund SR `grandTotal` into `refundAmount` once attributions exist. No formula redesign in this program.

## Evidence

Domain tests: sale + cash refund → Expected Cash 140 → 115 (opening 100 + 40 − 25).

## Final Certification

**PRODUCTION CERTIFIED**
