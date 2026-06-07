# PG-1C.2E — CommercialContext Integration

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.2E — read-only CommercialContext adapter and entitlements API  
**Date:** 2026-06-07  
**Status:** Implemented (observation only — no authority replacement)

---

## 1. Purpose

Provides a **read-only** path from runtime subscription data to canonical `CommercialEntitlements` output. Existing feature gates, billing checks, and router authorization are **unchanged**.

```
Runtime DB records
    → buildCommercialContextFromDb()     [server/commercial/]
    → buildCommercialContext()           [src/lib/commercial/]
    → resolveCommercialEntitlements()    [src/lib/commercial/]
    → { context, entitlements }
```

---

## 2. Module Map

| Module | Location | Role |
|---|---|---|
| Plan ID mapping | `src/lib/commercial/planIdMapping.ts` | `planId` → `catalogPlan` per PLAN-ID-MAPPING.md |
| Context builder (pure) | `src/lib/commercial/commercialContext.ts` | `CommercialContext` type + `buildCommercialContext()` |
| Entitlements (pure) | `src/lib/commercial/getCommercialEntitlements.ts` | `getCommercialEntitlementsFromContext()` |
| DB adapter | `server/commercial/buildCommercialContextFromDb.ts` | Loads user + account-level subscription |
| Service | `server/commercial/getCommercialEntitlements.ts` | End-to-end read-only service |
| API | `server/commercial/router.ts` | tRPC `commercial.getEntitlements` |

---

## 3. CommercialContext Contract

Implemented per PG-1C.2D §3:

```typescript
type CommercialContext = {
  ownerId: number;
  role: "admin" | "user";
  subscription: {
    catalogPlan: "BASIC" | "PROFESSIONAL" | "ENTERPRISE";
    subscriptionStatus: "trial" | "active" | "canceled" | "expired";
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  } | null;
  now: Date;
};
```

**Admin:** `subscription` is always `null`; resolver outputs `plan: ADMIN`.

**Account-level pick:** `pickUserLevelSubscription()` — only `restaurantId = 0` rows. Restaurant-scoped rows do not drive owner authority in this adapter.

**Unknown `planId`:** Logged warning; context `subscription` set to `null` (NONE authority).

---

## 4. Plan ID Mapping

| `planId` | `catalogPlan` |
|---:|---|
| 30001 | BASIC |
| 30002 | PROFESSIONAL |
| 30003 | ENTERPRISE |

Source: `mapPlanIdToCatalogPlan()` in `src/lib/commercial/planIdMapping.ts`  
Spec: `docs/commercial-spec/PLAN-ID-MAPPING.md`

---

## 5. Read-Only API

### tRPC (primary)

| Procedure | Auth | Input | Output |
|---|---|---|---|
| `commercial.getEntitlements` | `verifiedProcedure` | *(none — uses `ctx.user.id`)* | `{ context, entitlements }` |

**Client usage:**

```typescript
const { data } = trpc.commercial.getEntitlements.useQuery();
// data.context   — CommercialContext
// data.entitlements — CommercialEntitlements (matrix + flags + limits)
```

### HTTP

tRPC is mounted at the application API path (same as other procedures). There is no separate REST `/api/commercial/entitlements` route; the tRPC procedure is the diagnostic endpoint.

---

## 6. Safety Guarantees

This integration **does not**:

- Replace `isSubscriptionActive`, `resolveTableOrderingEntitlement`, or other legacy gates
- Change billing, webhooks, MRR, or invoice logic
- Add feature enforcement on mutations
- Modify database schema or subscription rows
- Alter router authorization paths

The endpoint exists for **observation, diagnostics, and Wave 1 client read paths** only.

---

## 7. Tests

| Suite | Path | Coverage |
|---|---|---|
| Plan mapping | `src/lib/commercial/__tests__/planIdMapping.test.ts` | 30001/30002/30003, unknown IDs |
| Context + resolver | `src/lib/commercial/__tests__/commercialContext.test.ts` | BASIC, TRIAL, ENTERPRISE, ADMIN, expired, NONE |
| Server adapter | `server/commercial/getCommercialEntitlements.test.ts` | DB mock → adapter → resolver flow |

Run:

```bash
npx vitest run src/lib/commercial server/commercial
```

---

## 8. Verification Flow

Example: active Professional owner (user 5, account-level sub `planId: 30002`):

1. `getUserById(5)` → `{ role: "user" }`
2. `getSubscriptionsByUser(5)` → `[{ restaurantId: 0, planId: 30002, status: "active", ... }]`
3. `pickUserLevelSubscription()` → account-level row
4. `mapPlanIdToCatalogPlan(30002)` → `PROFESSIONAL`
5. `buildCommercialContext()` → context with `catalogPlan: PROFESSIONAL`
6. `resolveCommercialEntitlements()` → `plan: PROFESSIONAL`, `accountType: PAYING`, full feature set

Legacy `getCanonicalUserSubscription` and `isSubscriptionActive` continue to operate independently with unchanged behavior.

---

## 9. Next Phase

**PG-1C.2F / Wave 1 client** — optional `useCommercialEntitlements()` hook consuming `commercial.getEntitlements` for UI display (still read-only).

**Wave 2+** — replace legacy gates with `entitlements.features.*` per PG-1C.2D alignment decisions.

---

*Read-only integration. No authority replacement.*
