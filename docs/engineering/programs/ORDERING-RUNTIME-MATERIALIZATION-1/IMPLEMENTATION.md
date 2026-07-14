# ORDERING-RUNTIME-MATERIALIZATION-1 — Runtime Materialization
## Phase C — Certification Report

**Program:** ORDERING-RUNTIME-MATERIALIZATION-1  
**Type:** Core Runtime Composition Architecture  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

ORDERING-RUNTIME-MATERIALIZATION-1 introduces `OrderingRuntimeMaterializer` as the sole runtime composition layer. The factory is narrowed to construction + freeze only. Shared materialization contracts, ownership registry, architecture guards, and regression tests are in place. No QR migration, API changes, DB loaders, or production behavior changes.

---

## 2. Problem Statement

ORDERING-RUNTIME-CONTEXT-1 delivered the immutable runtime and factory, but composition (defaults, consistency validation, source merging, metadata) still lived partially in the factory. Without a dedicated materializer, future channels or loaders would duplicate composition logic.

---

## 3. Architecture Decision

**Decision:** Introduce `OrderingRuntimeMaterializer` as the only composition pipeline. Slim `OrderingRuntimeContextFactory` to structural construction + deep-freeze. Require complete materialized `OrderingRuntimeContextInput` (no factory-side business defaults).

---

## 4. Pipelines

| Pipeline | Location | Behavior |
|----------|----------|----------|
| Validation | `validateSources` | Channel, restaurant, locale, currency match, supported channels |
| Normalization + composition | `normalizeAndCompose` | Defaults, availability derivation, channel policy merge, metadata |
| Construction | `OrderingRuntimeContextFactory.create` | Map + freeze only |

---

## 5. Ownership Matrix

| Artifact | Owner |
|----------|-------|
| Source bag contract | Shared platform |
| Materializer | Server ordering platform |
| Factory | Server ordering platform (construction) |
| Clients | Consume only (unmigrated) |

---

## 6. Files Changed

| File | Change |
|------|--------|
| `shared/ordering-platform/orderingRuntimeMaterializationContract.ts` | **New** source bag |
| `shared/ordering-platform/orderingRuntimeContract.ts` | Complete required `OrderingRuntimeContextInput` |
| `shared/ordering-platform/orderingPlatformContracts.ts` | Materialization concern |
| `shared/ordering-platform/index.ts` | Export materialization types |
| `server/ordering-platform/OrderingRuntimeMaterializer.ts` | **New** materializer |
| `server/ordering-platform/OrderingRuntimeContextFactory.ts` | Construction-only |
| `server/ordering-platform/orderingPlatformOwnership.ts` | Materializer registry |
| `server/ordering-platform/index.ts` | Export materializer |
| `server/ordering-platform/__tests__/OrderingRuntimeMaterializer.test.ts` | **New** |
| `server/ordering-platform/__tests__/OrderingRuntimeContextFactory.test.ts` | Updated for materialized input |
| `server/ordering-platform/__tests__/orderingRuntimeMaterialization.architecture.guards.test.ts` | **New** |
| `client/.../qrOrderingChannelContract.ts` | Forbid materializer |
| `client/.../orderingRuntimeMaterialization.architecture.guards.test.ts` | **New** |
| `docs/.../ORDERING-RUNTIME-MATERIALIZATION-1/*` | Architecture + this report |

**Not modified:** QR pages, routers, place-order path, DB loaders, public APIs.

---

## 7. Regression Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `OrderingRuntimeMaterializer.test.ts` | 7 | Pass |
| `OrderingRuntimeContextFactory.test.ts` | 7 | Pass |
| `orderingRuntimeMaterialization.architecture.guards.test.ts` (server) | 6 | Pass |
| `orderingRuntimeMaterialization.architecture.guards.test.ts` (client) | 3 | Pass |
| Prior ORC / platform / offerCart guards | 19 | Pass |

---

## 8. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Materializer is canonical composition layer | ✓ |
| Factory performs construction only | ✓ |
| Repositories remain pure data providers | ✓ |
| Clients remain consumers (no composition) | ✓ |
| Exactly one composition pipeline | ✓ |
| No production behavior / API / QR migration | ✓ |

---

## 9. Validation Report

| Check | Result |
|-------|--------|
| `npm test -- server/ordering-platform client/src/lib/ordering-platform shared/ordering-platform` | **42/42 Pass** |
| `npm run build` | **Pass** |

---

## 10. Future Work

- Repository/loader adapters that fill `OrderingRuntimeMaterializationRequest`
- QR adoption of materialized runtime
- Caching / delivery API (separate programs)

---

ORDERING-RUNTIME-MATERIALIZATION-1 Phase C establishes runtime composition ownership permanently in the Ordering Platform.
