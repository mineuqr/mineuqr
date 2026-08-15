# ADMIN CHARGED TERMS IMPLEMENTATION

| Concern | Location |
|---------|----------|
| UI | `CustomerSuccessAccountsSection` — unchanged; price remains display-only |
| Procedure | `admin.createUserSubscriptionByAdmin` |
| Orchestration | `applyAdminUserSubscriptionCreate` in `server/subscriptionAudit.ts` |
| Offer resolve | `resolveChargedTermsForAdminCreate` |
| Persist | `persistAdminCreateChargedTerms` |
| Module | `server/commercial/adminChargedTermsCompletion.ts` |
| Compensate | `deleteUserSubscriptionById` in `server/db.ts` |
| Plan identity | `resolveLivePlanById` — UUID only |
| Price | `pricingService.currentPriceForPlan` |
| Cycles | catalog `listBillingCycles` ∩ `{monthly, yearly}` |
| MRR | unchanged `chargedTermsMrr.ts` |
| Entitlements | unchanged hub; Binding not required |

No schema migration. Binding table already holds `chargedAmount`, `chargedCurrency`, `billingCycleCode`, `planId`.
