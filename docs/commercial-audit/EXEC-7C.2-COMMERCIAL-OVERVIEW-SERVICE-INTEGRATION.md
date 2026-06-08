# EXEC-7C.2 — Commercial Overview Service Integration

**Program:** Commercial Authority Program — Execution  
**Phase:** EXEC-7C.2 — Canonical snapshot builder + admin read endpoint  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** Service integration only. No UI. No dashboard page changes.

**Prerequisites:** EXEC-7C.1 data contract (`EXEC-7C.1-COMMERCIAL-OVERVIEW-DATA-CONTRACT.md`).

---

## 1. Executive Summary

EXEC-7C.2 implements the **single canonical read path** for `/admin/commercial`:

| Deliverable | Location |
|-------------|----------|
| `CommercialOverviewSnapshot` type | `server/commercial/metrics/CommercialOverviewSnapshot.ts` |
| `getCommercialOverviewSnapshot()` | `CanonicalMetricsService` |
| `admin.getCommercialOverview` | `adminDashboardRouter.ts` |

Future Commercial Overview UI can render from **one tRPC query** with zero client-side commercial derivation.

---

## 2. Implementation

### 2.1 Snapshot builder

```typescript
canonicalMetricsService.getCommercialOverviewSnapshot(
  entityCounts: { totalUsers, activeRestaurants },
  now?: Date
): Promise<CommercialOverviewSnapshot>
```

**Single CRS load:** `loadOwnerStates(now)` once per request. All commercial fields derived from that array via existing private helpers (`computeMrrFromStates`, `subscriberCountsFromStates`, `expiringFromStates`, `planDistributionFromStates`, `subscriptionHealthFromStates`).

**Operational counts:** `totalUsers` and `activeRestaurants` from `resolveAdminDashboardEntityCounts()` — same DB path as `getDashboardSummary` (not CRS).

### 2.2 tRPC endpoint

```typescript
admin.getCommercialOverview({ now?: ISO8601 }) → CommercialOverviewSnapshot
```

- Read-only `protectedProcedure`
- `assertAdminAccess(ctx, "admin.getCommercialOverview")`
- Optional `now` for deterministic evaluation (tests / parity)

### 2.3 Metadata

| Field | Value |
|-------|-------|
| `metadata.schemaVersion` | `EXEC-7C.1` |
| `metadata.authorityVersion` | `S1_CANONICAL` |
| `metadata.commercialAuthoritySource` | `S1_CANONICAL` |
| `metadata.metricsSource` | `CANONICAL_OWNER` |
| `metadata.assembledBy` | `CanonicalMetricsService.getCommercialOverviewSnapshot` |
| `metadata.generatedAt` / `metadata.asOf` | Mirrors top-level snapshot timestamps |

---

## 3. Contract Alignment

| EXEC-7C.1 section | Status |
|-------------------|--------|
| `executive` KPIs | ✅ Composed from CRS + operational entity counts |
| `subscriptionHealth` | ✅ trial/active/canceled/expired/inactive only |
| `planDistribution` | ✅ Full `CommercialPlan` breakdown |
| `needsAttention` | ✅ expiring + canceled/expired; grace/suspended `null` |
| `recentActivity` | ✅ `available: false` |
| `growth` | ✅ `available: false` |

**Not implemented (by design):** grace, suspended, activity feed, growth deltas, raw row aggregates.

---

## 4. Refactoring (non-behavioral)

| Change | Reason |
|--------|--------|
| `resolveAdminDashboardEntityCounts()` extracted | Shared by `getDashboardSummary` and `getCommercialOverview` |
| `planDistributionFromStates()` extracted | Reused by `getPlanDistribution` and snapshot |
| `Array.from(counts.entries())` | Fixes TS2802 iterator issue in `getPlanDistribution` |

No change to MRR formula, entitlement rules, or CRS resolution.

---

## 5. Validation

**Test file:** `server/commercial/exec7c2CommercialOverview.test.ts`

| Test | Assertion |
|------|-----------|
| Metadata population | schemaVersion, authorityVersion, metricsSource, assembledBy |
| Executive parity | snapshot === `analytics.getMRR` + `getSubscriberCounts` + `getDashboardSummary` fields |
| Health statuses | Authority statuses only; no grace/suspended keys |
| Deferred sections | `recentActivity.available === false`, `growth.available === false` |
| Access control | Non-admin denied |

Run:

```bash
pnpm exec vitest run server/commercial/exec7c2CommercialOverview.test.ts server/commercial/exec3DashboardApi.test.ts
```

---

## 6. Consumer Guidance (EXEC-7C.3+)

```typescript
const { data } = trpc.admin.getCommercialOverview.useQuery();
// Render executive, subscriptionHealth, planDistribution, needsAttention
// Show placeholders for recentActivity / growth when available === false
```

**Do not:**

- Merge `analytics.*` + `getDashboardSummary` on client for commercial page
- Derive MRR or entitlement client-side
- Map grace/suspended until authority program defines them

---

## 7. Files Modified

| File | Change |
|------|--------|
| `server/commercial/metrics/CommercialOverviewSnapshot.ts` | **Created** — contract types |
| `server/commercial/metrics/CanonicalMetricsService.ts` | `getCommercialOverviewSnapshot` + helpers |
| `server/commercial/adminDashboardRouter.ts` | `getCommercialOverview` + entity count helper |
| `server/commercial/exec7c2CommercialOverview.test.ts` | **Created** — integration tests |

---

*Stop boundary: EXEC-7C.2 complete. EXEC-7C.3 UI not started.*
