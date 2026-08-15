# 15 — ARCHITECTURE GUARDS

Final-state guards (no `LEGACY_PLAN_BRIDGE`, no leftover webhook read, no leftover bind column) **must not** be added while those artifacts remain required.

Existing guards that still apply:

- `livePlanIdentity.guards.test.ts` — UUID storage, checkout price, MRR Charged Terms
- `subscriptionPlansResidual.guards.test.ts` — leftover table is not commercial authority
- `od3PublicApiUuid.guards.test.ts` — public UUID writers; leftover bridges still present

OD-4 final guards are deferred until webhook leftover read and bind-column drop are authorized.
