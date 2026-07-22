# SPLIT-PAYMENT-PERSISTENCE-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Persistence only (no Domain / Architecture / Integration / Projection / API / Presentation) |
| **ADR** | ADR-ARCH-024 · ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 (compat) |
| **Prior** | SPLIT-PAYMENT-DOMAIN-1 (frozen) |

---

## Delivered

| Artifact | Path |
|----------|------|
| Migration | `drizzle/0074_check_split_payments.sql` |
| Journal | `drizzle/meta/_journal.json` (idx 74) |
| Drizzle tables | `checkSplitPayments`, `checkSplitPaymentTenders`, `checkSplitPaymentTenderAllocations`, `checkSplitPaymentAllocations`, `checkSplitPaymentAttempts` in `drizzle/schema.ts` |
| Mapper | `server/operational-session/check/splitPaymentMapper.ts` |
| Repository | `server/operational-session/check/splitPaymentRepository.ts` |
| Governance | Tail → `0074_check_split_payments` (75 entries) |
| Schema verify | Split Payment tables/indexes registered |
| Architecture guards | `shared/operational-session/__tests__/splitPaymentPersistence.architecture.guards.test.ts` |

---

## Schema (Domain state only)

### `check_split_payments`

| Column | Notes |
|--------|--------|
| id | Surrogate PK (never replaces PaymentId) |
| restaurantId, checkId | Ownership |
| paymentId | Canonical domain identity (UNIQUE) |
| paymentReference | Canonical business reference (UNIQUE per check) |
| financialReference | Optional financial correlation reference |
| status | Domain enum |
| amount, allocatedAmount, unallocatedAmount | decimal(10,2) |
| version | Optimistic concurrency token |
| createdAt, updatedAt | Audit timestamps |

### Children (normalized)

- `check_split_payment_tenders` — Tender facts (`tenderId` UNIQUE)
- `check_split_payment_tender_allocations` — TenderAllocation facts (`tenderAllocationId` UNIQUE)
- `check_split_payment_allocations` — PaymentAllocation / Settlement Portion facts (`allocationId` UNIQUE)

### `check_split_payment_attempts` (immutable historical records)

| Column | Notes |
|--------|--------|
| attemptId | Canonical domain identity (UNIQUE) — never reused |
| paymentId | Parent Payment when bound (nullable) |
| status | started / succeeded / failed / cancelled |
| amount, method | Immutable after insert |
| externalProviderReference | Persistence-only provider correlation |
| id / createdAt | Attempt ordering for audit |

**Not stored:** Check grandTotal, Revenue, Projection DTOs, lifecycle rules, Financial Completion (Check settle).

**Constraints:** Unique canonical ids — no DB FKs (platform convention).

---

## Concurrency strategy

1. **Create Payment / Attempt:** unique indexes → `SplitPaymentPersistenceError(DUPLICATE)`.
2. **Update Payment:** compare-and-set on `version` (`expectedVersion`) → `CONFLICT` / `NOT_FOUND`.
3. **Finalize Attempt outcome:** CAS on `expectedStatus`; updates only status / paymentId bind / provider ref / updatedAt.
4. **Children:** append-only insert-if-absent by canonical id (idempotent; no deletes).
5. **Transactions:** optional `SessionDbClient` joins Check-owned unit of work — repositories never open/commit independent transactions.
6. **Delete:** not provided — historical retention (esp. Payment Attempts).

---

## Payment Attempt Persistence Governance

- Each retry creates a **new** `attemptId` row.
- Rows are never physically reused or overwritten as a different external attempt.
- Identity, amount, method, and createdAt are immutable after insert.
- Outcome finalize is the only mutation path (same attempt’s outcome).
- Lists are ordered by surrogate `id` ascending for audit / reconciliation.

---

## Mapping

```
DB rows ⇄ PersistenceRow ⇄ SplitPayment / PaymentAttempt (Domain)
```

- Surrogate `id` and `version` are persistence concerns (returned alongside Domain on load).
- `impliesFinancialSettlement` is always mapped `false` (I-SP-06); not a DB column.
- `externalProviderReference` is persistence-only (not a Domain PaymentAttempt field).

---

## Out of scope (confirmed)

No Domain edits · No Architecture edits · No Integration · No Projection · No APIs · No Presentation · No Reporting.

---

## Ready for

**SPLIT-PAYMENT-INTEGRATION-1** — Check Aggregate may load/persist Domain snapshots via repositories inside Check-owned transactions without persistence redesign.
