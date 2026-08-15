# FORENSIC-REPORT.md

Re-verified 2026-08-15 against current code. No production query in this program.

## Production customer fact

Architecture Authority: **no real legacy customers / no real customer contracts**.

Independent prior proof (COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1, 2026-08-14, read-only TiDB):

| Fact | Value |
|------|-------|
| Users | 3 (2 INTERNAL admin, 1 COMMERCIAL `local_sa…` test) |
| `user_subscriptions` | 5 — owner/dev/test/internal only |
| Paid customer invoices | **0** |
| Catalog bindings | **0** |
| Stripe ids | **0** |
| Real paying customer | **No** |

Later snapshots (`COMMERCIAL-LIVE-PLANS-PRODUCTION-MIGRATION-1`, `PLATFORM-OWNER-ACCESS-MODE-PRODUCTION-MIGRATION-1`) still show `user_subscriptions: 5`.

Classification of remaining `subscription_plans` / subscription rows: **development, test, configuration, compatibility** — not customer contractual history.

No grandfathering, customer re-bind, or Charged Terms reconstruction was designed or implemented.

## Live application dependencies (re-verified)

| Site | After this program | Class |
|------|--------------------|-------|
| `createCheckoutSession` / `createTapCheckout` | **Live Plan offer** via `resolveCheckoutOfferFromLivePlan` | Consolidated (price) |
| PayPal / Tap webhooks | Still `getSubscriptionPlanById` (existence / email) | Residual identity |
| `CanonicalMetricsService` | Still `getSubscriptionPlans` prices | **D — gated MRR** |
| `getAdminStatistics` / `getRevenueByMonth` | Still table prices | Residual / deprecated |
| `getCurrentSubscription` / `getByRestaurant` | Still joins table for plan DTO | Residual display |
| `listPlans` | Catalog-first; fallback `getSubscriptionPlans` | Residual fallback |
| Trial `resolveTrialPlanId` | Catalog-first; fallback table | Residual fallback |
| CRS unbound `planName` | Still `getSubscriptionPlanById` | Residual display |
| Admin notifications | Still `nameAr` from table | Residual display |
| Admin `generateInvoicePDF` | Still table prices | Residual amount |
| `createSubscriptionPlan` | Unused write helper | Residual |
| Entitlements / limits | Live Plan hub | **Already consolidated** |
| Plan Editor / Public Pricing | Live Plans | **Already consolidated** |

## Indirect

`legacyPlanId` / `LEGACY_PLAN_BRIDGE` / `planIdMapping` / `user_subscriptions.planId` — integer **compatibility handle**, not catalog authority.

No formal FK. No cron. No views. POS / Order / Check / Settlement / Register: no hits.
