# FORENSIC-BASELINE

**HEAD:** `4fdfd8f6` — working tree clean at start.

## Already removed (prior programs)

| Path | Source now |
|------|------------|
| Checkout price | Live Plan Offer List Price |
| MRR | Charged Terms monthly-equivalent |
| Entitlements / limits | Live Plan hub |

## Remaining at start (runtime)

| Location | Use | Class (pre) |
|----------|-----|-------------|
| `subscription.listPlans` | Fallback `getSubscriptionPlans()` | A / B |
| `getCurrentSubscription` / `getByRestaurant` | Plan DTO from table | B / I |
| `CommercialReadService` | Unbound `getSubscriptionPlanById` name | B |
| `create-trial-subscription` | `getSubscriptionPlans()` sortOrder fallback | A / E |
| `paypal-webhook` | Existence + name + price fallback | B / D |
| `tap-webhook` | `nameAr` | B |
| Admin create/update notifications | `nameAr` | B |
| `admin.generateInvoicePDF` | `priceMonthly` / `priceYearly` as invoice amount | C |
| `getAdminStatistics` | `computeAdminMrr` + plan names | A |
| `getRevenueByMonth` | Plan prices as monthly “revenue” | A |
| `subscriptionPlanLimits.ts` | Type `Pick<SelectSubscriptionPlan>` only | G / B |
| `db.getSubscriptionPlans` / `ById` / `create` | ORM helpers | E / H |
| Schema / migrations / seeds / scripts / tests | Persistence + fixtures | E / G / H |

## Customer data

Prior production forensics (2026-08-14): 5 test/internal `user_subscriptions`, 0 paid invoices, 0 bindings. AA: no real customer contracts. This program did not mutate production data.
