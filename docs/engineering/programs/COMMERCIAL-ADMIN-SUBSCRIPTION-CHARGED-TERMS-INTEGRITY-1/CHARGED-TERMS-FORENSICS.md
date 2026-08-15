# CHARGED TERMS FORENSICS

## Authority

Charged Terms = immutable historical commercial terms used for MRR.

Storage: `commercial_subscription_bindings` (`chargedAmount`, `chargedCurrency`, `billingCycleCode`, `billingCycleId`, `planId`).

Live Plan `commercial_prices` = **current Offer List Price**. Must not reconstruct historical Charged Terms.

## Who writes Charged Terms

`bindSubscriptionToLivePlan` → `chargedTermsForPlan(planId, billingCycleCode ?? "monthly", regionId)`.

Amount is **current catalog price at bind time**, not provider capture, not Admin input, not `user_subscriptions` amount (there is none).

`ensureLivePlanBoundForSubscription` does **not** accept `billingCycleCode`. Admin create/update therefore always bind as **monthly** catalog price when bind succeeds.

## Immutability — disproven for Admin re-bind

Comment on `bindSubscriptionToLivePlan`: later price edits do not rewrite Charged Terms.

`onDuplicateKeyUpdate` **does** rewrite `chargedAmount` / `chargedCurrency` / `billingCycleCode` on every successful re-bind.

Admin update re-binds on plan change, period-end change, or status activation. That overwrites historical terms with **today's** monthly catalog price.

Passive Plan Editor price edits do not touch existing bindings (unchanged from prior Live Plan audit).

## Admin create path

| Era | Bind on Admin create? | Charged Terms? |
|-----|------------------------|----------------|
| Before `0085` (2026-07-29) | Table did not exist | Impossible |
| `0085` until `fe209565` (2026-08-15 01:10 +0300) | Table existed; Admin create did not call bind | Not written by Admin create |
| After `fe209565` | Admin create calls bind (fail-soft) | Written if bind succeeds; cycle forced monthly |

## Production Charged Terms (SELECT 2026-08-15T15:17:10.073Z)

| subscriptionId | chargedAmount | currency | cycle | Origin |
|----------------|---------------|----------|-------|--------|
| 810001 | 19.00 | USD | monthly | Admin create 2026-08-15 (plan leftover 30001 / basic) |
| 840001 | 99.00 | USD | monthly | Admin create 2026-08-15 (plan leftover 30003 / enterprise) |
| 600001, 690001, 750001, 780001 | none | — | — | No binding |

840001's `99.00` matches **today's** enterprise monthly Offer List Price. That is consistent with bind-time catalog snapshot for a **monthly** Admin create. It does **not** prove 780001's historical commitment.

## Fail-closed read

`resolveLivePlanCapabilities`: missing binding → `chargedTerms: null`. Does not fill from Live Plan price.

`monthlyEquivalentFromChargedTerms`: missing/invalid amount → `INCOMPLETE_CHARGED_TERMS`, value 0.

`computeMrrFromChargedTerms`: no terms row → skip (0).
