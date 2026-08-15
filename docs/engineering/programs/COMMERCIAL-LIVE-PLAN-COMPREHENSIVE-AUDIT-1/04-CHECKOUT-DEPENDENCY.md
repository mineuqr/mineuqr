# 04 — CHECKOUT DEPENDENCY

## Verified path

```
livePlanUuidInput (UUID)
  → resolveCheckoutOfferFromLivePlan
      → resolveLivePlanById (UUID only)
      → plan must exist and not isHidden
      → pricingService.currentPriceForPlan (global Offer List Price)
  → PayPal: amount + currency "USD"
  → Tap:   amount (same number) + currency "SAR"
```

`subscription.listPlans` / `getSubscriptionPlanById` / `subscription_plans.priceMonthly` are **not** on this path (guard-tested).

## Behaviors

| Case | Result |
|------|--------|
| UUID input | Required |
| `planCode` | Not checkout input; returned on offer as `planCode` |
| Hidden plan | `null` → NOT_FOUND |
| Unknown / malformed UUID | fail closed → NOT_FOUND |
| Inactive (no `isActive` on live plan) | N/A — hide is `isHidden` |
| Currency PayPal | Hardcoded USD matching global offer |
| Currency Tap | Hardcoded SAR **with USD numeric amount** — defect (documented, not fixed) |
| Provider payload plan id | UUID (`custom_id.planId` / `metadata.plan_id`) |
| PayPal `billing_cycle` | **Not** in `custom_id` |
| Tap `billing_cycle` | In metadata; webhook uses it for period end only, **not** for Charged Terms bind |

## Classification

Checkout price authority: **Canonical** Live Plan Offer List Price.

Tap SAR labeling: **Incorrect architecture / operational financial defect** relative to catalog (USD number charged as SAR). Out of scope to fix here.
