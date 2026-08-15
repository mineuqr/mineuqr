# GOVERNANCE-GAPS.md

Constitution v1.0 and I-CE-01…18 remain in force. This program does **not** amend them.

## G-01 — MRR constitution (I-CATALOG-13)

No single approved rule for: charged terms vs `subscription_plans` vs catalog; yearly normalization; refunds; complimentary; currency.

**Follow-on:** COMMERCIAL-MRR-CONSTITUTION-1 (decision only, then implementation).

## G-02 — UI truthfulness

Pricing may show catalog 26.40 while Checkout charges 39.00. Limits exist in the API but not on Pricing. Subscription UI does not show binding charged terms.

**Follow-on:** COMMERCIAL-UI-TRUTHFULNESS-1.

## G-03 — Limits / Quotas in the constitution

Noted in LIMITS-REPAIR-1: CE rules are capability-centric. `checkLimit` is not yet the constitutional twin of `requireFeature`.

**Follow-on:** extend constitution with I-LIMIT (do not weaken CE).

## G-04 — flags_only capabilities

Most projection keys lack mutation `requireFeature`. Pricing/Editor visibility ≠ implementation (CE-04 already says this). Residual implementation debt.

**Follow-on:** per-capability enforcement programs (do not batch-redesign).

## G-05 — `isSubscriptionActive` parallel path

Templates / custom colors / fonts bypass the hub.

**Follow-on:** retire that gate in favor of `requireFeature` / hub.

## G-06 — Dual price book retirement

Checkout LEGACY_COMPATIBILITY is justified until a cutover. MRR should not stay on that book without a decision.

## G-07 — Extra limit vocabulary

Seven unused limit keys. Do not enforce or delete without a product decision.

Do not weaken existing governance to close these gaps.
