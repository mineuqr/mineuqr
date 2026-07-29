# VIOLATIONS

**Program:** COMMERCIAL-SNAPSHOT-ENTITLEMENT-SSOT-VERIFICATION-1  

## V1 — Mixed resolution hub (Critical)

**File:** `server/commercial/getCommercialEntitlements.ts`  
**Class:** **C**  
**Pattern:** Prefer/overlay Snapshot onto Legacy base  

```
base = Legacy(planFeatureMatrix)
IF snapshot → return { ...base, features: overlay, limits: overlay }
```

Violates: Snapshot exclusive authority; “no prefer”; no Legacy after bind.

## V2 — Quota limits ignore Snapshot (Critical)

**File:** `server/subscriptionPlanLimits.ts` → `resolvePlanLimitsForUser`  
**Class:** **B** applied to bound rows without Snapshot gate  
Violates: Limits must come from Snapshot when bound.

## V3 — Incomplete Snapshot fact surface (High)

Even the overlay path does not make Snapshot authoritative for billing cycle, pricing, trial policy, promotion, or regional policy in the entitlement response.

## V4 — Trial status double path (Medium)

**File:** `server/commercial/wave1ReadAuthority.ts`  
Uses R01 then Legacy `isSubscriptionActive` / `getTrialEndDate` fallbacks → **C**.

## V5 — CommercialReadService legacy plan join (Medium)

**File:** `server/commercial/CommercialReadService.ts`  
After R01, loads `getSubscriptionPlanById` (Legacy table) for authority mapping → **C**.

## V6 — Activation / upgrade gaps (High)

PayPal/Tap activation and admin subscription mutations do not create Snapshot bindings.  
Upgrade/downgrade/renewal helpers are unused at call sites.  
Many “active” subscriptions remain permanently on Legacy Bridge.

## V7 — Snapshot payload process memory dependency (Medium)

Runtime Snapshot read uses in-memory store; DB binding without hydrated payload → false “unbound” → Legacy executes.

## Non-violations (in scope)

- Live Catalog admin CRUD (R18) is configuration SSOT, not bound entitlement resolution — **D** as config, acceptable if not used for runtime entitlement.
- Period checks (R14) are lifecycle, not feature/limit commercial facts — allowed as B-lifecycle if not substituted for Snapshot commercial authority.
