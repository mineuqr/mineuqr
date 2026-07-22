# ORDER-SETTLEMENT-PROJECTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-22 |
| **Type** | Projection / Read Model only |
| **ADR** | ADR-ARCH-022 · ADR-ARCH-020 · ADR-ARCH-021 |
| **Prior** | DOMAIN-1 · PERSISTENCE-1 · INTEGRATION-1 (certified) |

---

## Objective

Establish the canonical Order Settlement Projection as a **read-optimized reflection** of the committed Write Model — never a source of business truth.

---

## Delivered

| Artifact | Path |
|----------|------|
| Read Model contracts | `shared/operational-session/check/orderSettlement/projection/orderSettlementProjectionContract.ts` |
| Deterministic builders | `shared/.../projection/orderSettlementProjectionBuilder.ts` |
| Projection barrel | `shared/.../projection/index.ts` |
| Read Model store | `server/operational-session/check/read/orderSettlementProjectionStore.ts` |
| Post-commit materializer | `server/operational-session/check/read/orderSettlementProjectionMaterializer.ts` |
| Server read barrel | `server/operational-session/check/read/index.ts` |
| Builder tests | `shared/.../projection/__tests__/orderSettlementProjectionBuilder.test.ts` |
| Materializer tests | `server/.../read/__tests__/orderSettlementProjectionMaterializer.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/orderSettlementProjection.architecture.guards.test.ts` |

---

## Projection model

`OrderSettlementProjection` exposes:

- Identity: `restaurantId`, `checkId`, `orderId`
- Write-model money fields (copied, not calculated): `allocatedAmount`, `settledAmount`, `outstandingAmount`, `orderTotalSnapshot`
- Status + denormalized flags: `settlementStatus`, `isSettled`, `isComplimentary`, `isVoided`, `isRefunded`, `isCancelled`, `isPartiallySettled`
- Timestamps: `lastSettlementAt`, `createdAt`, `updatedAt`
- Versioning: `projectionSchemaVersion`, `projectionRevision`

**Projection ID:** `OS-P-01-order-settlement` (Check / FSP owned — distinct from Order analytics `P-09-settlement`).

---

## Source of truth

```
Check Aggregate
  → Order Settlement Domain
    → Committed Persistence State
      → Projection builders / materializer
```

Never from UI, API cache, or transient runtime inventing money.

---

## Pipeline

1. Callers supply **committed** `OrderSettlement` entities after successful financial persistence.
2. Optional collected Domain Events (Integration `*Detailed` / command results) record ADR-021 claim keys.
3. Builders rebuild projection state **only** from committed entities (event payloads do not invent amounts).
4. Store upserts Read Model rows; failures are isolatable via `tryMaterializeOrderSettlementProjections`.

**Not implemented (by design):** Event Bus, Outbox, Inbox, Broker, APIs, UI, Integration wiring into Check Aggregate.

---

## Versioning

| Field | Purpose |
|-------|---------|
| `ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION` (`1`) | Shape / replay compatibility |
| `projectionRevision` | Deterministic fingerprint of committed Write Model fields for freshness comparison |

No business semantics in revision strings.

---

## Idempotency (ADR-ARCH-021)

- Identical committed settlement ⇒ identical projection + revision.
- Duplicate event claim keys are skipped (`skippedDuplicateEventClaims`).
- Safe retry / replay of materialize after the same commit.

---

## Isolation

- Projection store is **not** Write Model persistence (`check_order_settlements` unchanged).
- Projection failures must not rollback committed finance (`tryMaterialize…` soft path).
- Integration and Domain were **not** modified.

---

## Out of scope (confirmed)

No Domain · Persistence · Repository · Integration redesign · Reporting · Dashboard · UI · Event Bus / Inbox / Outbox · APIs.

---

## Ready for

**ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1** — may consume `OrderSettlementProjection` / materializer post-commit without Aggregate or Persistence redesign.
