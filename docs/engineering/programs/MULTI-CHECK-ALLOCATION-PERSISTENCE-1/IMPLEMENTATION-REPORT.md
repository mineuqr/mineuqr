# MULTI-CHECK-ALLOCATION-PERSISTENCE-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Persistence only (no Domain / Architecture / Integration / Projection / API / Presentation) |
| **ADR** | ADR-ARCH-025 · ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 · ADR-ARCH-024 (compat) |
| **Prior** | MULTI-CHECK-ALLOCATION-DOMAIN-1 (frozen) |

---

## Delivered

| Artifact | Path |
|----------|------|
| Migration | `drizzle/0075_multi_check_allocation.sql` |
| Journal | `drizzle/meta/_journal.json` (idx 75) |
| Drizzle tables | `multiCheckAllocations`, `multiCheckAllocationSources`, `multiCheckAllocationPortions`, `multiCheckAllocationAdjustments`, `multiCheckAllocationReversals`, `multiCheckAllocationHistory` in `drizzle/schema.ts` |
| Mapper | `server/operational-session/check/multiCheckAllocationMapper.ts` |
| Repository | `server/operational-session/check/multiCheckAllocationRepository.ts` |
| Governance | Tail → `0075_multi_check_allocation` (76 entries) |
| Schema verify | Multi Check Allocation tables/indexes registered |
| Architecture guards | `shared/operational-session/__tests__/multiCheckAllocationPersistence.architecture.guards.test.ts` |

---

## Schema (Domain state + audit history)

### `multi_check_allocations`

| Column | Notes |
|--------|--------|
| id | Surrogate PK (never replaces AllocationId) |
| restaurantId | Tenant |
| allocationId | Canonical domain identity (UNIQUE) |
| allocationReference | Canonical business reference (UNIQUE per restaurant) |
| financialReference | Optional financial correlation reference |
| sourceCheckId / sourcePaymentId | Source Check / optional Payment reference |
| status | Domain enum |
| financialResponsibility, allocatedAmount, remainingAmount | decimal(10,2) |
| paymentValueCap | Optional Payment value bound |
| schemaVersion | Persistence schema version |
| version | Optimistic concurrency token |
| allocationReason | Persistence metadata |
| createdAt, updatedAt | Audit timestamps |

### Children (append-only by canonical id)

- `multi_check_allocation_sources` — Source facts (`allocationId`,`sourceCheckId` UNIQUE)
- `multi_check_allocation_portions` — Portion facts (`portionId` UNIQUE; `allocationSequence`; `targetCheckId`; `applied` finalize-only)
- `multi_check_allocation_adjustments` — Adjustment facts (`adjustmentId` UNIQUE)
- `multi_check_allocation_reversals` — Reversal facts (`reversalId` UNIQUE)

### `multi_check_allocation_history` (append-only audit)

| Column | Notes |
|--------|--------|
| previousRevision / newRevision | CAS trail |
| mutationType | create / reserve / apply / adjust / reverse / complete / cancel / update |
| allocationId, allocationReference, financialReference | Identity + correlation |
| sourceCheckId, targetCheckId, sourcePaymentId | Traceability |
| status + money snapshot | Reconstructible state |
| allocationReason, schemaVersion, createdAt | Audit metadata |

**Not stored:** Check grandTotal, Revenue, Projection DTOs, lifecycle rules, Order Settlement mutation, Finality flags (mapped `false` on load).

**Constraints:** Unique canonical ids — no DB FKs (platform convention).

---

## Concurrency strategy

1. **Create Allocation:** unique indexes → `MultiCheckAllocationPersistenceError(DUPLICATE)`.
2. **Update Allocation:** compare-and-set on `version` (`expectedVersion`) → `CONFLICT` / `NOT_FOUND`.
3. **Children:** append-only insert-if-absent by canonical id (idempotent; no deletes). Portion `applied` may finalize false→true.
4. **History:** append-only on every successful create/update; never update/delete history rows.
5. **Transactions:** optional `SessionDbClient` joins Check-owned unit of work — repositories never open/commit independent transactions.
6. **Delete:** not provided — historical retention.

---

## Mapping

```
DB rows ⇄ PersistenceRow ⇄ MultiCheckAllocation (Domain)
History rows ⇄ AllocationHistoryRecord (persistence audit)
```

- Surrogate `id`, `version`, `schemaVersion`, `allocationReason` are persistence concerns (returned alongside Domain on load).
- `impliesCheckSettlement` / `impliesPaymentCompletion` always mapped `false`; not DB columns.

---

## Out of scope (confirmed)

No Domain edits · No Architecture edits · No Integration · No Projection · No APIs · No Presentation · No Reporting.

---

## Ready for

**MULTI-CHECK-ALLOCATION-INTEGRATION-1** — Check Aggregate may load/persist Domain snapshots via repositories inside Check-owned transactions without persistence redesign.
