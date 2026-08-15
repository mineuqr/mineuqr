# 06 — CHARGED TERMS BOUNDARY

## Separation (intended)

Live Plan = current commercial **offer**.  
Charged Terms = historical customer **commitment** for the current period.

Type: `shared/commercial-catalog/types/chargedTerms.ts`.  
Storage: `commercial_subscription_bindings` (`chargedAmount`, `chargedCurrency`, `billingCycleId`, `billingCycleCode`, `planId`).

## Creation / bind

`bindSubscriptionToLivePlan` snapshots `chargedTermsForPlan(planId, billingCycleCode ?? "monthly", regionId)` — **current catalog**, not provider capture.

`ensureLivePlanBoundForSubscription` (webhooks, trial, admin) **does not pass `billingCycleCode`** → always `"monthly"` catalog price.

Re-bind (`onDuplicateKeyUpdate`) **overwrites** charged fields. Passive `saveLive` price edits do **not**.

Read path (`resolveLivePlanCapabilities`): missing terms → `chargedTerms: null`; **does not** fill from live list price. MRR treats incomplete as 0.

## Production

| Metric | Value |
|--------|-------|
| Bindings | 2 |
| Complete terms | 2 |
| Currency / cycle | USD / monthly only |
| `legacyPlanId` | both non-null (historical column; new writers pass `null`) |
| Disagreement vs `user_subscriptions.planId` | 0 |

## Can Live Plan edits alter historical financial facts?

| Action | Alters existing Charged Terms? |
|--------|--------------------------------|
| Admin price edit | **No** |
| Re-bind / webhook `ensureLivePlanBound` | **Yes** — current catalog monthly (default) |
| Provider capture | **Never written** to bindings |

**Verified:** MRR and invoice PDF amounts do **not** reconstruct from current Live Plan price; they read bindings. Incomplete/unbound subscriptions contribute 0 MRR, not live list price.

## Classification

Charged Terms: **F. Financial historical contract**.  
Webhook monthly default + unbound 4/6: **H. Incorrect architecture** relative to “immutable period terms from the actual checkout cycle/amount” — documented, not fixed.
