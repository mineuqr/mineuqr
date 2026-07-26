# REFUND-PRESENTATION-ADOPTION-1 — Presentation Adoption Report

| Field | Value |
|---|---|
| **Program** | REFUND-PRESENTATION-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Settlement Ledger as Unified Entry Point

Refund publications appear in the same Settlement History list and Detail sheet as settlements.

| Surface | Behavior |
|---------|----------|
| History list | Mixed history; filter facet includes Refunded |
| Search | Existing Settlement Record id / financial reference / check / session |
| Date range | Business Day window (unchanged) |
| Detail | Snapshot + compensating linkage + chain timeline |
| Receipt | Polymorphic status (prior adoption) |

---

## Refund history fields (display only)

| Field | Source |
|-------|--------|
| Status | Settlement Record `settlementStatus` / `recordKind` |
| Amount | Published `grandTotal` |
| Timestamp | `settlementTime` |
| Generation | `recordGeneration` |
| Prior settlement | `priorSettlementRecordId` → operational identity |
| Operator | Attribution operator name, else Staff (no raw id) |
| Register / Shift | Attribution display enrichment (fail-open) |
| Payment method | Payment snapshot lines |
| Business day | `audit.businessDay` |

---

## Compensating chain

`getByCheck` → chronological generation order → Settlement Chain section in Detail.

Supports Settlement → Refund → future compensating kinds without a second workspace.

---

## Backward compatibility

- Existing settle / success / receipt workflows unchanged  
- New filters and detail sections are additive  
- Attribution null → “Not attributed” (honest fail-open)  

---

## Final Certification

**PRODUCTION CERTIFIED**
