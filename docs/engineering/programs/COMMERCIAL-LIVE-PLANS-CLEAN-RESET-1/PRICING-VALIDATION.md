# PRICING-VALIDATION.md

## Canonical Live Plan prices (catalog)

Source: `LEGACY_PLAN_COMMERCIAL_PRICE_TERMS` — approved catalog seed (USD canonical, SAR regional override). **Not** copied from retired DB versions or admin `001`/`002`.

| Plan | Monthly USD | Yearly USD | Monthly SAR (region `sa`) | Yearly SAR |
|------|-------------|------------|---------------------------|------------|
| Basic | 0.00 | 0.00 | — | — |
| Professional | 26.40 | 264.00 | 99.00 | 990.00 |
| Enterprise | 79.73 | 797.33 | 299.00 | 2990.00 |

## Dual book (explicit residual — checkout not redesigned)

`subscription_plans` 30001–30003 remain:

| ID | Monthly USD | Yearly USD |
|----|-------------|------------|
| 30001 Basic | 19.00 | 175.00 |
| 30002 Professional | 39.00 | 349.00 |
| 30003 Enterprise | 99.00 | 899.00 |

This program does **not** rewrite checkout prices. Live Plans are catalog capability/pricing authority; checkout continues to use `subscription_plans` until a separate billing program.

Historical invoices/payments are not modified. Bound charged terms (when bindings exist later) must **not** fall back to the live list price if `chargedAmount` is null.
