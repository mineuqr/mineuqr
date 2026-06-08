# EXEC-1 — CommercialReadService Foundation — Completion Report

**Program:** Admin Dashboard Remediation — Execution  
**Phase:** EXEC-1 — CommercialReadService foundation  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** Implementation only. No schema changes, migrations, backfill, consumer migration, or legacy retirement.

---

## 1. Executive Summary

EXEC-1 delivers a **read-only** `CommercialReadService` that resolves commercial authority for a single owner through the **approved S1 canonical chain** (`getCommercialEntitlements` → `pickUserLevelSubscription` → `resolveCommercialEntitlements`).

| Outcome | Status |
|---------|--------|
| `CommercialReadService.getAuthorityForOwner(ownerId)` | **Implemented** |
| `CommercialAuthority` DTO | **Implemented** |
| Unit tests | **10 passed** (4 new + existing regression) |
| Dashboard / router / legacy consumers | **Unchanged** |
| Database writes | **None** |

The service is **usable in code and tests** but **not wired** to tRPC routers, admin UI, or metrics APIs (deferred to EXEC-2+).

---

## 2. Authority Sources Discovered (Step 1 — read-only audit)

### 2.1 Subscription entities

| Entity | Location | Role in S1 chain |
|--------|----------|------------------|
| `user_subscriptions` | `drizzle/schema.ts` | Account rows (`restaurantId = 0`) picked by `pickUserLevelSubscription` |
| `getSubscriptionsByUser` | `server/db.ts` | Loads all rows for owner (adapter input) |
| `pickUserLevelSubscription` | `server/subscriptionResolver.ts` | **Canonical account-scoped pick** |

### 2.2 Plan entities

| Entity | Location | Role |
|--------|----------|------|
| `subscription_plans` | `drizzle/schema.ts` | Catalog (`planId` → tier) |
| `mapPlanIdToCatalogPlan` | `src/lib/commercial/planIdMapping.ts` | Used inside `buildCommercialContextFromDb` |
| `getSubscriptionPlanById` | `server/db.ts` | Display name lookup for DTO (`planName`) |

### 2.3 Entitlement sources

| Source | Location | Classification |
|--------|----------|----------------|
| `getCommercialEntitlements` | `server/commercial/getCommercialEntitlements.ts` | **Canonical integration facade** |
| `buildCommercialContextFromDb` | `server/commercial/buildCommercialContextFromDb.ts` | DB → `CommercialContext` |
| `resolveCommercialEntitlements` | `src/lib/commercial/resolveCommercialEntitlements.ts` | Pure entitlement resolver |
| `planFeatureMatrix` | `src/lib/commercial/planFeatureMatrix.ts` | Limits + features + flags |

### 2.4 Server architecture conventions

| Convention | Finding |
|------------|---------|
| Service location | `server/commercial/` — **no** `src/server/services/` tree exists |
| Pure commercial lib | `src/lib/commercial/` via `@commercial/*` alias |
| Service style | Async **functions** and small modules (e.g. `getCommercialEntitlements`, `resolveGuestOrderingAllowed`) |
| Tests | Co-located `*.test.ts` beside modules, `vi.mock("../db")` pattern |
| tRPC | `server/commercial/router.ts` — **not extended in EXEC-1** |

**Decision:** Place EXEC-1 in `server/commercial/` (not `src/server/services/commercial/`) to match existing layout.

---

## 3. Files Created

| File | Purpose |
|------|---------|
| `server/commercial/CommercialReadService.ts` | Read service + `commercialReadService` singleton |
| `server/commercial/dto/commercialAuthority.ts` | `CommercialAuthority`, trial/status DTO types |
| `server/commercial/mapToCommercialAuthority.ts` | Pure mapper from entitlements result → DTO |
| `server/commercial/CommercialReadService.test.ts` | Integration tests for service |
| `server/commercial/mapToCommercialAuthority.test.ts` | Unit tests for mapper |
| `docs/commercial-audit/EXEC-1-COMPLETION-REPORT.md` | This report |

---

## 4. Files Modified

**None.** EXEC-1 is additive only.

---

## 5. Public API Exposed

### 5.1 Entry point

```typescript
import { commercialReadService } from "./commercial/CommercialReadService";

const authority = await commercialReadService.getAuthorityForOwner(ownerId);
```

### 5.2 Class API

| Method | Input | Output |
|--------|-------|--------|
| `CommercialReadService#getAuthorityForOwner` | `ownerId: number`, `now?: Date` | `Promise<CommercialAuthority>` |

### 5.3 Exported symbols

| Export | Path |
|--------|------|
| `CommercialReadService` | `server/commercial/CommercialReadService.ts` |
| `commercialReadService` | Default singleton instance |
| `CommercialAuthority` | `server/commercial/dto/commercialAuthority.ts` |
| `CommercialEntitlements` | Re-exported from `@commercial/types` via DTO module |
| `mapToCommercialAuthority` | `server/commercial/mapToCommercialAuthority.ts` (testable pure mapper) |

---

## 6. Authority Resolution Flow

```text
commercialReadService.getAuthorityForOwner(ownerId)
  ↓
getCommercialEntitlements(ownerId, now)
  ↓
buildCommercialContextFromDb
  ↓
pickUserLevelSubscription (restaurantId = 0 ONLY)
  ↓
resolveCommercialEntitlements + planFeatureMatrix
  ↓
getSubscriptionsByUser(ownerId)  — metadata only (same S1 pick)
pickUserLevelSubscription(rows)
  ↓
getSubscriptionPlanById(planId)  — display name only
  ↓
mapToCommercialAuthority(result, canonicalRow, catalogPlan, now)
  ↓
CommercialAuthority
```

**Invariants:**

- No legacy S2–S6 resolvers
- No fallback to `isSubscriptionActive` or scoped-first paths
- No database writes
- `authoritySource` always `"S1_CANONICAL"`

---

## 7. Assumptions Made

| # | Assumption |
|---|------------|
| 1 | `server/commercial/` is the correct service root (no `services/` package in repo) |
| 2 | `planName` uses catalog `nameEn` with `nameAr` fallback — display only, not authority |
| 3 | `isEntitled` derived as `entitlements.plan !== "NONE"` from existing resolver output |
| 4 | `subscriptionId` / `billingCycle` come from the same `pickUserLevelSubscription` row as entitlements |
| 5 | Admin `role === "admin"` continues to bypass subscription reads per existing `buildCommercialContextFromDb` |
| 6 | Scoped rows (`restaurantId > 0`) are invisible to authority until AR-6 backfill — consistent with S1 |

---

## 8. Risks Identified

| Risk | Severity | Mitigation |
|------|----------|------------|
| Launch DB has 0 account rows — owners show `plan: NONE` until AR-6 | **Expected** | Documented; backfill is EXEC-6 |
| Duplicate `getSubscriptionsByUser` call (adapter + service) | **Low** | Acceptable for EXEC-1; batch optimization in EXEC-2 |
| Admin user shows `ADMIN` plan while scoped row exists | **Low** | Existing role bypass — preserved, not changed |
| Service not yet exposed via tRPC | **None** | By design — EXEC-2 |

---

## 9. Deferred Work

| Item | Target phase |
|------|--------------|
| tRPC `commercial.getOwnerCommercialState` | EXEC-2 |
| `admin.getOwnerOverview` / `getDashboardSummary` | EXEC-2 |
| `CanonicalMetricsService` / `analytics.*` | EXEC-3 |
| Dashboard consumer migration (`AdminManagement.tsx`) | EXEC-4 / AR-5 |
| Legacy resolver retirement | EXEC-5+ |
| AR-6 account subscription backfill | EXEC-6 |
| Batch `getAuthorityForOwners(ids[])` | EXEC-2 |

---

## 10. EXEC-2 Readiness Assessment

| Prerequisite | Status |
|--------------|--------|
| `CommercialReadService` exists | **Ready** |
| `CommercialAuthority` DTO defined | **Ready** |
| Mapper unit-tested | **Ready** |
| Canonical chain unchanged | **Ready** |
| No consumer breakage | **Verified** — no existing files modified |

**EXEC-2 may proceed** with: wire `commercialReadService` into Category A tRPC procedures per AR-4 §3.1.

---

## 11. Validation

```bash
npx vitest run server/commercial/CommercialReadService.test.ts server/commercial/mapToCommercialAuthority.test.ts server/commercial/getCommercialEntitlements.test.ts
```

**Result:** 10/10 tests passed.

---

*End of EXEC-1 completion report.*
