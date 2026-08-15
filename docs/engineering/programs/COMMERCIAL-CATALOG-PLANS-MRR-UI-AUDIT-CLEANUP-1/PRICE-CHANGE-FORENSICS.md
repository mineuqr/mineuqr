# PRICE-CHANGE-FORENSICS.md

Code analysis + existing test (`commercialLivePlans.architectureAuthority.validation.test.ts`). **No production mutation.**

## Example

Customer charged term at bind: **100 SAR** (or 100.00 catalog currency).  
Administrator edits Live Plan current price to **150**.

| Concern | After catalog edit (no re-bind) |
|---------|----------------------------------|
| Current-period charged terms | **100** (binding row unchanged) |
| Catalog value | **150** |
| Public Pricing | **150** |
| Next renewal bind | **150** (renewal captures current catalog) |
| Invoice already issued | Unchanged (payment history) |
| Checkout new purchase | Still `subscription_plans` (19/39/99 book) |
| MRR | Still `subscription_plans` monthly-equivalent — **not** 100 or 150 |

## Verified

Editing the current Live Plan price does **not** rewrite historical `commercial_subscription_bindings.chargedAmount` unless an explicit re-bind event runs (upgrade / downgrade / renewal / admin activation).

Architecture comment: `adoptionService.bindSubscriptionToLivePlan` — later price edits do not rewrite the binding.
