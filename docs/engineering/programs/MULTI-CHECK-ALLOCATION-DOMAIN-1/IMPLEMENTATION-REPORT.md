# MULTI-CHECK-ALLOCATION-DOMAIN-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Pure Domain (no persistence) |
| **ADR** | [ADR-ARCH-025](../../../architecture/adrs/ADR-ARCH-025-multi-check-allocation-platform.md) |
| **Also compatible** | ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 · ADR-ARCH-024 |

---

## Delivered

Pure Multi Check Allocation domain under:

`shared/operational-session/check/multiCheckAllocation/`

| Module | Responsibility |
|--------|----------------|
| `multiCheckAllocationContract.ts` | Entities, statuses, identity VOs, Completion types, cardinality |
| `multiCheckAllocationIdentity.ts` | Allocation Identity Governance (stable opaque ids) |
| `multiCheckAllocationMoney.ts` | Allocated / Remaining / conservation math (I-MCA-01…) |
| `multiCheckAllocationLifecycle.ts` | Allow-list transitions + terminal protection |
| `multiCheckAllocationInvariants.ts` | I-MCA finality, conservation, identity stability |
| `multiCheckAllocationCommands.ts` | create / reserve / apply / adjust / reverse / complete / cancel |
| `multiCheckAllocationEvents.ts` | Event **contracts** only (no bus) |
| `multiCheckAllocationErrors.ts` | Canonical domain errors |
| `index.ts` | Barrel |

Exported from `shared/operational-session/check` and `shared/operational-session`.

---

## Design notes

- **Not** an Aggregate Root — Check-owned FSP relationship capability. Not a Payment. Not a Check.
- Commands return `{ outcome: "applied" \| "already_applied" \| "no_change", allocation, events }` for ADR-021 idempotent integration without Domain redesign.
- **Finality (I-MCA-09/10):** `impliesCheckSettlement` and `impliesPaymentCompletion` are always `false`; `AllocationCompleted` never settles a Check or completes a Payment.
- **Identity governance:** `AllocationId`, `AllocationReference`, `FinancialReference`, `SourcePaymentId`, `SourceCheckId`, `TargetCheckId`, `AllocationSequence`, `AllocationPortionId`, `AllocationAdjustmentId`, `AllocationReversalId` are stable; independent of persistence/transport ids.
- **Conservation:** `Allocated + Remaining = Financial Responsibility`; never create/destroy/duplicate value; never exceed responsibility or payment value cap; never negative responsibility.
- **Cardinalities:** One-to-One, One-to-Many (multi-portion), Many-to-One (Allocation sets), Many-to-Many (multi-source + multi-target).
- **Order Settlement:** Domain never mutates OS; emits responsibility/outstanding facts for Check Aggregate integration.
- No schema, repository, API, projection, integration, or UI.

---

## Tests

- Money, lifecycle, invariants, commands unit suites
- Architecture guards (no infra imports; statuses; identities; terminal protection; ADR-021 outcomes; event contracts; Finality; conservation; error codes)

---

## Ready for

**MULTI-CHECK-ALLOCATION-PERSISTENCE-1** — persistence may map `MultiCheckAllocation` / portions / adjustments / reversals without changing Domain contracts, lifecycle rules, Finality law, conservation, or identity semantics.
