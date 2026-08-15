# 10 — FINANCIAL INVARIANT PROOF

OD-3 changed plan **identity**, not historical commercial terms.

## OD-3 commit file set

`c1d64cba` did **not** modify:

- `server/commercial/metrics/chargedTermsMrr.ts`
- `server/commercial/metrics/CanonicalMetricsService.ts`
- Tax / FX / Settlement / POS / Register / Reporting financial modules
- Checkout amount formula (still `offer.amount` from Live Plan Offer List Price)

## MRR

Canonical path unchanged:

```
qualifying subscription
  → Charged Terms (bindings.chargedAmount / currency / cycle)
  → monthly equivalent
  → MRR
```

MRR does not use `planId` as a price, Live Plan current catalog price, or `subscription_plans` price.

Guard: `GUARD-IDENTITY-06` + residual MRR guard — PASS.

## Charged Terms

Production bindings (read-only):

| Fact | Value |
|------|-------|
| rows | 2 |
| complete Charged Terms | 2 |
| incomplete | 0 |
| currency / cycle | USD / monthly |

This program did not rebuild Charged Terms, reprice subscriptions, or copy current Live Plan price onto existing rows.

## Entitlements

Normal resolution:

```
user_subscriptions.planId
  → Live Plan UUID
  → capabilities / limits
  → entitlement hub (getCommercialEntitlements → resolveOwnerEntitlements)
```

No integer identity is required for normal entitlement resolution. Unbound leftover fallback remains an OD-4 compatibility path.

Guard: `GUARD-IDENTITY-04/05` — PASS.

## Payment / financial safety

No real payment, refund, Check, or Settlement Transaction was executed.

| Concern | OD-3 effect |
|---------|-------------|
| payment amount | unchanged authority (Offer List Price at checkout) |
| currency | unchanged |
| payment provider | unchanged |
| settlement / Check | untouched |
| Charged Terms | unchanged |
| refunds | untouched |
| MRR | unchanged |

## Decision

**FINANCIAL INVARIANT GATE: PASS**
