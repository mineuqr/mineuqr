# REFUND-REGISTER-ADOPTION-1 — Attribution Audit Report

| Field | Value |
|---|---|
| **Program** | REFUND-REGISTER-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Attribution model

| Identity | Preserved |
|----------|-----------|
| Register | From Settlement Context (`registerId`) |
| Operator | From Settlement Context (`operatorUserId`) |
| Financial Shift | From Settlement Context (`financialShiftId`) |
| Settlement Record | Refund SR id (unique key) |
| Tenant | `restaurantId` on Shift + Attribution |
| Historical | Append-only; idempotent by SR id |

## Event adoption

| Concern | Result |
|---------|--------|
| Event | Reuses `SettlementAttributed` (polymorphic by SR id) |
| Exactly once | Unique `settlementRecordId` → `already_applied` |
| ADR-021 | Business key = refund Settlement Record id |
| Retry safe | Yes |
| Duplicate attribution | Impossible (domain + persistence uniqueness) |
| Fail-open | Incomplete context → `skipped`; create error → `failed`; money TX already committed |

## Audit trail

Refund attributions appear in the same Shift attribution list as settle attributions — no parallel audit store.

## Final Certification

**PRODUCTION CERTIFIED**
