# PRICING-VALIDATION.md

## Catalog book (Live Plans, production after bootstrap)

Matches `LEGACY_PLAN_COMMERCIAL_PRICE_TERMS` / `CLEAN-RESET-1`. No guess, no overwrite.

| Plan | USD monthly | USD yearly | SAR monthly (`sa`) | SAR yearly (`sa`) |
|------|-------------|------------|--------------------|-------------------|
| Basic | 0.00 | 0.00 | — | — |
| Professional | 26.40 | 264.00 | 99.00 | 990.00 |
| Enterprise | 79.73 | 797.33 | 299.00 | 2990.00 |

10 price rows. No duplicate `(planId, billingCycleId, currency, regionId)`.

## Checkout book (`subscription_plans` 30001–30003) — unchanged

| ID | Monthly USD | Yearly USD |
|----|-------------|------------|
| 30001 Basic | 19.00 | 175.00 |
| 30002 Professional | 39.00 | 349.00 |
| 30003 Enterprise | 99.00 | 899.00 |

This program did **not** rewrite checkout prices. Dual book remains an approved residual.

## Phase 10 — pricing semantics (no production billing writes)

Automated TEST B / AA validation (`commercialLivePlans.cleanReset.test.ts`, `commercialLivePlans.architectureAuthority.validation.test.ts`):

- Captured 100 SAR term stays 100 SAR after live list price moves to 150 SAR.
- Historical invoice path is not rewritten.
- `chargedAmount` null does **not** fall back to live list price (`adoptionService.ts` guard).

No production invoice, payment, or binding was created or updated to perform this test.
