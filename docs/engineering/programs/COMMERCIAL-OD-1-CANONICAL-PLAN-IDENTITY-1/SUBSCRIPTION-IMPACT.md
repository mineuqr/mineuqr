# SUBSCRIPTION-IMPACT

No subscription code or schema was changed.

## Today

`user_subscriptions.planId` is `int NOT NULL` with **no FK** to `subscription_plans`.

Creation / trial / admin / Customer Success write that integer. Display and entitlements resolve through Live Plan (bound UUID preferred; unbound uses integer → bridge → code).

## Can it eventually become `commercial_plans.id`?

**Yes — without ambiguity — if and only if** every stored integer maps to exactly one current Live Plan via the existing bridge codes, and unmapped integers fail closed.

| Path | Resolves to one Live Plan today? |
|------|----------------------------------|
| Bound subscription | Yes — `bindings.planId` is already the UUID |
| Unbound 30001/30002/30003 | Yes — one code → one Live Plan (unique `code`) |
| Unmapped integers (tests use `1`, `102`) | No — must fail closed, not guess |

## Blockers (implementation, not this decision)

- OD-2: ALTER `user_subscriptions.planId` int → varchar(36)
- OD-3: public/admin `planId: number` cutover
- OD-5: production distinct `planId` proof
- Unmapped integers must not be guessed by price or name

Charged Terms must not be rewritten during that future ALTER.

## Lifecycle (analysis only)

Create, trial, bind, renew, upgrade, downgrade, cancel, expire, admin update: all can point at a UUID once the column and APIs accept it. Renewal/upgrade must keep Charged Terms semantics (ADR-035). This program does not change those events.
