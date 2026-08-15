# PRICE SOURCE FORENSICS

## What the Admin UI price is

The create/edit dialog does **not** have an amount input.

Plans are loaded from `trpc.commercialCatalog.listPublishedOfferings` → `listLivePlanOfferings` → `offeringFromPlan`:

- `priceMonthly` = current global (non-regional) `commercial_prices` row for monthly
- `priceYearly` = current global yearly row

Display:

- Plan `<SelectItem>`: `formatAdminSubscriptionPrice(plan, billingCycle)` = `formatPlanPriceForCycle`
- Summary preview: same helper via `useSubscriptionFormPreview`

`getPlanPrice(plan, billingCycle)` reads `priceMonthly` or `priceYearly` from that offering. It is **current Live Plan Offer List Price**.

Create dialog default `billingCycle` is `"monthly"`. Enterprise monthly catalog on 2026-08-15 SELECT: **99.00 USD**. Formatted line: `$99.00 / Monthly` (or Arabic equivalent).

## Mutation payload (proven)

```
{ userId, planId, billingCycle, status, subscriptionEndDate? }
```

No price, no amount, no currency.

## Classification of $99.00 / monthly

| Hypothesis | Verdict |
|------------|---------|
| 1. Current Live Plan Offer List Price | **Yes** — this is what the UI displays |
| 2. Admin-entered amount | **No** — no amount field |
| 3. Existing subscription terms | **No** — edit form still displays catalog offering prices, not Binding Charged Terms |
| 4. Other persisted commercial source on the subscription | **No** — `user_subscriptions` has no amount column |

Therefore $99 is:

- **a display value** of the current enterprise **monthly** Offer List Price,
- **not** an input,
- **not** a persisted subscription term,
- **not** a stored financial commitment for 780001.

## 780001 vs the displayed $99

780001 persisted `billingCycle = yearly`. If the administrator selected Yearly in the cycle control, the same helpers would display the **yearly** offering price (today **999.00 USD**), not $99.

Operator observation of `$99.00 / monthly` matches:

- the form's **default monthly** cycle, and/or
- the enterprise monthly list price shown while monthly is selected,

not the persisted yearly cadence, and not a frozen Charged Terms amount.

Audit create payload has no amount. Binding does not exist. **Do not treat $99 as 780001's commercial commitment.**
