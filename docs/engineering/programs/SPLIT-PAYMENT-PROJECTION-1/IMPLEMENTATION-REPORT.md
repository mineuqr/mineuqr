# SPLIT-PAYMENT-PROJECTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Projection / Read Model only |
| **ADR** | ADR-ARCH-024 · ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 |
| **Prior** | DOMAIN-1 · PERSISTENCE-1 · MIGRATION-EXECUTION-1 · INTEGRATION-1 (certified) |

---

## Objective

Establish the canonical Split Payment Projection as a **read-optimized reflection** of the committed Write Model — never a source of business truth.

---

## Delivered

| Artifact | Path |
|----------|------|
| Read Model contracts | `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionContract.ts` |
| Deterministic builders | `shared/.../projection/splitPaymentProjectionBuilder.ts` |
| Projection barrel | `shared/.../projection/index.ts` |
| Read Model store | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| Post-commit materializer | `server/operational-session/check/read/splitPaymentProjectionMaterializer.ts` |
| Server read barrel | `server/operational-session/check/read/index.ts` |
| Builder tests | `shared/.../projection/__tests__/splitPaymentProjectionBuilder.test.ts` |
| Materializer tests | `server/.../read/__tests__/splitPaymentProjectionMaterializer.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/splitPaymentProjection.architecture.guards.test.ts` |

---

## Projection model

### `SplitPaymentProjection` (`SP-P-01-split-payment`)

- Identity: `paymentId`, `paymentReference`, `financialReference` (canonical — never replaced by surrogate ids)
- Money (copied): `amount`, `allocatedAmount`, `unallocatedAmount`
- Status flags + Completion: `isPaymentCompleted`, `impliesFinancialSettlement: false`, `isFinanciallyComplete: false`
- Tender / allocation breakdowns + historical timeline (denormalized child facts)
- Versioning: `projectionSchemaVersion`, `projectionRevision`, `projectionTimestamp`

### `SplitPaymentAttemptProjection`

Historical attempt rows for audit / reconciliation (ordered by `createdAt`).

### `SplitPaymentOutstandingProjection`

Check-scoped outstanding snapshot copied from Check Aggregate inputs — not calculated in Projection.

---

## Source of truth

```
Check Aggregate
  → Split Payment Domain
    → Committed Persistence State
      → Projection builders / materializer
```

Never from UI, API cache, or transient runtime inventing money.

---

## Pipeline

1. Callers supply **committed** `SplitPayment` / `PaymentAttempt` / optional Outstanding after successful financial persistence.
2. Optional collected Domain Events (Integration command results) record ADR-021 claim keys.
3. Builders rebuild projection state **only** from committed entities.
4. Store upserts Read Model rows; failures isolatable via `tryMaterializeSplitPaymentProjections`.

**Not implemented (by design):** Event Bus, Outbox, Inbox, Broker, APIs, UI, Integration wiring into Check Aggregate.

---

## Versioning

| Field | Purpose |
|-------|---------|
| `SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION` (`1`) | Shape / replay compatibility |
| `projectionRevision` | Deterministic fingerprint of committed Write Model fields |
| `projectionTimestamp` | Materialization metadata stamp |

---

## Idempotency (ADR-ARCH-021)

- Identical committed Payment ⇒ identical projection + revision.
- Duplicate event claim keys skipped (`skippedDuplicateEventClaims`).
- Safe retry / replay of materialize after the same commit.

---

## Failure isolation

Projection failures must not affect Write Model, Persistence, or Integration.  
Read Model may be rebuilt from canonical persisted state.

---

## Out of scope (confirmed)

No Domain · Persistence · Integration · API · Presentation · Reporting changes.

---

## Ready for

**SPLIT-PAYMENT-API-1** — may serve Projection store reads as the SSOT for Split Payment read operations without Projection redesign.
