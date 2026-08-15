# MONTHLY-EQUIVALENT-RULES

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

ADR-036 allows only two normalizations. No additional cycles.

## Rules

| Charged Terms cycle | MRR contribution |
|---------------------|------------------|
| monthly (`monthly` / `month`) | `chargedAmount` |
| yearly (`yearly` / `year`) | `chargedAmount / 12` |

Examples:

| Charged Terms | MRR |
|---------------|-----|
| $35 / month | $35 |
| $120 / year | $10 |
| $35 / month + $120 / year (two owners) | $45 |

## Cycle source order

1. Binding `billingCycleCode` (Charged Terms).
2. If absent: `OwnerCommercialState.billingCycle` (subscription lifecycle field already on CRS).
3. If both absent or not monthly/yearly: `UNSUPPORTED_BILLING_CYCLE` → **0**.

Do not default missing cycle to monthly. That would invent a contract.

Do not read Live Plan billing-cycle catalog (`pricingService.listBillingCycles`) for MRR.

## Currency

USD-native. `chargedCurrency` null or `USD` is accepted. Any other currency → `UNSUPPORTED_CURRENCY` → **0**. No FX.

## Amount

| Amount | Classification | Contribution |
|--------|----------------|--------------|
| missing / non-numeric | `INCOMPLETE_CHARGED_TERMS` | 0 |
| `<= 0` | `ZERO_VALUE` | 0 |
| `> 0` and cycle + currency ok | `INCLUDED` | monthly equivalent |

## Rounding

Sum contributions, then `Math.round(total * 100) / 100` (same as the previous CMS total).
