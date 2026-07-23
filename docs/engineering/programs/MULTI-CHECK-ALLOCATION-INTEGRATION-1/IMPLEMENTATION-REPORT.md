# MULTI-CHECK-ALLOCATION-INTEGRATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Integration (Check Aggregate orchestration) |
| **ADR** | ADR-ARCH-025 · ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 · ADR-ARCH-024 |
| **Prior** | MULTI-CHECK-ALLOCATION-DOMAIN-1 · PERSISTENCE-1 · MIGRATION-EXECUTION-1 (0075 applied) |

---

## Objective

Connect the certified Multi Check Allocation Domain and Repository to the Financial Settlement Platform so the **Check Aggregate** is the only mutation authority, with atomic Check-owned transactions covering Allocation persistence, append-only history, and collected Domain events.

---

## Delivered

| Artifact | Path |
|----------|------|
| Check Aggregate MCA orchestration | `server/operational-session/check/checkMultiCheckAllocationIntegration.ts` |
| Check Aggregate wiring + tx ownership | `server/operational-session/check/CheckService.ts` |
| Barrel exports | `server/operational-session/check/index.ts` |
| Integration tests | `server/operational-session/check/__tests__/checkMultiCheckAllocationIntegration.test.ts` |
| Transaction ownership tests | `server/operational-session/check/__tests__/CheckService.multiCheckAllocationIntegration.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/multiCheckAllocationIntegration.architecture.guards.test.ts` |

---

## Command flow (enforced)

```
Application
  → Check Aggregate (CheckService / withCheckOwnedTransaction)
    → checkMultiCheckAllocationIntegration
      → Multi Check Allocation Domain commands
      → Multi Check Allocation Repository (SessionDbClient)
        → header CAS + children append + history append
```

No API / Controller / UI / Repository bypass of Aggregate commands.  
No Order Settlement mutation from Allocation Integration (ADR-025).

---

## Atomicity (ATOMICITY GOVERNANCE)

Every successful Allocation command commits atomically under the Check Aggregate.

Within a single Check-owned transaction (`withCheckOwnedTransaction` → `SessionDbClient`):

| Step | Participates |
|------|----------------|
| Check Aggregate command boundary | Yes (open + source ownership validation) |
| Allocation Domain | Pure (in-memory) |
| Allocation persistence (header + children) | Yes (`SessionDbClient`) |
| Allocation history append | Yes (same client; after Allocation state write) |
| Version increment (CAS) | Yes (`expectedVersion` → next) |
| Domain event collection | Yes — returned only after persist succeeds; **not** published |

**Prohibited**

- Partial persistence (header without history, history without Allocation, version without state)
- Mutation APIs without Check-owned `SessionDbClient` (`requireCheckOwnedTxClient`)
- Repository / Integration opening independent `.transaction(`
- Returning Domain events when persistence fails

On any failure: Check Aggregate transaction rolls back; no orphan Allocation or history; events not observable outside the failed unit of work.

---

## Integrated Aggregate commands

| CheckService | Integration |
|--------------|-------------|
| `createMultiCheckAllocationOnCheck` | `createAllocationOnCheck` |
| `reserveMultiCheckAllocationOnCheck` | `reserveAllocationOnCheck` |
| `applyMultiCheckAllocationOnCheck` | `applyAllocationOnCheck` |
| `adjustMultiCheckAllocationOnCheck` | `adjustAllocationOnCheck` |
| `reverseMultiCheckAllocationOnCheck` | `reverseAllocationOnCheck` |
| `completeMultiCheckAllocationOnCheck` | `completeAllocationOnCheck` |
| `cancelMultiCheckAllocationOnCheck` | `cancelAllocationOnCheck` |
| `getMultiCheckAllocationsForSourceCheck` | `loadAllocationsForSourceCheck` |
| `getMultiCheckAllocationByIdentity` | `loadAllocationByIdentity` |

---

## Idempotency / concurrency

- Pre-load by `AllocationId` → `already_applied` (empty events, no write)
- Domain `already_applied` / `no_change` → skip persist
- Insert race `DUPLICATE` → reload → `already_applied`
- Update CAS via `expectedVersion`; `CONFLICT` propagated unchanged
- Domain errors propagated without HTTP/tRPC/DB translation

---

## Ownership rules

- Commanding `checkId` must equal Allocation `sourceCheckId`
- Check must be `open` for mutations
- Finality flags remain Domain-owned (`impliesCheckSettlement` / `impliesPaymentCompletion` = false)
- Financial Conservation enforced exclusively by Domain

---

## Out of scope (confirmed)

No Domain / Persistence / Architecture redesign · No Projection · No API · No Presentation · No Event Bus publish · No Order Settlement mutation.

---

## Ready for

**MULTI-CHECK-ALLOCATION-PROJECTION-1** — Integration collects Domain events and persists Allocation state; Projection may materialize read models without Integration redesign.
