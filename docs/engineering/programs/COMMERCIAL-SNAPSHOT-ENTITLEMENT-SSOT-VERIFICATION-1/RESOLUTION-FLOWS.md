# RESOLUTION-FLOWS

**Program:** COMMERCIAL-SNAPSHOT-ENTITLEMENT-SSOT-VERIFICATION-1  

---

## 1. Canonical feature entitlement (runtime) — observed

```
API / Hook (commercial.getEntitlements | guest ordering | CRS)
    ↓
getCommercialEntitlements(ownerId)                    [R01]
    ↓
buildCommercialContextFromDb                          [R04]
    ↓  user_subscriptions + mapPlanIdToCatalogPlan
getCommercialEntitlementsFromContext                  [R02]
    ↓
resolveCommercialEntitlements                         [R03]
    ↓  planFeatureMatrix (FEATURE_MATRIX / PLAN_LIMITS)
base entitlements  ←── ALWAYS computed from Legacy Bridge
    ↓
resolveCommercialFactsFromSnapshot(subscriptionId)    [R05]
    ↓
IF snapshot missing → return base (Legacy only)       [B path]
IF snapshot present → OVERLAY features/limits onto base
                      keep plan/status/flags from base
                      return { ...base, features, limits, meta }
                                                      [C path — MIXED]
```

### Decision points (R01)

| Step | Question | Observed behavior |
|------|----------|-------------------|
| D1 | Snapshot exists? | Checked **after** Legacy resolution |
| D2 | If yes, Snapshot exclusive? | **No** — Legacy base always computed first |
| D3 | Catalog live read for features? | Not in R01 overlay; Catalog used at selection/seed elsewhere |
| D4 | Billing/pricing/trial/promo/regional from Snapshot? | **No** — not applied to entitlement result |
| D5 | On Snapshot error? | Falls back to Legacy base |

---

## 2. Required invariant (not met)

```
IF Snapshot exists
    resolve ONLY from Snapshot     ← REQUIRED
ELSE
    resolve ONLY from Legacy       ← REQUIRED
```

```
Observed when Snapshot exists:
    resolve Legacy Matrix
        THEN mix Snapshot features/limits onto Legacy result
```

---

## 3. Limit quota flow (restaurant/item/category)

```
assertRestaurantCreateAllowed / item / category
    ↓
resolvePlanLimitsForUser                              [R12]
    ↓
user_subscriptions → planId
    ↓
subscription_plans.max*   ← Legacy table ONLY
    ↓
(no Snapshot lookup)
```

Bound subscriptions still hit Legacy plan columns.

---

## 4. Guest ordering

```
order.create / canOrder / QR ordering runtime
    ↓
resolveGuestOrderingAllowed(restaurantId)             [R06]
    ↓
restaurant.userId → getCommercialEntitlements         [R01 → C]
    ↓
features.ordering
```

---

## 5. Trial status

```
subscription.checkTrialStatus
    ↓
resolveTrialStatusRead                                [R11]
    ↓
getCommercialEntitlements                             [R01 → C]
    ↓
if plan === NONE → isSubscriptionActive (Legacy)      [extra mix]
    ↓
trialEndsAt from context OR getTrialEndDate (Legacy)
```

---

## 6. Trial activation (capture vs resolve)

```
createTrialSubscription / registerOwner
    ↓
Legacy planId (via Catalog bridge for id selection)
    ↓
INSERT user_subscriptions
    ↓
createImmutableCommercialSnapshotForSubscription      [capture]
    ↓
Later runtime reads → R01 (MIXED), not Snapshot-only
```

---

## 7. Upgrade / Downgrade / Renewal

```
No production call sites found that:
  - create new Snapshot on upgrade/downgrade/renewal
  - switch resolution to Snapshot-only

Payment activation (PayPal/Tap) / admin update:
  update planId on user_subscriptions only
  → no binding update observed
```
