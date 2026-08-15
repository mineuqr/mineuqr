# BILLING CYCLE GOVERNANCE

Supported cycles are discovered from the catalog (`pricingService.listBillingCycles`) and restricted to the existing Admin enum: **monthly**, **yearly**.

The Charged Terms `billingCycleCode` is the Admin-selected cycle passed into `resolveChargedTermsForAdminCreate` / `persistAdminCreateChargedTerms`.

| Forbidden remap | Status |
|-----------------|--------|
| yearly → monthly | removed for Admin create (old `ensureLivePlanBound` omitted cycle) |
| monthly → yearly | not performed |

Missing or invalid cycle → `invalid_billing_cycle` → fail closed (`PRECONDITION_FAILED`). tRPC `z.enum(["monthly","yearly"])` is the API gate; the resolver still fail-closes if called with anything else or if the catalog lacks that cycle.
