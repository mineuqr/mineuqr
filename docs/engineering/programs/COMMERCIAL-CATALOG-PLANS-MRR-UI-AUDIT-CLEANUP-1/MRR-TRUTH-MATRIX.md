# MRR-TRUTH-MATRIX.md

Policy is **not formally defined**. Rows describe **implemented** behavior of `CanonicalMetricsService` (price = `subscription_plans`, include = `countsInMrr`).

| Subscription State | Billing Cycle | Charged Terms | Current Plan Price | MRR Contribution | Invoice Behavior | UI Behavior | Status |
|--------------------|---------------|---------------|--------------------|------------------|------------------|-------------|--------|
| Monthly ACTIVE entitled | monthly | Binding catalog-at-bind | Catalog list | `subscription_plans.priceMonthly` | Checkout/invoice separate | Admin KPI | GOVERNANCE GAP |
| Yearly ACTIVE entitled | yearly | Binding | Catalog yearly | `priceYearly / 12` | Separate | Admin KPI | GOVERNANCE GAP |
| Trial | either | Bind on trial | Catalog | **0** (`countsInMrr: false`) | Excluded | Trial counts elsewhere | Implemented |
| Expired / entitlements off | — | Preserved | Catalog | **0** | Historical invoices remain | Frozen UX | Implemented |
| FROZEN | — | Preserved | Catalog | **0** | Renewal allowed | Pricing redirect | Implemented |
| Cancelled | — | Preserved | Catalog | 0 if not `countsInMrr` | Unspecified vs invoices | Cancel stub | Incomplete |
| Complimentary | — | Unspecified | — | Unspecified | Unspecified | — | GOVERNANCE GAP |
| Refunded / voided | — | Unspecified | — | Not invoice-aware | Unspecified | — | GOVERNANCE GAP |
| Owner FULL_PLATFORM | n/a | none | n/a | **0** | No charge | Owner UI | Implemented |
| Owner SIMULATED_PLAN | n/a | none | Display only | **0** | No charge | Simulation note | Implemented |
| Internal / test | — | — | — | Excluded from population | — | — | Implemented |

**I-CATALOG-13: not fully met.** Follow-on MRR constitution required.
