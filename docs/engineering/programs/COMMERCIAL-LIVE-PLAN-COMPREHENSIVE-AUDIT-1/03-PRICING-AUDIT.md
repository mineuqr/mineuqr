# 03 — PRICING AUDIT

## What Live Plan price means

**Offer List Price** = current catalog amount on `commercial_prices` for a plan + billing cycle, typically the **global** row (`regionId IS NULL`), currency usually USD.

It is **not** stored on `commercial_plans`. Resolver: `pricingService.currentPriceForPlan(planId, billingCycleCode, regionId?)`.

Checkout and bind call it **without** `regionId` → global USD row.

## Production Offer List Prices (SELECT)

| Plan | Cycle | Global | Regional (SA) |
|------|-------|--------|----------------|
| basic | monthly | 19.00 USD | none |
| basic | yearly | 199.00 USD | none |
| professional | monthly | 29.00 USD | 99.00 SAR |
| professional | yearly | 349.00 USD | 990.00 SAR |
| enterprise | monthly | 99.00 USD | 299.00 SAR |
| enterprise | yearly | 999.00 USD | 2990.00 SAR |

## Separation (as implemented)

| Layer | Authority | Applied at checkout? |
|-------|-----------|----------------------|
| Catalog Offer List Price | `commercial_prices` | **Yes** (global row) |
| Customer Charged Terms | bindings at bind time | After payment, not the charge itself |
| Payment Provider Amount | PayPal USD / Tap **SAR label + USD number** | Yes — **Tap misaligned** |
| Tax | Restaurant/check tax policy; `commercial_regions.taxPolicyRef` unused | **No** on subscription checkout |
| FX | `resolveDualPricePresentation` display | Pricing page presentation only |
| Historical financial facts | Invoices / settlement / charged terms | Not catalog |

## Tax inclusion

Catalog amounts are **ex-tax list prices**. Live Plan does not compute VAT. `taxPolicyRef` (`sa-vat` metadata present on region `sa`) is **not read** by checkout, bind, or MRR.

## Discounts / promotions

`commercial_promotions` exists; Production count **0**. Not wired into checkout.

## Classification of price fields on leftover `subscription_plans`

`priceMonthly` / `priceYearly` on leftover table: **Historical**. Guard tests forbid checkout/MRR use. Not Live Plan authority.
