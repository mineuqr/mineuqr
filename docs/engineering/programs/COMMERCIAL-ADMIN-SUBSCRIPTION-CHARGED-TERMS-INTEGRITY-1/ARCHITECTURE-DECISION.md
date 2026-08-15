# ARCHITECTURE DECISION

**Chosen: B. ADMIN FLOW HAS A FINANCIAL INTEGRITY GAP**

Admin-created qualifying subscriptions **can exist without Charged Terms**.

## Why not A (financially complete)

- 780001 and 750001 are proven Admin creates with no Binding / no Charged Terms.
- Bind on create is fail-soft.
- `billingCycleCode` is omitted; yearly creates would snapshot monthly catalog price.
- Amount is never an Admin input and is never stored on `user_subscriptions`.
- Admin update can overwrite Charged Terms from current catalog.

840001/810001 show that **post-cutover monthly** Admin creates *can* write Charged Terms. Completeness is therefore **incidental to create date and bind success**, not an invariant.

## Why not C (intentionally non-financial)

- Current Admin create **calls** `ensureLivePlanBoundForSubscription`.
- Admin invoice PDF **requires** Charged Terms.
- Canonical MRR **is defined** on Charged Terms.
- Post-cutover Admin creates 810001 and 840001 **did** receive Charged Terms.

The flow is **intended** to be financial for commercially qualifying subscriptions. It is **not** implemented as a closed chain.

## I-ADMIN-CT-01

Recorded as the intended financial-completeness invariant. Not enforced at write time. See `SUBSCRIPTION-FINANCIAL-BOUNDARY.md`.

## Minimum implementation (NOT authorized in this program)

Do **not** implement until Architecture Authority explicitly authorizes a follow-on program.

Minimum to make **future** Admin creates financially complete:

1. Pass `user_subscriptions.billingCycle` into `ensureLivePlanBoundForSubscription` / `bindSubscriptionToLivePlan` as `billingCycleCode`.
2. Fail closed on Admin create (and on Admin updates that constitute a new commercial commitment) if Binding + valid Charged Terms are not persisted. Do not leave a qualifying `active`/`trial` row as the sole success signal.
3. Stop silent Charged Terms overwrite from current catalog on unrelated lifecycle edits. New commercial commitment → new snapshot policy (open decision OD-ADMIN-CT-04), not `onDuplicateKeyUpdate` of historical amount from monthly list price.
4. Keep amount source explicit: catalog snapshot at bind time **or** a future Admin-entered amount — never an implicit UI display value.
5. Tests (when implementation is authorized): Admin monthly; Admin yearly; Live Plan identity; price source; Binding creation; Charged Terms creation; MRR calculation; missing Charged Terms fail-closed; subscription update; historical Charged Terms immutability; duplicate account subscriptions; internal/test subscriptions.
6. **Do not** backfill 780001 (or other pre-cutover rows) from today's Live Plan price.

780001 remains financially incomplete. INTERNAL population remains outside certified commercial MRR regardless.

## Next authorized program (proposed, not started)

`COMMERCIAL-ADMIN-CHARGED-TERMS-COMPLETION-1`

Scope: items 1–5 above only. No 780001 mutation. No OD-4. No SAFE DELETE. No webhook retirement.
