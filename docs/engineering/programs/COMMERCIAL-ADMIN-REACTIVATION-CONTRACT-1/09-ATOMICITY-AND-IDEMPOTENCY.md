# 09 — ATOMICITY AND IDEMPOTENCY

## Required boundary (Model B paid)

One SQL transaction (Classification **A**), same shape as `applyAdminCommercialIdentityChange`:

1. Resolve offer **before** the transaction (fail closed if missing/zero)
2. INSERT Snapshot N+1 (or skip insert only when already entitled **and** current snapshot matches offer)
3. UPDATE `user_subscriptions` (`status=active`, `planId`, `billingCycle`, period start/end)
4. Binding `planId` only (insert Binding if missing; leftover charged columns are not authority)

Free variant: grant concession + activate in one transaction (Classification **A**). Today’s free-first create is Classification **B** (compensate-delete). Implementation may reuse B only if it cannot return success without the concession.

## Failure matrix (current vs contract)

| Case | Today (implicit update) | Contract |
|------|-------------------------|----------|
| A. Activation succeeds, snapshot fails | **Possible** (status-only never attempts snapshot) | Must not succeed |
| B. Snapshot succeeds, activation fails | N/A on status-only; plan/cycle path is one TX | Rollback |
| C. Binding succeeds, snapshot fails | Possible on concession identity path | Paid path: one TX |
| D. Concession update vs activation | Cancel is best-effort on subscription cancel | Free reactivate: one TX or compensate |
| E. Entitlement on, commitment missing | **Occurs today** | Forbidden |

## Idempotency (duplicate Admin Reactivate)

| Situation | Class | Behavior |
|-----------|-------|----------|
| Two clicks, first still in flight | Implementation must unique `(subscriptionId, version)` + TX | One winner; loser conflict or retry to idempotent read |
| Second call after success, still entitled, same offer | **IDEMPOTENT** | No Snapshot N+2 |
| Second call after success, catalog price changed, still entitled | Not Reactivation — that is a later plan/price change | Do not insert from “reactivate” |
| Second call while still canceled (first failed closed) | Retry | One snapshot + activate |
| Status-only update today, two clicks | **IDEMPOTENT** write of same status; **UNSAFE** financially | Must be removed as Reactivation |
| Create-after-cancel twice | First creates row; second CONFLICT if entitled | Dual-row if first not entitled yet |

Current implicit path: **UNSAFE** (financial) / **PARTIALLY SAFE** (no duplicate snapshot because none is written).

Contract path: **IDEMPOTENT** when already entitled with matching current snapshot; otherwise one new snapshot per successful Reactivation.
