# ORDER-SETTLEMENT-PERSISTENCE-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-22 |
| **Type** | Persistence only (no Domain / API / Projection changes) |
| **ADR** | ADR-ARCH-022 · ADR-ARCH-020 · ADR-ARCH-021 (compat) |
| **Prior** | ORDER-SETTLEMENT-DOMAIN-1 (frozen) |

---

## Delivered

| Artifact | Path |
|----------|------|
| Migration | `drizzle/0073_check_order_settlements.sql` |
| Journal | `drizzle/meta/_journal.json` (idx 73) |
| Drizzle table | `checkOrderSettlements` in `drizzle/schema.ts` |
| Mapper | `server/operational-session/check/orderSettlementMapper.ts` |
| Repository | `server/operational-session/check/orderSettlementRepository.ts` |
| Governance | Tail → `0073_check_order_settlements` (74 entries) |
| Schema verify | `check_order_settlements` objects registered |

---

## Schema (Domain fields only)

Table: **`check_order_settlements`**

| Column | Notes |
|--------|--------|
| id | Surrogate PK |
| restaurantId, checkId, orderId | Identity (I-OS-01) |
| status | Domain enum |
| orderTotalSnapshot, allocatedAmount, settledAmount, outstandingAmount | decimal(10,2) |
| createdAt, updatedAt | timestamps |

**Not stored:** Check grandTotal, tenders, Membership flags, tax snapshots (owned elsewhere).

**Constraints:** UNIQUE `(checkId, orderId)` — no DB FKs (platform convention).

---

## Concurrency strategy

1. **Create:** unique index → duplicate insert → `OrderSettlementPersistenceError(DUPLICATE)` (ADR-021 safe retry via exists/find).  
2. **Update:** compare-and-set on `status` (`expectedStatus`) → `CONFLICT` if diverged / `NOT_FOUND` if missing.  
3. **Transactions:** optional `SessionDbClient` joins existing Financial Settlement unit of work (no nested tx ownership).  
4. **Delete:** not provided — terminal history retained (ADR-022).

---

## Mapping

```
DB row ⇄ OrderSettlementPersistenceRow ⇄ OrderSettlement (Domain)
```

Deterministic string money coercion; status asserted via Domain type guard on read only (mapping fidelity, not lifecycle).

---

## Out of scope (confirmed)

No Domain edits · No APIs · No projections · No UI · No Inbox/Outbox/Event bus.

---

## Ready for

**ORDER-SETTLEMENT-INTEGRATION-1** and **ORDER-SETTLEMENT-PROJECTION-1** without persistence redesign.
