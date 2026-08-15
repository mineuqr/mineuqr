# FINAL-REPORT.md — COMMERCIAL-CATALOG-ARCHITECTURE-1

**Date:** 2026-08-15  
**Executive decision:** **APPROVED WITH CONDITIONS**

No application code, production data, constitution registry, or ADR registry was modified.

---

## Decisions (normative, Proposed)

1. Live Plan = catalog + sellable product + entitlement template. Not the customer contract.
2. Five price semantics; catalog edit does not rewrite charged terms.
3. Target checkout price = Live Plan Offer list price. Current checkout = `subscription_plans` (legacy).
4. MRR = charged-terms monthly-equivalent for ACTIVE paid accounts. ≠ Check Revenue. Current MRR implementation is non-compliant with this constitution.
5. CanUse / checkLimit / Frozen are server authority. Flags_only ≠ enforced.
6. `isSubscriptionActive` = coarse subscription liveness. Do not mass-replace.
7. Pricing SHOULD show limits (presentation). Not a Limits repair.

## Additional decisions required before implementation

1. **Accept** ADR-ARCH-034, 035, 036 into the ADR Registry.
2. **Checkout cutover design:** PayPal USD vs Tap SAR vs catalog USD/SAR; dual-write; rollback; customer messaging.
3. **MRR FX policy** for reporting USD if charged currency ≠ USD.
4. **Refund / complimentary → binding** classification for MRR exclusion.

---

```
ARCHITECTURE STATUS:
NOT READY — ADDITIONAL DECISION REQUIRED
```

1. Formal acceptance of ADR-ARCH-034 / 035 / 036.  
2. Checkout cutover design (currency, dual-write, rollback).  
3. MRR FX and refund-to-binding classification.

Until those are recorded, do **not** implement Checkout migration or MRR changes.

**STOP.** Await Architecture Authority acceptance. No commit, push, or deploy.

---

## Addendum — COMMERCIAL-ADR-REGISTRATION-1 (2026-08-15)

Condition **1** (formal ADR registration) is now satisfied. Canonical Accepted (governance) records:

- [ADR-ARCH-034](../../../architecture/adrs/ADR-ARCH-034-commercial-catalog-authority.md)
- [ADR-ARCH-035](../../../architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md)
- [ADR-ARCH-036](../../../architecture/adrs/ADR-ARCH-036-mrr-constitution.md)

Conditions **2–4** remain open. Overall status is unchanged:

```
ARCHITECTURE STATUS:
NOT READY — ADDITIONAL DECISION REQUIRED
```

---

## Addendum — COMMERCIAL-PRICING-POLICY-UPDATE-1 (2026-08-15)

The **New Checkout / current-period / Renewal / Charged Terms / MRR** pricing behavior is now an approved, registered policy (ADR-035 / 036 rev 1.1). See [PRICING-POLICY-ADDENDUM.md](./PRICING-POLICY-ADDENDUM.md).

Resolved by this addendum: exact period-lock and renewal-reprice rules (no lifetime lock; no mid-period charge or refund).

Still open:

1. Checkout Cutover Design
2. MRR FX Policy
3. Refund-to-Binding Classification

Overall status is unchanged:

```
ARCHITECTURE STATUS:
NOT READY — ADDITIONAL DECISION REQUIRED
```
