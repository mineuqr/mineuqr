# 04 — FINANCIAL SEMANTICS

## Authoritative answer

**Admin Reactivation is a NEW commercial commitment, not continuation of the old one.**

The existing subscription **row** may be reused (account identity).  
The existing Charged Terms **snapshot** may **not** be reused as the live commitment.

## Price-change scenario (conceptual — not implemented)

T1: Professional monthly = $29 → Snapshot #1 = $29  
T2: Catalog becomes $39. Customer cancels.  
T3: Admin reactivates.

| Model | Live commitment | MRR after reactivate | After later catalog → $49 |
|-------|-----------------|----------------------|---------------------------|
| A (rejected) | $29 | $29 | $29 |
| **B (contract)** | **$39 Snapshot #2** | **$39** | **$39** (catalog does not reprice #2) |
| C (rejected) | $39 on a **new** row | $39 | $39 |

## Termination states

| State | Entitlement now | Financial authority now | Reactivation semantics |
|-------|-----------------|-------------------------|------------------------|
| A. Cancelled paid | Off immediately | Last snapshot historical; MRR 0 (`countsInMrr` false) | **B paid:** new snapshot at current offer |
| B. Expired paid | Off (read-time or `db_expired`) | Last snapshot historical; MRR 0 | **B paid:** new snapshot; new period |
| C. Cancelled free-first | Off | No snapshot; concession cancelled best-effort | **Free:** new concession. **Paid:** new snapshot. Never invent $0 snapshot |
| D. Expired free-first | Off | No snapshot; concession not current | Same as C |
| E. Cancelled + historical snapshots | Off | Current = latest snapshot, not in MRR | New snapshot N+1; old rows untouched |
| F. Multiple historical snapshots | Off or on | Current = latest by `effectiveFrom`, `version` | Same; never rewrite N |
| G. Active concession | On if period valid | MRR suppressed | Not a Reactivation case. Cancel first or revise concession |
| H. Expired concession, period still valid, paid snapshot | On | MRR resumes from current snapshot | Not Reactivation — already entitled |
| I. No Charged Terms | On only if period valid | MRR 0 | Paid reactivate **must** create Snapshot #1. Status-only revive is financially incomplete |

## Cancel vs expiry

Both are **termination of the live commitment**. Neither preserves a price lock.

- Cancel: entitlement off immediately (`db_canceled`). Period end is irrelevant.
- Expiry: entitlement off at period end (read-time). No hidden Charged Terms write.

Reactivation after either is a **new period** and a **new commitment**. Do not assume period continuity.

## Free-first

Forbidden: free expiry → implicit paid commitment.

Allowed:

1. **Free reactivate:** new concession version from `now` (immediate grant). No Charged Terms. MRR = 0.
2. **Paid reactivate:** current Live Plan offer → Snapshot #1 (or N+1 if history exists).

Reviving an expired concession window without a new grant is **not** allowed.

## Concession after cancel

Subscription cancel best-effort **cancels** the current concession. Reactivation does **not** restore it.

A paid snapshot must not become MRR-active while a **current** concession exists. If Admin wants suppression after paid reactivate, that is a **separate grant**.

## Plan / cycle

Reactivation inputs are explicit:

- Live Plan UUID (selected, resolved)
- billing cycle (selected)
- Yearly amount = yearly Live Plan offer (never monthly × 12 unless that offer equals it)

These are **part of the Reactivation command**, not a silent extra plan-change.
