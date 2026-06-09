# AUTHORITY-CLEANUP-1 — Subscription Authority Unification

**Program:** Commercial Authority Program  
**Incident reference:** [COMM-AUDIT-1A-FINAL-REPORT.md](./COMM-AUDIT-1A-FINAL-REPORT.md)  
**Date:** 2026-06-07  
**Status:** Complete  

---

## 1. Executive Summary

COMM-AUDIT-1A identified two incompatible definitions of **“has subscription”**. This phase unifies all commercial consumers on the **CommercialReadService (CRS) account-level entitlement model** without rewriting CRS, changing pricing, or changing entitlement rules.

**Canonical rule (post-cleanup):**

```text
Has Subscription (commercial authority)
  ⇔ owner has account-scoped row (restaurantId = 0) picked by pickUserLevelSubscription
     AND CRS commercialStatus.isEntitled === true
```

Admin **create** blocks only when `isEntitled`; admin **update/delete/invoice** target the account row from `pickUserLevelSubscription` (may exist but not be entitled).

---

## 2. AUTH-1A — Authority Inventory

| # | Function / path | File | Rule (pre-cleanup) | Data source | Consumer |
|---|----------------|------|-------------------|-------------|----------|
| 1 | `getCanonicalUserSubscription` | `server/db.ts` | Any `user_subscriptions` row for user (`pickCanonicalSubscription`) | `getSubscriptionsByUser` | **Was:** `createUserSubscriptionByAdmin`, `deleteUserSubscriptionByAdmin`, `generateInvoicePDF`; user-facing `subscription` router |
| 2 | `pickUserLevelSubscription` | `server/subscriptionResolver.ts` | Account row (`restaurantId = 0`), period-valid pick | `user_subscriptions` rows | CRS, `buildCommercialContextFromDb` |
| 3 | `commercialReadService.getOwnerCommercialState` | `server/commercial/CommercialReadService.ts` | `isEntitled` from entitlements on account row | CRS pipeline | Operations UI, admin user commercial badges |
| 4 | `buildCommercialContextFromDb` | `server/commercial/buildCommercialContextFromDb.ts` | Same as (2)+(entitlements) | DB rows | CRS internals |
| 5 | `CanonicalMetricsService` | `server/commercial/CanonicalMetricsService.ts` | Composes CRS snapshots | CRS | MRR, ARR, Commercial Overview |
| 6 | `resolveSubscriptionForActivation` | `server/subscriptionActivation.ts` | Account row with scoped fallback | rows + activation context | **Was:** `updateUserSubscriptionByAdmin` |
| 7 | `resolveSubscriptionRestaurantIdForUser` | `server/adminSubscriptionHelpers.ts` | Force restaurant scope when user owns venues | restaurants + input | **Was:** `createUserSubscriptionByAdmin` |
| 8 | `getSubscriptionForRestaurant` | `server/db.ts` | Row for specific `restaurantId` | DB | **Was:** restaurant-scoped admin mutations |
| 9 | `isSubscriptionActive` | `server/db.ts` | Legacy any-row active check | canonical sub | Legacy limits / parity tests |
| 10 | `pickCanonicalSubscription` | `server/subscriptionResolver.ts` | Newest row any scope | rows | Legacy user subscription display |
| 11 | Admin Operations UI | `client/src/pages/AdminManagement.tsx` | CRS via `getUsers` enriched state | tRPC + CRS | Operations |
| 12 | Commercial Overview | `client/src/pages/AdminCommercial.tsx` | `getCommercialOverview` → CMS | CRS | Executive KPIs |

**Split-brain pattern (pre-cleanup):** paths 1, 6, 7 vs paths 2–5, 11–12.

---

## 3. AUTH-1B — Canonical Authority Decision

**Chosen canonical source:** `CommercialReadService` entitlement pipeline, exposed for admin mutations via:

```text
server/commercial/ownerAccountSubscriptionAuthority.ts
```

| Helper | Purpose |
|--------|---------|
| `ownerHasEntitledAccountSubscription(userId)` | Create guard — `CRS.commercialStatus.isEntitled` |
| `getOwnerAccountSubscriptionRow(userId)` | Update/delete/invoice target — `pickUserLevelSubscription(rows)` |

**Rationale:**

- CRS is already the sole commercial authority for Operations UI, metrics, and Commercial Overview (EXEC program invariants).
- `pickUserLevelSubscription` is the account-scoped row picker inside CRS; it ignores restaurant-scoped orphan rows.
- `getCanonicalUserSubscription` (any-scope) caused the COMM-AUDIT-1A incident and is **not** used for admin commercial mutations after this phase.

---

## 4. AUTH-1C — Create Flow Alignment

**`admin.createUserSubscriptionByAdmin`** (`server/routers.ts`):

| Before | After |
|--------|-------|
| Block if `getCanonicalUserSubscription` returns any row | Block only if `ownerHasEntitledAccountSubscription` |
| `restaurantId` from `resolveSubscriptionRestaurantIdForUser` | Always `restaurantId: 0`; reject non-zero input |
| Could create scoped subscription | Account-level only |

---

## 5. AUTH-1D — Operations Alignment

Verified consumers already share CRS path (no duplicate authority added):

| Consumer | Authority path | Change |
|----------|----------------|--------|
| Operations UI | `getUsers` + CRS enrichment | None (already CRS) |
| Commercial Overview | `CanonicalMetricsService.getCommercialOverviewSnapshot` | None |
| MRR / metrics | CRS composition | None |
| `updateUserSubscriptionByAdmin` | **Aligned** → `getOwnerAccountSubscriptionRow` |
| `deleteUserSubscriptionByAdmin` | **Aligned** → `getOwnerAccountSubscriptionRow` |
| `generateInvoicePDF` | **Aligned** → account row + `subscriptionId` match |

---

## 6. AUTH-1E — Legacy Retirement

Restaurant-scoped admin subscription mutations **retired** (throw `PRECONDITION_FAILED`):

| Procedure | Replacement |
|-----------|-------------|
| `admin.createRestaurantSubscription` | `admin.createUserSubscriptionByAdmin` |
| `admin.updateRestaurantSubscription` | `admin.updateUserSubscriptionByAdmin` |
| `admin.cancelRestaurantSubscription` | `admin.updateUserSubscriptionByAdmin` |
| `admin.deleteRestaurantSubscription` | `admin.deleteUserSubscriptionByAdmin` |

Implementation: `server/commercial/retiredRestaurantSubscriptionApi.ts`

**Not removed (out of scope — user-facing / legacy read paths):**

- `getCanonicalUserSubscription` in user subscription router (non-admin)
- `isSubscriptionActive`, `pickCanonicalSubscription` (legacy; documented in EXEC-2 parity tests)

---

## 7. Validation Scenarios

Automated: `server/commercial/authorityCleanup1.test.ts`

### Scenario A — Active entitled account

```text
Account row 660001, restaurantId=0, active, period valid
  Create     → CONFLICT (blocked)
  CRS        → isEntitled true
  Account row pick → id 660001
```

### Scenario B — No entitled account

```text
No account row
  Create     → success, restaurantId=0
  CRS        → isEntitled false
```

### Scenario C — Expired / orphan legacy scoped rows only

```text
Scoped rows only (no restaurantId=0)
  Create     → allowed (no split-brain)
  CRS        → isEntitled false, subscriptionId null
  getOwnerAccountSubscriptionRow → undefined
```

---

## 8. Success Criteria

The system can no longer produce:

```text
Create → "User already has subscription"
Operations → No subscription
MRR → 0
Commercial Overview → 0 active subscriptions
```

…for the same owner unless the account row exists but is **not entitled** (expired/canceled) — in that case create is **allowed** (replacing/upgrading via create), consistent with CRS showing no active commercial subscription.

---

## 9. Files Changed

| File | Change |
|------|--------|
| `server/commercial/ownerAccountSubscriptionAuthority.ts` | **New** — canonical helpers |
| `server/commercial/retiredRestaurantSubscriptionApi.ts` | **New** — retirement guard |
| `server/routers.ts` | Align create/update/delete/invoice; retire restaurant-scoped admin APIs |
| `server/commercial/authorityCleanup1.test.ts` | **New** — scenarios A/B/C |
| `server/admin-invoice-billing.test.ts` | Updated mocks for account-level authority |
| `server/admin-subscription.test.ts` | Retirement expectations |

---

## 10. Related Documents

- [COMM-AUDIT-1A-FINAL-REPORT.md](./COMM-AUDIT-1A-FINAL-REPORT.md) — incident root cause
- [AR-UX-7-COMMERCIAL-AUTHORITY-UX-ALIGNMENT.md](./AR-UX-7-COMMERCIAL-AUTHORITY-UX-ALIGNMENT.md) — Operations UI owner-level UX
- `server/commercial/CommercialReadService.parity.test.ts` — EXEC-2 parity (legacy mismatches documented)
