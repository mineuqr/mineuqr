# 07 — CONCESSION IMPACT

## Current facts

- Current concession = `status=active AND now < endsAt`
- Subscription cancel: best-effort `cancelCommercialConcession` (`subscription_canceled`)
- Grant/revise/cancel on existing row: reject `canceled` / `expired` / `trial`
- Cancel unpaid (no snapshot) may set `currentPeriodEnd=now`

## Cancel while concession current, then Admin “reactivates” before original `endsAt`

Today: concession is already `cancelled`. Status-only revive does **not** restore it. Entitlement can return without a concession and without a snapshot if period end is still in the future — **financially incomplete**.

## Contract

| Intent | Required write |
|--------|----------------|
| Free restore | New concession version from `now`. Align `currentPeriodEnd` to new `endsAt`. No Charged Terms. |
| Paid restore | New snapshot. Do not un-cancel the old concession. |
| Paid + later free | Separate `grantCommercialConcession` after the row is active |

Reactivation MUST NOT:

- rewrite historical concession grant facts
- treat a cancelled concession as current
- create a $0 snapshot to mean “free”
- auto-convert free history into paid

A paid snapshot and a **current** concession together: MRR suppressed; entitlement follows `planId`. That pairing is allowed only via an explicit later grant, not as a side effect of Reactivation.
