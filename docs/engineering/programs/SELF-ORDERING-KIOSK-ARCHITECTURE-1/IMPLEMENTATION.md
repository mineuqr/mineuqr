# SELF-ORDERING-KIOSK-ARCHITECTURE-1 — Self Ordering Kiosk Architecture
## Phase C — Certification Report

**Program:** SELF-ORDERING-KIOSK-ARCHITECTURE-1  
**Type:** Ordering Channel Architecture  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

SELF-ORDERING-KIOSK-ARCHITECTURE-1 establishes Self Ordering Kiosk as the second official Ordering Platform client. Channel contracts, experience lifecycle, session isolation/reset model, runtime consumption rules, ownership registry, architecture guards, and regression tests are in place. No Kiosk UI, API redesign, database changes, or production behavior changes were made.

---

## 2. Architecture Validation

| Check | Result |
|-------|--------|
| Kiosk is established Ordering Platform client | ✓ |
| Runtime source is OrderingRuntimeContext only | ✓ |
| Experience-only ownership documented | ✓ |
| Session isolation + automatic reset documented | ✓ |
| Touch-first adaptive layout is presentation-only | ✓ |
| No kiosk UI shipped | ✓ |
| PlaceOrder / Materializer / Factory unchanged as authorities | ✓ |

---

## 3. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/ordering-platform/kioskOrderingChannelContract.ts` | **New** channel contract |
| `client/src/lib/ordering-platform/kioskExperienceLifecycle.ts` | **New** experience flow |
| `client/src/lib/ordering-platform/kioskSessionLifecycle.ts` | **New** session isolation |
| `client/src/lib/ordering-platform/kioskRuntimeConsumerContract.ts` | **New** consumption model |
| `client/src/lib/ordering-platform/index.ts` | Export kiosk contracts |
| `shared/ordering-platform/orderingPlatformContracts.ts` | Touch-first input constants |
| `shared/ordering-platform/index.ts` | Export input constants |
| `server/ordering-platform/orderingPlatformOwnership.ts` | Established channels + kiosk registry |
| `server/ordering-platform/index.ts` | Export new ownership constants |
| `client/.../__tests__/kioskOrderingArchitecture*.ts` | **New** tests + guards |
| `server/.../__tests__/kioskOrderingArchitecture.architecture.guards.test.ts` | **New** |
| `docs/.../SELF-ORDERING-KIOSK-ARCHITECTURE-1/*` | Architecture + this report |

---

## 4. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Kiosk is second official Ordering Platform client | ✓ |
| OrderingRuntimeContext is only runtime source | ✓ |
| Kiosk owns experience only | ✓ |
| Session isolation + automatic reset architected | ✓ |
| Touch-first adaptive experience established | ✓ |
| No duplicated ordering / runtime construction | ✓ |
| No production regressions / scope creep | ✓ |

---

## 5. Validation Report

| Check | Result |
|-------|--------|
| `npm test -- server/ordering-platform client/src/lib/ordering-platform shared/ordering-platform` | **68/68 Pass** |
| `npm run build` | **Pass** |

---

## 6. Future Work

- Kiosk UI implementation program (consume runtime; no business logic)
- Channel-parameterized runtime delivery (`channel=kiosk`) when UI mounts
- Device role `self_ordering_kiosk` hosting experience without gaining order authority

---

SELF-ORDERING-KIOSK-ARCHITECTURE-1 certifies the Kiosk as a pure Ordering Platform client for the lifetime of the platform.
