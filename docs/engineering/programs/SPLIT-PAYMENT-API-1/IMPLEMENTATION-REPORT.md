# SPLIT-PAYMENT-API-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Read-only API adoption |
| **ADR** | ADR-ARCH-024 · ADR-ARCH-023 · ADR-ARCH-022 · ADR-ARCH-021 · ADR-ARCH-020 |
| **Prior** | DOMAIN · PERSISTENCE · INTEGRATION · PROJECTION (certified) |

---

## Objective

Expose the canonical Split Payment **Projection** through MineuQR’s API Platform as a **read-only** adapter. Zero financial mutation authority. Projection is the exclusive Single Source of Truth for all read procedures.

---

## Delivered

| Artifact | Path |
|----------|------|
| DTOs | `server/operational-session/check/api/splitPaymentApiDtos.ts` |
| Projection → DTO mapper | `server/operational-session/check/api/splitPaymentApiMapper.ts` |
| Error mapping | `server/operational-session/check/api/mapSplitPaymentApiError.ts` |
| Read service | `server/operational-session/check/api/splitPaymentReadService.ts` |
| Composition (shared Read Store) | `server/operational-session/check/api/splitPaymentReadComposition.ts` |
| tRPC router | `server/operational-session/check/api/splitPaymentReadRouter.ts` |
| App mount | `appRouter.splitPayment` in `server/routers.ts` |
| Tests | `server/.../api/__tests__/splitPayment*.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/splitPaymentApi.architecture.guards.test.ts` |

---

## Endpoints (`splitPayment.*`)

| Procedure | Purpose |
|-----------|---------|
| `getByPayment` | Payment by `(restaurantId, checkId, paymentId)` |
| `listByCheck` / `getByCheck` | Payments for a Check |
| `listByRestaurant` | Payments for a Restaurant |
| `getOutstanding` | Check-scoped outstanding projection |
| `getTimeline` | Financial timeline from payment projection |
| `getAttempts` | Attempts for a Payment |
| `listAttemptsByCheck` | Attempts for a Check |
| `getByAttempt` | Attempt by `(restaurantId, checkId, attemptId)` |
| `getSummaryByCheck` | Status-count summary (no money aggregation) |
| `getProjectionMetadata` | `projectionId` + `projectionSchemaVersion` + program id |

All procedures are **`.query` only**.

---

## Data path

```
Split Payment Projection
  → Read Store (composition singleton)
    → DTO mapping
      → tRPC response
```

API does **not** read Domain, Aggregate, Repository, Persistence entities, or execute commands. No materialization during request handling.

---

## Authorization

- `verifiedProcedure`
- `assertRestaurantAccess(ctx, restaurantId, "splitPayment.<proc>")`
- Tenant / restaurant isolation preserved; no bypass; no duplicated auth logic

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

## API contract versioning

| Field | Role |
|-------|------|
| `apiContractVersion` | Versions the **API DTO contract** (`SPLIT_PAYMENT_API_CONTRACT_VERSION = 1`) |
| `apiContractId` | Stable contract family id (`SP-API-01`) — catalog only |
| `projection.projectionSchemaVersion` | Versions the **Projection schema** — independent |

Governance:

- DTO evolution within a contract version is **additive only**
- Existing field semantics MUST NOT change within a contract version
- Breaking changes REQUIRE a new `apiContractVersion`
- Consumers MUST NOT infer Projection internals from DTO structure
- Backward compatibility is preserved for the supported API lifecycle

## Projection versioning

Each payment / attempt / outstanding / timeline DTO includes:

- `projection.projectionId` (`SP-P-01-split-payment`)
- `projection.projectionSchemaVersion`
- `projection.projectionRevision`
- `projection.projectedAt`

Summary exposes `latestProjectionRevision`. Catalog endpoint exposes API contract identity **and** Projection schema identity as independent fields.

Repeated reads at the same Projection revision return identical DTOs.

---

## Out of scope (confirmed)

No Domain · Persistence · Integration · Projection redesign · Presentation · Reporting · Command / mutation APIs · schema changes.

---

## Ready for

**SPLIT-PAYMENT-PRESENTATION-ADOPTION-1** — UI may consume `splitPayment.*` DTOs; post-commit materialization should target `getSplitPaymentProjectionStore()` so API reads stay consistent with the Projection SSOT.
