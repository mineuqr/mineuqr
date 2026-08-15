# HISTORICAL-CONTRACT-IMPACT

Charged Terms were not modified.

## Independence

Canonical Plan Identity names the catalog template. It does **not** reconstruct price.

```
Live Plan UUID = X
Current Offer List Price = $45
Historical Charged Terms = $35

MRR and invoices continue to use $35
```

`CommercialChargedTerms.planId` may store UUID X as the template that was bound. `chargedAmount` / `chargedCurrency` / `billingCycleCode` remain the contract.

## Lifecycle requirement (not implemented)

Deleting a Live Plan row that historical bindings still reference would dangle UUID FKs. There is no `deletePlan` API today. Hide (`isHidden`) does not change `id`.

Future rule: do not hard-delete a Live Plan while bindings or Charged Terms still point at its UUID. Archive/hide only.

Catalog wipe that regenerates UUIDs is an operational destroy of catalog rows — not a normal edit — and must not run while UUID references remain.
