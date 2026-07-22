# ORDER-SETTLEMENT-API-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Read-only API adoption |
| **ADR** | ADR-ARCH-022 · ADR-ARCH-020 · ADR-ARCH-021 |
| **Prior** | DOMAIN · PERSISTENCE · INTEGRATION · PROJECTION (certified) |

---

## Objective

Expose the canonical Order Settlement **Projection** through MineuQR’s API Platform as a **read-only** adapter. Zero financial mutation authority.

---

## Delivered

| Artifact | Path |
|----------|------|
| DTOs | `server/operational-session/check/api/orderSettlementApiDtos.ts` |
| Projection → DTO mapper | `server/operational-session/check/api/orderSettlementApiMapper.ts` |
| Error mapping | `server/operational-session/check/api/mapOrderSettlementApiError.ts` |
| Read service | `server/operational-session/check/api/orderSettlementReadService.ts` |
| Composition (shared Read Store) | `server/operational-session/check/api/orderSettlementReadComposition.ts` |
| tRPC router | `server/operational-session/check/api/orderSettlementReadRouter.ts` |
| App mount | `appRouter.orderSettlement` in `server/routers.ts` |
| Tests | `server/.../api/__tests__/*` |
| Architecture guards | `shared/operational-session/__tests__/orderSettlementApi.architecture.guards.test.ts` |

---

## Endpoints (`orderSettlement.*`)

| Procedure | Purpose |
|-----------|---------|
| `getByOrder` | Settlement by `(restaurantId, checkId, orderId)` |
| `listByOrder` | Settlements for an Order across Checks |
| `listByCheck` / `getByCheck` | Settlements for a Check |
| `listByRestaurant` | Settlements for a Restaurant |
| `getSummaryByCheck` | Status-count summary (no money aggregation) |
| `getProjectionMetadata` | `projectionId` + `projectionSchemaVersion` + program id |

All procedures are **`.query` only**.

---

## Data path

```
Order Settlement Projection
  → Read Store (composition singleton)
    → DTO mapping
      → tRPC response
```

API does **not** read Domain, Aggregate, Repository, or Persistence entities.

---

## Authorization

- `verifiedProcedure`
- `assertRestaurantAccess(ctx, restaurantId, "orderSettlement.<proc>")`
- Tenant / restaurant isolation preserved; no bypass

---

## Errors

| Condition | tRPC code |
|-----------|-----------|
| Missing projection row | `NOT_FOUND` |
| Tenant / ownership failure | `FORBIDDEN` |
| Invalid input | Zod → validation |
| Projection store failure | `PRECONDITION_FAILED` |
| Unexpected | `INTERNAL_SERVER_ERROR` |

Domain / repository / database errors are not leaked.

---

## Projection versioning

Each settlement DTO includes:

- `projection.projectionId` (`OS-P-01-order-settlement`)
- `projection.projectionSchemaVersion`
- `projection.projectionRevision`

Summary exposes `latestProjectionRevision`. Catalog endpoint exposes schema identity.

---

## Out of scope (confirmed)

No Domain · Persistence · Integration · Projection redesign · UI · Dashboard · Reporting · Command / mutation APIs · schema changes.

---

## Ready for

**ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1** — UI may consume `orderSettlement.*` DTOs; post-commit materialization should target `getOrderSettlementProjectionStore()` so API reads stay consistent.
