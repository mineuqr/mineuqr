# ADMIN UPDATE FORENSICS

## Execution graph (current code)

```
CustomerSuccessAccountsSection.openEditSubDialog
  hydrates planId, billingCycle, status, end date from owner commercial state
  ↓
Same form as create (catalog price display-only)
  ↓ mutate: { userId, planId?, billingCycle, status, subscriptionEndDate? }
     NO amount
  ↓
admin.updateUserSubscriptionByAdmin
  ↓
applyAdminUserSubscriptionUpdate
  ↓ getOwnerAccountSubscriptionRow (canonical restaurantId=0 pick)
  ↓ resolveCanonicalLivePlanId if planId present
  ↓ buildAdminSubscriptionUpdateData
       planId, billingCycle, status, currentPeriodEnd
       trial → trialEndsAt
  ↓ updateSubscriptionById  (lifecycle columns only)
  ↓ audit subscription_updated_by_admin (plan, status, expiration — no amount, no cycle)
  ↓ re-bind ONLY if planChanged OR periodChanged OR statusActivated
       ensureLivePlanBoundForSubscription({ planId, event: upgrade|downgrade|renewal|plan_selected })
       billingCycleCode NOT passed
       bindSubscriptionToLivePlan onDuplicateKeyUpdate OVERWRITES
         chargedAmount, chargedCurrency, billingCycleCode from CURRENT catalog monthly default
```

## What each Admin field does

| Admin change | Lifecycle (`user_subscriptions`) | Binding | Charged Terms |
|--------------|----------------------------------|---------|----------------|
| plan | `planId` updated to Live Plan UUID | Re-bind if plan id changed | Overwritten from **current catalog** (monthly default) |
| billing cycle | `billingCycle` updated | **No re-bind** unless another trigger fires | Unchanged unless a re-bind happens for another reason |
| price | **Not an input.** Display is current Offer List Price | — | — |
| status | `status` updated; trial fills `trialEndsAt` | Re-bind only if new status is `active` and old was not | Overwritten from current catalog if re-bind runs |
| expiration / renewal date | `currentPeriodEnd` updated | Re-bind if period end string changed | Overwritten from current catalog if re-bind runs |

## Classification of an update

1. **Always** can change subscription lifecycle (plan, cycle, status, period end).
2. **Does not** accept a new commercial amount from the administrator.
3. **Does not** create a new immutable Charged Terms snapshot. Re-bind uses `onDuplicateKeyUpdate` on the unique `subscriptionId`.
4. **Does** mutate existing Charged Terms when a re-bind trigger fires — from **current Live Plan Offer List Price**, default cycle **monthly**, not from the subscription's stored `billingCycle`, and not from any Admin-entered amount.
5. **May** create a Binding if none existed and a re-bind trigger fires (same fail-soft as create).
6. If none of plan/period/status-activated change, financial history is left unchanged — including leaving a missing Binding missing.

Historical financial terms **can** be silently overwritten on plan/period/activate updates. That violates the architectural rule that Charged Terms are immutable historical commercial terms.

## Production update evidence (2026-08-15 SELECT)

| Audit id | Target | When | What changed |
|----------|--------|------|----------------|
| 720003 | 690001 | 2026-06-13 | expiration `2026-07-09` → `2026-06-14` (status stayed active, plan 30002) |
| 19890002 | 810001 | 2026-08-15T00:24:32Z | status `active` → `expired`; expiration tweaked. Enabled a subsequent create of 840001 |

No `subscription_updated_by_admin` event exists for 780001. Its `updatedAt = 2026-08-15T09:37:49Z` is shared by **all six** `user_subscriptions` rows and matches the Live Plan UUID identity migration, not an Admin edit.
