# MULTI-CHECK-ALLOCATION-PROJECTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Projection / Read Model only |
| **ADR** | ADR-ARCH-025 · ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 · ADR-ARCH-024 |
| **Prior** | DOMAIN-1 · PERSISTENCE-1 · MIGRATION-EXECUTION-1 · INTEGRATION-1 (certified) |

---

## Objective

Establish the canonical Multi Check Allocation Projection as a **read-optimized reflection** of the committed Write Model — never a source of business truth.

---

## Delivered

| Artifact | Path |
|----------|------|
| Read Model contracts | `shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionContract.ts` |
| Deterministic builders | `shared/.../projection/multiCheckAllocationProjectionBuilder.ts` |
| Projection barrel | `shared/.../projection/index.ts` |
| Read Model store | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| Post-commit materializer | `server/operational-session/check/read/multiCheckAllocationProjectionMaterializer.ts` |
| Server read barrel | `server/operational-session/check/read/index.ts` |
| Builder tests | `shared/.../projection/__tests__/multiCheckAllocationProjectionBuilder.test.ts` |
| Materializer tests | `server/.../read/__tests__/multiCheckAllocationProjectionMaterializer.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/multiCheckAllocationProjection.architecture.guards.test.ts` |
| Implementation report | `docs/engineering/programs/MULTI-CHECK-ALLOCATION-PROJECTION-1/IMPLEMENTATION-REPORT.md` |

---

## Projection model

### `MultiCheckAllocationProjection` (`MCA-P-01-multi-check-allocation`)

- Identity: `allocationId`, `allocationReference`, `financialReference` (canonical)
- Source / Target / Payment references (copied)
- Money (copied): `financialResponsibility`, `allocatedAmount`, `remainingAmount`, `paymentValueCap`
- Status flags + finality: `impliesCheckSettlement: false`, `impliesPaymentCompletion: false`
- Nested read models: sources, targets, portions, adjustments, reversals, responsibility, timeline
- Versioning: `projectionSchemaVersion`, `projectionRevision`, `projectionTimestamp`, `metadata`

### `MultiCheckAllocationSummaryProjection`

Lightweight index / list shape for source-check scoped reads.

### Child projections

- `MultiCheckAllocationPortionProjection`
- `MultiCheckAllocationAdjustmentProjection`
- `MultiCheckAllocationReversalProjection`
- `MultiCheckAllocationResponsibilityProjection`
- Timeline entries (source / portion / adjustment / reversal)

---

## Source of truth

```
Check Aggregate
  → Multi Check Allocation Domain
    → Committed Persistence State
      → Projection builders / materializer
```

Never from UI, API cache, session state, or transient runtime inventing money.

---

## Pipeline

1. Callers supply **committed snapshots** (`MultiCheckAllocation` + `allocationRevision`) after successful financial persistence.
2. Optional collected Domain Events (Integration command results) record ADR-021 claim keys.
3. Builders rebuild one coherent projection tree **only** from that snapshot.
4. Store upserts Allocation + Summary Read Model rows (**complete snapshot replacement** by identity).
5. Failures isolatable via `tryMaterializeMultiCheckAllocationProjections`.

Supports: initial projection · replay · refresh · revision update · projection replacement.

**Not implemented (by design):** Event Bus, Outbox, Inbox, Broker, APIs, UI, Integration wiring into Check Aggregate.

---

## Snapshot governance

Every Projection is one **immutable financial snapshot**. It preserves:

| Field | Role |
|-------|------|
| `projectionRevision` | Deterministic fingerprint of the committed snapshot |
| `projectionTimestamp` / `metadata.projectedAt` | Materialization stamp |
| `allocationRevision` | Persistence CAS version of the committed Allocation |
| `financialReference` | Canonical financial correlation (copied) |
| Canonical identities | `allocationId`, `allocationReference`, source/target/payment ids |

Rules:

- Nested portions / adjustments / reversals / responsibility share the same Allocation Revision, Projection Timestamp, and Financial Reference.
- Snapshots **MUST NEVER** merge data from different Allocation revisions.
- Each refresh **completely replaces** the previous snapshot (upsert, no patch merge).
- Coherence enforced by `assertMultiCheckAllocationProjectionSnapshotCoherent`.

---

## Versioning

| Field | Purpose |
|-------|---------|
| `MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION` (`2`) | Shape / replay compatibility (snapshot governance fields) |
| `projectionRevision` | Deterministic fingerprint of committed Write Model + Allocation Revision |
| `allocationRevision` | Committed persistence version reflected by this snapshot |
| `projectionTimestamp` / `metadata.projectedAt` | Materialization metadata stamp |
| `metadata.projectionId` | `MCA-P-01-multi-check-allocation` |

Independent from API versioning.

---

## Idempotency (ADR-ARCH-021)

- Identical committed Allocation ⇒ identical projection + revision.
- Duplicate event claim keys skipped (`skippedDuplicateEventClaims`).
- Safe retry / replay of materialize after the same commit.
- Upsert replaces by identity — never duplicates projection state.

---

## Financial conservation

Projection copies committed money and responsibility fields only.  
It does **not** recalculate allocations, modify money, or interpret business rules.

---

## Failure isolation

Projection failures must not affect Write Model, Persistence, or Integration.  
Read Model may be rebuilt entirely from canonical persisted state.

---

## Out of scope (confirmed)

No Domain · Persistence · Integration · API · Presentation · Reporting changes.

---

## Ready for

**MULTI-CHECK-ALLOCATION-API-1** — may serve Projection store reads as the SSOT for Multi Check Allocation read operations without Projection redesign.
