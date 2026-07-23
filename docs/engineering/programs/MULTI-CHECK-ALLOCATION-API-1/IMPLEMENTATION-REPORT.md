# MULTI-CHECK-ALLOCATION-API-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Canonical API (Projection reads + Integration writes) |
| **ADR** | ADR-ARCH-025 · ADR-ARCH-024 · ADR-ARCH-023 · ADR-ARCH-022 · ADR-ARCH-021 · ADR-ARCH-020 |
| **Prior** | DOMAIN · PERSISTENCE · MIGRATION · INTEGRATION · PROJECTION (certified) |

---

## Objective

Expose the canonical Multi Check Allocation contract through MineuQR’s API Platform as the **single supported interface** for Presentation and all future workflows.

- Reads: Projection store only (SSOT for operational reads)
- Writes: Check Aggregate Integration only (no orchestration duplication)

---

## Delivered

| Artifact | Path |
|----------|------|
| DTOs | `server/operational-session/check/api/multiCheckAllocationApiDtos.ts` |
| Projection → DTO mapper | `server/.../api/multiCheckAllocationApiMapper.ts` |
| Error mapping | `server/.../api/mapMultiCheckAllocationApiError.ts` |
| Read service | `server/.../api/multiCheckAllocationReadService.ts` |
| Write service | `server/.../api/multiCheckAllocationWriteService.ts` |
| Composition (shared store) | `server/.../api/multiCheckAllocationApiComposition.ts` |
| tRPC router | `server/.../api/multiCheckAllocationRouter.ts` |
| App mount | `appRouter.multiCheckAllocation` in `server/routers.ts` |
| Tests | `server/.../api/__tests__/multiCheckAllocation*.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/multiCheckAllocationApi.architecture.guards.test.ts` |

---

## Endpoints (`multiCheckAllocation.*`)

### Reads (Projection only)

| Procedure | Purpose |
|-----------|---------|
| `getAllocation` | Allocation by `(restaurantId, allocationId)` |
| `listAllocations` / `listBySourceCheck` | Allocations for a source Check |
| `listByTargetCheck` | Allocations involving a target Check |
| `listByRestaurant` | Allocations for a Restaurant |
| `getAllocationTimeline` | Timeline from Allocation projection |
| `getAllocationSummary` | Summary projection row |
| `listSummariesBySourceCheck` | Summary list for a source Check |
| `getAllocationResponsibility` | Responsibility snapshot |
| `getProjectionMetadata` | API contract id + Projection schema identity |

### Writes (Integration only)

| Procedure | Integration delegate |
|-----------|----------------------|
| `createAllocation` | `createMultiCheckAllocationOnCheck` |
| `reserveAllocation` | `reserveMultiCheckAllocationOnCheck` |
| `applyAllocation` | `applyMultiCheckAllocationOnCheck` |
| `adjustAllocation` | `adjustMultiCheckAllocationOnCheck` |
| `reverseAllocation` | `reverseMultiCheckAllocationOnCheck` |
| `completeAllocation` | `completeMultiCheckAllocationOnCheck` |
| `cancelAllocation` | `cancelMultiCheckAllocationOnCheck` |

All procedures use **`verifiedProcedure`**.

---

## Data paths

```
READ:
  Projection Store
    → Read Service
      → DTO mapping
        → tRPC response

WRITE:
  tRPC mutation
    → Write Service
      → CheckService / Integration
        → (post-commit) Projection materialize into shared store
          → Command result DTO (outcome + Projection-backed allocation)
```

API does **not** read Domain entities for Presentation, does **not** query repositories for reads, and does **not** execute business rules or money math.

---

## Authorization

- `verifiedProcedure`
- `assertRestaurantAccess(ctx, restaurantId, "multiCheckAllocation.<proc>")`
- Tenant / restaurant isolation preserved
- Business ownership remains Integration / Check Aggregate responsibility

---

## DTO governance

- Hide persistence models, Domain entities, and **internal Allocation revisions** (`allocationRevision` never on DTOs)
- Expose stable Presentation fields + Projection freshness metadata (`projectionId`, `projectionSchemaVersion`, `projectionRevision`, `projectedAt`)
- `apiContractVersion` / `apiContractId` (`MCA-API-01`) independent from Projection schema version

---

## Errors

| Condition | tRPC code |
|-----------|-----------|
| Missing projection row | `NOT_FOUND` |
| Tenant / ownership failure | `FORBIDDEN` |
| Invalid input | Zod → validation |
| Domain / lifecycle conflict | `CONFLICT` / `BAD_REQUEST` |
| Projection store failure | `PRECONDITION_FAILED` |
| Unexpected | `INTERNAL_SERVER_ERROR` |

Repository / database / stack traces are not leaked.

---

## Idempotency (ADR-ARCH-021)

Write procedures preserve Integration command outcomes:

- `applied`
- `already_applied`
- `no_change`

Duplicate commands return the canonical outcome without inventing financial state.

---

## API adoption governance

This API is the **canonical interface** for all Multi Check Allocation operations.

After this program:

- Presentation MUST consume `multiCheckAllocation.*`
- No Presentation component may access Projection directly
- No future workflow may bypass these procedures

---

## Out of scope (confirmed)

No Domain · Persistence · Integration · Projection redesign · Presentation · Reporting changes.

---

## Ready for

**MULTI-CHECK-ALLOCATION-PRESENTATION-1** — UI and workflows must consume these procedures exclusively.
