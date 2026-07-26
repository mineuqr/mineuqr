# REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — Financial Identity Report

| Field | Value |
|---|---|
| **Program** | REFUND-DOCUMENT-NUMBERING-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Two planes (unchanged)

| Plane | Settlement | Refund |
|-------|------------|--------|
| Persistence | `sr:…:settlement:N` | `sr:…:refund:N` / `rfnd:…` |
| Operational | `ST-######` | `RF-######` |

Operational identity never participates in money logic (OI-04).

---

## Refund document identity fields (operator-facing)

| Field | Source |
|-------|--------|
| Refund Number | RF sequence |
| Origin Settlement Number | ST from Check id |
| Check Number | `checkId` |
| Business Date | Settlement Record `businessDay` |
| Refund Date | `settledAt` / `createdAt` |
| Restaurant | tenant scope |
| Operator | attribution / createdBy |
| Refund Amount | SR `grandTotal` (copied facts) |
| Refund Reason | Refund domain / apply payload |
| Refund Status | presentation status (`refunded`) |

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| Settlement Ledger | Document Number + Document Type; origin ST under RF rows |
| Detail | Document Number / Type / Origin Settlement |
| Receipt | “Refund Receipt” + prominent RF + origin ST |
| Search | RF number, ST number, Check number |
| Reporting / Register | Consume immutable SRs; numbering is identity only |

---

## Final Certification

**PRODUCTION CERTIFIED**
