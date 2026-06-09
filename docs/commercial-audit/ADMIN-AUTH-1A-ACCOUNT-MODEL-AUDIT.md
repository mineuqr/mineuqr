# ADMIN-AUTH-1A — Account Model Audit (Phase A)

**Date:** 2026-06-09  
**Status:** Complete (read-only)  
**Scope:** No production behavior changes.

---

## 1. User schema

**Table:** `users` (`drizzle/schema.ts`)

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | `int` autoincrement | — | Primary key |
| `openId` | `varchar(64)` | required | Identity provider key |
| `name` | `text` | nullable | Display name |
| `email` | `varchar(320)` | nullable | Account email |
| `loginMethod` | `varchar(64)` | nullable | Auth method |
| `passwordHash` | `varchar(255)` | nullable | Local password |
| `emailVerifiedAt` | `timestamp` | nullable | Verification |
| `passwordChangedAt` | `timestamp` | nullable | Password rotation |
| `sessionValidAfter` | `timestamp` | nullable | Session revocation boundary |
| **`role`** | **`enum('user','admin')`** | **`user`** | **Authorization only (schema intent)** |
| `createdAt` | `timestamp` | `CURRENT_TIMESTAMP` | Signup time |
| `updatedAt` | `timestamp` | auto | Last update |
| `lastSignedIn` | `timestamp` | `CURRENT_TIMESTAMP` | Last login |

**Not present today:**

- `accountClassification` (proposed ADMIN-AUTH-1B)
- `accountType` at persistence layer (exists only as derived commercial entitlement)
- Service-account markers

---

## 2. Existing role values

| Value | Meaning today | Set by |
|-------|---------------|--------|
| `user` | Default customer/owner account | Registration, admin user management |
| `admin` | Platform operator with elevated permissions | `updateUserRole`, `upsertUser` when `openId === ENV.ownerOpenId` |

**Authorization consumers of `role`:**

| Location | Usage |
|----------|-------|
| `server/_core/assertAdminAccess.ts` | Gate admin tRPC procedures |
| `server/_core/trpc.ts` | `adminProcedure` middleware |
| `server/routers.ts` | Inline `ctx.user.role !== "admin"` on legacy routes |
| `server/_core/emailVerificationPolicy.ts` | Admins skip email verification requirement |
| `client/src/_core/hooks/useAuthGate.ts` | `isAdmin` for UI route gating |
| Admin pages | `gate.user?.role === "admin"` enables queries |

**Role is correctly used for access control.** The problem is secondary use of `role` inside the commercial authority resolver.

---

## 3. Existing account types (commercial layer)

Distinct from `users.role`. Defined in `src/lib/commercial/planTypes.ts`:

```ts
AccountType = "ADMIN" | "TRIAL" | "PAYING" | "NONE"
```

| Type | Derivation today | Meaning |
|------|------------------|---------|
| `ADMIN` | `users.role === "admin"` **or** `CommercialPlan === "ADMIN"` | Platform operator commercial bypass |
| `TRIAL` | Active trial subscription | Trial customer |
| `PAYING` | Active paid catalog plan | Paying customer |
| `NONE` | No entitled subscription | Unsubscribed / expired |

**Critical coupling:** `AccountType.ADMIN` is assigned when `role === "admin"` in `resolveCommercialEntitlements.ts` and `buildCommercialContextFromDb.ts`, **before** any subscription row is read.

```ts
// buildCommercialContextFromDb.ts
if (role === "admin") {
  return buildCommercialContext({ ownerId, role: "admin", subscriptionRow: null, now });
}

// resolveCommercialEntitlements.ts
if (input.role === "admin") {
  return { plan: "ADMIN", status: null };
}
```

This conflates **authorization role** with **commercial entitlement classification**.

---

## 4. Existing admin logic

### Bootstrap

| Mechanism | File | Behavior |
|-----------|------|----------|
| Owner openId elevation | `server/db.ts` `upsertUser` | `openId === ENV.ownerOpenId` → `role = 'admin'` on insert/update |
| Role mutation | `admin.updateUserRole` | Admin can set `user` ↔ `admin` |
| Self-protection | `assertNotSelfAdminTarget` | Admin cannot change own role or delete self |

### Commercial bypass for admins

| Step | Effect |
|------|--------|
| `role === "admin"` | Skips subscription row resolution |
| Resolver returns `CommercialPlan.ADMIN` | Unlimited features via `planFeatureMatrix` |
| `isEntitled: true` | Counts in subscriber KPIs |
| `countsInMrr: false` | Excluded from MRR/ARR |
| `planDistribution` | Appears in `ADMIN` bucket |

Documented in EXEC-7C.7 §6 as **P2 follow-up** for ADMIN-AUTH-1.

---

## 5. Existing analytics filters

### Certified commercial pipeline (post ANALYTICS-ALIGNMENT-1)

```text
getAllUsers()
        ↓
CommercialReadService.getAllOwnerCommercialStates()   ← ALL users, no role filter
        ↓
CanonicalMetricsService.getCommercialOverviewSnapshot()
        ↓
CommercialReportService.buildCommercialExportPackage()
        ↓
projectCommercialAnalytics() → StatisticsPanel
```

**No analytics population filter exists today.** Every `users` row becomes an owner commercial state.

### Per-metric inclusion rules (derived, not filtered)

| Metric | Admin `role=admin` effect |
|--------|---------------------------|
| MRR / ARR | Excluded (`countsInMrr: false`) |
| Commercial Subscribers | **Included** (`isEntitled: true`, ADMIN plan) |
| Plan Distribution | **Included** in `ADMIN` bucket |
| Subscription Health | Typically `inactive` or null status (not trial/active/canceled/expired) |
| Subscriber table / export rows | **Included** with `planCode: ADMIN` |
| Needs Attention | Excluded from expiring (no period end) |
| `totalUsers` (platform) | **Included** in entity count |
| User growth chart | **Included** in signup buckets |

### Optional UI filters (not population filters)

| Filter | Location | Scope |
|--------|----------|-------|
| `roleFilter` on `getOwnerOverviewList` | `adminDashboardRouter.ts` | Display list only |
| `statusFilter` / `planFilter` on `getSubscriptionOverview` | `adminDashboardRouter.ts` | Display only (deprecated path for analytics table) |

---

## 6. Places where `role === "admin"` affects analytics

| # | File | Function / surface | Analytics impact |
|---|------|-------------------|------------------|
| 1 | `server/commercial/buildCommercialContextFromDb.ts` | `buildCommercialContextFromDb` | Admin → ADMIN plan, entitled, in population |
| 2 | `src/lib/commercial/resolveCommercialEntitlements.ts` | `resolveCommercialPlan` | Admin → ADMIN plan |
| 3 | `src/lib/commercial/commercialContext.ts` | `buildCommercialContext` | Admin context shape |
| 4 | `server/commercial/CommercialReadService.ts` | `getAllOwnerCommercialStates` | Loads all users; admin states computed via #1–3 |
| 5 | `server/commercial/metrics/CanonicalMetricsService.ts` | All KPI derivations | Operates on unfiltered states |
| 6 | `server/commercial/reporting/CommercialReportService.ts` | `buildSubscriberReport` | Admin rows in export |
| 7 | `server/commercial/reporting/analyticsProjection.ts` | Subscriber table mapping | Admin rows visible |
| 8 | `server/commercial/reporting/resolveOperationalCounts.ts` | `totalUsers` | All users counted |
| 9 | `server/db.ts` | `getExtendedAdminStats` → `userGrowth` | All signups in growth chart |

**Not analytics (authorization only):**

| File | Usage |
|------|-------|
| `assertAdminAccess.ts` | Procedure access |
| `StatisticsPanel.tsx` `gate.user?.role === "admin"` | Enables query — does not filter KPI population |
| `AdminCommercialPage.tsx` | Same |
| `emailVerificationPolicy.ts` | Policy exemption |

---

## 7. Gap summary

| Concern | Today | Target (ADMIN-AUTH-1) |
|---------|-------|----------------------|
| Who is a "subscriber" for KPIs? | All `isEntitled` owners, including `role=admin` | `accountClassification === COMMERCIAL` only |
| Who can access admin UI? | `role === admin` | Unchanged — `role` only |
| Internal staff without `role=admin` | Invisible to commercial exclusion | `INTERNAL` classification excludes from KPIs |
| System accounts | No model | `SYSTEM` classification |
| `AccountType.ADMIN` vs `role` | Conflated | Decouple in ADMIN-AUTH-1C |

---

## 8. Related prior certification

EXEC-7C.7 explicitly flagged:

> Admin-role users count as entitled subscribers but not MRR — **ADMIN-AUTH-1 follow-up**

This audit confirms that follow-up requires a persistent `accountClassification` field, not further `role`-based commercial logic.
