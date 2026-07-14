# ORDERING-RUNTIME-CONTEXT-1 — Ordering Runtime Context
## Phase C — Certification Report

**Program:** ORDERING-RUNTIME-CONTEXT-1  
**Type:** Core Runtime Architecture  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

ORDERING-RUNTIME-CONTEXT-1 establishes the canonical immutable **OrderingRuntimeContext** and the sole constructor **OrderingRuntimeContextFactory**. Shared contracts, freeze helper, ownership registry, architecture guards, and regression tests are in place. No QR migration, API changes, database changes, or production behavior changes were made.

---

## 2. Problem Statement

ORDERING-PLATFORM-ARCHITECTURE-1 defined platform ownership and a stub runtime contract. Ordering state was still assembled per channel. Without a canonical immutable runtime snapshot and a single factory, multi-channel scale would force duplicated construction logic.

---

## 3. Architecture Decision

**Decision:** Expand the shared `OrderingRuntimeContext` contract (schema v1), introduce server-owned `OrderingRuntimeContextFactory` as the only construction path, and deep-freeze snapshots for request-lifecycle immutability.

**Not decided here:** materialization from DB, channel adoption, or API surface.

---

## 4. Runtime Architecture Summary

```
Restaurant → Ordering Platform → OrderingRuntimeContextFactory
                                           │
                                           ▼
                                 Immutable OrderingRuntimeContext
                                           │
                           QR / Kiosk / Mobile / Waiter (future consumers)
```

---

## 5. Factory Design Summary

| Aspect | Implementation |
|--------|----------------|
| Validate | Channel, restaurant identity, business day, menu version, pricing currency, capabilities |
| Normalize | Defaults for optional arrays/flags; metadata `runtimeId` / `createdAt` |
| Freeze | `freezeOrderingRuntimeContext` deep-freezes sections and arrays |
| Singleton | `orderingRuntimeContextFactory` |

---

## 6. Ownership Matrix

| Artifact | Owner |
|----------|-------|
| `orderingRuntimeContract.ts` | Shared platform |
| `freezeOrderingRuntimeContext.ts` | Shared (factory-internal use) |
| `OrderingRuntimeContextFactory.ts` | Server ordering platform |
| `QR_FORBIDDEN_RUNTIME_CONSTRUCTION` | QR channel boundary |
| Channel UX / form factor | Channels only |

---

## 7. Files Changed

| File | Change |
|------|--------|
| `shared/ordering-platform/orderingRuntimeContract.ts` | Full runtime + input contract (schema v1) |
| `shared/ordering-platform/freezeOrderingRuntimeContext.ts` | **New** deep-freeze helper |
| `shared/ordering-platform/orderingPlatformContracts.ts` | Runtime ownership concerns |
| `shared/ordering-platform/index.ts` | Export expanded types |
| `server/ordering-platform/OrderingRuntimeContextFactory.ts` | **New** sole factory |
| `server/ordering-platform/orderingPlatformOwnership.ts` | Factory + contract registry |
| `server/ordering-platform/index.ts` | Export factory |
| `server/ordering-platform/__tests__/OrderingRuntimeContextFactory.test.ts` | **New** unit tests |
| `server/ordering-platform/__tests__/orderingRuntimeContext.architecture.guards.test.ts` | **New** server guards |
| `client/src/lib/ordering-platform/qrOrderingChannelContract.ts` | Forbidden construction list |
| `client/src/lib/ordering-platform/index.ts` | Export forbidden list |
| `client/src/lib/ordering-platform/__tests__/orderingRuntimeContext.architecture.guards.test.ts` | **New** client guards |
| `docs/engineering/programs/ORDERING-RUNTIME-CONTEXT-1/ARCHITECTURE.md` | Binding architecture |
| `docs/engineering/programs/ORDERING-RUNTIME-CONTEXT-1/IMPLEMENTATION.md` | This report |

**Not modified:** QR pages, routers, place-order path, operational runtime, database, public APIs.

---

## 8. Regression Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `OrderingRuntimeContextFactory.test.ts` | 6 | Pass |
| `orderingRuntimeContext.architecture.guards.test.ts` (server) | 4 | Pass |
| `orderingRuntimeContext.architecture.guards.test.ts` (client) | 3 | Pass |
| Existing ordering-platform guards + offerCartIdentity | 12 | Pass |

---

## 9. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| OrderingRuntimeContext is canonical runtime snapshot | ✓ |
| Factory is only runtime constructor | ✓ |
| Clients must not construct runtime (guards + contract) | ✓ |
| Immutable (deep-frozen) | ✓ |
| No duplicated runtime construction | ✓ |
| No API changes | ✓ |
| No production behavior changes | ✓ |
| No QR migration | ✓ |
| No scope creep | ✓ |

---

## 10. Validation Report

| Check | Result |
|-------|--------|
| `npm test -- server/ordering-platform client/src/lib/ordering-platform shared/ordering-platform` | **25/25 Pass** |
| `npm run build` | **Pass** |

---

## 11. Future Work (Explicitly Deferred)

- Runtime materialization from menu/hours/pricing authorities
- QR adoption of runtime context
- Kiosk / Mobile / Waiter consumption
- Runtime delivery API (when needed)

---

ORDERING-RUNTIME-CONTEXT-1 Phase C establishes the runtime foundation. Channels remain unmigrated by design.
